import logging
from django.conf import settings
from django.core.cache import cache
from django.db.models import Count
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Rating
from .serializers import RatingSerializer, RatingSummarySerializer

logger = logging.getLogger(__name__)

GUEST_TTL = getattr(settings, 'GUEST_SESSION_TTL', 3600)

VALID_SOURCES = {
    '', 'recommendation_panel', 'fit_visualization',
    'product_page', 'order_history',
}


def _guest_index_key(session_key):
    return f'guest_rating_keys:{session_key}'


def _guest_key(request, target_type, target_id, create=True):
    key = request.session.session_key
    if not key:
        if not create:
            return None
        request.session.create()
        key = request.session.session_key
    return f"guest_rating:{key}:{target_type}:{target_id}"


class RatingSubmitView(APIView):
    """
    POST /ratings/ — REGISTERED USERS ONLY. Guests have no rating rights:
    unauthenticated submissions are refused with 403 + a signup/login prompt
    payload (FR-7.5). Nothing is cached or persisted for guests (FR-1.9).

    Registered user -> upsert the (user, target, source) row, updating ONLY the
    dimensions present in the payload (stars never overwrite a like, etc.).

    NOTE: permission_classes stays AllowAny on purpose so we can answer a clean
    403; DRF's IsAuthenticated would answer 401, which the frontend's token
    lifecycle interprets as a session reset for guests.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # ---------- GUEST REJECTION (no rating rights) ----------
        if not request.user.is_authenticated:
            logger.info("Guest rating attempt refused (403): no rating rights.")
            return Response({
                'detail': 'Registration is required to rate items.',
                'prompt': 'signup_login',
                'persisted': False,
            }, status=status.HTTP_403_FORBIDDEN)

        # ---------- REGISTERED PATH ----------
        serializer = RatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data
        target_type = vd['target_type']
        target_id = vd['target_id']
        score = vd.get('score')
        vote = vd.get('vote')
        source = vd.get('source', '') or ''
        if source not in VALID_SOURCES:
            return Response(
                {'detail': f'Invalid source "{source}". '
                           f'Allowed: {sorted(VALID_SOURCES)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rating, created = Rating.objects.get_or_create(
            user=request.user,
            target_type=target_type,
            target_id=target_id,
            source=source,
        )
        # Apply ONLY the dimensions supplied, preserving the other one
        if 'score' in vd:
            rating.score = vd['score']
        if 'vote' in vd:
            rating.vote = vd['vote']
        rating.save()

        return Response({
            'persisted': True,
            'created': created,
            'rating': RatingSerializer(rating).data,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class RatingSummaryView(APIView):
    """
    GET /ratings/summary/?target_type=&target_id=[&source=]
    Public aggregate. Optional `source` filter restricts the counts to one UI
    surface (e.g. ?source=recommendation_panel for UAT OBJ-05 evidence).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        target_type = request.query_params.get('target_type')
        target_id = request.query_params.get('target_id')
        if not target_type or not target_id:
            return Response({'error': 'target_type and target_id are required'},
                            status=status.HTTP_400_BAD_REQUEST)

        source = request.query_params.get('source', '')
        if source and source not in VALID_SOURCES:
            return Response(
                {'error': f'Invalid source "{source}". '
                          f'Allowed: {sorted(VALID_SOURCES)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = Rating.objects.filter(target_type=target_type, target_id=target_id)
        if source:
            qs = qs.filter(source=source)

        # Star dimension: ignore nulls so likes/dislikes never skew the average
        scores = [s for s in qs.values_list('score', flat=True) if s is not None]
        score_count = len(scores)
        average = round(sum(scores) / score_count, 2) if score_count else 0.0

        star_counts = {str(i): 0 for i in range(1, 6)}
        for row in qs.values('score').annotate(count=Count('id')):
            if row['score'] is not None:
                star_counts[str(row['score'])] = row['count']

        like_count = qs.filter(vote='like').count()
        dislike_count = qs.filter(vote='dislike').count()

        # Guest per-session aggregates: guests can no longer submit ratings, so
        # any legacy cache entry is the only possible source; normally zero.
        g_score_count = g_avg = 0.0
        g_like = g_dislike = 0
        if not request.user.is_authenticated:
            key = _guest_key(request, target_type, target_id, create=False)
            agg = cache.get(key) if key else None
            if agg:
                g_score_count = agg.get('score_count', 0)
                g_avg = round(agg.get('score_sum', 0) / g_score_count, 2) if g_score_count else 0.0
                g_like = agg.get('like_count', 0)
                g_dislike = agg.get('dislike_count', 0)

        data = {
            'target_type': target_type,
            'target_id': target_id,
            'source': source or 'all',
            'score_count': score_count,
            'average': average,
            'like_count': like_count,
            'dislike_count': dislike_count,
            'star_counts': star_counts,
            'guest_session_score_count': g_score_count,
            'guest_session_average': g_avg,
            'guest_session_like_count': g_like,
            'guest_session_dislike_count': g_dislike,
        }
        return Response(RatingSummarySerializer(data).data)


class GuestSessionClearView(APIView):
    """POST /ratings/guest-session/clear/ — discards any legacy guest cache
    aggregates and flushes the guest session (FR-1.9 housekeeping)."""
    permission_classes = [AllowAny]

    def post(self, request):
        if request.user.is_authenticated:
            return Response({'cleared': False}, status=status.HTTP_200_OK)

        session_key = request.session.session_key
        if session_key:
            index_key = _guest_index_key(session_key)
            guest_keys = cache.get(index_key) or []
            cache.delete_many([*guest_keys, index_key])
            request.session.flush()
        return Response({'cleared': True}, status=status.HTTP_200_OK)


class MyRatingsView(APIView):
    """GET /ratings/mine/ — list own persisted ratings."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Rating.objects.filter(user=request.user)
        return Response(RatingSerializer(qs, many=True).data)


class RatingDetailView(APIView):
    """PATCH / DELETE /ratings/<id>/ — owner-only (everyone else gets 404)."""
    permission_classes = [IsAuthenticated]

    def _get_own(self, request, pk):
        return Rating.objects.filter(user=request.user, id=pk).first()

    def patch(self, request, pk):
        rating = self._get_own(request, pk)
        if rating is None:
            return Response({'error': 'Rating not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = RatingSerializer(rating, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data
        if 'score' in vd:
            rating.score = vd['score']
        if 'vote' in vd:
            rating.vote = vd['vote']
        rating.save()
        return Response(RatingSerializer(rating).data)

    def delete(self, request, pk):
        rating = self._get_own(request, pk)
        if rating is None:
            return Response({'error': 'Rating not found'}, status=status.HTTP_404_NOT_FOUND)
        rating.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)