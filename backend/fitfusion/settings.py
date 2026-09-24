import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

# FIX: Corrected typo from `file` to `__file__`
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-fitfusion-dev-secret-key-2026')

# CRITICAL FIX: DEBUG defaults to False in production to prevent sensitive error exposure
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = ['*'] # Note: Restrict to specific domains in production deployment

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

# ==========================================
# Database: MongoDB Atlas (SRS §5.2)
# ==========================================
MONGODB_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/fitfusion')
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
# CORS Configuration
# CRITICAL FIX: Restricted CORS origins for production security.
# ==========================================
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',  # Vite dev server
    'http://localhost:3000',  # React dev server
    'https://your-production-domain.com',  # TODO: Add actual production domain before deploy
]

# Allow all origins only in local development
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

MAX_BATCH_ITEMS = 10
MAX_WORKERS = 2
BATCH_PROCESSING_TIMEOUT_MINUTES = 10

SPECTACULAR_SETTINGS = {
    'TITLE': 'FitFusion AI API',
    'DESCRIPTION': 'Seller catalog upload and management API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}