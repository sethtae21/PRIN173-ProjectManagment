"""
accounts/views/__init__.py
Re-exports all view classes from sub-modules so urls.py can import from a single path.
"""

from .auth_views import (
    RegisterView,
    LoginView,
    LogoutView,
    PasswordChangeView,
    DeactivateAccountView,
    CustomTokenRefreshView,
)
from .core import ProfileView
from .health import health_check
from .preset_views import AvatarPresetViewSet

__all__ = [
    "RegisterView",
    "LoginView",
    "LogoutView",
    "PasswordChangeView",
    "DeactivateAccountView",
    "CustomTokenRefreshView",
    "ProfileView",
    "health_check",
    "AvatarPresetViewSet",
]