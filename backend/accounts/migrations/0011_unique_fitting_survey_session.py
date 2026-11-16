# Hand-written migration: enforce one survey row per (user, session_id).
# Step 1 merges any existing duplicates (accounts/survey_dedupe.py) so the
# unique index creation cannot fail on legacy data. Step 2 adds the constraint.
# Do NOT run makemigrations to generate this file — it is provided as-is, and
# the matching Meta.unique_together edit keeps `makemigrations --check` clean.

from django.db import migrations


def forwards(apps, schema_editor):
    # Live-model import is intentional: the dedupe routine introspects the
    # concrete schema and merges generically; it does not depend on historical
    # field definitions.
    from accounts.survey_dedupe import dedupe_fitting_studio_surveys
    dedupe_fitting_studio_surveys(apply=True)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_remove_survey_user_type"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name="fittingstudiosurvey",
            unique_together={("user", "session_id")},
        ),
    ]