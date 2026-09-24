from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from datetime import datetime


def generate_jwt_tokens(user):
    """Generate JWT access and refresh tokens for user"""
    access_token = AccessToken.for_user(user)
    refresh_token = RefreshToken.for_user(user)
    
    return {
        'access': str(access_token),
        'refresh': str(refresh_token),
        'expires_at': access_token.payload['exp']
    }


def decode_jwt_token(token):
    """Decode JWT token and return payload"""
    try:
        decoded_token = AccessToken(token)
        return decoded_token.payload
    except Exception as e:
        return None


def get_user_from_token(token):
    """Get user object from JWT token"""
    try:
        decoded = decode_jwt_token(token)
        if decoded:
            from accounts.models import User
            user = User.objects.get(_id=decoded['user_id'])
            return user
    except Exception:
        pass
    return None