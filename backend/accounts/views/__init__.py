from .preset_views import AvatarPresetViewSet  # noqa: F401
from .auth_views import (  # noqa: F401
    CustomTokenRefreshView,
    LoginView,
    LogoutView,
    ProfileView,
    RegisterView,
    PasswordChangeView,
    login_view,
    logout_view,
    register_view,
)

__all__ = [
    'CustomTokenRefreshView',
    'LoginView',
    'LogoutView',
    'ProfileView',
    'RegisterView',
    'PasswordChangeView',
    'login_view',
    'logout_view',
    'register_view',
]