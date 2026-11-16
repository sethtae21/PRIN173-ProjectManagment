"""
Export MongoDB collections to JSON files (replaces mongoexport CLI).
Uses pymongo directly from the Django environment.

FIX v2:
  * Recursive serialization — handles nested ObjectIds in foreign keys,
    embedded documents, and arrays (Rating.user, UATResponse.session, etc.).
  * Explicit .env loading from the backend directory, regardless of CWD.
  * Reports the actual URI being used (with credentials masked).

Usage:
    python scripts/export_mongodb.py
"""
import json
import os
import sys
from pathlib import Path

# Explicitly load .env from the backend directory BEFORE Django settings are read.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

try:
    from dotenv import load_dotenv
    env_file = BACKEND_DIR / '.env'
    if env_file.exists():
        load_dotenv(env_file, override=True)
        print(f"  Loaded env from {env_file}")
    else:
        print(f"  ⚠ No .env found at {env_file}; using ambient environment.")
except ImportError:
    print("  ⚠ python-dotenv not installed; using ambient environment.")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fitfusion.settings')
import django
django.setup()

from django.conf import settings
from bson import ObjectId
from pymongo import MongoClient

MONGO_URI = settings.MONGODB_URI
DB_NAME = 'fitfusion'
OUTPUT_DIR = BACKEND_DIR / 'mongodb_export'

COLLECTIONS = [
    'accounts_rating',
    'accounts_fittingstudiosurvey',
    'accounts_user',
]


def serialize_value(value):
    """Recursively convert ObjectId and datetime to JSON-safe strings.

    Handles the common shapes we see in this DB:
      - top-level _id (ObjectId)
      - foreign keys like user, session, catalog_item (ObjectId)
      - embedded documents (fitting_studio_surveys, rejection_report, notes)
      - arrays of documents (outfits.items, cart items, etc.)
      - datetimes (created_at, updated_at, archived_at, etc.)
    """
    if isinstance(value, dict):
        return {str(k): serialize_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [serialize_value(item) for item in value]
    if isinstance(value, ObjectId):
        return str(value)
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode('utf-8', errors='replace')
    return value


def mask_uri(uri):
    """Hide credentials in the printed URI for safe terminal logging."""
    if '://' not in uri:
        return uri
    scheme, rest = uri.split('://', 1)
    if '@' in rest:
        creds, host = rest.split('@', 1)
        if ':' in creds:
            user, _ = creds.split(':', 1)
            return f"{scheme}://{user}:***@{host}"
        return f"{scheme}://{creds}:***@{host}"
    return uri


def export_collection(client, db_name, collection_name, output_path):
    """Export one collection to a JSON array file."""
    db = client[db_name]
    collection = db[collection_name]

    raw_docs = list(collection.find())
    docs = [serialize_value(doc) for doc in raw_docs]

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)

    print(f"  ✓ {collection_name}: {len(docs)} documents → {output_path}")
    return len(docs)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if not MONGO_URI:
        print("  ✗ MONGODB_URI is empty. Set it in .env or the environment.")
        sys.exit(1)

    print(f"\nConnecting to: {mask_uri(MONGO_URI)}")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
        info = client.server_info()
        print(f"  ✓ Connected to MongoDB {info.get('version', '?')}")
    except Exception as e:
        print(f"  ✗ Connection failed: {e}")
        sys.exit(1)

    print(f"\nExporting {len(COLLECTIONS)} collections from '{DB_NAME}' database:\n")

    totals = {}
    for collection_name in COLLECTIONS:
        output_path = OUTPUT_DIR / f'{collection_name}.json'
        try:
            totals[collection_name] = export_collection(
                client, DB_NAME, collection_name, output_path)
        except Exception as e:
            print(f"  ✗ {collection_name}: {type(e).__name__}: {e}")
            totals[collection_name] = 0

    client.close()
    print(f"\n✓ Export complete. Files saved to {OUTPUT_DIR}/")
    print(f"  Totals: {totals}")


if __name__ == '__main__':
    main()