from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class Rating(models.Model):
    """
    In-app rating for recommended items & fit visualizations (SRS FR-7.5).

    REGISTERED USERS ONLY: guests have no rating rights. Guest clicks are
    refused server-side (403) and only ever show the sign-up/login prompt in
    the UI; no guest reaction is cached or persisted (FR-1.9).

    Two INDEPENDENT dimensions (so stars never masquerade as likes):
      - score : 1..5 star rating  -> feeds average / score_count only
      - vote  : like | dislike    -> feeds like_count / dislike_count only
    Either or both may be set on a single (user, target, source) row.

    `source` tags which UI surface produced the rating so UAT KPI reports can
    cleanly separate:
      * recommendation_panel  -> OBJ-05 / Criterion 10 (recommendation approval)
      * fit_visualization     -> OBJ-01 / Criterion 9  (fit confidence like)
      * product_page          -> product review (context only)
      * order_history         -> post-purchase (context only)
      * '' (empty)            -> legacy rows written before the field existed
    """
    TARGET_CHOICES = [('item', 'Catalog Item'), ('fit', 'Fit Visualization')]
    VOTE_CHOICES = [('like', 'Like'), ('dislike', 'Dislike')]
    SOURCE_CHOICES = [
        ('', 'Unspecified'),
        ('recommendation_panel', 'Recommendation Panel'),
        ('fit_visualization', 'Fit Visualization'),
        ('product_page', 'Product Page'),
        ('order_history', 'Order History'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ratings')
    target_type = models.CharField(max_length=10, choices=TARGET_CHOICES)
    target_id = models.CharField(max_length=50)  # ObjectId stored as string

    score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)])
    vote = models.CharField(max_length=10, choices=VOTE_CHOICES, null=True, blank=True)

    source = models.CharField(
        max_length=32, choices=SOURCE_CHOICES, blank=True, default='')

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
        bits = []
        if self.score is not None:
            bits.append(f"{self.score}★")
        if self.vote:
            bits.append(self.vote)
        source_label = self.source or 'unspecified'
        return (
            f"{self.user} -> {self.target_type}:{self.target_id} "
            f"[{', '.join(bits) or 'empty'}] ({source_label})"
        )