from rest_framework import serializers

from .models import Rating, UATResponse, UATSession


class RatingSerializer(serializers.ModelSerializer):
    """
    Accepts score (1-5) and/or vote (like/dislike) independently.
    At least one must be present on CREATE. Neither is folded into the other.
    Accepts optional `source` to tag the UI surface that produced the rating.
    """
    id = serializers.CharField(read_only=True)
    user = serializers.CharField(read_only=True, source='user_id')

    score = serializers.IntegerField(required=False, allow_null=True,
                                     min_value=1, max_value=5)
    vote = serializers.ChoiceField(choices=['like', 'dislike'],
                                   required=False, allow_null=True, allow_blank=True)
    source = serializers.ChoiceField(
        choices=['', 'recommendation_panel', 'fit_visualization',
                 'product_page', 'order_history'],
        required=False, allow_blank=True, default='',
    )

    class Meta:
        model = Rating
        fields = ['id', 'user', 'target_type', 'target_id', 'score', 'vote',
                  'source', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']

    def validate(self, attrs):
        # Normalize blank vote -> None so it doesn't count as a reaction
        if attrs.get('vote') == '':
            attrs['vote'] = None

        has_score = attrs.get('score') is not None
        has_vote = attrs.get('vote') is not None

        # On CREATE require at least one real signal; on PARTIAL UPDATE allow either/none
        if self.instance is None and not (has_score or has_vote):
            raise serializers.ValidationError(
                {'detail': 'Provide score (1-5) and/or vote (like/dislike).'})
        return attrs


class UATSessionSerializer(serializers.ModelSerializer):
    user = serializers.CharField(read_only=True, source='user_id')

    class Meta:
        model = UATSession
        fields = ['session_id', 'user', 'role', 'product_id', 'status', 'started_at', 'completed_at']
        read_only_fields = ['session_id', 'user', 'started_at', 'completed_at']


class UATResponseSerializer(serializers.ModelSerializer):
    session_id = serializers.CharField(source='session_id', read_only=True)

    class Meta:
        model = UATResponse
        fields = ['session_id', 'product_id', 'question_key', 'phase', 'value', 'created_at', 'updated_at']
        read_only_fields = ['session_id', 'created_at', 'updated_at']


class RatingSummarySerializer(serializers.Serializer):
    """Read-only aggregate payload for GET /ratings/summary/."""
    target_type = serializers.CharField()
    target_id = serializers.CharField()
    source = serializers.CharField(allow_blank=True)
    # Star dimension (score only)
    score_count = serializers.IntegerField()
    average = serializers.FloatField()
    star_counts = serializers.DictField(child=serializers.IntegerField())
    # Reaction dimension (like/dislike only)
    like_count = serializers.IntegerField()
    dislike_count = serializers.IntegerField()
    # Guest per-session aggregates (FR-1.9). Guests can no longer submit
    # ratings, so these always read 0; kept for contract stability.
    guest_session_score_count = serializers.IntegerField()
    guest_session_average = serializers.FloatField()
    guest_session_like_count = serializers.IntegerField()
    guest_session_dislike_count = serializers.IntegerField()