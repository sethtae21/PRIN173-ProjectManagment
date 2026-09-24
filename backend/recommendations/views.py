"""Read-only recommendation API. Guest-accessible because SRS Sec. 4.2 states
read-only endpoints may be accessed by Guests."""
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
        avatar = AvatarProfile(
            undertone=request.query_params.get("undertone", "neutral"),
            height_cm=_as_float(request.query_params.get("height_cm"), 170.0),
            body_shape=request.query_params.get("body_shape", "balanced"),
            style_tags=_as_tuple(request.query_params.get("styles", "")),
            occasion_tags=_as_tuple(request.query_params.get("occasions", "")),
        )
        limit = int(_as_float(request.query_params.get("limit"), 10))
        # TODO(Carlos): restrict to published items using the real status field
        # in catalog/models.py, e.g. CatalogItem.objects.filter(status="active")
        items = [_item_profile(i) for i in CatalogItem.objects.all()]
        ranked = rank_items(avatar, items, limit=limit)
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