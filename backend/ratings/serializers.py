from rest_framework import serializers

from .models import Rating, UATResponse, UATSession


class StrictStarField(serializers.IntegerField):
    """
    STRICT 1..5 integer stars (SRS FR-7.5 star-only baseline).

    DRF's IntegerField happily coerces "5", 5.0 and True into 5. The baseline
    requires an actual integer, so every non-int (including bool, which is an
    int subclass in Python) is rejected with 400 instead of being coerced.
    """

    def to_internal_value(self, data):
        if isinstance(data, bool) or not isinstance(data, int):
            self.fail('invalid')
        return super().to_internal_value(data)


class RatingSerializer(serializers.ModelSerializer):
    """
    STAR-ONLY payload: { target_type, target_id, score (int 1..5), source }.
    `score` and `source` are REQUIRED. There is no vote/like/dislike field.

    HARDENING (defense-in-depth): legacy `vote` / `like` / `dislike` keys in
    the request body are EXPLICITLY REJECTED (400), not silently dropped.
    Without this guard, a stale client sending `{"score": 5, "vote": "like"}`
    would still save the score and the vote would vanish — masking the
    client-side drift from the terminal.
    """
    id = serializers.CharField(read_only=True)
    user = serializers.CharField(read_only=True, source='user_id')

    score = StrictStarField(min_value=1, max_value=5)
    source = serializers.ChoiceField(choices=Rating.SOURCE_CHOICES)

    class Meta:
        model = Rating
        fields = ['id', 'user', 'target_type', 'target_id', 'score',
                  'source', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        if hasattr(data, 'keys'):
            legacy = {'vote', 'like', 'dislike'}.intersection(data.keys())
            if legacy:
                raise serializers.ValidationError({
                    key: 'Like/dislike voting is no longer supported; submit a 1-5 star score instead.'
                    for key in sorted(legacy)
                })
        return super().to_internal_value(data)


class UATSessionSerializer(serializers.ModelSerializer):
    user = serializers.CharField(read_only=True, source='user_id')

    class Meta:
        model = UATSession
        fields = ['session_id', 'user', 'role', 'product_id', 'status', 'started_at', 'completed_at']
        read_only_fields = ['session_id', 'user', 'started_at', 'completed_at']


class UATResponseSerializer(serializers.ModelSerializer):
    session_id = serializers.CharField(read_only=True)

    class Meta:
        model = UATResponse
        fields = ['session_id', 'product_id', 'question_key', 'phase', 'value', 'created_at', 'updated_at']
        read_only_fields = ['session_id', 'created_at', 'updated_at']


class RatingSummarySerializer(serializers.Serializer):
    """Read-only STAR aggregate for GET /ratings/summary/ (no vote counts)."""
    target_type = serializers.CharField()
    target_id = serializers.CharField()
    source = serializers.CharField(allow_blank=True)
    score_count = serializers.IntegerField()
    average = serializers.FloatField()
    star_counts = serializers.DictField(child=serializers.IntegerField())
    approval_count = serializers.IntegerField()