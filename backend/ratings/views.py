import csv
import logging

from django.core.cache import cache
from django.db.models import Count
from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Rating, UATResponse, UATSession, UAT_VALUE_MIN, UAT_VALUE_MAX
from .serializers import (
    RatingSerializer,
    RatingSummarySerializer,
    UATResponseSerializer,
)
# Single source of truth for charter KPIs. build_uat_workbook_rows is re-exported
# here on purpose: ratings/management/commands/export_uat_workbook.py and
# UATExportCSVView import it from this module.
from .uat_kpis import (
    APPROVAL_MIN_SCORE,
    KNOWN_QUESTION_KEYS,
    build_uat_workbook_rows,
)

logger = logging.getLogger(__name__)

# STAR-ONLY baseline: exactly the four SADD sources. The undocumented
# 'fitting_studio_popup' tag and the empty legacy tag are GONE.
VALID_SOURCES = {
    'recommendation_panel', 'fit_visualization',
    'product_page', 'order_history',
}

SHOPPER_ONLY_DETAIL = 'Only registered shoppers can submit ratings.'


def _guest_index_key(session_key):
    return f'guest_rating_keys:{session_key}'


def _legacy_guest_keys(request):
    """Read-only lookup of LEGACY guest cache keys so they can be DELETED.
    Nothing is ever written to the cache for a guest (FR-1.9)."""
    session_key = request.session.session_key
    if not session_key:
        return []
    index_key = _guest_index_key(session_key)
    return [*(cache.get(index_key) or []), index_key]


def _is_shopper(user):
    return getattr(user, 'role', None) == 'shopper'


class RatingSubmitView(APIView):
    """
    POST /ratings/ — REGISTERED SHOPPERS ONLY, STAR-ONLY (1..5 integer).

    * Guest  -> 403 + signup/login prompt; NOTHING cached or persisted.
    * Seller -> 403 (ratings are a shopper surface).
    * Shopper-> upsert the (user, target_type, target_id, source) row's score.

    permission_classes stays AllowAny on purpose so guests get a clean 403
    (DRF IsAuthenticated would answer 401, which the frontend token lifecycle
    interprets as a session reset).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not request.user.is_authenticated:
            logger.info("Guest rating attempt refused (403): no rating rights.")
            return Response({
                'detail': 'Registration is required to rate items.',
                'prompt': 'signup_login',
                'persisted': False,
            }, status=status.HTTP_403_FORBIDDEN)

        if not _is_shopper(request.user):
            return Response(
                {'detail': SHOPPER_ONLY_DETAIL, 'persisted': False},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data
        source = vd['source']
        if source not in VALID_SOURCES:
            return Response(
                {'detail': f'Invalid source "{source}". '
                           f'Allowed: {sorted(VALID_SOURCES)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rating, created = Rating.objects.get_or_create(
            user=request.user,
            target_type=vd['target_type'],
            target_id=vd['target_id'],
            source=source,
            defaults={'score': vd['score']},
        )
        if not created:
            rating.score = vd['score']
            rating.save(update_fields=['score', 'updated_at'])

        return Response({
            'persisted': True,
            'created': created,
            'rating': RatingSerializer(rating).data,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class RatingSummaryView(APIView):
    """
    GET /ratings/summary/?target_type=&target_id=[&source=]
    Public STAR aggregate. 4-5 stars = approval (approval_count).
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

        scores = [s for s in qs.values_list('score', flat=True) if s is not None]
        score_count = len(scores)
        average = round(sum(scores) / score_count, 2) if score_count else 0.0

        star_counts = {str(i): 0 for i in range(1, 6)}
        for row in qs.values('score').annotate(count=Count('id')):
            if row['score'] is not None:
                star_counts[str(row['score'])] = row['count']

        approval_count = sum(1 for s in scores if s >= APPROVAL_MIN_SCORE)

        return Response(RatingSummarySerializer({
            'target_type': target_type,
            'target_id': target_id,
            'source': source or 'all',
            'score_count': score_count,
            'average': average,
            'star_counts': star_counts,
            'approval_count': approval_count,
        }).data)


class GuestSessionClearView(APIView):
    """POST /ratings/guest-session/clear/ — deletes any LEGACY guest cache
    aggregates and flushes the guest session (FR-1.9 housekeeping).
    Never writes anything."""
    permission_classes = [AllowAny]

    def post(self, request):
        if request.user.is_authenticated:
            return Response({'cleared': False}, status=status.HTTP_200_OK)
        keys = _legacy_guest_keys(request)
        if keys:
            cache.delete_many(keys)
        if request.session.session_key:
            request.session.flush()
        return Response({'cleared': True}, status=status.HTTP_200_OK)


class MyRatingsView(APIView):
    """GET /ratings/mine/ — the caller's persisted stars (server truth used by
    the UI to rehydrate ratings after reload / logout / login)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Rating.objects.filter(user=request.user)
        return Response(RatingSerializer(qs, many=True).data)


class RatingDetailView(APIView):
    """PATCH / DELETE /ratings/<id>/ — owner-only, shopper-only.

    CHANGED (audit fix #8a): delete now also requires `_is_shopper`. Previously
    create required shopper but delete only required ownership, which left a
    symmetry gap (a seller couldn't create but could delete their own, and a
    seller who somehow got a row into the table could remove it).
    """
    permission_classes = [IsAuthenticated]

    def _get_own(self, request, pk):
        return Rating.objects.filter(user=request.user, id=pk).first()

    def patch(self, request, pk):
        rating = self._get_own(request, pk)
        if rating is None:
            return Response({'error': 'Rating not found'}, status=status.HTTP_404_NOT_FOUND)
        if not _is_shopper(request.user):
            return Response({'detail': SHOPPER_ONLY_DETAIL}, status=status.HTTP_403_FORBIDDEN)
        serializer = RatingSerializer(rating, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if 'score' in serializer.validated_data:
            rating.score = serializer.validated_data['score']
            rating.save(update_fields=['score', 'updated_at'])
        return Response(RatingSerializer(rating).data)

    def delete(self, request, pk):
        if not _is_shopper(request.user):
            return Response({'detail': SHOPPER_ONLY_DETAIL}, status=status.HTTP_403_FORBIDDEN)
        rating = self._get_own(request, pk)
        if rating is None:
            return Response({'error': 'Rating not found'}, status=status.HTTP_404_NOT_FOUND)
        rating.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UATSessionCreateView(APIView):
    """POST /ratings/uat/session/ — start a tester session.

    FIX (OBJ-01 join): persist product_id from the payload. The OBJ-01 KPI
    joins fit-visualization ratings to sessions by (user, product).

    CHANGED (audit fix #8b): REGISTERED SHOPPERS ONLY. A seller logging a UAT
    session would contaminate the OBJ-01 / OBJ-05 / OBJ-06 evidence denominators.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _is_shopper(request.user):
            return Response({'detail': SHOPPER_ONLY_DETAIL}, status=status.HTTP_403_FORBIDDEN)

        role = request.data.get('role', request.user.role)
        if role not in {'shopper', 'seller'}:
            return Response({'detail': 'Invalid UAT role.'}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role != role:
            return Response({'detail': 'Role mismatch for this tester session.'}, status=status.HTTP_403_FORBIDDEN)

        product_id = str(request.data.get('product_id') or '').strip()
        session = UATSession.objects.create(
            user=request.user, role=role, status='active', product_id=product_id)
        return Response({
            'session_id': session.session_id,
            'status': session.status,
            'role': session.role,
            'product_id': session.product_id,
        }, status=status.HTTP_201_CREATED)


class UATResponseSubmitView(APIView):
    """POST /ratings/uat/response/ — save one survey answer.

    `value == 0` is LEGAL (style_discovery "No"). Fractions are refused, not
    truncated. Unknown question keys are rejected against KNOWN_QUESTION_KEYS.
    Sessions stay 'active' so the server-side commerce hook can still record
    cart_created / checkout_completed.

    CHANGED (audit fix #8b): REGISTERED SHOPPERS ONLY. A seller logging a UAT
    response would contaminate the charter evidence paired-answer calculations.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _is_shopper(request.user):
            return Response({'detail': SHOPPER_ONLY_DETAIL}, status=status.HTTP_403_FORBIDDEN)

        session_id = request.data.get('session_id')
        if not session_id:
            return Response({'detail': 'session_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        session = UATSession.objects.filter(session_id=session_id, user=request.user).first()
        if session is None:
            return Response({'detail': 'UAT session not found or not owned by this account.'}, status=status.HTTP_404_NOT_FOUND)

        product_id = str(request.data.get('product_id') or '').strip()
        question_key = str(request.data.get('question_key') or request.data.get('key') or '').strip()
        phase = str(request.data.get('phase') or 'before').strip()
        if not question_key:
            return Response({'detail': 'question_key is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not product_id:
            return Response({'detail': 'product_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if question_key not in KNOWN_QUESTION_KEYS:
            return Response(
                {'detail': f"Unknown UAT question '{question_key}'. "
                           f'Allowed: {", ".join(sorted(KNOWN_QUESTION_KEYS))}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        value = request.data.get('value')
        if value is None or value == '':
            return Response({'detail': 'value is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if isinstance(value, bool):
            return Response({'detail': 'value must be a whole number.'}, status=status.HTTP_400_BAD_REQUEST)
        if isinstance(value, float):
            if not value.is_integer():
                return Response({'detail': 'value must be a whole number.'}, status=status.HTTP_400_BAD_REQUEST)
            numeric_value = int(value)
        elif isinstance(value, int):
            numeric_value = value
        elif isinstance(value, str):
            if '.' in value:
                return Response({'detail': 'value must be a whole number.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                numeric_value = int(value)
            except ValueError:
                return Response({'detail': 'value must be a whole number.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'detail': 'value must be a whole number.'}, status=status.HTTP_400_BAD_REQUEST)

        if not UAT_VALUE_MIN <= numeric_value <= UAT_VALUE_MAX:
            return Response(
                {'detail': f'value must be between {UAT_VALUE_MIN} and {UAT_VALUE_MAX}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        obj, created = UATResponse.objects.update_or_create(
            session=session,
            product_id=product_id,
            question_key=question_key,
            phase=phase,
            defaults={'value': numeric_value},
        )
        return Response({
            'created': created,
            'response': UATResponseSerializer(obj).data,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class UATExportCSVView(APIView):
    """GET /ratings/uat/export/ — staff-only CSV of the charter KPI workbook."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'Staff access required.'}, status=status.HTTP_403_FORBIDDEN)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="fitfusion_uat_results.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'KPI', 'Charter objective', 'Target', 'Actual result', 'Sample size',
            'Status', 'Evidence reference', 'Numerator', 'Denominator'
        ])
        for row in build_uat_workbook_rows():
            writer.writerow([
                row['kpi'], row['objective'], row['target'], row['actual_result'],
                row['sample_size'], row['status'], row['evidence_reference'],
                row['numerator'], row['denominator'],
            ])
        return response