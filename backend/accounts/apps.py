import threading
from django.apps import AppConfig
from django.db.models.signals import post_migrate

class AccountsConfig(AppConfig):
    # MongoDB-native ObjectId primary keys (matches settings.DEFAULT_AUTO_FIELD)
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'accounts'

    def ready(self):
        # 1. Disconnect the buggy create_permissions signal
        post_migrate.disconnect(
            dispatch_uid="django.contrib.auth.management.create_permissions"
        )
        
        # 2. Run the startup sweep in a background thread so it doesn't block server boot
        def run_sweep():
            try:
                from catalog.views import mark_stale_batches_as_failed
                mark_stale_batches_as_failed()
            except Exception as e:
                print(f"Startup sweep skipped: {e}")

        # daemon=True ensures the thread dies when the server stops
        threading.Thread(target=run_sweep, daemon=True).start()