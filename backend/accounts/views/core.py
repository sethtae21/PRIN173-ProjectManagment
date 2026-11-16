"""
accounts/views/core.py
Profile management + Fitting Studio survey (star-only).
Traceability: SRS FR-1.2, FR-1.3, FR-7.5; SADD FITTING_STUDIO_SURVEYS.
"""

import uuid

from django.db import IntegrityError
from django.utils import timezone

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User, FittingStudioSurvey
from accounts.serializers import UserSerializer
from accounts.utils import blacklist_refresh_token
from catalog.models import CatalogItem
from commerce.models import CartItem, Order


class ProfileView(generics.RetrieveUpdateDestroyAPIView):
    """FR-1.2 / FR-1.3 profile GET / PATCH / DELETE (archive grace window)."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        return Response({
            'success': True,
            'user': self.get_serializer(self.get_object()).data
        }, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({
            'success': True,
            'message': 'Profile updated successfully',
            'user': serializer.data
        }, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        refresh_raw = request.data.get('refresh')
        if refresh_raw:
            try:
                blacklist_refresh_token(RefreshToken(refresh_raw))
            except TokenError:
                pass

        user.status = 'archive'
        user.is_active = False
        user.archived_at = timezone.now()
        user.save(update_fields=['status', 'is_active', 'archived_at'])

        return Response({
            'success': True,
            'message': 'Your account has been archived. All your data is retained.',
        }, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# FITTING STUDIO SURVEY — STAR-ONLY, REGISTERED SHOPPERS ONLY.
# Strict validation: a PROVIDED star must be a real int 1..5. Strings, bools
# and fractions are REJECTED with 400 (never coerced, never silently nulled).
# Absent / null keys mean "not answered yet" and are simply not written.
# CHANGED (audit fixes):
#   * Legacy reaction keys (fit_like_dislike / vote / like / dislike) are now
#     EXPLICITLY rejected with 400 instead of being silently ignored.
#   * The non-baselined `user_type` field is gone from payload and mirror.
#   * (user, session_id) uniqueness is DB-enforced (migration 0011 + the
#     matching Meta.unique_together); a lost create race resolves to the
#     existing row and merges into it below.
#   * GAP 2: the merge writes ONLY the fields this phase supplied, so two
#     concurrent phases can no longer clobber each other with stale NULLs.
# ---------------------------------------------------------------------------

SURVEY_SCORE_KEYS = (
    'pre_confidence',
    'pre_return_intent',
    'post_confidence',
    'post_return_intent',
    'fit_rating',
)

SURVEY_SESSION_ID_MAX = 64

LEGACY_REACTION_KEYS = ('fit_like_dislike', 'vote', 'like', 'dislike')
LEGACY_REACTION_DETAIL = (
    'Like/dislike voting is no longer supported; submit a 1-5 star score instead.'
)


class _InvalidStar(ValueError):
    pass


def _strict_star(value, field):
    if value is None or value == '':
        return None
    if isinstance(value, bool) or not isinstance(value, int):
        raise _InvalidStar(f'{field} must be an integer 1-5.')
    if not 1 <= value <= 5:
        raise _InvalidStar(f'{field} must be between 1 and 5.')
    return value


def _clean_session_id(value):
    if value is None:
        return ''
    return str(value).strip()[:SURVEY_SESSION_ID_MAX]


def _clean_equipped_ids(value):
    if not isinstance(value, list):
        return []
    return [str(entry) for entry in value if entry is not None][:50]


def _clean_avatar_context(value):
    if not isinstance(value, dict):
        return {}
    allowed = ('gender', 'height', 'weight', 'body_build_cm')
    return {key: value[key] for key in allowed if key in value}


def _confidence_gain(pre, post):
    if isinstance(pre, int) and isinstance(post, int):
        return post - pre
    return None


def _survey_payload(row):
    return {
        'id': str(row.id),
        'user_email': row.user_email,
        'session_id': row.session_id,
        'pre_confidence': row.pre_confidence,
        'pre_return_intent': row.pre_return_intent,
        'post_confidence': row.post_confidence,
        'post_return_intent': row.post_return_intent,
        'confidence_gain': row.confidence_gain,
        'fit_rating': row.fit_rating,
        'equipped_item_ids': row.equipped_item_ids,
        'avatar_context': row.avatar_context,
        'submitted_at': row.submitted_at.isoformat() if row.submitted_at else None,
    }


class FittingStudioSurveyView(APIView):
    """
    POST /profile/fitting-studio-survey/  (registered shoppers only)
        Upsert ONE visit document keyed by (user, session_id) and mirror it
        onto accounts_user.latest_fitting_studio_survey.
        Payload: { "survey": { session_id, pre_confidence, pre_return_intent,
                               post_confidence, post_return_intent, fit_rating,
                               equipped_item_ids, avatar_context } }

    GET  /profile/fitting-studio-survey/
        The caller's visit documents (newest first) + the on-account mirror.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rows = FittingStudioSurvey.objects.filter(user=request.user)
        return Response({
            'success': True,
            'count': rows.count(),
            'latest': request.user.latest_fitting_studio_survey or None,
            'surveys': [_survey_payload(row) for row in rows],
        }, status=status.HTTP_200_OK)

    def post(self, request):
        # RBAC: surveys are a REGISTERED SHOPPER surface. Sellers out.
        if getattr(request.user, 'role', None) != 'shopper':
            return Response(
                {'detail': 'Only registered shoppers can submit fitting studio ratings.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        survey = request.data.get('survey') if isinstance(request.data, dict) else None
        if hasattr(survey, 'dict'):
            survey = survey.dict()
        if not isinstance(survey, dict):
            return Response(
                {'detail': 'A "survey" object is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # HARDENING (audit fix): reject legacy reaction keys outright instead
        # of silently ignoring them, so stale clients surface loudly.
        legacy_keys = set(LEGACY_REACTION_KEYS) & set(survey.keys())
        if legacy_keys:
            return Response(
                {key: LEGACY_REACTION_DETAIL for key in sorted(legacy_keys)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cleaned = {}
        try:
            for key in SURVEY_SCORE_KEYS:
                cleaned[key] = _strict_star(survey.get(key), key)
        except _InvalidStar as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        cleaned['session_id'] = _clean_session_id(survey.get('session_id'))
        cleaned['equipped_item_ids'] = _clean_equipped_ids(survey.get('equipped_item_ids'))
        cleaned['avatar_context'] = _clean_avatar_context(survey.get('avatar_context'))

        if (
            all(cleaned[key] is None for key in SURVEY_SCORE_KEYS)
            and not cleaned['equipped_item_ids']
        ):
            return Response(
                {'detail': 'Survey contains no rating data.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session_id = cleaned['session_id'] or uuid.uuid4().hex
        # CONCURRENCY (gap 2): migration 0011 AND the matching
        # FittingStudioSurvey.Meta.unique_together enforce ONE document per
        # (user, session_id) in the database itself.
        # NOTE: Django MongoDB Backend runs in autocommit mode and does NOT
        # support django.db.transaction (it ships its own
        # django_mongodb_backend.transaction API), and select_for_update() is a
        # no-op there. So this block is deliberately NOT wrapped in
        # django.db.transaction.atomic(): a lost insert race raises
        # IntegrityError immediately, cannot poison an outer transaction, and
        # deterministically resolves to the SAME row below.
        try:
            row, created = FittingStudioSurvey.objects.get_or_create(
                user=request.user,
                session_id=session_id,
                defaults={
                    'user_email': request.user.email or '',
                },
            )
        except IntegrityError:
            row = FittingStudioSurvey.objects.get(
                user=request.user, session_id=session_id,
            )
            created = False

        # MERGE (two-phase, lost-update safe): write ONLY the fields this phase
        # actually supplied, as ONE targeted update — a single-document $set is
        # atomic in MongoDB (and a column-scoped UPDATE on SQL). The previous
        # full row.save() wrote EVERY field from a possibly stale in-memory
        # snapshot, so a concurrent phase could overwrite the other phase's
        # answers with stale NULLs.
        updates = {'user_email': request.user.email or row.user_email}
        for key in SURVEY_SCORE_KEYS:
            if cleaned[key] is not None:
                updates[key] = cleaned[key]
        if cleaned['equipped_item_ids']:
            updates['equipped_item_ids'] = cleaned['equipped_item_ids']
        if cleaned['avatar_context']:
            updates['avatar_context'] = cleaned['avatar_context']
        FittingStudioSurvey.objects.filter(pk=row.pk).update(**updates)

        # SERVER-COMPUTED gain, from the FRESHEST stored answers (never from the
        # client, never from a stale snapshot). The extra filter is a
        # compare-and-set: if another phase changed either input since this
        # read, the update matches nothing and that writer computes the gain
        # instead — a stale gain is never written.
        row.refresh_from_db()
        gain = _confidence_gain(row.pre_confidence, row.post_confidence)
        if row.confidence_gain != gain:
            FittingStudioSurvey.objects.filter(
                pk=row.pk,
                pre_confidence=row.pre_confidence,
                post_confidence=row.post_confidence,
            ).update(confidence_gain=gain)
            row.refresh_from_db()

        request.user.latest_fitting_studio_survey = _survey_payload(row)
        request.user.save(update_fields=['latest_fitting_studio_survey'])

        return Response({
            'success': True,
            'created': created,
            'message': 'Fitting studio survey saved to your account.',
            'survey_id': str(row.id),
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)