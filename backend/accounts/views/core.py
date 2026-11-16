"""
accounts/views/core.py
Profile management view — returns full user data including address fields
so the checkout page can auto-fill delivery information.
Traceability: SRS FR-1.2, FR-1.3
"""

import uuid

from django.utils import timezone  # stamp the archive grace-window clock

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
    """
    FR-1.2 / FR-1.3: Get and update the authenticated user's profile.

    GET  /api/profile/         → returns full user data (including address fields)
    PATCH /api/profile/        → updates editable profile fields
    DELETE /api/profile/       → ARCHIVE (grace window): status='archive',
                                 is_active=False, archived_at=now. ALL linked
                                 data is retained so support can restore within
                                 90 days; the prune sweep (accounts/archive.py)
                                 relocates the profile to accounts_archiveduser
                                 after the window closes.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Return the authenticated user."""
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        """Return the authenticated user's full profile including address."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'user': serializer.data
        }, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        """Update editable profile fields (name, mobile, address, etc.)."""
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
        """
        FR-1.4 archive (grace window): flip status + is_active and stamp
        archived_at so the 90-day cold-relocation clock starts. No linked data
        is touched here — that is the prune sweep's job after the window.
        """
        user = self.get_object()
        refresh_raw = request.data.get('refresh')
        if refresh_raw:
            try:
                blacklist_refresh_token(RefreshToken(refresh_raw))
            except TokenError:
                pass

        user.status = 'archive'
        user.is_active = False
        user.archived_at = timezone.now()  # start the 90-day window
        user.save(update_fields=['status', 'is_active', 'archived_at'])

        return Response({
            'success': True,
            'message': 'Your account has been archived. All your data is retained.',
        }, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# FITTING STUDIO SURVEYS (Criterion 9 / 11, OBJ-01 / KAN-89) — STARS ONLY.
# CHANGED (rating redesign):
#   * fit_like_dislike is GONE; fit_rating_score (1-5) replaces it.
#   * UPSERT per (user, session_id): the Pre-Try-On Check creates the visit
#     document; the Post-Try-On Check and the "Rate Avatar Look" score UPDATE
#     the same document, so confidence_gain becomes computable once both
#     phases exist. One flat row per visit in accounts_fittingstudiosurvey.
#   * Every submit also mirrors the newest state FLAT onto
#     accounts_user.latest_fitting_studio_survey (readable in Compass).
# accounts_rating is NEVER touched here (FR-7.5 star surfaces write it via
# POST /ratings/ from the frontend). Guests cannot reach this view
# (IsAuthenticated) — FR-1.9; the frontend holds guest payloads in
# sessionStorage and shows the sign-up/login modal instead.
# ---------------------------------------------------------------------------

SURVEY_SCORE_KEYS = (
    'pre_confidence',
    'pre_return_intent',
    'post_confidence',
    'post_return_intent',
    'fit_rating_score',
)

SURVEY_SESSION_ID_MAX = 64


def _clean_survey_score(value):
    """Clamp a payload score to a legal 1-5 star value; anything else -> None."""
    if value in (None, ''):
        return None
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if 1 <= number <= 5 else None


def _clean_session_id(value):
    """Sanitize the client studio-visit id to a bounded plain string."""
    if value is None:
        return ''
    return str(value).strip()[:SURVEY_SESSION_ID_MAX]


def _clean_equipped_ids(value):
    """Keep the tried-on catalog ids as strings, capped defensively."""
    if not isinstance(value, list):
        return []
    return [str(entry) for entry in value if entry is not None][:50]


def _clean_avatar_context(value):
    """Whitelist the avatar snapshot fields stored with each survey."""
    if not isinstance(value, dict):
        return {}
    allowed = ('gender', 'height', 'weight', 'body_build_cm')
    return {key: value[key] for key in allowed if key in value}


def _confidence_gain(pre, post):
    """Server-computed pre→post delta; None when either side is missing."""
    if isinstance(pre, int) and isinstance(post, int):
        return post - pre
    return None


def _survey_payload(row):
    """Flat, Compass-readable serialization of one visit document."""
    return {
        'id': str(row.id),
        'user_email': row.user_email,
        'session_id': row.session_id,
        'user_type': row.user_type,
        'pre_confidence': row.pre_confidence,
        'pre_return_intent': row.pre_return_intent,
        'post_confidence': row.post_confidence,
        'post_return_intent': row.post_return_intent,
        'confidence_gain': row.confidence_gain,
        'fit_rating_score': row.fit_rating_score,
        'equipped_item_ids': row.equipped_item_ids,
        'avatar_context': row.avatar_context,
        'submitted_at': row.submitted_at.isoformat() if row.submitted_at else None,
    }


class FittingStudioSurveyView(APIView):
    """
    POST /profile/fitting-studio-survey/
        Upsert ONE flat visit document (keyed by user + session_id) AND mirror
        it onto the account. Payload:
          { "survey": { session_id,
                        pre_confidence, pre_return_intent,
                        post_confidence, post_return_intent,
                        fit_rating_score,
                        equipped_item_ids: [...], avatar_context: {...} } }
        Only the fields PRESENT in the payload are written; earlier phases of
        the same visit are preserved. `user`, `user_email`, `user_type`,
        `confidence_gain`, `submitted_at` are SERVER-derived.

    GET /profile/fitting-studio-survey/
        List the authenticated account's visit documents (newest first) plus
        the on-account mirror.
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
        survey = request.data.get('survey') if isinstance(request.data, dict) else None
        # Form-encoded bodies arrive as QueryDict; JSON bodies as plain dict.
        if hasattr(survey, 'dict'):
            survey = survey.dict()
        if not isinstance(survey, dict):
            return Response(
                {'detail': 'A "survey" object is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cleaned = {key: _clean_survey_score(survey.get(key)) for key in SURVEY_SCORE_KEYS}
        cleaned['session_id'] = _clean_session_id(survey.get('session_id'))
        cleaned['equipped_item_ids'] = _clean_equipped_ids(survey.get('equipped_item_ids'))
        cleaned['avatar_context'] = _clean_avatar_context(survey.get('avatar_context'))

        # Reject a payload that carries no signal at all so neither storage
        # location fills with empty placeholders.
        if (
            all(cleaned[key] is None for key in SURVEY_SCORE_KEYS)
            and not cleaned['equipped_item_ids']
        ):
            return Response(
                {'detail': 'Survey contains no rating data.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session_id = cleaned['session_id'] or uuid.uuid4().hex
        row, created = FittingStudioSurvey.objects.get_or_create(
            user=request.user,
            session_id=session_id,
            defaults={
                'user_email': request.user.email or '',
                'user_type': 'registered',  # server-derived; guests never here
            },
        )

        # Write ONLY the phases/scores present in this payload so the pre-check
        # and post-check of one visit accumulate on the same document.
        for key in SURVEY_SCORE_KEYS:
            if cleaned[key] is not None:
                setattr(row, key, cleaned[key])
        if cleaned['equipped_item_ids']:
            row.equipped_item_ids = cleaned['equipped_item_ids']
        if cleaned['avatar_context']:
            row.avatar_context = cleaned['avatar_context']
        row.user_email = request.user.email or row.user_email
        row.confidence_gain = _confidence_gain(row.pre_confidence, row.post_confidence)
        row.save()

        # Mirror the newest visit FLAT onto the accounts_user document so the
        # rating is visible directly on the account in Compass (no array).
        request.user.latest_fitting_studio_survey = _survey_payload(row)
        request.user.save(update_fields=['latest_fitting_studio_survey'])

        return Response({
            'success': True,
            'created': created,
            'message': 'Fitting studio survey saved to your account.',
            'survey_id': str(row.id),
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)