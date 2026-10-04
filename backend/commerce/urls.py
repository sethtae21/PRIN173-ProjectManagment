"""URL routes for cart, checkout, and order history."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from commerce.views import CartViewSet, CheckoutView, OrderViewSet


router = DefaultRouter()
router.register('cart', CartViewSet, basename='cart')
router.register('orders', OrderViewSet, basename='order')

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('', include(router.urls)),
]