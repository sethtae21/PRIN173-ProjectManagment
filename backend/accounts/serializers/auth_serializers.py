from rest_framework import serializers
from django.contrib.auth import authenticate
from django.core.validators import validate_email as django_validate_email
from django.core.exceptions import ValidationError as DjangoValidationError

from ..models import User


# ==========================================
# Standalone validation helpers (FR-1.5)
# ==========================================
def validate_password_strength(password: str) -> str:
    """Password policy: 8+ chars, 1 upper, 1 lower, 1 number, 1 special."""
    if len(password) < 8:
        raise serializers.ValidationError("Password must be at least 8 characters long.")
    if not any(c.isupper() for c in password):
        raise serializers.ValidationError("Password must contain at least one uppercase letter.")
    if not any(c.islower() for c in password):
        raise serializers.ValidationError("Password must contain at least one lowercase letter.")
    if not any(c.isdigit() for c in password):
        raise serializers.ValidationError("Password must contain at least one number.")
    if not any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in password):
        raise serializers.ValidationError("Password must contain at least one special character.")
    return password


def validate_email_format(value: str) -> str:
    """Basic email format check."""
    try:
        django_validate_email(value)
    except DjangoValidationError:
        raise serializers.ValidationError("Enter a valid email address.")
    return value


# ==========================================
# Registration (FR-1.1 / FR-1.5)
# ==========================================
class RegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration (shopper or seller)."""
    id = serializers.CharField(read_only=True)
    email = serializers.EmailField(required=True)
    full_name = serializers.CharField(required=True, max_length=255)
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password_confirm = serializers.CharField(
        write_only=True, required=True, allow_blank=False,
        style={'input_type': 'password'}
    )
    role = serializers.ChoiceField(choices=['shopper', 'seller'], default='shopper')
    store_name = serializers.CharField(required=False, allow_blank=True)

    # Contact & address fields
    mobile = serializers.CharField(required=False, allow_blank=True)
    street = serializers.CharField(required=False, allow_blank=True)
    barangay = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    province = serializers.CharField(required=False, allow_blank=True)
    postal_code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'full_name', 'password', 'password_confirm',
            'role', 'store_name', 'mobile', 'street', 'barangay',
            'city', 'province', 'postal_code',
        )

    def validate_email(self, value):
        validate_email_format(value)
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_full_name(self, value):
        value = value.strip()
        if len(value.split()) < 2:
            raise serializers.ValidationError('Please enter at least your first name and surname.')
        return value

    def validate(self, data):
        confirm = data.get('password_confirm')
        if confirm and confirm != data.get('password'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})

        validate_password_strength(data['password'])

        if data.get('role') == 'seller' and not data.get('store_name'):
            raise serializers.ValidationError({'store_name': 'Store name is required for sellers.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        role = validated_data.pop('role', 'shopper')

        if role == 'seller':
            user = User.objects.create_seller(
                email=validated_data['email'],
                full_name=validated_data['full_name'],
                store_name=validated_data.get('store_name', ''),
                password=validated_data['password'],
                role=role,
                mobile=validated_data.get('mobile', ''),
                street=validated_data.get('street', ''),
                barangay=validated_data.get('barangay', ''),
                city=validated_data.get('city', ''),
                province=validated_data.get('province', ''),
                postal_code=validated_data.get('postal_code', ''),
            )
        else:
            user = User.objects.create_user(
                email=validated_data['email'],
                full_name=validated_data['full_name'],
                password=validated_data['password'],
                role=role,
                mobile=validated_data.get('mobile', ''),
                street=validated_data.get('street', ''),
                barangay=validated_data.get('barangay', ''),
                city=validated_data.get('city', ''),
                province=validated_data.get('province', ''),
                postal_code=validated_data.get('postal_code', ''),
            )
        return user


# Backward-compatible alias
UserRegistrationSerializer = RegistrationSerializer


# ==========================================
# Login (email + password)
# ==========================================
class LoginSerializer(serializers.Serializer):
    """Serializer for user login — accepts email (case-insensitive)."""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, data):
        email = (data.get('email') or '').strip().lower()
        password = data.get('password')

        if not email or not password:
            raise serializers.ValidationError('Email and password are required.')

        request = self.context.get('request')

        # USERNAME_FIELD is 'email', so authenticate with email=...
        auth_user = authenticate(request=request, email=email, password=password)

        if auth_user is None:
            raise serializers.ValidationError('Invalid email or password.')
        if not auth_user.is_active:
            raise serializers.ValidationError('This account has been deactivated.')

        data['user'] = auth_user
        return data