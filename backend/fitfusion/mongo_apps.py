"""
MongoDB-compatible AppConfig overrides for Django built-in apps.

Django's built-in apps (admin, auth, contenttypes) default to integer 
AutoField/BigAutoField primary keys, which MongoDB does not support 
(system check mongodb.fields.auto.E001). 

These subclasses force ObjectIdAutoField so `migrate` works against MongoDB Atlas (SRS §5.2).

NOTE: SimpleJWT's token_blacklist app is NOT overridden here because it 
causes Django admin autodiscover crashes. Token blacklisting is handled 
via raw PyMongo in views.py (Option B from Code Review).
"""
from django.contrib.admin.apps import AdminConfig
from django.contrib.auth.apps import AuthConfig
from django.contrib.contenttypes.apps import ContentTypesConfig

class MongoAdminConfig(AdminConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'

class MongoAuthConfig(AuthConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'

class MongoContentTypesConfig(ContentTypesConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'