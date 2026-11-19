"""
Management command: FR-1.4 / RA 10173 backfill for ALREADY-ARCHIVED records.

Changing future archive writes does not fix legacy accounts_archiveduser
documents that were copied intact by older builds (or sanitized under the old
placeholder/null scheme). This command pseudonymizes them in place via the
live helper: keyed pseudonymous email, pseudonymous display name
("Archived <32hex>"), field-specific MOB-/ADDR-/POST-/STORE- tokens for
contact/address/postal/store identity (never null), empty password, cleared
behavioral timestamps.

Idempotent: a second run reports pseudonymized=0 / already_clean=N and writes
nothing. --dry-run computes the same counts without saving.

Usage:
    python manage.py pseudonymize_archived_users --dry-run
    python manage.py pseudonymize_archived_users
    python manage.py pseudonymize_archived_users   # again -> already_clean=N
"""
from django.core.management.base import BaseCommand

from accounts.pseudonymization import sanitize_existing_archives


class Command(BaseCommand):
    help = (
        "Idempotent FR-1.4 backfill: pseudonymize legacy accounts_archiveduser "
        "rows (keyed tokens for every direct identifier — never null or the "
        "original; password cleared). Safe to re-run; --dry-run reports "
        "without writing."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Report what would be pseudonymized without writing anything.",
        )

    def handle(self, *args, **options):
        apply = not options['dry_run']
        stats = sanitize_existing_archives(apply=apply)
        prefix = '[dry-run] ' if not apply else ''
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}scanned={stats['scanned']} "
            f"pseudonymized={stats['pseudonymized']} "
            f"already_clean={stats['already_clean']}"
        ))