"""Read-only recommendation API. Guest-accessible because SRS Sec. 4.2 states
read-only endpoints may be accessed by Guests."""
import math

from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import CatalogItem  # adjust model/field names to catalog/models.py

from .knowledge_table import WEIGHTS, WEIGHTS_VERSION
from .scoring import AvatarProfile, ItemProfile, rank_items


def _as_tuple(value) -> tuple:
    if value is None:
        return ()
    if isinstance(value, str):
        return tuple(v.strip() for v in value.split(",") if v.strip())
    return tuple(value)


def _as_float(value, default):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


class RecommendationQuerySerializer(serializers.Serializer):
    undertone = serializers.ChoiceField(
        choices=('warm', 'cool', 'neutral'), default='neutral', required=False
    )
    height_cm = serializers.FloatField(min_value=50, max_value=250, default=170, required=False)
    body_shape = serializers.ChoiceField(
        choices=('top-heavy', 'bottom-heavy', 'balanced'),
        default='balanced', required=False,
    )
    styles = serializers.CharField(required=False, allow_blank=True, max_length=500, default='')
    occasions = serializers.CharField(required=False, allow_blank=True, max_length=500, default='')
    limit = serializers.IntegerField(min_value=1, max_value=50, default=10, required=False)

    def validate_height_cm(self, value):
        if not math.isfinite(value):
            raise serializers.ValidationError('Height must be a finite number.')
        return value

    def _validate_tags(self, value, field_name):
        tags = tuple(tag.strip() for tag in value.split(',') if tag.strip())
        if len(tags) > 20:
            raise serializers.ValidationError(f'Provide no more than 20 {field_name} tags.')
        if any(len(tag) > 40 for tag in tags):
            raise serializers.ValidationError(f'Each {field_name} tag must be 40 characters or fewer.')
        return tags

    def validate_styles(self, value):
        return self._validate_tags(value, 'style')

    def validate_occasions(self, value):
        return self._validate_tags(value, 'occasion')


def _item_profile(item) -> ItemProfile:
    """Single adapter between catalog models and the pure scoring core.
    If catalog/models.py uses different field names, fix them HERE only."""
    return ItemProfile(
        name=item.name,
        category=(getattr(item, "category", "") or "").lower(),
        color_family=_as_tuple(getattr(item, "color_family", ())),
        color_description=getattr(item, "color_description", "") or "",
        style_tags=_as_tuple(getattr(item, "style_tags", ())),
        occasion_tags=_as_tuple(getattr(item, "occasion_tags", ())),
    )


class RecommendationListView(APIView):
    """GET /api/recommendations/ - ranked, explainable recommendations.

    Query params: undertone (warm|cool|neutral), height_cm, body_shape
    (top-heavy|bottom-heavy|balanced), styles (csv), occasions (csv), limit.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        query = RecommendationQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        values = query.validated_data
        avatar = AvatarProfile(
            undertone=values['undertone'],
            height_cm=values['height_cm'],
            body_shape=values['body_shape'],
            style_tags=values['styles'],
            occasion_tags=values['occasions'],
        )
        items = [_item_profile(i) for i in CatalogItem.objects.filter(status="active")]
        ranked = rank_items(avatar, items, limit=values['limit'])
        return Response({
            "weights_version": WEIGHTS_VERSION,
            "weights": WEIGHTS,
            "avatar_profile": {
                "undertone": avatar.undertone,
                "height_cm": avatar.height_cm,
                "body_shape": avatar.body_shape,
                "style_tags": list(avatar.style_tags),
                "occasion_tags": list(avatar.occasion_tags),
            },
            "recommendations": [b.as_dict() for b in ranked],
        })