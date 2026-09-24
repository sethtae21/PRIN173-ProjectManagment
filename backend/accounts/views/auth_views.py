import logging

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect

from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from accounts.serializers import RegistrationSerializer, LoginSerializer, UserSerializer, PasswordChangeSerializer
from accounts.utils import generate_jwt_tokens, blacklist_refresh_token, is_token_blacklisted
from accounts.models import User

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

    # ==========================================
    # KAN-56 ADDED: Account deletion with RA 10173 erasure
    # ==========================================
    def destroy(self, request, *args, **kwargs):
        """Delete account + cascade all owned data + invalidate tokens (RA 10173)."""
        user = self.get_object()

        # Blacklist the refresh token if provided (server-side logout)
        refresh_raw = request.data.get('refresh')
        if refresh_raw:
            try:
                blacklist_refresh_token(RefreshToken(refresh_raw))
            except TokenError:
                pass

        try:
            user.delete()   # CASCADE: presets, outfits, cart, orders, listings
        except Exception as e:
            logger.error(f"Account deletion failed for user {request.user.id}: {e}")
            return Response({
                'success': False,
                'detail': 'Account could not be deleted due to related records.'
            }, status=status.HTTP_409_CONFLICT)

        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomTokenRefreshView(TokenRefreshView):
    """
    Token refresh with MongoDB blacklist check (Option B).
    Rejects blacklisted/rotated tokens; blacklists the consumed refresh token.
    """
    def post(self, request, *args, **kwargs):
        refresh_raw = request.data.get('refresh')

        # 1. Reject tokens that were logged out / already rotated
        if refresh_raw:
            try:
                old_token = RefreshToken(refresh_raw)
                if is_token_blacklisted(old_token):
                    return Response({
                        'success': False,
                        'detail': 'Token is blacklisted or already rotated.'
                    }, status=status.HTTP_401_UNAUTHORIZED)
            except TokenError:
                pass  # let super() return the standard 401 for invalid tokens

        # 2. Issue new tokens
        response = super().post(request, *args, **kwargs)

        # 3. Blacklist the consumed refresh token (manual rotation enforcement)
        if refresh_raw and response.status_code == 200:
            try:
                blacklist_refresh_token(RefreshToken(refresh_raw))
            except TokenError:
                pass

        # 4. Return access AND the rotated refresh (never drop it)
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
                pass  # ignore malformed/expired tokens during logout

        return Response({
            'success': True,
            'message': 'Logout successful. Tokens invalidated server-side.'
        }, status=status.HTTP_200_OK)


# ==========================================
# KAN-56 ADDED: Password Change Endpoint (FR-1.3)
# ==========================================
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