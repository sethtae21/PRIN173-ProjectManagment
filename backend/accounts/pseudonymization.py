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

PSEUDONYM CONTRACT (tokenized identifiers — no placeholders, no nulls):
  account token = HMAC-SHA256(server secret, closed_account_id)[:32]
  field token   = HMAC-SHA256(server secret, "<closed_account_id>:<field>")[:32]

  email       -> archived-<account token>@archive.invalid
                 (derivation UNCHANGED from the previous build: rows already
                 pseudonymized keep their existing email verbatim)
  full_name   -> "Archived <account token>"  (was the constant 'Archived User';
                 a generic placeholder is NOT a pseudonym)
  mobile      -> MOB-<field token>
  street / barangay / city / province -> ADDR-<field token> (distinct per field)
  postal_code -> POST-<field token>
  store_name  -> STORE-<field token>  (tokenized for ALL roles, never null)
  password    -> ''  (the live hash is NEVER copied)

  * stable  -> same closed_account_id + same key => identical values on every
               create / re-create / heal (idempotency key stays closed_account_id).
  * keyed   -> irreversible without the secret; derived ONLY from the account
               id + field label, never from the original value, so no email /
               name / contact / address / store data is stored or encoded.
  * domain  -> `archive.invalid` is reserved; pseudonymous emails can never
               collide with a real registrant.

LENGTH NOTE (no schema change required):
  MOB-/POST- tokens are 36-37 chars and exceed the legacy max_length metadata
  on mobile (20) / postal_code (10). MongoDB does not enforce varchar caps and
  cold rows are written via the ORM (no full_clean), so the field definitions
  stay untouched. Tombstones are read-only audit records — do not edit them
  through ModelForms/admin.

UPGRADE NOTE:
  Rows sanitized by the OLD scheme ('Archived User' + null contact fields) are
  upgraded to tokens by re-running `pseudonymize_archived_users` (migration
  0012 does not re-run once applied). Emails are untouched by that upgrade
  because their derivation is preserved.

RETAINED (legitimate business/legal purpose only):
  closed_account_id (idempotency/audit key), role (non-identifying retention
  reporting), status, archived_at + cold_moved_at (retention-clock audit; the
  documented SCHEDULED-date semantics of cold_moved_at are NOT changed here).
"""
import hashlib
import hmac

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

ARCHIVED_EMAIL_DOMAIN = 'archive.invalid'
PSEUDONYM_HEX_LENGTH = 32

# field -> token prefix (style contract documented in the SADD).
FIELD_TOKEN_PREFIXES = {
    'mobile': 'MOB',
    'street': 'ADDR',
    'barangay': 'ADDR',
    'city': 'ADDR',
    'province': 'ADDR',
    'postal_code': 'POST',
    'store_name': 'STORE',
}


def _key() -> bytes:
    # Prefer a dedicated stable key in production; rotating SECRET_KEY would
    # otherwise change pseudonym derivation for future writes.
    secret = getattr(settings, 'ARCHIVE_PSEUDONYM_KEY', '') or settings.SECRET_KEY
    if not secret:
        raise ImproperlyConfigured(
            'Set ARCHIVE_PSEUDONYM_KEY (or DJANGO_SECRET_KEY) to pseudonymize '
            'archived accounts.'
        )
    return str(secret).encode('utf-8')


def pseudonym_for(closed_account_id, field=None) -> str:
    """32-hex keyed token. field=None keeps the ORIGINAL account-level
    derivation (bare id) so existing pseudonymous emails never change;
    field='mobile' etc. derives a distinct, field-specific token."""
    message = (
        str(closed_account_id) if field is None
        else f"{closed_account_id}:{field}"
    )
    return hmac.new(
        _key(), message.encode('utf-8'), hashlib.sha256
    ).hexdigest()[:PSEUDONYM_HEX_LENGTH]


def pseudonymous_email(closed_account_id) -> str:
    return f"archived-{pseudonym_for(closed_account_id)}@{ARCHIVED_EMAIL_DOMAIN}"


def pseudonymous_full_name(closed_account_id) -> str:
    return f"Archived {pseudonym_for(closed_account_id)}"


def pseudonymous_field_token(closed_account_id, field) -> str:
    if field not in FIELD_TOKEN_PREFIXES:
        raise ValueError(f"No pseudonym prefix defined for field '{field}'.")
    return f"{FIELD_TOKEN_PREFIXES[field]}-{pseudonym_for(closed_account_id, field)}"


def pseudonymous_profile_fields(closed_account_id, role='shopper') -> dict:
    """The ONLY profile values a cold row may hold.

    Every direct identifier is a deterministic keyed token (never null, never
    the original, never a generic placeholder). Credential -> ''. Behavioral
    timestamps (last_login, date_joined) -> None (no retention purpose).
    Role is non-identifying and kept for retention reporting.
    """
    fields = {
        'email': pseudonymous_email(closed_account_id),
        'full_name': pseudonymous_full_name(closed_account_id),
        'role': role if role in ('shopper', 'seller') else 'shopper',
        'status': 'archive',
        'password': '',
        'is_active': False,
        'is_staff': False,
        'last_login': None,
        'date_joined': None,
    }
    fields.update({
        name: pseudonymous_field_token(closed_account_id, name)
        for name in FIELD_TOKEN_PREFIXES
    })
    return fields


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
    """Repeatable backfill over accounts_archiveduser (legacy intact copies
    AND rows sanitized under the old placeholder/null scheme).

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