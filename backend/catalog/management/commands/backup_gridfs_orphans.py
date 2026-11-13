"""
backup_gridfs_orphans — reversible safety net for sweep_orphan_gridfs --delete.

WHY THIS EXISTS
    scripts/backup_atlas.ps1 needs the mongodump binary. The SRS Data Recovery
    clause allows "manual database exports (via mongodump OR Atlas JSON export)",
    so this command provides the export path using only pymongo + bson, which
    are already pinned dependencies. No new tooling, no new pip package.

WHAT IT BACKS UP
    Exactly the documents sweep_orphan_gridfs would delete: the orphan fs.files
    documents AND every fs.chunks document belonging to them. Detection is
    imported from the sweep module, so the two can never disagree.

FORMAT
    Length-prefixed BSON frames: 4-byte little-endian size + bson.encode(doc).
    BSON round-trips ObjectId / Binary / datetime / Int64 losslessly, which JSON
    cannot do without custom encoders.

RESTORE
    --restore <path> re-inserts the saved documents via insert_many(ordered=False).
    Duplicate-key errors mean the document is already back, which is success for
    an idempotent restore. The in-memory test double implements the same
    insert_many contract, so tests and Atlas exercise ONE code path.

Usage:
    python manage.py backup_gridfs_orphans
    python manage.py backup_gridfs_orphans --out D:\\backups\\orphans.bson
    python manage.py backup_gridfs_orphans --restore backend\\backups\\gridfs-orphans-<ts>.bson
"""
import logging
from pathlib import Path

import bson
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from pymongo.errors import BulkWriteError

from accounts.storage import gridfs_storage
from catalog.management.commands.sweep_orphan_gridfs import (
    collect_referenced_names,
    find_orphans,
)

logger = logging.getLogger(__name__)


def write_frames(path, docs):
    """Write length-prefixed BSON frames. Returns (count, bytes_written)."""
    count = 0
    with open(path, 'wb') as handle:
        for doc in docs:
            payload = bson.encode(doc)
            handle.write(len(payload).to_bytes(4, 'little'))
            handle.write(payload)
            count += 1
    return count, Path(path).stat().st_size


def read_frames(path):
    """Yield documents from a length-prefixed BSON frame file."""
    with open(path, 'rb') as handle:
        while True:
            header = handle.read(4)
            if not header:
                return
            if len(header) != 4:
                raise ValueError('Truncated frame header — backup file is corrupt.')
            size = int.from_bytes(header, 'little')
            payload = handle.read(size)
            if len(payload) != size:
                raise ValueError('Truncated frame payload — backup file is corrupt.')
            yield bson.decode(payload)


class Command(BaseCommand):
    help = (
        "Export the GridFS orphan documents (fs.files + fs.chunks) that "
        "sweep_orphan_gridfs --delete would remove, to a restorable BSON file. "
        "Use --restore to put them back. Requires no mongodump. "
        "Traceability: SRS Data Recovery / RSK-03 / KAN-119."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--out', type=str, default=None,
            help="Output path (default: backend/backups/gridfs-orphans-<timestamp>.bson).",
        )
        parser.add_argument(
            '--restore', type=str, default=None,
            help="Restore documents from a previously written backup file.",
        )

    def _restore(self, db, path):
        source = Path(path)
        if not source.is_file():
            self.stderr.write(self.style.ERROR(f"Backup file not found: {source}"))
            raise SystemExit(1)

        files_docs, chunks_docs = [], []
        for doc in read_frames(source):
            if 'files_id' in doc:
                chunks_docs.append(doc)
            else:
                files_docs.append(doc)

        self.stdout.write(
            f"Backup contains {len(files_docs)} fs.files doc(s) and "
            f"{len(chunks_docs)} fs.chunks doc(s)."
        )

        restored_files = self._insert(db['fs.files'], files_docs, 'fs.files')
        restored_chunks = self._insert(db['fs.chunks'], chunks_docs, 'fs.chunks')

        self.stdout.write(self.style.SUCCESS(
            f"Restore complete: {restored_files} fs.files doc(s) and "
            f"{restored_chunks} fs.chunks doc(s) re-inserted "
            f"(already-present documents were skipped)."
        ))

    def _insert(self, collection, docs, label):
        """insert_many(ordered=False) against real pymongo OR the test double.

        Duplicate-key (11000) errors are expected on a repeated restore and are
        treated as success. Any OTHER write error is logged and surfaced.
        """
        if not docs:
            return 0
        try:
            result = collection.insert_many(docs, ordered=False)
            return len(result.inserted_ids)
        except BulkWriteError as exc:
            inserted = int(exc.details.get('nInserted', 0))
            non_duplicate = [
                e for e in exc.details.get('writeErrors', []) if e.get('code') != 11000
            ]
            if non_duplicate:
                logger.error("KAN-119 restore hit non-duplicate errors on %s: %s",
                             label, non_duplicate[:3])
                self.stderr.write(self.style.ERROR(
                    f"{label}: {len(non_duplicate)} non-duplicate write error(s); see the log."
                ))
            return inserted

    def handle(self, *args, **options):
        gridfs_storage._require_fs()
        db = gridfs_storage._db

        if options['restore']:
            self._restore(db, options['restore'])
            return

        referenced = collect_referenced_names()
        _candidates, orphans = find_orphans(db, referenced)

        if not orphans:
            self.stdout.write(self.style.SUCCESS(
                "No orphans found — nothing to back up."
            ))
            return

        orphan_ids = [doc['_id'] for doc in orphans]
        chunks = []
        if hasattr(db['fs.chunks'], 'find'):
            chunks = list(db['fs.chunks'].find({'files_id': {'$in': orphan_ids}}))

        payload_bytes = sum(int(doc.get('length') or 0) for doc in orphans)

        if options['out']:
            destination = Path(options['out'])
        else:
            stamp = timezone.now().strftime('%Y%m%d-%H%M%S')
            destination = Path(settings.BASE_DIR) / 'backups' / f'gridfs-orphans-{stamp}.bson'
        destination.parent.mkdir(parents=True, exist_ok=True)

        count, size = write_frames(destination, list(orphans) + chunks)

        self.stdout.write(
            f"Orphans: {len(orphans)} file(s), {payload_bytes:,} logical byte(s) "
            f"({payload_bytes / (1024 * 1024):.2f} MB)."
        )
        self.stdout.write(f"Chunks captured: {len(chunks)}")
        self.stdout.write(self.style.SUCCESS(
            f"Backup written: {destination} ({count} documents, {size:,} bytes on disk)"
        ))
        self.stdout.write("")
        self.stdout.write(
            f"Restore with: python manage.py backup_gridfs_orphans --restore \"{destination}\""
        )