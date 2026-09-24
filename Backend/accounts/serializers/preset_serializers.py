from rest_framework import serializers

from outfits.models import AvatarPreset


class AvatarPresetSerializer(serializers.ModelSerializer):
    """
    Avatar preset serializer (FR-2.5, FR-2.7, FR-2.8–2.10).
    - id rendered as ObjectId-safe string
    - user assigned server-side only (owner-only, RBAC)
    - cup_size: female-only rule (FR-2.7), but null/blank ACCEPTED and
      normalized to '' so male updates don't crash with 400
    """
    id = serializers.CharField(read_only=True)
    user = serializers.CharField(read_only=True, source='user_id')

    # FIX: explicitly allow null/blank so switching to male can clear cup_size
    cup_size = serializers.CharField(
        max_length=5, allow_null=True, allow_blank=True, required=False
    )

    class Meta:
        model = AvatarPreset
        fields = '__all__'
        read_only_fields = ['user']

    def validate_height(self, value):
        if value <= 0:
            raise serializers.ValidationError('Height must be a positive number.')
        return value

    def validate_weight(self, value):
        if value <= 0:
            raise serializers.ValidationError('Weight must be a positive number.')
        return value

    def validate_cup_size(self, value):
        # Normalize None -> '' and enforce A–D when a value is provided
        if value in (None, ''):
            return ''
        if value not in ('A', 'B', 'C', 'D'):
            raise serializers.ValidationError('Cup size must be one of: A, B, C, D.')
        return value

    def validate(self, attrs):
        # Support partial updates (PATCH): fall back to existing instance values
        gender = attrs.get('gender', getattr(self.instance, 'gender', None))
        cup_size = attrs.get('cup_size', getattr(self.instance, 'cup_size', None))

        if gender != 'female' and cup_size:
            raise serializers.ValidationError(
                {'cup_size': 'Cup size applies to female avatars only (FR-2.7).'}
            )
        return attrs