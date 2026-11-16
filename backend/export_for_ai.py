import argparse
import json
import os
import re
import sys

from pymongo import MongoClient

# ----------------------------------------------------------------------------
# CONFIG
# ----------------------------------------------------------------------------
OUT = "mongodb_export.json"            # FULL export (every document per collection)
SAMPLE_OUT = "mongodb_sample.json"     # COMPACT: exactly ONE document per collection
PER_COLLECTION_DIR = "mongodb_export"  # one JSON file per collection (full data)
LIMIT = None          # None = every document in the FULL export; set e.g. 50 to cap
REDACT_PII = True     # keep True when sharing with any AI; False = raw (not recommended)

# PII / secrets stripped before anything leaves your machine (when REDACT_PII=True)
REDACT_KEYS = {
    "password", "password_hash", "hashed_password", "last_login",
    "email", "full_name", "mobile", "contact_number",
    "recipient_name", "recipient_email", "shipping_address",
    "address", "street", "barangay", "city", "province", "postal_code",
}

HERE = os.path.dirname(os.path.abspath(__file__))


def mask(uri):
    """Hide the password when printing the resolved connection."""
    return re.sub(r"(://[^:]+:)[^@]+(@)", r"\1****\2", uri)


def discover_settings_module():
    """Read DJANGO_SETTINGS_MODULE straight from manage.py (robust)."""
    manage = os.path.join(HERE, "manage.py")
    if not os.path.exists(manage):
        return None
    with open(manage, encoding="utf-8") as f:
        text = f.read()
    m = re.search(r"DJANGO_SETTINGS_MODULE['\"]?\s*,\s*['\"]([^'\"]+)", text)
    return m.group(1) if m else None


def django_connection():
    """Return (uri, db_name) exactly as the running Django app connects."""
    mod = os.environ.get("DJANGO_SETTINGS_MODULE") or discover_settings_module()
    if not mod:
        return None, None
    sys.path.insert(0, HERE)
    sys.path.insert(0, os.path.dirname(HERE))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", mod)
    try:
        import django
        django.setup()
    except Exception as exc:
        print("django.setup() failed:", exc)
        return None, None

    from django.conf import settings

    # 1) plain URI-style settings
    for attr in ("MONGODB_URI", "MONGO_URI", "MONGODB_URL", "MONGO_URL", "MONGO_CONNECTION"):
        val = getattr(settings, attr, None)
        if val:
            dbn = (
                getattr(settings, "MONGODB_DB", None)
                or getattr(settings, "MONGO_DB", None)
                or getattr(settings, "MONGODB_NAME", None)
            )
            return val, dbn

    # 2) djongo / django-mongodb-backend DATABASES
    db = (getattr(settings, "DATABASES", {}) or {}).get("default", {}) or {}
    client = db.get("CLIENT") or {}
    host = client.get("host") or db.get("HOST") or ""
    name = client.get("name") or db.get("NAME") or ""
    if host:
        if str(host).startswith("mongodb"):
            return host, name or None
        port = client.get("port") or db.get("PORT") or 27017
        user = client.get("username") or client.get("user") or db.get("USER") or ""
        pw = client.get("password") or client.get("pass") or db.get("PASSWORD") or ""
        uri = f"mongodb://{user}:{pw}@{host}:{port}" if user else f"mongodb://{host}:{port}"
        return uri, name or None

    return None, None


def resolve_connection():
    """Env override first, then auto-detect from Django settings."""
    uri = os.environ.get("MONGODB_URI")
    dbn = os.environ.get("MONGODB_DB")
    if uri:
        return uri, dbn
    u, d = django_connection()
    if u:
        return u, (d or dbn)
    return None, None


def clean(value):
    if isinstance(value, dict):
        return {
            k: ("[REDACTED]" if (REDACT_PII and k in REDACT_KEYS) else clean(v))
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [clean(v) for v in value]
    return value  # ObjectId / datetime / Decimal handled by default=str


def main():
    parser = argparse.ArgumentParser(
        description="Export MongoDB collections to JSON files. "
                    "Use --print to dump the sample JSON to the terminal for copy-pasting."
    )
    parser.add_argument(
        "-p", "--print",
        dest="print_sample",
        action="store_true",
        help="After exporting, print the sample JSON to stdout so you can copy-paste it.",
    )
    args = parser.parse_args()

    uri, db_name = resolve_connection()
    if not uri:
        print(
            "Could not detect a MongoDB connection.\n"
            "Either set env vars:  $env:MONGODB_URI='mongodb+srv://...'; $env:MONGODB_DB='fitfusion'\n"
            "or open backend/settings.py and copy the mongodb URI / DATABASES CLIENT host into them."
        )
        sys.exit(1)

    print("Connecting to:", mask(uri))
    client = MongoClient(uri, serverSelectionTimeoutMS=8000)

    if db_name:
        db = client[db_name]
    else:
        try:
            db = client.get_default_database()
        except Exception:
            candidates = [
                n for n in client.list_database_names()
                if n not in ("admin", "local", "config")
            ]
            if not candidates:
                print("No user databases found on this server.")
                sys.exit(1)
            db = client[candidates[0]]
    print("Database:", db.name)

    os.makedirs(PER_COLLECTION_DIR, exist_ok=True)

    export = {}   # full data per collection
    sample = {}   # ONE document per collection (the paste-friendly file)
    for coll in sorted(db.list_collection_names()):
        if coll.startswith("system.") or coll.endswith((".files", ".chunks")):
            continue  # skip GridFS images + system collections
        cursor = db[coll].find()
        if LIMIT:
            cursor = cursor.limit(LIMIT)
        docs = [clean(d) for d in cursor]
        export[coll] = docs
        sample[coll] = docs[:1]   # exactly one doc; [] when the collection is empty

        with open(os.path.join(PER_COLLECTION_DIR, f"{coll}.json"), "w", encoding="utf-8") as f:
            json.dump(docs, f, default=str, indent=2, ensure_ascii=False)

        print(f"{coll}: {len(docs)} documents (sample: {len(sample[coll])})")

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(export, f, default=str, indent=2, ensure_ascii=False)

    sample_text = json.dumps(sample, default=str, indent=2, ensure_ascii=False)
    with open(SAMPLE_OUT, "w", encoding="utf-8") as f:
        f.write(sample_text)

    print(f"\nFull export:      {OUT}")
    print(f"One-doc sample:   {SAMPLE_OUT}")
    print(f"Per-collection:   {PER_COLLECTION_DIR}/<collection>.json")
    print("Safe to paste into an AI (PII redacted)." if REDACT_PII
          else "WARNING: raw PII included.")

    # --- NEW: dump the sample JSON to the terminal so you can copy-paste ---
    if args.print_sample:
        print("\n" + "=" * 70)
        print("=== SAMPLE JSON (one document per collection) — COPY FROM BELOW ===")
        print("=" * 70)
        print(sample_text)
        print("=" * 70)


if __name__ == "__main__":
    main()