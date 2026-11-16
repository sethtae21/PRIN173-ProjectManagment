"""
STAR-ONLY baseline (SRS FR-7.5 / Scope Criteria 9-11 / SADD RATINGS).

Forward-only leaf migration on top of 0004. Already-applied migrations
0001-0004 are NOT rewritten.

  1. DROP legacy vote-only rows (score IS NULL). We never invent a star score
     from a like/dislike — that would fabricate UAT evidence.
  2. Remove the `vote` column (no like/dislike dimension remains).
  3. Make `score` a REQUIRED integer 1..5 (4-5 = approval).
  4. Restrict `source` to the four baselined surfaces; the undocumented
     'fitting_studio_popup' tag and the empty legacy tag are removed from the
     choices (existing legacy rows are left untouched in the collection).
"""
import django.core.validators
from django.db import migrations, models


def drop_vote_only_rows(apps, schema_editor):
    Rating = apps.get_model('ratings', 'Rating')
    Rating.objects.filter(score__isnull=True).delete()


def noop_reverse(apps, schema_editor):
    # Deleted legacy vote-only rows are not reconstructable; intentional no-op.
    return


class Migration(migrations.Migration):

    dependencies = [
        ('ratings',
         '0004_rename_uat_response_session_product_idx_uat_respons_session_a26510_idx_and_more'),
    ]

    operations = [
        migrations.RunPython(drop_vote_only_rows, noop_reverse),
        migrations.RemoveField(model_name='rating', name='vote'),
        migrations.AlterField(
            model_name='rating',
            name='score',
            field=models.IntegerField(validators=[
                django.core.validators.MinValueValidator(1),
                django.core.validators.MaxValueValidator(5),
            ]),
        ),
        migrations.AlterField(
            model_name='rating',
            name='source',
            field=models.CharField(
                choices=[
                    ('recommendation_panel', 'Recommendation Panel'),
                    ('fit_visualization', 'Fit Visualization'),
                    ('product_page', 'Product Page'),
                    ('order_history', 'Order History'),
                ],
                max_length=32,
            ),
        ),
    ]