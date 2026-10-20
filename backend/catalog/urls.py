from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CatalogViewSet, home, seller_dashboard
from .views.page_views import serve_gridfs_media

router = DefaultRouter()
router.register(r'catalog', CatalogViewSet, basename='catalog')

urlpatterns = [
    path('', home, name='home'),
    path('seller-dashboard/', seller_dashboard, name='seller_dashboard'),

    # GridFS media serving — rembg-processed transparent PNGs (FR-4.2 / FR-4.4)
    path('media/<path:name>', serve_gridfs_media, name='gridfs-media'),

    path('catalog/download-template/', CatalogViewSet.as_view({'get': 'download_template'}), name='catalog-download-template'),
    path('', include(router.urls)),
    path('test-upload/', home, name='test-upload'),
]