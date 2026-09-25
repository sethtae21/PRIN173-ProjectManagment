import logging

from django.conf import settings
from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Rating
from .serializers import RatingSerializer, RatingSummarySerializer

logger = logging.getLogger(__name__)

GUEST_TTL = getattr(settings, 'SESSION_COOKIE_AGE', 1209600)
_MISSING = object()


def _guest_key(request, target_type, target_id):
    key = request.session.session_key
    if not key:
        request.session.create()
        key = request.session.session_key
    return f"guest_rating:{key}:{target_type}:{target_id}"


def _empty_session_agg():
    return {'score_count': 0, 'score_sum': 0, 'like_count': 0, 'dislike_count': 0}


class RatingSubmitView(APIView):
    """
    POST /ratings/
      - Registered user -> upsert the (user,target) row, updating ONLY the
        dimensions present in the payload (stars never overwrite a like, etc.).
      - Guest -> NOT persisted; accumulate per-session in cache (discarded with
        session, FR-1.9) and return the sign-up/login prompt (FR-7.5).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data
        target_type = vd['target_type']
        target_id = vd['target_id']
        score = vd.get('score')
        vote = vd.get('vote')

        # ---------- GUEST PATH ----------
        if not request.user.is_authenticated:
            key = _guest_key(request, target_type, target_id)
            agg = cache.get(key) or _empty_session_agg()
            if score is not None:
                agg['score_count'] += 1
                agg['score_sum'] += score
            if vote == 'like':
                agg['like_count'] += 1
            elif vote == 'dislike':
                agg['dislike_count'] += 1
            cache.set(key, agg, GUEST_TTL)
            logger.info(f"Guest session rating {target_type}:{target_id} -> {agg}")
            return Response({
                'persisted': False,
                'prompt': 'signup_login',
                'message': 'Sign up or log in to save your rating permanently.',
                'session_aggregate': {
                    'score_count': agg['score_count'],
                    'average': round(agg['score_sum'] / agg['score_count'], 2) if agg['score_count'] else 0.0,
                    'like_count': agg['like_count'],
                    'dislike_count': agg['dislike_count'],
                },
            }, status=status.HTTP_200_OK)

        # ---------- REGISTERED PATH ----------
        rating, created = Rating.objects.get_or_create(
            user=request.user, target_type=target_type, target_id=target_id)
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
    """GET /ratings/summary/?target_type=&target_id= — public aggregate."""
    permission_classes = [AllowAny]

    def get(self, request):
        target_type = request.query_params.get('target_type')
        target_id = request.query_params.get('target_id')
        if not target_type or not target_id:
            return Response({'error': 'target_type and target_id are required'},
                            status=status.HTTP_400_BAD_REQUEST)

        qs = Rating.objects.filter(target_type=target_type, target_id=target_id)

        # Star dimension: ignore nulls so likes/dislikes never skew the average
        scores = [s for s in qs.values_list('score', flat=True) if s is not None]
        score_count = len(scores)
        average = round(sum(scores) / score_count, 2) if score_count else 0.0

        # Reaction dimension
        like_count = qs.filter(vote='like').count()
        dislike_count = qs.filter(vote='dislike').count()

        # Guest per-session aggregates
        g_score_count = g_avg = 0.0
        g_like = g_dislike = 0
        if not request.user.is_authenticated:
            agg = cache.get(_guest_key(request, target_type, target_id))
            if agg:
                g_score_count = agg['score_count']
                g_avg = round(agg['score_sum'] / g_score_count, 2) if g_score_count else 0.0
                g_like = agg['like_count']
                g_dislike = agg['dislike_count']

        data = {
            'target_type': target_type,
            'target_id': target_id,
            'score_count': score_count,
            'average': average,
            'like_count': like_count,
            'dislike_count': dislike_count,
            'guest_session_score_count': g_score_count,
            'guest_session_average': g_avg,
            'guest_session_like_count': g_like,
            'guest_session_dislike_count': g_dislike,
        }
        return Response(RatingSummarySerializer(data=data).data)


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