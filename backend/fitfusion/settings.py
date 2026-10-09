import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

load_dotenv()

# FIX: Corrected typo from `file` to `__file__`
BASE_DIR = Path(__file__).resolve().parent.parent

# DEBUG defaults to False; local development must opt in explicitly.
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '')
if SECRET_KEY in ('', 'change-me-in-real-env'):
    if DEBUG:
        SECRET_KEY = 'fitfusion-local-development-only-key'
    else:
        raise ImproperlyConfigured('Set DJANGO_SECRET_KEY to a unique secret outside DEBUG mode.')

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get(
        'DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver'
    ).split(',')
    if host.strip()
]

# ==========================================
# MongoDB Compatibility Layer
# These custom AppConfig classes force ObjectId PKs on Django built-in apps
# to prevent MongoDB AutoField errors. See: fitfusion/mongo_apps.py
#
# NOTE: SimpleJWT's 'token_blacklist' app is intentionally OMITTED here.
# Installing it causes Django admin autodiscover crashes with MongoDB.
# Instead, we use raw PyMongo in views.py to handle blacklisting (Option B).
# ==========================================
INSTALLED_APPS = [
    # MongoDB-compatible configs for built-in apps (ObjectId PKs)
    'fitfusion.mongo_apps.MongoAdminConfig',
    'fitfusion.mongo_apps.MongoAuthConfig',
    'fitfusion.mongo_apps.MongoContentTypesConfig',
    
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_spectacular',

    # Local apps
    'accounts',
    'catalog',
    'outfits',
    'commerce',
    'recommendations',
    'ratings',  # KAN-101: In-app rating endpoints
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'fitfusion.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'fitfusion.wsgi.application'

# KAN-93: the localhost default is DEV-ONLY. A missing .env MONGODB_URI makes the
# app silently talk to localhost; db_ping and /health REFUSE to report a green
# ping against local (see accounts/health_utils.resolve_target). Live/demo must
# set MONGODB_URI to the +srv URI from .env.example (with the hardening params).
MONGODB_URI = os.environ.get('MONGODB_URI', '')
if not MONGODB_URI:
    if DEBUG:
        MONGODB_URI = 'mongodb://localhost:27017/fitfusion'
    else:
        raise ImproperlyConfigured('Set MONGODB_URI to the Atlas connection URI outside DEBUG mode.')
if not DEBUG and not MONGODB_URI.lower().startswith('mongodb+srv://'):
    raise ImproperlyConfigured('Staging must use an Atlas mongodb+srv URI so TLS is enabled.')
DATABASES = {
    'default': {
        'ENGINE': 'django_mongodb_backend',
        'HOST': MONGODB_URI,
        'NAME': 'fitfusion',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# MongoDB-native ObjectId primary keys
DEFAULT_AUTO_FIELD = 'django_mongodb_backend.fields.ObjectIdAutoField'
AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ==========================================
# Simple JWT Settings (FR-1.6, SRS §4.2, RA 10173)
# CRITICAL FIX: Restored 1-hour access token lifetime.
# HIGH PRIORITY FIX: Enabled token rotation and blacklisting.
# ==========================================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),  # Restored to 1 hour
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,                # Enabled for security
    'BLACKLIST_AFTER_ROTATION': True,             # Handled via PyMongo in views.py
    'UPDATE_LAST_LOGIN': False,
}

# ==========================================
# CORS Configuration (React Frontend Integration)
# ==========================================
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        'CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000'
    ).split(',')
    if origin.strip()
]

# Allow credentials (cookies, authorization headers) for JWT auth
CORS_ALLOW_CREDENTIALS = True

# Allow specific headers needed for file uploads and JWT
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Allow methods needed for REST API
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Allow all origins only in local development (for easier debugging)
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

SECURE_SSL_REDIRECT = os.environ.get(
    'SECURE_SSL_REDIRECT', 'False' if DEBUG else 'True'
).lower() in ('true', '1', 'yes')
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_COOKIE_AGE = int(os.environ.get('GUEST_SESSION_TTL', '3600'))
GUEST_SESSION_TTL = SESSION_COOKIE_AGE
SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '0'))
if os.environ.get('TRUST_PROXY_SSL_HEADER', 'False').lower() in ('true', '1', 'yes'):
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

MAX_BATCH_ITEMS = 10
MAX_WORKERS = 2
BATCH_PROCESSING_TIMEOUT_MINUTES = 10
REMBG_MODEL = os.environ.get('REMBG_MODEL', 'u2netp')

SPECTACULAR_SETTINGS = {
    'TITLE': 'FitFusion AI API',
    'DESCRIPTION': 'Seller catalog upload and management API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# ==========================================
# Cache Configuration (KAN-101: Guest session rating aggregates)
# Uses local memory cache; in production, swap to Redis/Memcached
# ==========================================
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'fitfusion-ratings',
    }
}