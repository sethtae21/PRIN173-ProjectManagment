import logging

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.utils import timezone  # stamp the archive grace-window clock

from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from ..serializers.auth_serializers import RegistrationContactSerializer
from accounts.serializers import RegistrationSerializer, LoginSerializer, UserSerializer, PasswordChangeSerializer
# ✅ FIXED: Import from auth_serializers instead of validators
from accounts.serializers.auth_serializers import validate_password_strength
from accounts.utils import generate_jwt_tokens, blacklist_refresh_token, is_token_blacklisted
from accounts.models import User
from accounts.archive import prune_expired_archived_users  # lazy 90-day sweep
from commerce.models import Order

logger = logging.getLogger(__name__)


# ==========================================
# Function-Based Views (HTML test site)
# ==========================================
def home(request):
    """Landing page / HTML test upload site."""
    return render(request, 'accounts/test_upload.html')


def register_view(request):
    if request.method == 'POST':
        pass  # HTML placeholder — real registration happens via RegisterView API
    return render(request, 'accounts/register.html')


def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('/')
        else:
            messages.error(request, 'Invalid username or password')
    return render(request, 'accounts/login.html')


@login_required
def seller_dashboard(request):
    return render(request, 'accounts/seller_dashboard.html')


def logout_view(request):
    logout(request)
    return redirect('/')


# ==========================================
# DRF API Views
# ==========================================
class RegistrationContactCheckView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = RegistrationContactSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        return Response({"available": True})


class RegisterView(generics.CreateAPIView):
    """API endpoint for user registration"""
    serializer_class = RegistrationSerializer
    permission_classes = (AllowAny,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        tokens = generate_jwt_tokens(user)

        return Response({
            'success': True,
            'message': 'Registration successful',
            'user': UserSerializer(user).data,
            'tokens': tokens
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """API endpoint for user login"""
    permission_classes = (AllowAny,)
    serializer_class = LoginSerializer

    def post(self, request):
        # Lazy, best-effort 90-day cold-relocation sweep. Runs on login so the
        # capstone needs no cron; wrapped so housekeeping can NEVER block a
        # login. (The standalone management command is the production path.)
        try:
            prune_expired_archived_users()
        except Exception:  # noqa: BLE001
            logger.exception("Archive prune failed during login (non-fatal).")

        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        tokens = generate_jwt_tokens(user)

        return Response({
            'success': True,
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'tokens': tokens
        }, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint to get and update user profile"""
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'user': serializer.data
        })

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
        })

    def destroy(self, request, *args, **kwargs):
        """
        FR-1.4 archive (grace window) — mirrors core.ProfileView.destroy:
        flip status + is_active and stamp archived_at to start the 90-day
        cold-relocation window. Linked data is left intact here; the prune
        sweep relocates the profile to accounts_archiveduser after the window.
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


class CustomTokenRefreshView(TokenRefreshView):
    """
    Token refresh with MongoDB blacklist check (Option B).
    Rejects blacklisted/rotated tokens; blacklists the consumed refresh token.
    """
    def post(self, request, *args, **kwargs):
        refresh_raw = request.data.get('refresh')

        if refresh_raw:
            try:
                old_token = RefreshToken(refresh_raw)
                if is_token_blacklisted(old_token):
                    return Response({
                        'success': False,
                        'detail': 'Token is blacklisted or already rotated.'
                    }, status=status.HTTP_401_UNAUTHORIZED)
            except TokenError:
                pass

        response = super().post(request, *args, **kwargs)

        if refresh_raw and response.status_code == 200:
            try:
                blacklist_refresh_token(RefreshToken(refresh_raw))
            except TokenError:
                pass

        data = {'success': True, 'access': response.data.get('access')}
        if 'refresh' in response.data:
            data['refresh'] = response.data['refresh']
        return Response(data)


class LogoutView(APIView):
    """
    Server-side logout: blacklists the refresh token in MongoDB (RA 10173).
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        refresh_raw = request.data.get('refresh')
        if refresh_raw:
            try:
                blacklist_refresh_token(RefreshToken(refresh_raw))
            except TokenError:
                pass

        return Response({
            'success': True,
            'message': 'Logout successful. Tokens invalidated server-side.'
        }, status=status.HTTP_200_OK)


class PasswordChangeView(APIView):
    """FR-1.3: change password with current-password verification."""
    permission_classes = (IsAuthenticated,)
    serializer_class = PasswordChangeSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'success': True,
            'message': 'Password updated. Please login again with the new password.'
        }, status=status.HTTP_200_OK)


class DeactivateAccountView(APIView):
    """
    FR-1.4 soft-delete: Sets is_active=False; retains records.
    NOTE: the UI deactivate button has been REMOVED from both the shopper
    and seller account pages. This endpoint is kept alive so any future
    support/admin tooling can still deactivate accounts.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        user = request.user
        reason = str(request.data.get('reason', '')).strip()

        logger.info(
            f"Account deactivation requested by user {user.id} "
            f"({user.email}): reason='{reason or 'not provided'}'"
        )

        user.is_active = False
        user.save(update_fields=['is_active'])

        refresh_raw = request.data.get('refresh')
        if refresh_raw:
            try:
                blacklist_refresh_token(RefreshToken(refresh_raw))
            except TokenError:
                pass

        return Response({
            'success': True,
            'message': 'Your account has been deactivated. Your records are retained.',
        }, status=status.HTTP_200_OK)