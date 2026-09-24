import datetime
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from pymongo import MongoClient

# ==========================================
# JWT Token Generation
# ==========================================
def generate_jwt_tokens(user):
    """Generate access and refresh tokens for the given user."""
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }

# ==========================================
# Token Blacklist Helpers (MongoDB / PyMongo — Option B)
# Bypasses Django ORM to avoid SimpleJWT admin autodiscover crashes.
# ==========================================
_blacklist_col = None

def get_token_blacklist_collection():
    """Lazy-loads the MongoDB collection and creates a TTL index for auto-cleanup."""
    global _blacklist_col
    if _blacklist_col is None:
        try:
            client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
            _blacklist_col = client.get_database()['token_blacklist']
            # TTL index: auto-deletes expired tokens to save space on the free tier
            _blacklist_col.create_index('expires_at', expireAfterSeconds=0)
        except Exception:
            # Fail gracefully if DB is unreachable during import/startup
            _blacklist_col = None
    return _blacklist_col

def blacklist_refresh_token(token):
    """Adds a refresh token's JTI to the blacklist collection."""
    col = get_token_blacklist_collection()
    if col is None:
        return
    col.update_one(
        {'jti': token['jti']},
        {'$set': {'expires_at': datetime.datetime.fromtimestamp(token['exp'], tz=datetime.timezone.utc)}},
        upsert=True,
    )

def is_token_blacklisted(token):
    """Checks if a refresh token's JTI is in the blacklist collection."""
    col = get_token_blacklist_collection()
    if col is None:
        return False
    return col.find_one({'jti': token['jti']}) is not None