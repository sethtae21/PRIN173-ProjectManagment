"""
FR-1.4 / RA 10173: pseudonymize ALREADY-ARCHIVED cold documents.

Data-only migration (no schema/index operations — the MongoDB backend keeps
document keys on RemoveField, and migration 0004 proved index alterations are
risky). Legacy accounts_archiveduser rows copied intact by older builds are
scrubbed in place via the LIVE helper (accounts.pseudonymization): keyed
pseudonymous email, pseudonymous display name ("Archived <32hex>"),
field-specific MOB-/ADDR-/POST-/STORE- tokens for contact/address/postal/store
identity (never null), EMPTY password, cleared behavioral timestamps.

Idempotent: clean rows are not re-saved. The same routine is re-runnable via
`python manage.py pseudonymize_archived_users` (or prune --sanitize-existing) —
that command is ALSO the upgrade path for rows already sanitized under the old
placeholder/null scheme, since an applied migration does not re-run.

Reverse is a no-op: pseudonymization is irreversible; the original identifiers
are intentionally unrecoverable from the cold archive.
"""
from django.db import migrations


def forwards(apps, schema_editor):
    from accounts.pseudonymization import ensure_pseudonymized

    ArchivedUser = apps.get_model('accounts', 'ArchivedUser')
    for row in ArchivedUser.objects.all().iterator():
        ensure_pseudonymized(row, apply=True)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_unique_fitting_survey_session'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]