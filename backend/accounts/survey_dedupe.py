"""
accounts/survey_dedupe.py
Idempotent (user, session_id) dedupe for FittingStudioSurvey.

Called by migration 0011 BEFORE the unique index is created, and safe to call
again: a failed migrate on MongoDB is not rolled back, so this helper may run
more than once over partially-deduped data.

CALL CONTRACT — every shape below is supported. Do NOT narrow this signature:
migration 0011 calls it with `apply=True`, and narrowing it to
(apps, schema_editor) breaks test-database creation for the whole project.
    dedupe_fitting_studio_surveys(apply=True)           # migration 0011
    dedupe_fitting_studio_surveys(apply=False)          # dry run
    dedupe_fitting_studio_surveys(False)                # legacy positional bool
    dedupe_fitting_studio_surveys(apps, schema_editor)  # RunPython style
    dedupe_fitting_studio_surveys(SurveyModel)          # explicit model class
    dedupe_fitting_studio_surveys()                     # live model, apply
    dedupe_fitting_studio_surveys(dry_run=True)         # alias for apply=False

MongoDB-safe: grouping happens in Python rather than .values().annotate(Count),
so it does not depend on backend aggregation support.

Two-phase preservation: the NEWEST row per key is kept (by submitted_at, the
model's real timestamp), and any field the keeper left null is filled from an
older row before that row is deleted, so a phase-1 answer stored on an older
duplicate is never lost. With apply=False nothing is saved or deleted; the
in-memory merge still runs so the reported counts are accurate.
"""
from __future__ import annotations

# submitted_at is this model's timestamp (there is no created_at/updated_at);
# the other names are kept so the helper still works if those are added later.
ORDER_FIELDS = ('submitted_at', 'updated_at', 'created_at', 'id')
PROTECTED = {
    'id', 'pk', 'user', 'user_id', 'session_id',
    'submitted_at', 'created_at', 'updated_at',
}


def _resolve_model(apps):
    if apps is not None and hasattr(apps, 'get_model'):   # RunPython(apps, editor)
        return apps.get_model('accounts', 'FittingStudioSurvey')
    if isinstance(apps, type):                            # called with the model class
        return apps
    from accounts.models import FittingStudioSurvey       # apply=/no-args call
    return FittingStudioSurvey


def dedupe_fitting_studio_surveys(apps=None, schema_editor=None, apply=True, *, dry_run=False):
    # Tolerate the legacy positional form dedupe_fitting_studio_surveys(False).
    if isinstance(apps, bool):
        apply = apps
        apps = None
    if dry_run:
        apply = False

    Survey = _resolve_model(apps)
    names = {f.name for f in Survey._meta.concrete_fields}
    order = [f'-{n}' for n in ORDER_FIELDS if n in names]
    payload_fields = sorted(names - PROTECTED)

    groups = {}
    for row in Survey.objects.all().order_by(*order).iterator():
        key = (str(getattr(row, 'user_id', '')), row.session_id)
        groups.setdefault(key, []).append(row)

    stats = {
        'scanned': 0,
        'duplicate_groups': 0,
        'merged_fields': 0,
        'deleted': 0,
        'applied': bool(apply),
    }
    for rows in groups.values():
        stats['scanned'] += len(rows)
        if len(rows) < 2:
            continue
        stats['duplicate_groups'] += 1
        keep, *dupes = rows            # newest first because of order_by
        changed = []
        for older in dupes:
            for field in payload_fields:
                if getattr(keep, field) is None and getattr(older, field) is not None:
                    setattr(keep, field, getattr(older, field))
                    changed.append(field)
        if changed:
            stats['merged_fields'] += len(set(changed))
            if apply:
                keep.save(update_fields=sorted(set(changed)))
        for older in dupes:
            stats['deleted'] += 1
            if apply:
                older.delete()
    return stats