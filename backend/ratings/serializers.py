from rest_framework import serializers

from .models import Rating


class RatingSerializer(serializers.ModelSerializer):
    """
    Accepts score (1-5) and/or vote (like/dislike) independently.
    At least one must be present on CREATE. Neither is folded into the other.
    """
    id = serializers.CharField(read_only=True)
    user = serializers.CharField(read_only=True, source='user_id')

    score = serializers.IntegerField(required=False, allow_null=True,
                                     min_value=1, max_value=5)
    vote = serializers.ChoiceField(choices=['like', 'dislike'],
                                   required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Rating
        fields = ['id', 'user', 'target_type', 'target_id', 'score', 'vote',
                  'created_at', 'updated_at']
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


class RatingSummarySerializer(serializers.Serializer):
    """Read-only aggregate payload for GET /ratings/summary/."""
    target_type = serializers.CharField()
    target_id = serializers.CharField()
    # Star dimension (score only)
    score_count = serializers.IntegerField()
    average = serializers.FloatField()
    # Reaction dimension (like/dislike only)
    like_count = serializers.IntegerField()
    dislike_count = serializers.IntegerField()
    # Guest per-session aggregates (FR-1.9)
    guest_session_score_count = serializers.IntegerField()
    guest_session_average = serializers.FloatField()
    guest_session_like_count = serializers.IntegerField()
    guest_session_dislike_count = serializers.IntegerField()