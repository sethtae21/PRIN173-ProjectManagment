"""Authenticated cart, checkout, and order-history API views."""

from decimal import Decimal

from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from commerce.models import Cart, CartItem, Order, OrderItem
from commerce.serializers import (
    AddToCartSerializer,
    CartSerializer,
    CheckoutSerializer,
    OrderSerializer,
    UpdateCartItemSerializer,
)
from commerce.services import MockPaymentGateway


class CartViewSet(viewsets.GenericViewSet):
    """Manage the authenticated user's one shopping cart."""

    permission_classes = (IsAuthenticated,)
    serializer_class = CartSerializer

    def get_cart(self):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return Cart.objects.prefetch_related('items__item').get(pk=cart.pk)

    @extend_schema(responses=CartSerializer)
    def list(self, request):
        """Return the current user's cart, creating it when necessary."""
        return Response(self.get_serializer(self.get_cart()).data)

    @extend_schema(request=AddToCartSerializer, responses=CartSerializer)
    @action(detail=False, methods=('post',), url_path='add_item')
    def add_item(self, request):
        """Add a catalog item, increasing its quantity if already present."""
        input_serializer = AddToCartSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        cart = self.get_cart()
        item = input_serializer.validated_data['catalog_item']
        quantity = input_serializer.validated_data['quantity']
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart, item=item, defaults={'quantity': quantity}
        )
        if not created:
            cart_item.quantity += quantity
            cart_item.save(update_fields=('quantity',))
        return Response(self.get_serializer(self.get_cart()).data, status=status.HTTP_200_OK)

    @extend_schema(request=UpdateCartItemSerializer, responses=CartSerializer)
    @action(detail=False, methods=('patch', 'put'), url_path='update_quantity')
    def update_quantity(self, request):
        """Set the quantity for an item already in the current user's cart."""
        input_serializer = UpdateCartItemSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        cart = self.get_cart()
        item = input_serializer.validated_data['catalog_item']
        cart_item = get_object_or_404(CartItem, cart=cart, item=item)
        cart_item.quantity = input_serializer.validated_data['quantity']
        cart_item.save(update_fields=('quantity',))
        return Response(self.get_serializer(self.get_cart()).data)

    @extend_schema(request=AddToCartSerializer, responses=CartSerializer)
    @action(detail=False, methods=('delete', 'post'), url_path='remove_item')
    def remove_item(self, request):
        """Remove a catalog item from the current user's cart."""
        input_serializer = AddToCartSerializer(
            data={'catalog_item': request.data.get('catalog_item'), 'quantity': 1}
        )
        input_serializer.is_valid(raise_exception=True)
        cart = self.get_cart()
        CartItem.objects.filter(
            cart=cart, item=input_serializer.validated_data['catalog_item']
        ).delete()
        return Response(self.get_serializer(self.get_cart()).data)

    @extend_schema(request=None, responses=CartSerializer)
    @action(detail=False, methods=('delete', 'post'), url_path='clear')
    def clear(self, request):
        """Remove every item from the current user's cart."""
        cart = self.get_cart()
        cart.items.all().delete()
        return Response(self.get_serializer(self.get_cart()).data)


class CheckoutView(APIView):
    """Approve a mock payment and create an order from the current cart."""

    permission_classes = (IsAuthenticated,)

    @extend_schema(
        request=CheckoutSerializer,
        responses={
            201: OrderSerializer,
            400: OpenApiTypes.OBJECT,
            402: OpenApiTypes.OBJECT,
        },
    )
    def post(self, request):
        """Create an order only after the mock gateway approves payment."""
        input_serializer = CheckoutSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart_items = list(cart.items.select_related('item').all())
        if not cart_items:
            return Response(
                {'detail': 'Cannot checkout with an empty cart.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_amount = sum(
            (entry.item.price * entry.quantity for entry in cart_items),
            Decimal('0.00'),
        )
        checkout_data = input_serializer.validated_data
        payment = MockPaymentGateway.process_payment(
            checkout_data['payment_method'], total_amount
        )
        if not payment['success']:
            return Response(
                {'detail': payment['message'], 'transaction_ref': payment['transaction_ref']},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        order = Order.objects.create(
            user=request.user,
            status='paid',
            shipping_address=checkout_data['shipping_address'],
            payment_method=checkout_data['payment_method'],
            transaction_ref=payment['transaction_ref'],
            total_amount=total_amount,
        )
        try:
            for entry in cart_items:
                item = entry.item
                OrderItem.objects.create(
                    order=order,
                    catalog_item=item,
                    item_name=item.name,
                    store_name=item.store_name,
                    unit_price=item.price,
                    quantity=entry.quantity,
                )
        except Exception:
            order.delete()
            raise

        cart.items.all().delete()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only order history scoped to the authenticated owner."""

    serializer_class = OrderSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        """Never expose another user's orders, even by direct ID lookup."""
        return self.request.user.orders.all().prefetch_related('items')