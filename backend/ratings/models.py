from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class Rating(models.Model):
    """
    In-app rating for recommended items & fit visualizations (SRS FR-7.5).

    Two INDEPENDENT dimensions (so stars never masquerade as likes):
      - score : 1..5 star rating  -> feeds average / score_count only
      - vote  : like | dislike    -> feeds like_count / dislike_count only
    Either or both may be set on a single (user, target) row.

    Persisted ONLY for registered users. Guest reactions live in per-session
    cache and are discarded with the session (FR-1.9).
    """
    TARGET_CHOICES = [('item', 'Catalog Item'), ('fit', 'Fit Visualization')]
    VOTE_CHOICES = [('like', 'Like'), ('dislike', 'Dislike')]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ratings')
    target_type = models.CharField(max_length=10, choices=TARGET_CHOICES)
    target_id = models.CharField(max_length=50)  # ObjectId stored as string

    score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)])
    vote = models.CharField(max_length=10, choices=VOTE_CHOICES, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_rating'
        unique_together = ('user', 'target_type', 'target_id')  # one row per user+target
        indexes = [models.Index(fields=['target_type', 'target_id'])]
        ordering = ['-updated_at']

    def __str__(self):
        bits = []
        if self.score is not None:
            bits.append(f"{self.score}★")
        if self.vote:
            bits.append(self.vote)
        return f"{self.user} -> {self.target_type}:{self.target_id} [{', '.join(bits) or 'empty'}]"