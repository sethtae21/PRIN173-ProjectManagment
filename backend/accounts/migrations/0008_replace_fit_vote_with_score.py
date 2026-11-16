# Stars-only redesign (SRS FR-7.5 / Criteria 9 & 10): the survey's binary
# fit_like_dislike column is replaced by fit_rating_score (1-5 stars).
# Legacy like/dislike survey values are dropped (they were superseded by the
# star scale); accounts_rating.vote is UNTOUCHED so charter KPI joins and the
# locked tests keep working.
#
# NOTE: the dependency label below must match your actual 0007 filename
# (the migration that added latest_fitting_studio_survey). If yours differs,
# either rename this dependency or delete this file and run
# `python manage.py makemigrations accounts` instead.
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_user_latest_fitting_studio_survey'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='fittingstudiosurvey',
            name='fit_like_dislike',
        ),
        migrations.AddField(
            model_name='fittingstudiosurvey',
            name='fit_rating_score',
            field=models.PositiveSmallIntegerField(
                blank=True,
                null=True,
                validators=[MinValueValidator(1), MaxValueValidator(5)],
            ),
        ),
    ]