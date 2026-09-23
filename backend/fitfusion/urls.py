from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # Accounts app (HTML views + all catalog/auth APIs)
    path('', include('accounts.urls')),

    # Swagger API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Startup banner
print("\n" + "=" * 60)
print("🚀 FITFUSION AI SERVER IS RUNNING!")
print("=" * 60)
print("🔗 Available Test Links:")
print("1. Test Upload Page:       http://127.0.0.1:8000/test-upload/")
print("2. Django Admin:           http://127.0.0.1:8000/admin/")
print("3. Download CSV Template:  http://127.0.0.1:8000/catalog/download-template/")
print("4. Public Catalog API:     http://127.0.0.1:8000/catalog/")
print("5. Swagger API Docs:       http://127.0.0.1:8000/api/docs/")
print("=" * 60 + "\n")