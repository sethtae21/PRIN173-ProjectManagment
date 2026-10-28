from rest_framework import serializers
from outfits.models import AvatarPreset


class AvatarPresetSerializer(serializers.ModelSerializer):
    """
    Avatar preset serializer (FR-2.5, FR-2.7, FR-2.8–2.10).
    - id rendered as ObjectId-safe string
    - user assigned server-side only (owner-only, RBAC)
    - cup_size: female-only rule (FR-2.7), but null/blank ACCEPTED and normalized
    - height/weight ranges enforced per checklist confirmation (120-230cm, 30-200)

    KAN-FIX (POST /presets/ 400 "is not a valid choice"):
    MongoDB stores every choice LOWERCASE ('male', 'neutral', 'broad', 'slim',
    'average', 'thick'), but the React UI sends display case ("Male", "Neutral",
    "Broad", ...). Choice validation happens INSIDE each field's run_validation,
    so a validate_<field>() hook is too late — the payload must be normalized in
    to_internal_value(), BEFORE field validation. This also maps the frontend's
    camelCase aliases (skinTone, cupSize, ...) onto the snake_case model fields
    so skin tone and cup size are actually persisted instead of silently dropped.
    """

    id = serializers.CharField(read_only=True)
    user = serializers.CharField(read_only=True, source='user_id')

    cup_size = serializers.CharField(max_length=5, allow_null=True, allow_blank=True, required=False)

    # Raw payload keys the React app may send -> canonical model field names.
    FIELD_ALIASES = {
        'skinTone': 'skin_tone',
        'skinColor': 'skin_tone',
        'cupSize': 'cup_size',
        'shoulderWidth': 'shoulder',
        'waistSize': 'waist',
        'hipSize': 'hip',
        'thighSize': 'thigh',
    }

    # Choices are stored lowercase in MongoDB (outfits.models.AvatarPreset).
    LOWERCASED_FIELDS = ('gender', 'undertone', 'shoulder', 'waist', 'hip', 'thigh')

    class Meta:
        model = AvatarPreset
        fields = '__all__'
        read_only_fields = ['user']

    def to_internal_value(self, data):
        """Normalize key aliases + value casing BEFORE choice validation runs."""
        if isinstance(data, dict):
            data = dict(data)

            # camelCase alias -> snake_case model field
            for alias, canonical in self.FIELD_ALIASES.items():
                if alias in data and canonical not in data:
                    data[canonical] = data.pop(alias)

            # "Male" -> "male", "Neutral" -> "neutral", "Broad" -> "broad", ...
            for field in self.LOWERCASED_FIELDS:
                value = data.get(field)
                if isinstance(value, str):
                    data[field] = value.strip().lower()

            # Cup letters are stored uppercase ('A'-'D'); blank stays blank.
            cup = data.get('cup_size')
            if isinstance(cup, str) and cup.strip():
                data['cup_size'] = cup.strip().upper()

        return super().to_internal_value(data)

    def validate_height(self, value):
        if not (120 <= value <= 230):
            raise serializers.ValidationError('Height must be between 120 and 230 cm.')
        return value

    def validate_weight(self, value):
        if not (30 <= value <= 200):
            raise serializers.ValidationError('Weight must be between 30 and 200 cm.')
        return value

    def validate_cup_size(self, value):
        if value in (None, ''):
            return ''
        if value not in ('A', 'B', 'C', 'D'):
            raise serializers.ValidationError('Cup size must be one of: A, B, C, D.')
        return value

    def validate(self, attrs):
        gender = attrs.get('gender', getattr(self.instance, 'gender', None))
        cup_size = attrs.get('cup_size', getattr(self.instance, 'cup_size', None))

        if gender != 'female' and cup_size:
            raise serializers.ValidationError({'cup_size': 'Cup size applies to female avatars only (FR-2.7).'})
        return attrs