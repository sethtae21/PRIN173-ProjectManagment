from rest_framework import serializers
from django.contrib.auth import get_user_model

from .auth_serializers import validate_password_strength

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for reading/updating the authenticated user's profile."""
    
    # ⭐ CRITICAL FIX: MongoDB ObjectId PK must serialize as a STRING, not int.
    # Without this, DRF auto-maps the PK to IntegerField and crashes with:
    # TypeError: int() argument must be ... not 'ObjectId'
    id = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'full_name', 'role', 'store_name',
            'mobile', 'street', 'barangay', 'city', 'province', 'postal_code',
            'skin_tone', 'height', 'weight', 'body_proportions',
            'is_active', 'date_joined',
        )
        read_only_fields = ('email', 'role', 'is_active', 'date_joined')


class PasswordChangeSerializer(serializers.Serializer):
    """FR-1.3: change password with current-password verification."""
    old_password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    new_password = serializers.CharField(required=True, write_only=True, min_length=8, style={'input_type': 'password'})
    new_password_confirm = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    def validate_new_password(self, value):
        validate_password_strength(value)
        return value

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})
        return data

    def save(self, **kwargs):
        user = self.context['request'].user
        if not user.check_password(self.validated_data['old_password']):
            raise serializers.ValidationError({'old_password': 'Current password is incorrect.'})
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user