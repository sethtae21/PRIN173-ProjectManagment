import csv
import json
import logging
from datetime import datetime

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count
from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Rating, UATResponse, UATSession
from .serializers import RatingSerializer, RatingSummarySerializer, UATResponseSerializer, UATSessionSerializer

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


class UATSessionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        role = request.data.get('role', request.user.role)
        if role not in {'shopper', 'seller'}:
            return Response({'detail': 'Invalid UAT role.'}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role != role:
            return Response({'detail': 'Role mismatch for this tester session.'}, status=status.HTTP_403_FORBIDDEN)

        session = UATSession.objects.create(user=request.user, role=role, status='active')
        return Response({'session_id': session.session_id, 'status': session.status, 'role': session.role}, status=status.HTTP_201_CREATED)


class UATResponseSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
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

        value = request.data.get('value')
        if value is None:
            return Response({'detail': 'value is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            numeric_value = int(value)
        except (TypeError, ValueError):
            return Response({'detail': 'value must be a whole number between 0 and 5.'}, status=status.HTTP_400_BAD_REQUEST)

        if numeric_value < 0 or numeric_value > 5:
            return Response({'detail': 'value must be between 0 and 5.'}, status=status.HTTP_400_BAD_REQUEST)

        obj, created = UATResponse.objects.update_or_create(
            session=session,
            product_id=product_id,
            question_key=question_key,
            phase=phase,
            defaults={'value': numeric_value},
        )
        session.status = 'completed' if session.responses.count() else 'active'
        session.save(update_fields=['status'])
        return Response({
            'created': created,
            'response': UATResponseSerializer(obj).data,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


def _json_session_notes(raw_session_notes):
    if not raw_session_notes:
        return {}
    if isinstance(raw_session_notes, dict):
        return raw_session_notes
    try:
        parsed = json.loads(raw_session_notes)
    except (TypeError, ValueError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _mean(values):
    values = [float(value) for value in values if value is not None]
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def _format_metric(value):
    if value is None:
        return ''
    if isinstance(value, float):
        return f'{value:.2f}'
    return str(value)


def _metric_status(actual_value, target_type, threshold, allow_blank=False):
    if actual_value in (None, ''):
        return 'Not Run' if allow_blank else 'No eligible observations'
    if target_type == 'min':
        return 'Met target' if float(actual_value) >= float(threshold) else 'Below target'
    if target_type == 'max':
        return 'Met target' if float(actual_value) <= float(threshold) else 'Above target'
    if target_type == 'rate_min':
        return 'Met target' if float(actual_value) >= float(threshold) else 'Below target'
    return 'Not Run'


def _paired_question_deltas(question_key, delta_kind='after_minus_before'):
    before_values = {}
    after_values = {}
    observed_count = 0

    for response in UATResponse.objects.filter(
        question_key=question_key,
        value__isnull=False,
    ).values('session_id', 'product_id', 'phase', 'value'):
        observed_count += 1
        key = (response['session_id'], str(response['product_id']))
        if response['phase'] == 'before':
            before_values[key] = int(response['value'])
        elif response['phase'] == 'after':
            after_values[key] = int(response['value'])

    paired = []
    for key, before_value in before_values.items():
        if key in after_values:
            after_value = int(after_values[key])
            before_value = int(before_value)
            delta = after_value - before_value if delta_kind == 'after_minus_before' else before_value - after_value
            paired.append(delta)

    return observed_count, paired


def _rating_summary(question_key):
    values = list(
        UATResponse.objects.filter(
            question_key=question_key,
            value__isnull=False,
        ).values_list('value', flat=True)
    )
    if not values:
        return {'actual_result': '', 'sample_size': 0, 'numerator': '', 'denominator': '', 'status': 'Not Run'}
    numeric_values = [int(value) for value in values]
    mean_value = _mean(numeric_values)
    total = sum(numeric_values)
    count = len(numeric_values)
    return {
        'actual_result': _format_metric(mean_value),
        'sample_size': count,
        'numerator': str(total),
        'denominator': str(count),
        'status': 'Calculated',
    }


def _yes_no_summary(question_key):
    records = list(
        UATResponse.objects.filter(
            question_key=question_key,
            value__isnull=False,
        ).values_list('value', flat=True)
    )
    if not records:
        return {'actual_result': '', 'sample_size': 0, 'numerator': '', 'denominator': '', 'status': 'Not Run'}

    yes_count = sum(1 for value in records if int(value) == 1)
    total_count = len(records)
    percentage = round((yes_count / total_count) * 100, 2) if total_count else 0.0
    return {
        'actual_result': f'{percentage:.2f}%',
        'sample_size': total_count,
        'numerator': str(yes_count),
        'denominator': str(total_count),
        'status': 'Calculated',
    }


def _checkout_summary():
    responses = list(
        UATResponse.objects.filter(
            question_key='checkout_frustration',
            value__isnull=False,
        ).values_list('value', flat=True)
    )
    if not responses:
        return {'actual_result': '', 'sample_size': 0, 'numerator': '', 'denominator': '', 'status': 'Not Run'}

    values = [int(value) for value in responses]
    mean_value = _mean(values)
    total = sum(values)
    return {
        'actual_result': _format_metric(mean_value),
        'sample_size': len(values),
        'numerator': str(total),
        'denominator': str(len(values)),
        'status': 'Calculated',
    }


def _seller_validation_summary():
    responses = list(
        UATResponse.objects.filter(
            question_key='seller_validation_clarity',
            value__isnull=False,
        ).values_list('value', flat=True)
    )
    if not responses:
        return {'actual_result': '', 'sample_size': 0, 'numerator': '', 'denominator': '', 'status': 'Not Run'}
    values = [int(value) for value in responses]
    mean_value = _mean(values)
    total = sum(values)
    return {
        'actual_result': _format_metric(mean_value),
        'sample_size': len(values),
        'numerator': str(total),
        'denominator': str(len(values)),
        'status': 'Calculated',
    }


def _session_cart_conversion_summary():
    eligible_sessions = 0
    successful_sessions = 0

    for session in UATSession.objects.all():
        notes = _json_session_notes(session.notes)
        cart_optional = notes.get('cart_optional')
        if cart_optional in (True, 'true', 'True', 1, '1'):
            eligible_sessions += 1
            if notes.get('cart_added_success') in (True, 'true', 'True', 1, '1'):
                successful_sessions += 1

    if eligible_sessions == 0:
        return {
            'actual_result': 'N/A',
            'sample_size': 0,
            'numerator': '0',
            'denominator': '0',
            'status': 'No eligible observations',
        }

    rate = round((successful_sessions / eligible_sessions) * 100, 2)
    return {
        'actual_result': f'{rate:.2f}%',
        'sample_size': eligible_sessions,
        'numerator': str(successful_sessions),
        'denominator': str(eligible_sessions),
        'status': 'Calculated',
    }


def build_uat_workbook_rows():
    rows = []

    def add_row(kpi, objective, target, metric_summary, label=''):
        actual = metric_summary.get('actual_result', '')
        sample_size = metric_summary.get('sample_size', 0)
        if actual == '' and sample_size == 0 and metric_summary.get('status') == 'Not Run':
            actual_result = ''
            status = 'Not Run'
        elif actual == 'N/A':
            actual_result = 'N/A'
            status = metric_summary.get('status', 'No eligible observations')
        else:
            actual_result = actual
            status = metric_summary.get('status', 'Calculated')

        rows.append({
            'kpi': kpi,
            'objective': objective,
            'target': target,
            'actual_result': actual_result,
            'sample_size': sample_size,
            'status': status,
            'evidence_reference': '',
            'numerator': metric_summary.get('numerator', ''),
            'denominator': metric_summary.get('denominator', ''),
        })

    for question_key, label in {
        'fit_confidence': 'OBJ-01 | Fit confidence change',
        'style_confidence': 'OBJ-01 | Style confidence change',
        'purchase_confidence': 'OBJ-06 | Purchase-decision confidence change',
    }.items():
        observed_count, paired_changes = _paired_question_deltas(question_key, 'after_minus_before')
        if observed_count and paired_changes:
            average_change = _mean(paired_changes)
            metric_summary = {
                'actual_result': _format_metric(average_change),
                'sample_size': len(paired_changes),
                'numerator': str(sum(paired_changes)),
                'denominator': str(len(paired_changes)),
                'status': 'Calculated',
            }
        elif observed_count:
            metric_summary = {'actual_result': 'N/A', 'sample_size': 0, 'numerator': '', 'denominator': '', 'status': 'No eligible observations'}
        else:
            metric_summary = {'actual_result': '', 'sample_size': 0, 'numerator': '', 'denominator': '', 'status': 'Not Run'}
        add_row(
            label,
            label.split(' | ')[0],
            'Mean After − Before ≥ +1.0 point (proposed)',
            metric_summary,
        )

    observed_count, paired_changes = _paired_question_deltas('return_intent', 'before_minus_after')
    if observed_count and paired_changes:
        reduction = _mean(paired_changes)
        metric_summary = {
            'actual_result': _format_metric(reduction),
            'sample_size': len(paired_changes),
            'numerator': str(sum(paired_changes)),
            'denominator': str(len(paired_changes)),
            'status': 'Calculated',
        }
    elif observed_count:
        metric_summary = {'actual_result': 'N/A', 'sample_size': 0, 'numerator': '', 'denominator': '', 'status': 'No eligible observations'}
    else:
        metric_summary = {'actual_result': '', 'sample_size': 0, 'numerator': '', 'denominator': '', 'status': 'Not Run'}

    add_row(
        'OBJ-06 | Return-intent reduction',
        'OBJ-06',
        'Mean Before − After ≥ +1.0 point (proposed)',
        metric_summary,
    )

    for key, kpi in {
        'privacy_comfort': 'OBJ-02 | Privacy comfort',
        'responsiveness': 'OBJ-03 | Perceived responsiveness',
        'match_helpfulness': 'OBJ-05 | Match reasons helpfulness',
    }.items():
        metric_summary = _rating_summary(key)
        add_row(
            kpi,
            kpi.split(' | ')[0],
            'Mean ≥ 4/5 (proposed)',
            metric_summary,
        )

    style_discovery_summary = _yes_no_summary('style_discovery')
    add_row(
        'OBJ-05 | Style discovery',
        'OBJ-05',
        'Yes ÷ all Yes/No answers ≥ 60% (proposed)',
        style_discovery_summary,
    )

    conversion_summary = _session_cart_conversion_summary()
    add_row(
        'OBJ-07 | Try-on-to-cart conversion',
        'OBJ-07',
        '≥ 40% (proposed)',
        conversion_summary,
    )

    checkout_summary = _checkout_summary()
    add_row(
        'OBJ-07 | Checkout frustration',
        'OBJ-07',
        'Mean ≤ 2/5 (proposed)',
        checkout_summary,
    )

    seller_summary = _seller_validation_summary()
    add_row(
        'OBJ-09 | Seller validation clarity',
        'OBJ-09',
        'Mean ≥ 4/5 (proposed)',
        seller_summary,
    )

    return rows


class UATExportCSVView(APIView):
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
                row['kpi'],
                row['objective'],
                row['target'],
                row['actual_result'],
                row['sample_size'],
                row['status'],
                row['evidence_reference'],
                row['numerator'],
                row['denominator'],
            ])
        return response