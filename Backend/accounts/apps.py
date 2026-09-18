from django.apps import AppConfig
from django.db.models.signals import post_migrate


class AccountsConfig(AppConfig):
    # MongoDB-native ObjectId primary keys (matches settings.DEFAULT_AUTO_FIELD)
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'accounts'

    def ready(self):
        # Disconnect the create_permissions signal to avoid the
        # "unhashable ObjectId" crash during migrate on MongoDB.
        # Safe: FitFusion uses custom role-based RBAC, not Django permissions.
        post_migrate.disconnect(
            dispatch_uid="django.contrib.auth.management.create_permissions"
        )