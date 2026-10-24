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
    # KAN-FIX: hyphen alias for the seller-listings LIST endpoint.
    # The my_listings action registers /catalog/my_listings/ (underscore) and
    # my_listing_manage registers /catalog/my-listings/<item_id>/ (hyphen+id).
    # Frontend code calling the hyphen form WITHOUT an id fell through the
    # router and returned 404 {detail:'Not found.'}. This alias serves the list
    # at the hyphen path too; it cannot shadow the per-item route because that
    # pattern requires an additional path segment.
    path('catalog/my-listings/', CatalogViewSet.as_view({'get': 'my_listings'}), name='catalog-my-listings-list-alias'),
    path('', include(router.urls)),
    path('test-upload/', home, name='test-upload'),
]