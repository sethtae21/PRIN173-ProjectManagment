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
    AvatarPresetViewSet,
)

router = DefaultRouter()
router.register(r'presets', AvatarPresetViewSet, basename='avatar-presets')

urlpatterns = [
    # FR-1.1 / FR-1.2 / FR-1.4 — authentication
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),

    # Token refresh — fixes "Given token not valid for any token type"
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # FR-1.3 — password change (was missing its route!)
    path('auth/change-password/', PasswordChangeView.as_view(), name='change_password'),

    # FR-1.4 — soft deactivation (records retained)
    path('auth/deactivate/', DeactivateAccountView.as_view(), name='deactivate'),

    # FR-1.6 — profile management (GET + PATCH + DELETE)
    path('profile/', ProfileView.as_view(), name='profile'),

    # Avatar presets
    path('', include(router.urls)),
]