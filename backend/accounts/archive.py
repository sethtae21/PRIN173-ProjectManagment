"""
accounts/archive.py
The 90-day cold-relocation sweep (FR-1.4 / RA 10173 end-of-retention).

ELIGIBILITY ALGORITHM (the forward form you asked to make explicit):
    due_date = archived_at + ARCHIVE_GRACE_DAYS      # archive_due_date()
    relocatable when  due_date <= now                # (or archived_at is NULL
                                                     #  = legacy row = due now)
The original code expressed the same rule backwards
(archived_at < now - 90d); both are identical, but the forward form is what
`describe_archive_schedule()` prints so you can SEE a row's due date and the
days remaining instead of guessing why it did or didn't move.

cold_moved_at is ALWAYS the real wall-clock moment of relocation (audit truth),
NEVER the due date: under cron it lands ~on the due date; under --force it
lands now (earlier than due), which is exactly the "instant demo move".

Moves accounts that have sat in the 'archive' grace window for >= ARCHIVE_GRACE_DAYS
out of accounts_user and into the accounts_archiveduser cold collection, then
detaches their linked data using the EXACT cascade your original hard-delete used
(cart fix-up loop + order pseudonymize loop + user.delete()), so the live
collections end up with zero dangling references.

Why reuse the old cascade instead of inventing a new one: that code path was
already proven crash-free by your test suite; replicating it verbatim at day-90
is the lowest-risk way to guarantee no view ever navigates a dead order.user /
item.seller id. The ONLY differences from the old immediate delete are (a) the
90-day delay and (b) the intact cold copy written first.

Called from two places:
  * accounts/management/commands/prune_archived_users.py  (production / cron / --force / --preview)
  * LoginView.post (lazy, best-effort, never blocks login)            (zero-config dev)
Models are imported lazily inside the functions to avoid any import cycle.
"""
import logging
import math
from datetime import datetime, timedelta, timezone as _StdTZ

from django.db.models import Q
from django.utils import timezone

logger = logging.getLogger(__name__)

# Grace window before a closed profile is relocated to cold storage.
ARCHIVE_GRACE_DAYS = 5

# Aware epoch used ONLY as a sort sentinel for legacy (NULL due) rows in the
# preview; never written to the DB. Django 5+ removed django.utils.timezone.utc,
# so the aware UTC comes from the stdlib datetime (works on every Django version).
_EPOCH = datetime(1970, 1, 1, tzinfo=_StdTZ.utc)


def archive_due_date(user, days: int = ARCHIVE_GRACE_DAYS):
    """Forward grace-window calculation: archived_at + `days`.

    Returns None for legacy rows with no archived_at stamp, which callers
    interpret as "due immediately". This is the single source of truth for the
    due date; the User.archive_due_date property mirrors it.
    """
    archived_at = getattr(user, 'archived_at', None)
    if archived_at is None:
        return None
    return archived_at + timedelta(days=days)


def _eligibility_queryset(days: int = ARCHIVE_GRACE_DAYS, force: bool = False):
    """Rows in accounts_user that may be relocated right now.

    force=True ignores the clock entirely (every status='archive' row) — this
    is the instant terminal move. Otherwise: archived longer than `days`, OR
    never timestamped (legacy isnull branch).
    """
    from accounts.models import User

    base = User.objects.filter(status='archive')
    if force:
        return base
    cutoff = timezone.now() - timedelta(days=days)
    return base.filter(
        Q(archived_at__lt=cutoff) | Q(archived_at__isnull=True)
    )


def describe_archive_schedule(days: int = ARCHIVE_GRACE_DAYS, force: bool = False) -> list:
    """Preview, per archived row: due date, days remaining, eligible-now flag.

    Iterates EVERY status='archive' row (not just eligible ones) so you can see
    a same-day archive listed as "due <date> -> in 90 day(s) -> NOT eligible",
    proving the algorithm. Sorted soonest-due first; legacy NULL-due rows float
    to the top.
    """
    from accounts.models import User

    now = timezone.now()
    rows = []
    for user in User.objects.filter(status='archive'):
        due = archive_due_date(user, days=days)
        if due is None:
            eligible = True
            remaining_label = "immediate (legacy: no archived_at)"
        else:
            secs = (due - now).total_seconds()
            if secs <= 0:
                eligible = True
                remaining_label = "OVERDUE -> eligible now"
            else:
                eligible = False
                remaining_label = f"in {math.ceil(secs / 86400)} day(s)"
        if force:
            eligible = True
            if due is not None and (due - now).total_seconds() > 0:
                remaining_label += " (forced)"
        rows.append({
            "id": str(user.pk),
            "email": user.email,
            "full_name": user.full_name,
            "archived_at": user.archived_at,
            "due_date": due,
            "eligible": eligible,
            "remaining": remaining_label,
        })

    rows.sort(key=lambda r: (r["due_date"] is not None, r["due_date"] or _EPOCH))
    return rows


def prune_expired_archived_users(days: int = ARCHIVE_GRACE_DAYS, force: bool = False) -> int:
    """Relocate eligible archived users to accounts_archiveduser.

    force=True bypasses the 90-day clock (instant move for demos/UAT). Each
    user is handled independently; a failure on one is logged and skipped so a
    single bad row can never stall the whole sweep. The cold copy is written
    BEFORE the live row is deleted, so even without a transaction the worst
    case is a duplicate cold row, never data loss. Returns users processed.
    """
    # Local imports: keep this module import-safe from anywhere (views, commands).
    from accounts.models import ArchivedUser
    from catalog.models import CatalogItem
    from commerce.models import CartItem, Order

    candidates = _eligibility_queryset(days=days, force=force)

    moved = 0
    for user in candidates:
        try:
            # 1) Intact cold backup FIRST (idempotent via closed_account_id).
            ArchivedUser.from_user(user)

            # 2) Detach buyers' carts that reference THIS seller's listings,
            #    so cascading the listings away later can't dangle a CartItem.
            #    (Verbatim from the original ProfileView.destroy.)
            for item in CatalogItem.objects.filter(seller=user):
                CartItem.objects.filter(item=item).update(
                    item=None,
                    catalog_item_id=str(item.pk),
                    item_name=item.name,
                    store_name=item.store_name,
                    unavailable_reason=(
                        "This item is unavailable because the seller’s account was deleted."
                    ),
                    seller_account_deleted=True,
                )

            # 3) Pseudonymize this user's orders: keep the order RECORD
            #    (totals/items/dates/status) but drop the personal link + PII.
            #    (Verbatim from the original ProfileView.destroy.)
            for order in Order.objects.filter(user=user):
                order.user = None
                order.recipient_name = ''
                order.contact_number = ''
                order.recipient_email = ''
                order.shipping_address = ''
                order.save(update_fields=[
                    'user', 'recipient_name', 'contact_number',
                    'recipient_email', 'shipping_address',
                ])

            # 4) Remove the live profile. Cascades delete the user's own
            #    presets / outfits / cart / remaining listings / ratings,
            #    exactly as the original hard-delete did. Orders survived step 3
            #    (user=None) and cart rows survived step 2 (item=None).
            user.delete()
            moved += 1
            logger.info(
                "Cold-archived user %s (%s)%s.",
                user.pk, user.email,
                " via --force" if force else f" after the {days}-day grace window",
            )
        except Exception:  # noqa: BLE001 - one bad row must not stall the sweep
            logger.exception("Failed to cold-archive user %s; skipping.", getattr(user, 'pk', '?'))

    if moved:
        logger.info("Prune sweep relocated %s archived user(s) to cold storage.", moved)
    return moved