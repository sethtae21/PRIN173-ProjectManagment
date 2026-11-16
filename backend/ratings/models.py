import uuid

from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


def generate_uat_session_id():
    return uuid.uuid4().hex


# ---------------------------------------------------------------------------
# UAT survey value envelope. "No" on a Yes/No question encodes as 0, so the
# lower bound MUST be 0 (not 1). Locked by CharterThresholdLockTests.
# ---------------------------------------------------------------------------
UAT_VALUE_MIN = 0
UAT_VALUE_MAX = 5


class Rating(models.Model):
    """
    In-app STAR rating (SRS FR-7.5 / Scope Criteria 9-11).

    STAR-ONLY BASELINE:
      * score is a REQUIRED integer 1..5. 4-5 = Approval, 1-3 = Not approval.
      * There is NO vote / like / dislike dimension anywhere (model, API,
        summary, KPI). Legacy vote-only rows were dropped by migration 0003.
      * REGISTERED SHOPPERS ONLY. Guests are refused server-side (403) and
        nothing is cached or persisted for them (FR-1.9). Sellers are refused
        too — ratings are a shopper surface.

    `source` tags the UI surface so UAT KPI reports separate cleanly:
      * recommendation_panel -> OBJ-05 / Criterion 10 (per recommended item)
      * fit_visualization    -> OBJ-01 / Criterion 9  (on-avatar + checkout
                                fit-accuracy)
      * product_page         -> product review (context only)
      * order_history        -> post-purchase (context only)
    """
    TARGET_CHOICES = [('item', 'Catalog Item'), ('fit', 'Fit Visualization')]
    SOURCE_CHOICES = [
        ('recommendation_panel', 'Recommendation Panel'),
        ('fit_visualization', 'Fit Visualization'),
        ('product_page', 'Product Page'),
        ('order_history', 'Order History'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ratings')
    target_type = models.CharField(max_length=10, choices=TARGET_CHOICES)
    target_id = models.CharField(max_length=50)  # ObjectId stored as string

    # REQUIRED, non-null, strict 1..5 stars.
    score = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)])

    source = models.CharField(max_length=32, choices=SOURCE_CHOICES)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_rating'
        unique_together = ('user', 'target_type', 'target_id', 'source')
        indexes = [
            models.Index(fields=['target_type', 'target_id']),
            models.Index(fields=['source']),
        ]
        ordering = ['-updated_at']

    def __str__(self):
        return (
            f"{self.user} -> {self.target_type}:{self.target_id} "
            f"[{self.score}★] ({self.source})"
        )


class UATSession(models.Model):
    role = models.CharField(max_length=10, choices=[('shopper', 'Shopper'), ('seller', 'Seller')], default='shopper')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='uat_sessions')
    session_id = models.CharField(max_length=32, primary_key=True, default=generate_uat_session_id, editable=False)
    product_id = models.CharField(max_length=50, blank=True, default='')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=[('active', 'Active'), ('completed', 'Completed')], default='active')
    notes = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'uat_session'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['product_id']),
        ]

    def __str__(self):
        return f"UAT {self.session_id} ({self.role})"


class UATResponse(models.Model):
    PHASE_CHOICES = [('before', 'Before'), ('after', 'After'), ('supplementary', 'Supplementary')]
    question_key = models.CharField(max_length=80)
    phase = models.CharField(max_length=20, choices=PHASE_CHOICES, default='before')
    product_id = models.CharField(max_length=50)
    value = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(UAT_VALUE_MIN), MaxValueValidator(UAT_VALUE_MAX)])
    session = models.ForeignKey(UATSession, on_delete=models.CASCADE, related_name='responses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'uat_response'
        unique_together = ('session', 'product_id', 'question_key', 'phase')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session', 'product_id']),
            models.Index(fields=['question_key', 'phase']),
        ]

    def __str__(self):
        return f"{self.session_id} {self.phase}:{self.question_key}={self.value}"