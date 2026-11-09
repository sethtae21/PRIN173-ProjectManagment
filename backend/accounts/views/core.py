"""
accounts/views/core.py
Profile management view — returns full user data including address fields
so the checkout page can auto-fill delivery information.
Traceability: SRS FR-1.2, FR-1.3
"""

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
# FITTING STUDIO PRE/POST SESSION POPUPS (Criterion 9 / 11, OBJ-01 / KAN-89).
# Each submit writes TWO places, in one request:
#   1. accounts_fittingstudiosurvey — one FLAT document per visit (history).
#   2. accounts_user.latest_fitting_studio_survey — a single FLAT mirror object
#      on the account document, so the rating is visible on dein's user row in
#      Compass without any array nesting.
# accounts_rating is NEVER touched by the popups (FR-7.5 surfaces only).
# Guests can never reach this view (IsAuthenticated) — FR-1.9.
# ---------------------------------------------------------------------------

SURVEY_SCORE_KEYS = (
    'pre_confidence',
    'pre_return_intent',
    'post_confidence',
    'post_return_intent',
)

SURVEY_VOTE_KEYS = ('fit_like_dislike',)

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


def _clean_survey_vote(value):
    """Accept only 'like' / 'dislike'; blank or junk -> None."""
    vote = str(value or '').strip().lower()
    return vote if vote in ('like', 'dislike') else None


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


class FittingStudioSurveyView(APIView):
    """
    POST /profile/fitting-studio-survey/
        Create one flat survey document AND mirror it onto the account.
        Payload: { "survey": { session_id, pre_confidence, pre_return_intent,
                               post_confidence, post_return_intent,
                               fit_like_dislike,
                               equipped_item_ids: [...],
                               avatar_context: {...} } }
        `user`, `user_email`, `user_type`, `confidence_gain`, `submitted_at`
        are SERVER-derived so clients cannot forge evidence.

    GET /profile/fitting-studio-survey/
        List the authenticated account's survey visits (newest first) plus the
        on-account mirror.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rows = FittingStudioSurvey.objects.filter(user=request.user)
        return Response({
            'success': True,
            'count': rows.count(),
            'latest': request.user.latest_fitting_studio_survey or None,
            'surveys': [
                {
                    'id': str(row.id),
                    'user_email': row.user_email,
                    'session_id': row.session_id,
                    'user_type': row.user_type,
                    'pre_confidence': row.pre_confidence,
                    'pre_return_intent': row.pre_return_intent,
                    'post_confidence': row.post_confidence,
                    'post_return_intent': row.post_return_intent,
                    'confidence_gain': row.confidence_gain,
                    'fit_like_dislike': row.fit_like_dislike,
                    'equipped_item_ids': row.equipped_item_ids,
                    'avatar_context': row.avatar_context,
                    'submitted_at': (
                        row.submitted_at.isoformat() if row.submitted_at else None
                    ),
                }
                for row in rows
            ],
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

        cleaned = {}
        for key in SURVEY_SCORE_KEYS:
            cleaned[key] = _clean_survey_score(survey.get(key))
        for key in SURVEY_VOTE_KEYS:
            cleaned[key] = _clean_survey_vote(survey.get(key))
        cleaned['session_id'] = _clean_session_id(survey.get('session_id'))
        cleaned['equipped_item_ids'] = _clean_equipped_ids(
            survey.get('equipped_item_ids')
        )
        cleaned['avatar_context'] = _clean_avatar_context(
            survey.get('avatar_context')
        )

        # Reject a survey that carries no signal at all so neither storage
        # location fills with empty placeholders.
        if (
            all(cleaned[key] is None for key in SURVEY_SCORE_KEYS + SURVEY_VOTE_KEYS)
            and not cleaned['equipped_item_ids']
        ):
            return Response(
                {'detail': 'Survey contains no rating data.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        row = FittingStudioSurvey.objects.create(
            user=request.user,
            user_email=request.user.email or '',
            session_id=cleaned['session_id'],
            user_type='registered',  # server-derived; guests cannot reach here
            pre_confidence=cleaned['pre_confidence'],
            pre_return_intent=cleaned['pre_return_intent'],
            post_confidence=cleaned['post_confidence'],
            post_return_intent=cleaned['post_return_intent'],
            confidence_gain=_confidence_gain(
                cleaned['pre_confidence'], cleaned['post_confidence']
            ),
            fit_like_dislike=cleaned['fit_like_dislike'],
            equipped_item_ids=cleaned['equipped_item_ids'],
            avatar_context=cleaned['avatar_context'],
        )

        # Mirror the newest visit FLAT onto the accounts_user document so the
        # rating is visible directly on the account in Compass (readable, no
        # array). History stays in accounts_fittingstudiosurvey.
        request.user.latest_fitting_studio_survey = {
            'survey_id': str(row.id),
            'session_id': row.session_id,
            'pre_confidence': row.pre_confidence,
            'pre_return_intent': row.pre_return_intent,
            'post_confidence': row.post_confidence,
            'post_return_intent': row.post_return_intent,
            'confidence_gain': row.confidence_gain,
            'fit_like_dislike': row.fit_like_dislike,
            'equipped_item_ids': row.equipped_item_ids,
            'submitted_at': (
                row.submitted_at.isoformat() if row.submitted_at else None
            ),
        }
        request.user.save(update_fields=['latest_fitting_studio_survey'])

        return Response({
            'success': True,
            'message': 'Fitting studio survey saved to your account.',
            'survey_id': str(row.id),
        }, status=status.HTTP_201_CREATED)