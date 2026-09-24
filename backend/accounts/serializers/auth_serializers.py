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
    """Serializer for user registration."""
    id = serializers.CharField(read_only=True)
    email = serializers.EmailField(required=True)
    username = serializers.CharField(required=False, allow_blank=True, max_length=150)
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    # OPTIONAL: HTML test site might only send one password field
    password_confirm = serializers.CharField(
        write_only=True, required=False, allow_blank=True,
        style={'input_type': 'password'}
    )
    store_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'password', 'password_confirm', 'role', 'store_name')

    def validate_email(self, value):
        validate_email_format(value)
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_username(self, value):
        if value and User.objects.filter(username=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_role(self, value):
        if value not in ('user', 'seller'):
            raise serializers.ValidationError("Role must be 'user' or 'seller'.")
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
        store_name = validated_data.pop('store_name', None) or ''
        email = validated_data['email']

        username = validated_data.get('username') or email.split('@')[0]
        base, suffix = username, 1
        while User.objects.filter(username=username).exists():
            username = f"{base}{suffix}"
            suffix += 1

        return User.objects.create_user(
            email=email,
            username=username,
            password=validated_data['password'],
            role=validated_data.get('role', 'user'),
            store_name=store_name,
        )


# Backward-compatible alias
UserRegistrationSerializer = RegistrationSerializer


# ==========================================
# Login (accepts email OR username)
# ==========================================
class LoginSerializer(serializers.Serializer):
    """Serializer for user login — accepts email OR username, any case."""
    email = serializers.EmailField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, data):
        password = data.get('password')
        identifier = (data.get('email') or data.get('username') or '').strip()

        if not identifier or not password:
            raise serializers.ValidationError('Email/username and password are required.')

        request = self.context.get('request')
        # Case-insensitive lookup on BOTH email and username
        user = (User.objects.filter(email__iexact=identifier).first()
                or User.objects.filter(username__iexact=identifier).first())

        if user:
            auth_user = authenticate(request=request, username=user.username, password=password)
        else:
            auth_user = authenticate(request=request, username=identifier, password=password)

        if auth_user is None:
            raise serializers.ValidationError('Invalid email/username or password.')
        if not auth_user.is_active:
            raise serializers.ValidationError('This account has been deactivated.')

        data['user'] = auth_user
        return data