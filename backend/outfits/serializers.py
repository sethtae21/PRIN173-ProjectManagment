"""Outfit persistence serializer (FR-5.4-5.8, KAN-69 backend half, WBS 1.3.8 / RT-05).

Base contract (KAN-41) = id, user, name, items (list of CatalogItem IDs), timestamps.
`items` REMAINS symmetric IDs on read+write (ObjectIdListField); the try-on canvas
resolves each ID via the guest-readable /catalog/{id}/. ADDITIVE (FR-5.4 optional
description/occasion; FR-5.6 avatar re-equip; SRS data-dictionary SAVED_OUTFITS.
avatar_preset_id): occasion, description, avatar_preset (nullable FK), a top-level
avatar_view mirror, and a nested read-only `avatar` snapshot reconstructed from the
inline avatar_* columns. The nested object is accepted on WRITE via to_internal_value
(flattened into the avatar_* columns) so we never expose 11 raw keys on the wire.

WRITE-TIME AUTO-FILL (the "never null, no backfill" guarantee): create()/update() call
_ensure_avatar(), which treats avatar_gender as an all-or-nothing sentinel. If a write
arrives WITH a captured body (gender non-empty -- the normal frontend path, which sends
the nested `avatar`), the client's true snapshot is preserved EXACTLY and nothing is
overwritten. If a write arrives WITHOUT one (a stale client, a direct API call, the green
tests that post only {'name','items'}), the row is completed server-side from the owner's
default AvatarPreset, else the standard body, and the source preset is linked via
avatar_preset_id. A null outfit row is therefore structurally impossible at write time,
independent of frontend state or process cache -- which is why the one-off backfill
command was removed: the guarantee now lives in the write path itself.

READ-SIDE OBJECTID COERCION (two fields, both required under django_mongodb_backend):
  * items -> ObjectIdListField (list of pks coerced to strings on read).
  * avatar_preset -> ObjectIdRelatedField (single pk coerced to a string on read). This
    one only matters when the FK is NON-NULL, i.e. exactly when the write-time auto-fill
    adopted and linked the owner's default preset. A null FK is short-circuited by
    Serializer.to_representation's None-guard, so the preset-less test fixture never
    enters this path -- which is why the green suite passed while a live save by a
    user who OWNS presets 500'd with "Object of type ObjectId is not JSON serializable".
  * The inline skin-tone column is read from the snapshot attribute (avatar_skin_tone),
    not the preset-only attribute of the same base name; a prior revision used the wrong
    attribute and 500'd every /outfits/ response once a row held a skin tone.

None of this alters the items read/write shape, so the existing item-contract tests
(ids on read, ids on write, inactive-on-create -> 400, grandfathering, empty-items edge,
cross-session persistence, RA-10173 cascade) pass unchanged -- verified against their
actual assertion bodies (none assert avatar_* emptiness or an exact key-set).

MongoDB note (the bug this file guards against): PrimaryKeyRelatedField's default
to_representation() returns the RAW pk, which under django_mongodb_backend is an
ObjectId -> json.dumps raises "Object of type ObjectId is not JSON serializable" on
any response whose value list is non-empty. The two ObjectId*Field classes override
ONLY the read side to coerce pk -> str; the write side (to_internal_value ->
queryset.get via the ObjectId-backed auto pk field) is inherited unchanged and already
accepts hex strings.
"""
from rest_framework import serializers

from catalog.models import CatalogItem

from .models import AvatarPreset, Outfit


class ObjectIdListField(serializers.PrimaryKeyRelatedField):
    """PrimaryKeyRelatedField that serializes each related pk as a STRING.

    Fixes the ObjectId-not-JSON-serializable crash on read/render (for the `items` M2M)
    without touching the (correct) write/coercion path inherited from PrimaryKeyRelatedField.
    """

    def to_representation(self, value):
        pk = super().to_representation(value)      # raw pk (ObjectId here)
        return str(pk) if pk is not None else None


class ObjectIdRelatedField(serializers.PrimaryKeyRelatedField):
    """Single-value counterpart to ObjectIdListField.

    Coerces the related pk to a STRING on read so a non-null FK -- e.g. avatar_preset,
    which the write-time auto-fill links when it adopts the owner's default preset --
    never leaks a raw ObjectId into json.dumps under django_mongodb_backend. A null FK
    is short-circuited by Serializer.to_representation's None-guard and never reaches
    this method, so the preset-less test fixture is unaffected and stays green.
    """

    def to_representation(self, value):
        pk = super().to_representation(value)      # raw pk (ObjectId here)
        return str(pk) if pk is not None else None


# Lower-case model choice values -> the capitalized strings the React avatar expects,
# and back again on write. Kept here so the wire format matches the frontend's
# DEFAULT_AVATAR / capitalizeChoice convention exactly.
_AVATAR_CHOICE_KEYS = ('gender', 'undertone', 'shoulder', 'waist', 'hip', 'thigh')

# The 11 inline snapshot columns (everything except the optional avatar_preset FK).
_AVATAR_COLUMNS = (
    'avatar_gender', 'avatar_height', 'avatar_weight', 'avatar_skin_tone',
    'avatar_undertone', 'avatar_shoulder', 'avatar_waist', 'avatar_hip',
    'avatar_thigh', 'avatar_cup_size', 'avatar_view',
)

# Mirrors the frontend DEFAULT_AVATAR / the standard "FitFusion Standard" preset, so a
# row with no owner preset still renders a complete, non-null body (FR-5.6).
STANDARD = {
    'avatar_gender': 'female',
    'avatar_height': 165,
    'avatar_weight': 58,
    'avatar_skin_tone': '#d9aa82',
    'avatar_undertone': 'neutral',
    'avatar_shoulder': 'average',
    'avatar_waist': 'average',
    'avatar_hip': 'average',
    'avatar_thigh': 'average',
    'avatar_cup_size': 'B',
    'avatar_view': 'front',
}


def _cap(v):
    s = str(v or '').strip()
    return (s[:1].upper() + s[1:]) if s else ''


def _low(v):
    return str(v or '').strip().lower()


def _default_avatar_source(user):
    """Resolve the body to adopt when a write captured none: the owner's default
    AvatarPreset, else their most-recent preset, else the standard body. Returns
    (columns_dict, preset_or_None). A preset carries no view, so avatar_view falls
    back to the standard 'front'. Values are copied as-is (both models store the
    same lower-cased choice tokens / hex skin tone / int cm-kg), so no conversion.
    """
    preset = (
        AvatarPreset.objects.filter(user=user, is_default=True).first()
        or AvatarPreset.objects.filter(user=user).order_by('-created_at').first()
    )
    if preset is None:
        return dict(STANDARD), None
    cols = {
        'avatar_gender': preset.gender or STANDARD['avatar_gender'],
        'avatar_height': preset.height if preset.height is not None else STANDARD['avatar_height'],
        'avatar_weight': preset.weight if preset.weight is not None else STANDARD['avatar_weight'],
        'avatar_skin_tone': preset.skin_tone or STANDARD['avatar_skin_tone'],
        'avatar_undertone': preset.undertone or STANDARD['avatar_undertone'],
        'avatar_shoulder': preset.shoulder or STANDARD['avatar_shoulder'],
        'avatar_waist': preset.waist or STANDARD['avatar_waist'],
        'avatar_hip': preset.hip or STANDARD['avatar_hip'],
        'avatar_thigh': preset.thigh or STANDARD['avatar_thigh'],
        'avatar_cup_size': preset.cup_size or STANDARD['avatar_cup_size'],
        'avatar_view': STANDARD['avatar_view'],
    }
    return cols, preset


class OutfitSerializer(serializers.ModelSerializer):
    # ObjectId-safe id (mirrors the KAN-58 preset serializer; avoids int(ObjectId) crash)
    id = serializers.CharField(read_only=True)
    user = serializers.CharField(read_only=True, source='user_id')

    # Writable M2M as a list of CatalogItem PKs, READ as strings (see ObjectIdListField).
    items = ObjectIdListField(
        many=True,
        queryset=CatalogItem.objects.all(),   # all statuses so grandfathering + existence work
        required=False,
        allow_empty=True,
    )

    # --- ADDITIVE FR-5.4 / FR-5.6 fields -------------------------------------------
    occasion = serializers.CharField(max_length=32, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    # Nullable traceability link (SRS SAVED_OUTFITS.avatar_preset_id). Optional on
    # purpose: a look may be saved on a live, never-saved avatar, in which case only
    # the inline snapshot below is set. Null here is correct-by-spec, not a bug.
    # READ via ObjectIdRelatedField so a NON-null link (the adopt-a-preset branch) never
    # leaks a raw ObjectId into json.dumps (see module docstring / the live 500 this fixes).
    avatar_preset = ObjectIdRelatedField(
        queryset=AvatarPreset.objects.all(), required=False, allow_null=True,
    )
    # Top-level mirror of the saved angle so list/editor readers (raw.avatar_view)
    # work without depending on the nested object. Writable via the nested flatten.
    avatar_view = serializers.CharField(max_length=8, required=False, allow_blank=True)
    # Nested, READ-ONLY reconstruction of the inline snapshot columns.
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Outfit
        fields = [
            'id', 'user', 'name', 'items',
            'occasion', 'description', 'avatar_preset', 'avatar_view', 'avatar',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['user', 'created_at', 'updated_at', 'avatar']

    # ---- read: rebuild the camelCase avatar object the canvas consumes -------------
    # Every access below MUST be an obj.avatar_* snapshot column (the Outfit model has
    # no bare skin-tone / choice attributes; those live only on AvatarPreset).
    def get_avatar(self, obj):
        out = {}
        if obj.avatar_gender:
            out['gender'] = _cap(obj.avatar_gender)
        if obj.avatar_height is not None:
            out['height'] = obj.avatar_height
        if obj.avatar_weight is not None:
            out['weight'] = obj.avatar_weight
        if obj.avatar_skin_tone:
            out['skinTone'] = obj.avatar_skin_tone
        if obj.avatar_undertone:
            out['undertone'] = _cap(obj.avatar_undertone)
        if obj.avatar_shoulder:
            out['shoulder'] = _cap(obj.avatar_shoulder)
        if obj.avatar_waist:
            out['waist'] = _cap(obj.avatar_waist)
        if obj.avatar_hip:
            out['hip'] = _cap(obj.avatar_hip)
        if obj.avatar_thigh:
            out['thigh'] = _cap(obj.avatar_thigh)
        if obj.avatar_cup_size:
            out['cupSize'] = obj.avatar_cup_size
        if obj.avatar_view:
            out['view'] = obj.avatar_view
        # Empty dict -> frontend `raw.avatar && typeof==='object'` spreads nothing over
        # DEFAULT_AVATAR, so any still-legacy row (no snapshot) falls back correctly.
        return out or None

    # ---- write: accept a nested `avatar` object, flatten into the snapshot columns --
    def to_internal_value(self, data):
        # Copy so we don't mutate the caller's dict / QueryDict.
        try:
            data = dict(data)
        except (TypeError, ValueError):
            pass
        avatar = data.pop('avatar', None) if hasattr(data, 'pop') else None
        validated = super().to_internal_value(data)
        if avatar is not None:
            validated.update(self._flatten_avatar(avatar))
        return validated

    @staticmethod
    def _flatten_avatar(avatar):
        if not isinstance(avatar, dict):
            return {}
        out = {}
        for key in _AVATAR_CHOICE_KEYS:           # gender/undertone/shoulder/waist/hip/thigh
            if key in avatar:
                out[f'avatar_{key}'] = _low(avatar[key])
        if 'cup_size' in avatar or 'cupSize' in avatar:
            cv = avatar.get('cup_size', avatar.get('cupSize'))
            out['avatar_cup_size'] = (str(cv).strip().upper()[:1] if cv else '')
        if 'skin_tone' in avatar or 'skinTone' in avatar:
            out['avatar_skin_tone'] = str(avatar.get('skin_tone', avatar.get('skinTone')) or '')[:32]
        if 'height' in avatar:
            try:
                out['avatar_height'] = int(round(float(avatar['height'])))
            except (TypeError, ValueError):
                pass
        if 'weight' in avatar:
            try:
                out['avatar_weight'] = int(round(float(avatar['weight'])))
            except (TypeError, ValueError):
                pass
        if 'view' in avatar or 'avatarView' in avatar:
            v = _low(avatar.get('view', avatar.get('avatarView')))
            out['avatar_view'] = v if v in ('front', 'rear') else 'front'
        return out

    # ---- write-time auto-fill: a null row cannot survive a write (no backfill) -----
    def _ensure_avatar(self, instance, user):
        """All-or-nothing sentinel on avatar_gender. Non-empty => a real body was
        captured; preserve it exactly (no overwrite, no re-link). Empty => nothing was
        captured, so adopt the owner's default preset (else the standard body) and link
        the source preset. Returns True if the instance was mutated (caller re-saves).
        """
        if (instance.avatar_gender or '').strip():
            return False
        cols, preset = _default_avatar_source(user)
        for key, value in cols.items():
            setattr(instance, key, value)
        if preset is not None and instance.avatar_preset_id is None:
            instance.avatar_preset = preset
        return True

    def create(self, validated_data):
        user = validated_data.get('user')
        instance = super().create(validated_data)
        if user is not None and self._ensure_avatar(instance, user):
            instance.save()   # concrete columns only; the items M2M is untouched
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        user = validated_data.get('user', instance.user)
        # Heals a legacy empty row on ANY edit (e.g. a name-only patch), and is a no-op
        # when the client sent a real body (gender non-empty -> _ensure_avatar returns False).
        if user is not None and self._ensure_avatar(instance, user):
            instance.save()
        return instance

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