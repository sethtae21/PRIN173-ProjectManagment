from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    ProfileView,
    PasswordChangeView,
    DeactivateAccountView,
    CustomTokenRefreshView,
    AvatarPresetViewSet,
    health_check,
)

router = DefaultRouter()
router.register(r'presets', AvatarPresetViewSet, basename='avatar-presets')

urlpatterns = [
    # FR-1.1 / FR-1.2 / FR-1.4 — authentication
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),

    # Token refresh — fixes "Given token not valid for any token type"
    path('auth/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),

    # FR-1.3 — password change
    path('auth/change-password/', PasswordChangeView.as_view(), name='change_password'),

    # FR-1.4 — soft deactivation
    path('auth/deactivate/', DeactivateAccountView.as_view(), name='deactivate'),

    # NEW: User profile endpoint for checkout auto-fill
    # Frontend calls: GET /api/auth/user/profile/
    path('auth/user/profile/', ProfileView.as_view(), name='user_profile'),

    # FR-1.6 — profile management (GET + PATCH + DELETE) — legacy route
    path('profile/', ProfileView.as_view(), name='profile'),

    # Health check endpoint
    path('health/', health_check, name='health'),

    # Avatar presets
    path('', include(router.urls)),
]