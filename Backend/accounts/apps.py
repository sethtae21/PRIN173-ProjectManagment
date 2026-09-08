from django.apps import AppConfig
from django.db.models.signals import post_migrate

class AccountsConfig(AppConfig):
    # FIXED: Use Django's standard BigAutoField instead of MongoDB's ObjectIdAutoField
    # This ensures SQLite compatibility and proper integer-based primary keys
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        # Disconnect the buggy create_permissions signal using its official dispatch_uid
        # This prevents the "unhashable" crash during migrate on MongoDB
        # (Safe to keep for SQLite as well — it simply won't trigger any issue)
        post_migrate.disconnect(
            dispatch_uid="django.contrib.auth.management.create_permissions"
        )