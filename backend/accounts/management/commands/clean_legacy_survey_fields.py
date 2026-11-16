"""
accounts/management/commands/clean_legacy_survey_fields.py

v3 — Remove legacy fields that survived the star-only refactor:
  * fit_like_dislike    (replaced by fit_rating in accounts migration 0008)
  * vote                (removed from Rating in ratings migration 0005)
  * user_type           (extra field removed from FittingStudioSurvey in 0010)

WHY RAW MONGO: migrations 0005/0006/0008/0010 change the SCHEMA only. Legacy
keys live INSIDE stored BSON documents (embedded JSON arrays on accounts_user,
rows in accounts_fittingstudiosurvey, and vote keys on accounts_rating), which
the ORM can no longer see. This command walks the raw documents directly.

v3 CHANGES (audit fixes):
  * accounts_rating is now scanned too (v2 missed it, so rating docs kept
    their legacy `vote` keys).
  * The redundant ORM pass is gone — the raw pass covers every collection.
  * NEW opt-in flag --purge-untagged-ratings: ratings whose `source` is blank
    or not one of the four baselined surfaces cannot be attributed to any
    charter objective and violate the current source contract. They are
    LISTED in preview and DELETED only when the flag is combined with
    --apply. Nothing is ever mapped/guessed (no fabricated sources).

Usage:
    python manage.py clean_legacy_survey_fields                          # preview
    python manage.py clean_legacy_survey_fields --apply                  # strip legacy keys
    python manage.py clean_legacy_survey_fields --purge-untagged-ratings # preview purge list
    python manage.py clean_legacy_survey_fields --apply --purge-untagged-ratings
"""
from django.conf import settings
from django.core.management.base import BaseCommand
from pymongo import MongoClient

# Legacy keys stripped recursively from every scanned document.
LEGACY_FIELDS = ('fit_like_dislike', 'vote', 'user_type')

# The four baselined rating surfaces (mirror of Rating.SOURCE_CHOICES).
VALID_SOURCES = (
    'recommendation_panel',
    'fit_visualization',
    'product_page',
    'order_history',
)

# Collections that may still carry legacy keys inside stored documents.
SCANNED_COLLECTIONS = (
    'accounts_user',
    'accounts_fittingstudiosurvey',
    'accounts_rating',
)


def _strip_legacy(obj):
    """Recursively strip LEGACY_FIELDS from a dict/list structure in place.

    Returns the number of keys removed. The object is mutated directly.
    """
    removed = 0
    if isinstance(obj, dict):
        for field in LEGACY_FIELDS:
            if field in obj:
                del obj[field]
                removed += 1
        for value in obj.values():
            removed += _strip_legacy(value)
    elif isinstance(obj, list):
        for item in obj:
            removed += _strip_legacy(item)
    return removed


class Command(BaseCommand):
    help = (
        'Strip legacy vote/like/user_type keys from stored MongoDB documents '
        'and (opt-in) purge ratings whose source is blank or unsupported.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Actually write changes (default is preview-only).',
        )
        parser.add_argument(
            '--purge-untagged-ratings',
            action='store_true',
            help=(
                'Also delete accounts_rating documents whose source is blank or '
                'not one of the four baselined surfaces. Preview lists them first.'
            ),
        )

    def handle(self, *args, **options):
        apply_changes = options['apply']
        purge_untagged = options['purge_untagged_ratings']
        mode = "APPLY" if apply_changes else "PREVIEW (no writes)"
        self.stdout.write(f"\nMode: {mode}")
        self.stdout.write(f"Stripping legacy keys: {', '.join(LEGACY_FIELDS)}")
        self.stdout.write(
            f"Untagged-rating purge: {'ON' if purge_untagged else 'off'}\n")

        mongo_uri = getattr(settings, 'MONGODB_URI', None)
        if not mongo_uri:
            self.stdout.write(self.style.ERROR(
                "MONGODB_URI is not set — cannot scan the database."))
            return

        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
        db = client['fitfusion']

        total_fields = 0
        total_docs = 0

        # ---- Pass 1: recursive legacy-key strip over every scanned collection
        for collection_name in SCANNED_COLLECTIONS:
            collection = db[collection_name]
            self.stdout.write(f"\n[raw MongoDB] {collection_name}:")
            coll_fields = 0
            coll_docs = 0

            for doc in collection.find():
                # FIX: _strip_legacy mutates doc in place and returns only the count.
                removed = _strip_legacy(doc)
                if removed:
                    coll_docs += 1
                    coll_fields += removed
                    label = doc.get('email') or doc.get('_id') or '?'
                    verb = "removed" if apply_changes else "would remove"
                    self.stdout.write(f"  {label}: {verb} {removed} field(s)")
                    if apply_changes:
                        collection.replace_one({'_id': doc['_id']}, doc)

            verb = "Removed" if apply_changes else "Would remove"
            self.stdout.write(
                f"  {verb} {coll_fields} legacy field(s) "
                f"across {coll_docs} document(s).")
            total_fields += coll_fields
            total_docs += coll_docs

        # ---- Pass 2 (opt-in): purge ratings with blank/unsupported source
        if purge_untagged:
            collection = db['accounts_rating']
            self.stdout.write("\n[raw MongoDB] accounts_rating (untagged purge):")
            stale = list(collection.find({'source': {'$nin': list(VALID_SOURCES)}}))
            if not stale:
                self.stdout.write("  No untagged/unsupported-source ratings found.")
            else:
                for doc in stale:
                    label = doc.get('_id')
                    self.stdout.write(
                        f"  {label}: target={doc.get('target_type')}:"
                        f"{doc.get('target_id')} score={doc.get('score')} "
                        f"source={doc.get('source')!r}")
                verb = "Deleted" if apply_changes else "Would delete"
                self.stdout.write(f"  {verb} {len(stale)} untagged rating(s).")
                if apply_changes:
                    collection.delete_many(
                        {'_id': {'$in': [d['_id'] for d in stale]}})

        client.close()

        summary_verb = "Removed" if apply_changes else "Would remove"
        self.stdout.write(self.style.SUCCESS(
            f"\n✓ {summary_verb} {total_fields} legacy field(s) across "
            f"{total_docs} document(s)."))
        if not apply_changes:
            self.stdout.write(
                "Re-run with --apply to write the changes.")