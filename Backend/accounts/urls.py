from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from django.views.generic import TemplateView  # <-- Added this import
from accounts.views import (
    RegisterView,
    LoginView,
    ProfileView,
    CustomTokenRefreshView,
    LogoutView,
    CatalogViewSet,
)

router = DefaultRouter()
router.register(r'catalog', CatalogViewSet, basename='catalog')

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/token/refresh/', CustomTokenRefreshView.as_view(), name='auth-token-refresh'),
    
    # User profile endpoint
    path('profile/', ProfileView.as_view(), name='user-profile'),
    
    # Catalog endpoints (includes /catalog/upload/, /catalog/template/, etc.)
    path('', include(router.urls)),

    # Test page for browser testing (no Postman needed)
    path('test-upload/', TemplateView.as_view(template_name='accounts/test_upload.html'), name='test-upload'),  # <-- Added this line
]