import datetime
import logging

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import redirect, render
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.views import APIView
from pymongo import MongoClient

from ..models import User
from ..serializers.auth_serializers import UserRegistrationSerializer

logger = logging.getLogger(__name__)

try:
    _mongo_client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
    _db = _mongo_client.get_database()
    token_blacklist_collection = _db['token_blacklist']
    token_blacklist_collection.create_index("expires_at", expireAfterSeconds=0)
except Exception as e:
    logger.warning(f"Could not connect to MongoDB for token blacklist: {e}")
    token_blacklist_collection = None


def _mongo_blacklist(self):
    if token_blacklist_collection is None:
        logger.warning("Token blacklist collection unavailable.")
        return
    jti = self['jti']
    exp = self['exp']
    token_blacklist_collection.update_one(
        {'jti': jti},
        {'$set': {'expires_at': datetime.datetime.fromtimestamp(exp, tz=datetime.timezone.utc)}},
        upsert=True
    )


RefreshToken.blacklist = _mongo_blacklist


def register_view(request):
    if request.method == 'POST':
        pass
    return render(request, 'accounts/register.html')


def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('/')
        messages.error(request, 'Invalid username or password')
    return render(request, 'accounts/login.html')


def logout_view(request):
    logout(request)
    return redirect('/')


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': {
                    'id': str(user.id), 'username': user.username, 'email': user.email,
                    'role': user.role, 'store_name': user.store_name
                },
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(TokenObtainPairView):
    pass


class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token_str = request.data.get('refresh')
        if refresh_token_str and token_blacklist_collection is not None:
            try:
                token = RefreshToken(refresh_token_str)
                if token_blacklist_collection.find_one({'jti': token['jti']}):
                    raise InvalidToken('Token is blacklisted or has been rotated.')
            except TokenError:
                raise InvalidToken('Token is invalid or expired.')
        return super().post(request, *args, **kwargs)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token_str = request.data.get("refresh")
            if refresh_token_str:
                RefreshToken(refresh_token_str).blacklist()
        except Exception as e:
            logger.warning(f"Logout token blacklist error: {e}")
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': str(user.id), 'username': user.username, 'email': user.email,
            'role': user.role, 'store_name': user.store_name,
            'skin_tone': user.skin_tone, 'height': user.height,
            'weight': user.weight, 'body_proportions': user.body_proportions
        })

    def put(self, request):
        user = request.user
        user.skin_tone = request.data.get('skin_tone', user.skin_tone)
        user.height = request.data.get('height', user.height)
        user.weight = request.data.get('weight', user.weight)
        user.body_proportions = request.data.get('body_proportions', user.body_proportions)
        if user.role == 'seller':
            user.store_name = request.data.get('store_name', user.store_name)
        user.save()
        return Response({'detail': 'Profile updated successfully'})