from rest_framework.routers import SimpleRouter

from .views import OutfitViewSet

router = SimpleRouter()
router.register('outfits', OutfitViewSet, basename='outfit')

urlpatterns = router.urls