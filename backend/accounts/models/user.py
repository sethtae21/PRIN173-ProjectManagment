from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, full_name, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        if not full_name:
            raise ValueError("Users must have a full name")

        # default status='active' so new accounts are live.
        extra_fields.setdefault('status', 'active')
        email = self.normalize_email(email)
        user = self.model(email=email, full_name=full_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_seller(self, email, full_name, store_name, password=None, **extra_fields):
        extra_fields.setdefault('role', 'seller')
        extra_fields.setdefault('status', 'active')
        if not store_name:
            raise ValueError("Sellers must have a store name")

        user = self.create_user(email, full_name, password, **extra_fields)
        user.store_name = store_name
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('shopper', 'Shopper'),
        ('seller', 'Seller'),
    )

    # 'active' = live account; 'archive' = deleted by the user, retained in
    # accounts_user for the 90-day grace window, then relocated to
    # accounts_archiveduser by the prune sweep (see accounts/archive.py).
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('archive', 'Archive'),
    )

    # Authentication
    email = models.EmailField(unique=True, max_length=255)
    full_name = models.CharField(max_length=255)

    # Role
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='shopper')
    store_name = models.CharField(max_length=255, blank=True, null=True)

    # Archive flag (see STATUS_CHOICES)
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True,
    )

    # Moment the account was flipped to 'archive'. Drives the 90-day
    # cold-relocation window. NULL = archived before this field existed
    # (treated as expired by the sweep so legacy rows get cleaned up).
    archived_at = models.DateTimeField(blank=True, null=True)

    # Contact Information
    mobile = models.CharField(max_length=20, blank=True, null=True)

    # Address Fields
    street = models.CharField(max_length=255, blank=True, null=True)
    barangay = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=255, blank=True, null=True)
    province = models.CharField(max_length=255, blank=True, null=True)
    postal_code = models.CharField(max_length=10, blank=True, null=True)

    # NEW (readable on-account mirror): a SINGLE FLAT object with the user's
    # most recent fitting-studio popup survey, embedded directly on the
    # accounts_user document so Compass shows the latest pre/post ratings and
    # like/dislike at a glance (no array nesting). The full per-visit history
    # lives in accounts_fittingstudiosurvey (FittingStudioSurvey below).
    latest_fitting_studio_survey = models.JSONField(default=dict, blank=True)

    # NOTE (avatar refactor): the legacy body attributes
    #   skin_tone / height / weight / body_proportions
    # were REMOVED from this model. They are owned exclusively by
    # outfits.AvatarPreset (SRS FR-2.3, FR-2.4, FR-2.7, FR-2.9).

    # Django required fields (simplified - no username)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # For Django admin access
    date_joined = models.DateTimeField(auto_now_add=True)

    # Custom manager
    objects = UserManager()

    # Use email as the username field
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        db_table = 'accounts_user'
        verbose_name = 'user'
        verbose_name_plural = 'users'
        # Composite index backs the prune sweep's filter
        # (status='archive' AND archived_at < cutoff).
        indexes = [
            models.Index(fields=['status', 'archived_at'], name='acct_user_status_arch_idx'),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    def get_full_name(self):
        return self.full_name

    def get_short_name(self):
        return self.email

    # NEW (no migration: this is a property, not a field).
    # The forward form of the grace-window rule: due = archived_at + 90 days.
    # NULL archived_at (legacy rows) => due immediately => returns None, and
    # callers treat None as "already eligible". Imports are local to the body
    # so this can never create a circular import with accounts.archive.
    @property
    def archive_due_date(self):
        if self.archived_at is None:
            return None
        from datetime import timedelta
        from accounts.archive import ARCHIVE_GRACE_DAYS
        return self.archived_at + timedelta(days=ARCHIVE_GRACE_DAYS)


# ---------------------------------------------------------------------------
# ONE FLAT DOCUMENT PER FITTING-STUDIO VISIT (Criterion 9 / 11, OBJ-01 / KAN-89).
# In MongoDB Compass each visit is a standalone, human-readable document with
# scalar columns (pre/post confidence, keep-intent, computed gain, like/dislike)
# plus the owner's email denormalized in (no join needed to read it).
# The newest visit is ALSO mirrored as User.latest_fitting_studio_survey so the
# rating is visible directly on the accounts_user document.
# ---------------------------------------------------------------------------
class FittingStudioSurvey(models.Model):
    VOTE_CHOICES = (
        ('like', 'Like'),
        ('dislike', 'Dislike'),
    )

    # Owner FK; related_name keeps a natural accessor:
    # user.fitting_studio_surveys.all()
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='fitting_studio_surveys',
    )
    # Denormalized for readability in Compass.
    user_email = models.EmailField(blank=True, default='', max_length=254)

    # Client-generated studio-visit id (bounded by the view's sanitizer).
    session_id = models.CharField(max_length=64, blank=True, default='')
    user_type = models.CharField(max_length=16, default='registered')

    # The four 1-5 star answers (same direction pre & post so the ≥+1 gain
    # calculation for Criterion 9 stays valid). NULL = skipped / not asked.
    pre_confidence = models.IntegerField(blank=True, null=True)
    pre_return_intent = models.IntegerField(blank=True, null=True)
    post_confidence = models.IntegerField(blank=True, null=True)
    post_return_intent = models.IntegerField(blank=True, null=True)

    # Server-computed delta (post_confidence - pre_confidence); NULL when
    # either side is missing. Makes the OBJ-01 gain visible at a glance.
    confidence_gain = models.IntegerField(blank=True, null=True)

    # Binary fit-visualization reaction (Criterion 9 "like" evidence).
    fit_like_dislike = models.CharField(
        max_length=8, choices=VOTE_CHOICES, blank=True, null=True
    )

    # Context snapshots (tried-on catalog ids + avatar state at submit time).
    equipped_item_ids = models.JSONField(default=list, blank=True)
    avatar_context = models.JSONField(default=dict, blank=True)

    # default (not auto_now_add) so future data ports can preserve timestamps.
    submitted_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'accounts_fittingstudiosurvey'
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['user', 'submitted_at'], name='acct_fss_user_time'),
        ]

    def __str__(self):
        return (
            f"FittingStudioSurvey {self.session_id or self.pk} "
            f"({self.user_email}) gain={self.confidence_gain}"
        )