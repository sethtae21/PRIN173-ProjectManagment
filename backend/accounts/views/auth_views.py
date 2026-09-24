from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from accounts.serializers import RegistrationSerializer, LoginSerializer, UserSerializer
from accounts.utils import generate_jwt_tokens, blacklist_refresh_token, is_token_blacklisted
from accounts.models import User


class RegisterView(generics.CreateAPIView):
    """API endpoint for user registration"""
    serializer_class = RegistrationSerializer
    permission_classes = (AllowAny,)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens
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
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        tokens = generate_jwt_tokens(user)
        
        return Response({
            'success': True,
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'tokens': tokens
        }, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
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


class CustomTokenRefreshView(TokenRefreshView):
    """
    Custom token refresh view with MongoDB blacklist check (Option B).
    Prevents blacklisted/rotated tokens from issuing new access tokens.
    """
    def post(self, request, *args, **kwargs):
        refresh_raw = request.data.get('refresh')
        
        # 1. Check if the incoming token is already blacklisted
        if refresh_raw:
            try:
                old_token = RefreshToken(refresh_raw)
                if is_token_blacklisted(old_token):
                    return Response({
                        'success': False, 
                        'detail': 'Token is blacklisted or already rotated.'
                    }, status=status.HTTP_401_UNAUTHORIZED)
            except TokenError:
                pass  # Let super().post() handle invalid/expired tokens
        
        # 2. Issue new tokens
        response = super().post(request, *args, **kwargs)
        
        # 3. Blacklist the consumed refresh token (Manual rotation enforcement)
        if refresh_raw and response.status_code == 200:
            try:
                blacklist_refresh_token(RefreshToken(refresh_raw))
            except TokenError:
                pass
        
        # 4. Return both access and refresh tokens to prevent frontend session loss
        data = {'success': True, 'access': response.data.get('access')}
        if 'refresh' in response.data:
            data['refresh'] = response.data['refresh']
            
        return Response(data)


class LogoutView(APIView):
    """
    API endpoint for user logout.
    Server-side invalidation of the refresh token via MongoDB blacklist (Option B).
    """
    permission_classes = (IsAuthenticated,)
    
    def post(self, request):
        refresh_raw = request.data.get('refresh')
        if refresh_raw:
            try:
                token = RefreshToken(refresh_raw)
                blacklist_refresh_token(token)
            except TokenError:
                pass  # Ignore invalid tokens during logout
        
        return Response({
            'success': True,
            'message': 'Logout successful. Tokens invalidated server-side.'
        }, status=status.HTTP_200_OK)