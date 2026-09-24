from rest_framework import serializers

from ..models import User
from .auth_serializers import validate_password_strength


class UserSerializer(serializers.ModelSerializer):
    """Safe user profile representation — never exposes the password hash."""
    id = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'role', 'store_name',
                  'skin_tone', 'height', 'weight', 'body_proportions',
                  'date_joined', 'is_active')
        read_only_fields = ('email', 'username', 'role', 'date_joined', 'is_active')


class PasswordChangeSerializer(serializers.Serializer):
    """FR-1.3: password change requires current password + FR-1.5 strength policy."""
    current_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    new_password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    new_password_confirm = serializers.CharField(write_only=True, required=False, allow_blank=True,
                                                 style={'input_type': 'password'})

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate(self, data):
        new = data.get('new_password')
        confirm = data.get('new_password_confirm')
        if confirm and confirm != new:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})
        user = self.context['request'].user
        if user.check_password(new):
            raise serializers.ValidationError({'new_password': 'New password must differ from the current one.'})
        validate_password_strength(new)
        return data

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user