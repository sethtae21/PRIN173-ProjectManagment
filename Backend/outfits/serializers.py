"""Outfit persistence serializer (FR-5.4-5.8, KAN-69 backend half, WBS 1.3.8 / RT-05).

Contract = KAN-41 standard fields: id, user, name, items (list of CatalogItem IDs),
timestamps. `items` is symmetric IDs on read+write by design (see ticket notes);
the try-on canvas resolves each ID via the guest-readable /catalog/{id}/.

Validation (judgment call #2): only ACTIVE catalog items may be ADDED (FR-3.3 /
KAN-104 invariant: shoppers never see rejected items). Already-stored items are
GRANDFATHERED so a post-hoc seller rejection can't lock the owner out of editing
their own outfit. Existence of every submitted ID is enforced by the field's
queryset; the active rule is layered on top in validate().

MongoDB note (the bug this file now guards against): PrimaryKeyRelatedField's
default to_representation() returns the RAW pk, which under django_mongodb_backend
is an ObjectId instance -> json.dumps raises "Object of type ObjectId is not JSON
serializable" on any response whose items list is non-empty. ObjectIdListField
overrides ONLY the read side to coerce pk -> str; the write side (to_internal_value
-> queryset.get via ObjectIdAutoField.to_python) is inherited unchanged and already
proven to accept hex strings.
"""
from rest_framework import serializers

from catalog.models import CatalogItem

from .models import Outfit


class ObjectIdListField(serializers.PrimaryKeyRelatedField):
    """PrimaryKeyRelatedField that serializes each related pk as a STRING.

    Fixes the ObjectId-not-JSON-serializable crash on read/render without touching
    the (correct) write/coercion path inherited from PrimaryKeyRelatedField.
    """

    def to_representation(self, value):
        pk = super().to_representation(value)      # raw pk (ObjectId here)
        return str(pk) if pk is not None else None


class OutfitSerializer(serializers.ModelSerializer):
    # ObjectId-safe id (mirrors the KAN-58 preset serializer; avoids int(ObjectId) crash)
    id = serializers.CharField(read_only=True)
    user = serializers.CharField(read_only=True, source='user_id')

    # Writable M2M as a list of CatalogItem PKs, READ as strings (see ObjectIdListField).
    # required=False + allow_empty=True honor the model's blank=True (an outfit may be
    # created with no items yet).
    items = ObjectIdListField(
        many=True,
        queryset=CatalogItem.objects.all(),   # all statuses so grandfathering + existence work
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Outfit
        fields = ['id', 'user', 'name', 'items', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']

    def validate(self, attrs):
        items = attrs.get('items')
        if items is None:                      # partial update that didn't touch items
            return attrs
        existing = set()
        if self.instance is not None:
            existing = {i.pk for i in self.instance.items.all()}
        # New additions must be active; stored members are grandfathered.
        bad = [it for it in items
               if it.pk not in existing and getattr(it, 'status', None) != 'active']
        if bad:
            raise serializers.ValidationError({'items': [
                f"item '{it.name}' ({it.pk}) is not active (status={it.status}); "
                f"only active catalog items can be added (FR-3.3 / KAN-104)."
                for it in bad
            ]})
        return attrs