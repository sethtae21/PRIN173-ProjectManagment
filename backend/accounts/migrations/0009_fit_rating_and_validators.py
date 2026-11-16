"""
SADD FITTING_STUDIO_SURVEYS alignment (leaf on top of 0008).

  * rename fit_rating_score -> fit_rating (the baselined field name)
  * add 1..5 validators to every star column

NULLABILITY (documented baseline amendment): pre_*, post_* and confidence_gain
stay NULLABLE because the prompts are OPTIONAL / SKIPPABLE (SRS FR-7.5) and are
submitted in two phases — the pre-check creates the row, the post-check
completes it. A non-null constraint would make skipping impossible.
"""
import django.core.validators
from django.db import migrations, models

STARS = [
    django.core.validators.MinValueValidator(1),
    django.core.validators.MaxValueValidator(5),
]


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_replace_fit_vote_with_score'),
    ]

    operations = [
        migrations.RenameField(
            model_name='fittingstudiosurvey',
            old_name='fit_rating_score',
            new_name='fit_rating',
        ),
        migrations.AlterField(
            model_name='fittingstudiosurvey',
            name='pre_confidence',
            field=models.IntegerField(blank=True, null=True, validators=STARS),
        ),
        migrations.AlterField(
            model_name='fittingstudiosurvey',
            name='pre_return_intent',
            field=models.IntegerField(blank=True, null=True, validators=STARS),
        ),
        migrations.AlterField(
            model_name='fittingstudiosurvey',
            name='post_confidence',
            field=models.IntegerField(blank=True, null=True, validators=STARS),
        ),
        migrations.AlterField(
            model_name='fittingstudiosurvey',
            name='post_return_intent',
            field=models.IntegerField(blank=True, null=True, validators=STARS),
        ),
        migrations.AlterField(
            model_name='fittingstudiosurvey',
            name='fit_rating',
            field=models.IntegerField(blank=True, null=True, validators=STARS),
        ),
        migrations.AlterField(
            model_name='fittingstudiosurvey',
            name='confidence_gain',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]