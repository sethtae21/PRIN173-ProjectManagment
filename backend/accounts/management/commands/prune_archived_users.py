"""
Management command: relocate archived users past the 90-day grace window into
the accounts_archiveduser cold collection. Production/cron path; the same sweep
also runs lazily on login (see LoginView) for zero-config development.

Usage:
    python manage.py prune_archived_users                 # default 90-day window
    python manage.py prune_archived_users --days 30       # custom window
    python manage.py prune_archived_users --force         # INSTANT: ignore the clock,
                                                          #   move every archived row now
    python manage.py prune_archived_users --preview       # SEE the math: list each
                                                          #   archived row's due date
                                                          #   (archived_at + window) and
                                                          #   days remaining; moves nothing

Cron example (daily at 03:00):
    0 3 * * *  /path/to/.venv/bin/python /path/to/backend/manage.py prune_archived_users
"""
from django.core.management.base import BaseCommand

from accounts.archive import (
    ARCHIVE_GRACE_DAYS,
    describe_archive_schedule,
    prune_expired_archived_users,
)


def _fmt(dt):
    return dt.strftime("%Y-%m-%d %H:%M:%S UTC") if dt else "(none / legacy)"


class Command(BaseCommand):
    help = (
        "Move accounts archived longer than the grace window (default 90 days) "
        "from accounts_user into the accounts_archiveduser cold collection, "
        "pseudonymizing their orders and cascade-removing their working data. "
        "Use --force to relocate immediately, --preview to inspect the schedule."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=ARCHIVE_GRACE_DAYS,
            help=f"Grace window in days before relocation (default {ARCHIVE_GRACE_DAYS}).",
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help="Ignore the grace window and relocate EVERY archived row now (demo/UAT).",
        )
        parser.add_argument(
            '--preview',
            action='store_true',
            help="Print each archived row's archived_at, due date (archived_at + window), "
                 "days remaining and eligible-now flag, then exit without moving anything.",
        )

    def handle(self, *args, **options):
        days = options['days']
        force = options['force']
        preview = options['preview']

        if preview:
            rows = describe_archive_schedule(days=days, force=force)
            if not rows:
                self.stdout.write(self.style.WARNING(
                    "No rows with status='archive' in accounts_user. Nothing to show."
                ))
                return
            self.stdout.write(
                f"Archive schedule preview (grace window = {days} day(s)"
                f"{', FORCE=on' if force else ''}):"
            )
            self.stdout.write("-" * 96)
            self.stdout.write(f"{'EMAIL':32} {'ARCHIVED_AT':23} {'DUE (archived_at+N)':23} ELIGIBLE")
            self.stdout.write("-" * 96)
            for r in rows:
                flag = "YES -> would move" if r['eligible'] else "no  -> waiting"
                self.stdout.write(
                    f"{r['email'][:31]:32} {_fmt(r['archived_at']):23} "
                    f"{_fmt(r['due_date']):23} {flag} ({r['remaining']})"
                )
            self.stdout.write("-" * 96)
            self.stdout.write(self.style.SUCCESS(
                "Preview only — no rows were moved. Drop --preview (add --force to "
                "relocate now, or rely on the default window) to act."
            ))
            return

        moved = prune_expired_archived_users(days=days, force=force)
        window_label = "FORCED (clock ignored)" if force else f"grace window = {days} days"
        self.stdout.write(
            self.style.SUCCESS(
                f"Prune complete: {moved} archived user(s) relocated to cold storage "
                f"({window_label})."
            )
        )