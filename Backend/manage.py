#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path

# Workaround: force TLS 1.2 for MongoDB Atlas
# (fixes the OpenSSL handshake bug on Python 3.13 / 3.14)
os.environ['OPENSSL_CONF'] = str(Path(__file__).resolve().parent / 'openssl_tls12.cnf')


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fitfusion.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    
    # Step 4: Run startup sweep before executing command
    # Mark stale batches as failed
    if 'runserver' in sys.argv or 'migrate' in sys.argv:
        try:
            from accounts.views import mark_stale_batches_as_failed
            mark_stale_batches_as_failed()
        except Exception as e:
            print(f"Warning: Could not run startup sweep: {e}")
    
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()