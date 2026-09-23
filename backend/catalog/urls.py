from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CatalogViewSet, home, seller_dashboard

router = DefaultRouter()
router.register(r'catalog', CatalogViewSet, basename='catalog')

urlpatterns = [
    path('', home, name='home'),
    path('seller-dashboard/', seller_dashboard, name='seller_dashboard'),
    path('catalog/download-template/', CatalogViewSet.as_view({'get': 'download_template'}), name='catalog-download-template'),
    path('', include(router.urls)),
    path('test-upload/', home, name='test-upload'),
]
