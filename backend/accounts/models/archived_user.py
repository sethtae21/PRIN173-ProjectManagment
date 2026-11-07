"""
accounts/models/archived_user.py
Cold-storage mirror of a permanently closed (archived) user profile.

LIFECYCLE (FR-1.4 / RA 10173 retention):
  active  --(user clicks Archive / DELETE /profile/)-->  archived in accounts_user
  archived --(prune sweep, accounts/archive.py, after 90 days)-->  MOVED HERE

DATE SEMANTICS (Updated per request):
  archived_at   = the moment the user pressed Archive (clock start).
  cold_moved_at = NOW STORES THE SCHEDULED WINDOW DATE (archived_at + ARCHIVE_GRACE_DAYS, currently 5 days for testing).
                  This is the "February" date you see in Compass.
                  DOCUMENTED TRADE-OFF: per the explicit request, this field holds
                  the SCHEDULED date rather than the real relocation instant, so the
                  "when did the data actually leave accounts_user" audit timestamp is
                  intentionally not recorded here. Eligibility in accounts/archive.py
                  is still computed live from ARCHIVE_GRACE_DAYS, so this stored value
                  is display/audit-of-schedule only and never drives the sweep.
                  Legacy rows with archived_at = NULL fall back to timezone.now().
"""
from datetime import timedelta

from django.db import models


class ArchivedUser(models.Model):
    ROLE_CHOICES = (
        ('shopper', 'Shopper'),
        ('seller', 'Seller'),
    )
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('archive', 'Archive'),
    )

    # Identity / profile
    email = models.EmailField(max_length=255, db_index=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='shopper')
    store_name = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='archive')

    mobile = models.CharField(max_length=20, blank=True, null=True)
    street = models.CharField(max_length=255, blank=True, null=True)
    barangay = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=255, blank=True, null=True)
    province = models.CharField(max_length=255, blank=True, null=True)
    postal_code = models.CharField(max_length=10, blank=True, null=True)

    password = models.CharField(max_length=128, blank=True, default='')
    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    last_login = models.DateTimeField(blank=True, null=True)
    date_joined = models.DateTimeField(blank=True, null=True)

    # Provenance / timing
    # NOTE: no db_index here on purpose. The index is created EXCLUSIVELY by the
    # named Meta.indexes entry below (arch_user_closed_idx). Adding db_index=True
    # would make Django generate a second, auto-named index on the same column,
    # which collides with the named one in MongoDB (IndexOptionsConflict) and is
    # exactly what broke migration 0004. Keep these two in sync: model has NO
    # db_index, Meta HAS the named index.
    closed_account_id = models.CharField(max_length=64)
    archived_at = models.DateTimeField(blank=True, null=True)

    # Stores the SCHEDULED move date (archived_at + 90 days), not the real move time.
    cold_moved_at = models.DateTimeField()

    class Meta:
        db_table = 'accounts_archiveduser'
        verbose_name = 'archived user'
        verbose_name_plural = 'archived users'
        ordering = ['-cold_moved_at']
        indexes = [
            models.Index(fields=['closed_account_id'], name='arch_user_closed_idx'),
            models.Index(fields=['cold_moved_at'], name='arch_user_moved_idx'),
        ]

    def __str__(self):
        return f"[archived] {self.full_name} ({self.email})"

    @classmethod
    def from_user(cls, user):
        """Build + persist an intact cold copy of a live (archived) User.

        Idempotent: if a copy for this closed_account_id already exists (a
        previous sweep crashed mid-run), it is returned untouched instead of
        duplicated. Must be called BEFORE the live row is deleted.
        """
        from django.utils import timezone
        from accounts.archive import ARCHIVE_GRACE_DAYS

        closed_id = str(user.pk)
        existing = cls.objects.filter(closed_account_id=closed_id).first()
        if existing:
            return existing

        archived_at = getattr(user, 'archived_at', None)

        # LOGIC (per request): cold_moved_at = the scheduled 90-day date.
        if archived_at:
            move_date = archived_at + timedelta(days=ARCHIVE_GRACE_DAYS)
        else:
            # Legacy rows with no archive stamp: cannot compute +90, fall back to now.
            move_date = timezone.now()

        return cls.objects.create(
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            store_name=user.store_name,
            status='archive',
            mobile=user.mobile,
            street=user.street,
            barangay=user.barangay,
            city=user.city,
            province=user.province,
            postal_code=user.postal_code,
            password=user.password,
            is_active=False,
            is_staff=user.is_staff,
            last_login=user.last_login,
            date_joined=user.date_joined,
            closed_account_id=closed_id,
            archived_at=archived_at,
            cold_moved_at=move_date,  # <--- Stores the scheduled (Feb) date here
        )