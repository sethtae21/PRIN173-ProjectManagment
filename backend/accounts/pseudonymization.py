"""
accounts/pseudonymization.py
FR-1.4 / RA 10173: the cold archive (accounts_archiveduser) must never hold
direct identifiers or credentials.

WHY VALUES, NOT SCHEMA CHANGES:
  The MongoDB backend does not erase document keys on RemoveField, and this
  project's migration 0004 already proved index alterations are risky
  (IndexOptionsConflict). So the ArchivedUser schema is unchanged; instead
  every archive write stores pseudonymous/cleared VALUES, and legacy documents
  are scrubbed by migration 0012 + the repeatable `pseudonymize_archived_users`
  command (also reachable via `prune_archived_users --sanitize-existing`).

PSEUDONYM CONTRACT:
  pseudonym = HMAC-SHA256(server secret, closed_account_id)[:32]
  * stable  -> re-archive / backfill of the same account yields the same value
               (idempotency key remains closed_account_id).
  * keyed   -> irreversible without the secret; contains no email/name/contact.
  * domain  -> `archive.invalid` is reserved; pseudonymous emails can never
               collide with a real registrant.

RETAINED (legitimate business/legal purpose only):
  closed_account_id (idempotency/audit key), role (non-identifying retention
  reporting), status, archived_at + cold_moved_at (retention-clock audit; the
  documented SCHEDULED-date semantics of cold_moved_at are NOT changed here).
"""
import hashlib
import hmac

from django.conf import settings

ARCHIVED_DISPLAY_NAME = 'Archived User'
ARCHIVED_EMAIL_DOMAIN = 'archive.invalid'


def _key() -> bytes:
    # Prefer a dedicated stable key in production; rotating SECRET_KEY would
    # otherwise change pseudonym derivation for future writes.
    secret = getattr(settings, 'ARCHIVE_PSEUDONYM_KEY', '') or settings.SECRET_KEY
    return secret.encode('utf-8')


def pseudonym_for(closed_account_id) -> str:
    return hmac.new(
        _key(), str(closed_account_id).encode('utf-8'), hashlib.sha256
    ).hexdigest()[:32]


def pseudonymous_email(closed_account_id) -> str:
    return f"archived-{pseudonym_for(closed_account_id)}@{ARCHIVED_EMAIL_DOMAIN}"


def pseudonymous_profile_fields(closed_account_id, role='shopper') -> dict:
    """The ONLY profile values a cold row may hold.

    email / full_name are non-nullable on the schema -> pseudonymous
    placeholders. Contact/address/store identity -> None. Credential -> ''.
    Behavioral timestamps (last_login, date_joined) -> None (no retention
    purpose). Role is non-identifying and kept for retention reporting.
    """
    return {
        'email': pseudonymous_email(closed_account_id),
        'full_name': ARCHIVED_DISPLAY_NAME,
        'role': role if role in ('shopper', 'seller') else 'shopper',
        'store_name': None,
        'status': 'archive',
        'mobile': None,
        'street': None,
        'barangay': None,
        'city': None,
        'province': None,
        'postal_code': None,
        'password': '',
        'is_active': False,
        'is_staff': False,
        'last_login': None,
        'date_joined': None,
    }


def ensure_pseudonymized(archived, apply=True) -> list:
    """Idempotently scrub one cold row (live OR historical migration model).

    Returns the list of fields that differed. Saves only when `apply` and
    something changed; a clean row is never re-saved. With apply=False the
    instance is mutated in memory only (dry-run counting).
    """
    expected = pseudonymous_profile_fields(archived.closed_account_id, role=archived.role)
    changed = []
    for field, value in expected.items():
        if getattr(archived, field) != value:
            setattr(archived, field, value)
            changed.append(field)
    if changed and apply:
        archived.save(update_fields=changed)
    return changed


def sanitize_existing_archives(apply=True) -> dict:
    """Repeatable backfill over accounts_archiveduser (legacy intact copies).

    Safe to re-run: already-clean rows report already_clean and are not
    written. Used by migration 0012, the dedicated command, and the prune
    command's --sanitize-existing flag.
    """
    from accounts.models import ArchivedUser

    stats = {'scanned': 0, 'pseudonymized': 0, 'already_clean': 0}
    for row in ArchivedUser.objects.all().iterator():
        stats['scanned'] += 1
        if ensure_pseudonymized(row, apply=apply):
            stats['pseudonymized'] += 1
        else:
            stats['already_clean'] += 1
    return stats