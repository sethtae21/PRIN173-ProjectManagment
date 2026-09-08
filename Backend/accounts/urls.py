from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, LogoutView, ProfileView, CustomTokenRefreshView,
    CatalogViewSet, home, register_view, login_view, seller_dashboard, logout_view
)

router = DefaultRouter()
router.register(r'catalog', CatalogViewSet, basename='catalog')

urlpatterns = [
    # Function-based views
    path('', home, name='home'),
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('seller-dashboard/', seller_dashboard, name='seller_dashboard'),
    
    # DRF API endpoints
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/token/refresh/', CustomTokenRefreshView.as_view(), name='auth-token-refresh'),
    path('profile/', ProfileView.as_view(), name='user-profile'),
    
    # Explicit download-package URL (MUST be before router.urls)
    path('catalog/download-package/', CatalogViewSet.as_view({'get': 'download_package'}), name='catalog-download-package'),
    
    # Catalog URLs (includes upload, batch-report, my-listings, etc.)
    path('', include(router.urls)),
    
    # Test upload page
    path('test-upload/', home, name='test-upload'),
]