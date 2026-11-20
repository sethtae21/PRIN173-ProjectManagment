"""
Redundancy fix: drop the on-account fitting-studio survey mirror.

accounts_fittingstudiosurvey (one document per (user, session_id) visit) is
the single source of truth. The embedded copy added in 0007 duplicated the
newest visit onto every accounts_user document; FittingStudioSurveyView now
derives the API's `latest` from the collection (newest submitted_at).

NOTE (MongoDB): RemoveField updates Django's migration state; the Django
MongoDB Backend does not strip the key from existing documents. Run the
companion one-off script (backend/unset_latest_survey_mirror.py) ONCE after
this migration to $unset the stale key from existing accounts_user rows.
Historical migrations (0007 etc.) are intentionally left untouched.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_pseudonymize_archiveduser'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='latest_fitting_studio_survey',
        ),
    ]