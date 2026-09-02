from django.apps import AppConfig
from django.db.models.signals import post_migrate

class AccountsConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'accounts'

    def ready(self):
        # Disconnect the buggy create_permissions signal using its official dispatch_uid
        # This prevents the "unhashable" crash during migrate on MongoDB
        post_migrate.disconnect(
            dispatch_uid="django.contrib.auth.management.create_permissions"
        )