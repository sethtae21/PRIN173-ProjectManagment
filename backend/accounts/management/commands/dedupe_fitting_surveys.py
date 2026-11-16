"""Preview/apply the (user, session_id) survey dedupe before migration 0011.

    python manage.py dedupe_fitting_surveys            # preview only
    python manage.py dedupe_fitting_surveys --apply    # merge duplicates now

The migration runs the same routine automatically; this command exists so you
can inspect the damage before migrating.
"""

from django.core.management.base import BaseCommand, CommandError

from accounts.survey_dedupe import dedupe_fitting_studio_surveys


class Command(BaseCommand):
    help = "Merge duplicate FittingStudioSurvey rows per (user, session_id)."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true",
                            help="Write changes. Without it, preview only.")

    def handle(self, *args, **options):
        try:
            summary = dedupe_fitting_studio_surveys(apply=options["apply"])
        except ValueError as exc:
            raise CommandError(str(exc))
        mode = "APPLIED" if summary["applied"] else "PREVIEW (nothing written)"
        self.stdout.write(self.style.SUCCESS(f"{mode}: {summary}"))