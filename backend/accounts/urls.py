from django.urls import path
from rest_framework.routers import SimpleRouter
from .views import (
    RegisterView, LoginView, LogoutView, ProfileView, CustomTokenRefreshView,
    PasswordChangeView,
    register_view, login_view, logout_view,
    AvatarPresetViewSet,
)

# KAN-58: Preset CRUD routes → /presets/
router = SimpleRouter()
router.register('presets', AvatarPresetViewSet, basename='presets')

urlpatterns = [
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/token/refresh/', CustomTokenRefreshView.as_view(), name='auth-token-refresh'),
    path('profile/', ProfileView.as_view(), name='user-profile'),
    # KAN-56 ADDED: Password change endpoint
    path('profile/password/', PasswordChangeView.as_view(), name='password-change'),
]

urlpatterns += router.urls