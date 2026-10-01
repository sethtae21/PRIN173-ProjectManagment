import datetime

from django.conf import settings
from pymongo import MongoClient
from rest_framework_simplejwt.tokens import RefreshToken


def generate_jwt_tokens(user):
    """Generate access and refresh tokens for the given user."""
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


_blacklist_col = None


def get_token_blacklist_collection():
    """Return the MongoDB token blacklist collection, initializing its TTL index."""
    global _blacklist_col
    if _blacklist_col is None:
        try:
            client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
            _blacklist_col = client.get_database()['token_blacklist']
            _blacklist_col.create_index('expires_at', expireAfterSeconds=0)
        except Exception:
            _blacklist_col = None
    return _blacklist_col


def blacklist_refresh_token(token):
    """Add a refresh token's JTI to the blacklist collection."""
    collection = get_token_blacklist_collection()
    if collection is None:
        return
    collection.update_one(
        {'jti': token['jti']},
        {
            '$set': {
                'expires_at': datetime.datetime.fromtimestamp(
                    token['exp'], tz=datetime.timezone.utc
                )
            }
        },
        upsert=True,
    )


def is_token_blacklisted(token):
    """Check whether a refresh token's JTI is in the blacklist collection."""
    collection = get_token_blacklist_collection()
    if collection is None:
        return False
    return collection.find_one({'jti': token['jti']}) is not None