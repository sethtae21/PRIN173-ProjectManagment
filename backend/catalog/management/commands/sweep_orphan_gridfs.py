"""
sweep_orphan_gridfs — find and optionally remove GridFS blobs whose CatalogItem
row is gone (FR-4.6 / RSK-03 / KAN-119 orphan-cleanup hooks).

SCOPE: only enumerates files whose filename lives under the catalog upload_to
prefixes. Anything else in GridFS (avatars, future media) is ignored — we never
touch what we don't own.

PREFIXES:
  catalog/front/  — CatalogItem.front_image (current)
  catalog/rear/   — CatalogItem.rear_image  (current)
  catalog/side/   — CatalogItem.side_image, REMOVED in catalog migration
                    0004_remove_catalogitem_side_image. No model field can
                    reference these anymore, so every one is an orphan. The
                    post_delete receiver only loops front/rear and never
                    cleaned them up.

DETECTION: a GridFS file is an orphan when its stored identifier (the ObjectId
string that GridFSStorage._save returns, which is what CatalogItem.front_image
and .rear_image store) is NOT present in any current CatalogItem row.

The detection helpers are module-level so backup_gridfs_orphans imports the
EXACT same logic — the two commands can never disagree about what an orphan is.

SAFETY: --dry-run is the default. --delete actually removes files AND their
chunks. Idempotent: a second run reports zero orphans.

OPERATIONAL WARNING: run this only when no upload/edit is in flight. The upload,
batch, and PATCH paths write a GridFS object with save=False BEFORE committing
the row; sweeping in that window would delete a live image.

Usage:
    python manage.py sweep_orphan_gridfs                 # default: dry-run
    python manage.py sweep_orphan_gridfs --delete        # actually remove them
"""
import logging

from django.core.management.base import BaseCommand

from accounts.storage import gridfs_storage
from catalog.models import CatalogItem

logger = logging.getLogger(__name__)

# catalog/side/ is legacy: side_image was removed in migration 0004, so nothing
# can reference those files. Including it reclaims that dead quota (RSK-03).
CATALOG_PREFIXES = ('catalog/front/', 'catalog/rear/', 'catalog/side/')


def collect_referenced_names():
    """Every front_image.name and rear_image.name across all CatalogItems.

    These are the 24-char hex ObjectId strings that GridFSStorage._save returned
    when the file was written — the only identifiers we need to match against.
    Empty/None fields are skipped.
    """
    referenced = set()
    for item in CatalogItem.objects.only('front_image', 'rear_image').iterator():
        for field_name in ('front_image', 'rear_image'):
            name = getattr(getattr(item, field_name, None), 'name', None)
            if name:
                referenced.add(str(name))
    return referenced


def find_orphans(db, referenced):
    """Return (candidates, orphans) for the catalog prefixes.

    A file is referenced iff EITHER its ObjectId-string OR its filename appears
    in `referenced`. CatalogItem always stores the ObjectId-string, but the
    filename fallback mirrors the contract GridFSStorage.delete honours.
    """
    prefix_re = '^(' + '|'.join(CATALOG_PREFIXES) + ')'
    candidates = list(db['fs.files'].find({'filename': {'$regex': prefix_re}}))
    orphans = [
        doc for doc in candidates
        if str(doc['_id']) not in referenced
        and (doc.get('filename') or '') not in referenced
    ]
    return candidates, orphans


class Command(BaseCommand):
    help = (
        "Enumerate GridFS blobs under catalog/front/, catalog/rear/ and the "
        "legacy catalog/side/ whose CatalogItem row is gone (orphans). "
        "Default is dry-run; pass --delete to remove them. "
        "Traceability: RSK-03 / KAN-119."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Actually delete the orphaned files (default: dry-run).',
        )

    def handle(self, *args, **options):
        dry_run = not options['delete']

        # Touch storage once so _db / _fs are initialised. Works identically
        # against the real Atlas bucket and the injected test fake.
        gridfs_storage._require_fs()
        db = gridfs_storage._db

        referenced = collect_referenced_names()
        self.stdout.write(
            f"Referenced catalog image names: {len(referenced)} "
            f"(across {CatalogItem.objects.count()} listing(s))."
        )

        candidates, orphans = find_orphans(db, referenced)
        self.stdout.write(f"GridFS catalog-prefix files on disk: {len(candidates)}")

        total_bytes = sum(int(doc.get('length') or 0) for doc in orphans)

        self.stdout.write("")
        self.stdout.write(
            f"Orphans found: {len(orphans)} file(s), "
            f"{total_bytes:,} byte(s) ({total_bytes / (1024 * 1024):.2f} MB)."
        )
        if orphans:
            self.stdout.write("")
            self.stdout.write(f"{'_id':24}  {'length':>10}  filename")
            self.stdout.write("-" * 96)
            for doc in orphans:
                self.stdout.write(
                    f"{str(doc['_id']):24}  {int(doc.get('length') or 0):>10}  "
                    f"{doc.get('filename') or ''}"
                )

        if dry_run:
            self.stdout.write("")
            self.stdout.write(
                self.style.SUCCESS(
                    "Dry-run complete — nothing was deleted. "
                    "Re-run with --delete to reclaim this space."
                )
            )
            return

        # Delete each orphan's chunks then its file document — the same order
        # GridFS.delete uses internally, so both collections end up clean
        # (UT-13 wording). Failures are logged per-file and do not abort the
        # sweep: one bad blob must not stall the rest.
        deleted = 0
        bytes_freed = 0
        for doc in orphans:
            file_id = doc['_id']
            length = int(doc.get('length') or 0)
            try:
                if hasattr(db['fs.chunks'], 'delete_many'):
                    db['fs.chunks'].delete_many({'files_id': file_id})
                if hasattr(db['fs.files'], 'delete_one'):
                    db['fs.files'].delete_one({'_id': file_id})
                deleted += 1
                bytes_freed += length
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "KAN-119 ORPHAN_RISK sweep failed to delete file_id=%s filename=%s error=%s",
                    file_id, doc.get('filename'), exc,
                )
                self.stderr.write(
                    self.style.ERROR(
                        f"Failed to delete {file_id} ({doc.get('filename')}): {exc}"
                    )
                )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Sweep complete: {deleted}/{len(orphans)} orphan(s) deleted, "
                f"{bytes_freed:,} byte(s) ({bytes_freed / (1024 * 1024):.2f} MB) reclaimed."
            )
        )