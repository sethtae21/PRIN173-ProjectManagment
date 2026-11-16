"""
Drop the non-baselined `user_type` column from accounts_fittingstudiosurvey.

The owner of a visit is already identified by the `user` FK and the
denormalized `user_email`; `user_type` added no information (the endpoint is
shopper-only, so it was always the constant 'registered'). Stored documents
that still carry the key are scrubbed by
accounts/management/commands/clean_legacy_survey_fields.py.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_fit_rating_and_validators'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='fittingstudiosurvey',
            name='user_type',
        ),
    ]