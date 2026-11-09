"""Authenticated cart, checkout, and order-history API views."""
import logging
from decimal import Decimal

from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
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
    RemoveSelectedCartItemsSerializer,
    UpdateCartItemSerializer,
)
from commerce.services import MockPaymentGateway
from ratings.uat_kpis import (
    EVENT_CART_CREATED,
    EVENT_CHECKOUT_COMPLETED,
    record_uat_commerce_event,
)

logger = logging.getLogger(__name__)


class MongoRetryMixin:
    """Retry once on transient MongoDB errors AND always answer in JSON."""

    def dispatch(self, request, *args, **kwargs):
        try:
            return super().dispatch(request, *args, **kwargs)
        except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
            logger.warning(
                "Transient MongoDB error (%s) on %s; retrying once",
                type(exc).__name__,
                request.path,
            )
            return super().dispatch(request, *args, **kwargs)

    def handle_exception(self, exc):
        try:
            return super().handle_exception(exc)
        except Exception as inner:  # noqa: BLE001 - non-DRF exception
            logger.exception(
                "Unhandled server error on %s %s",
                getattr(self.request, "method", "?"),
                getattr(self.request, "path", "?"),
            )
            return Response(
                {"detail": f"{type(inner).__name__}: {inner}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CartViewSet(MongoRetryMixin, viewsets.GenericViewSet):
    """Manage the authenticated user's one shopping cart."""

    permission_classes = (IsAuthenticated,)
    serializer_class = CartSerializer

    def get_cart(self):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return Cart.objects.prefetch_related('items__item').get(pk=cart.pk)

    def cart_response(self, status_code=status.HTTP_200_OK):
        """Serialize the cart defensively; KAN-FIX: include the REAL exception
        type/message in the JSON so the browser console names the cause."""
        try:
            return Response(self.get_serializer(self.get_cart()).data, status=status_code)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Cart mutated but serialization failed")
            return Response(
                {
                    "detail": (
                        "The cart was updated but could not be rendered "
                        f"({type(exc).__name__}: {exc}). Please reload the cart page."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @extend_schema(responses=CartSerializer)
    def list(self, request):
        """Return the current user's cart, creating it when necessary."""
        return self.cart_response()

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
        cart_item.item_name = item.name
        cart_item.store_name = item.store_name
        cart_item.unavailable_reason = ''
        cart_item.seller_account_deleted = False
        cart_item.catalog_item_id = str(item.pk)
        cart_item.save(update_fields=('item_name', 'store_name', 'unavailable_reason', 'seller_account_deleted', 'catalog_item_id'))
        # OBJ-07 / Criterion 8: record cart creation on the tester's active UAT
        # session (if any). The hook is idempotent, owner-scoped, and never
        # raises — UAT bookkeeping must not break commerce.
        record_uat_commerce_event(request.user, EVENT_CART_CREATED)
        return self.cart_response()

    @extend_schema(request=UpdateCartItemSerializer, responses=CartSerializer)
    @action(detail=False, methods=('patch', 'put'), url_path='update_quantity')
    def update_quantity(self, request):
        """Set the quantity for an item already in the current user's cart."""
        input_serializer = UpdateCartItemSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        cart = self.get_cart()
        item = input_serializer.validated_data['catalog_item']
        cart_item = CartItem.objects.filter(cart=cart, item=item).first()
        if cart_item is None:
            cart_item = CartItem.objects.filter(
                cart=cart,
                catalog_item_id=str(item.pk),
                item__isnull=True,
            ).first()
        if cart_item is None:
            return Response(
                {'detail': 'This item is not in your cart.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if cart_item.item is None or cart_item.seller_account_deleted:
            # FIX (syntax): double-quoted literal so the apostrophe in
            # "seller's" cannot terminate the string (the original Unicode
            # right-quote was normalized to a straight quote and broke parsing).
            return Response(
                {"detail": "This item is unavailable because the seller's account was deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cart_item.quantity = input_serializer.validated_data['quantity']
        cart_item.save(update_fields=('quantity',))
        return self.cart_response()

    @extend_schema(request=AddToCartSerializer, responses=CartSerializer)
    @action(detail=False, methods=('delete', 'post'), url_path='remove_item')
    def remove_item(self, request):
        """Remove a catalog item from the current user's cart."""
        input_serializer = AddToCartSerializer(
            data={'catalog_item': request.data.get('catalog_item'), 'quantity': 1}
        )
        input_serializer.is_valid(raise_exception=True)
        cart = self.get_cart()
        catalog_item = input_serializer.validated_data['catalog_item']
        CartItem.objects.filter(
            cart=cart,
            item=catalog_item,
        ).delete()
        CartItem.objects.filter(
            cart=cart,
            catalog_item_id=str(catalog_item.pk),
            item__isnull=True,
        ).delete()
        return self.cart_response()

    @extend_schema(request=RemoveSelectedCartItemsSerializer, responses=CartSerializer)
    @action(detail=False, methods=('post',), url_path='remove_selected')
    def remove_selected(self, request):
        """Remove selected catalog items from the current user's cart."""
        input_serializer = RemoveSelectedCartItemsSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        cart = self.get_cart()
        selected = input_serializer.validated_data['catalog_items']
        CartItem.objects.filter(
            cart=cart,
            item_id__in=[value for value in selected if value],
        ).delete()
        CartItem.objects.filter(
            cart=cart,
            catalog_item_id__in=[str(value) for value in selected if value],
            item__isnull=True,
        ).delete()
        return self.cart_response()

    @extend_schema(request=None, responses=CartSerializer)
    @action(detail=False, methods=('delete', 'post'), url_path='clear')
    def clear(self, request):
        """Remove every item from the current user's cart."""
        cart = self.get_cart()
        cart.items.all().delete()
        return self.cart_response()


class CheckoutView(MongoRetryMixin, APIView):
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
        submitted_items = input_serializer.validated_data.get('items')
        item_options = {}

        requested_ids = []
        if submitted_items is not None:
            requested_ids = [entry['catalog_item'] for entry in submitted_items]
            if len(requested_ids) != len(set(requested_ids)):
                return Response(
                    {'detail': 'A product may only be selected once per checkout.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            item_options = {
                entry['catalog_item']: entry for entry in submitted_items
            }

        requested_id_set = {str(value) for value in requested_ids}
        for cart_entry in cart_items:
            cart_entry_id = str(cart_entry.item_id or cart_entry.catalog_item_id or '')
            if cart_entry_id in requested_id_set and (cart_entry.item is None or cart_entry.seller_account_deleted):
                return Response(
                    {
                        # FIX (syntax): double-quoted literal (apostrophe-safe).
                        "detail": "This item is unavailable because the seller's account was deleted.",
                        'unavailable_item': {
                            'catalog_item': cart_entry.catalog_item_id or cart_entry_id,
                            'name': cart_entry.item_name,
                        },
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if submitted_items is not None:
            cart_items = [
                entry for entry in cart_items
                if str(entry.item_id or entry.catalog_item_id) in requested_id_set
            ]
            if len(cart_items) != len(requested_ids):
                missing_ids = [
                    entry_id for entry_id in requested_ids
                    if str(entry_id) not in {
                        str(entry.item_id or entry.catalog_item_id) for entry in cart_items
                    }
                ]
                missing_id = missing_ids[0] if missing_ids else None
                if missing_id:
                    unavailable_name = next(
                        (
                            entry.item_name
                            for entry in cart.items.filter(catalog_item_id=str(missing_id)).all()
                            if entry.item is None or entry.seller_account_deleted
                        ),
                        'Selected item',
                    )
                    return Response(
                        {
                            # FIX (syntax): double-quoted literal (apostrophe-safe).
                            "detail": "This item is unavailable because the seller's account was deleted.",
                            'unavailable_item': {
                                'catalog_item': str(missing_id),
                                'name': unavailable_name,
                            },
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                return Response(
                    {'detail': 'One or more selected products are not in your cart.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if not cart_items:
            return Response(
                {'detail': 'Cannot checkout with an empty cart.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for entry in cart_items:
            if entry.item is None or entry.seller_account_deleted:
                return Response(
                    {
                        # FIX (syntax): double-quoted literal (apostrophe-safe).
                        "detail": "This item is unavailable because the seller's account was deleted.",
                        'unavailable_item': {
                            'catalog_item': entry.catalog_item_id or str(entry.item_id or ''),
                            'name': entry.item_name,
                        },
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        total_amount = sum(
            (
                Decimal(str(entry.item.price or 0)) * int(entry.quantity or 0)
                for entry in cart_items
            ),
            Decimal('0.00'),
        )
        shipping_fee = Decimal('0.00') if total_amount >= Decimal('1500.00') else Decimal('80.00')
        order_total = total_amount + shipping_fee
        checkout_data = input_serializer.validated_data
        payment_method = checkout_data['payment_method']
        is_cash_on_delivery = payment_method.casefold() == 'cash on delivery'
        payment = (
            {'success': True, 'transaction_ref': None}
            if is_cash_on_delivery
            else MockPaymentGateway.process_payment(payment_method, order_total)
        )
        if not payment['success']:
            return Response(
                {'detail': payment['message'], 'transaction_ref': payment['transaction_ref']},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        order = Order.objects.create(
            user=request.user,
            status='pending' if is_cash_on_delivery else 'paid',
            recipient_name=checkout_data.get('recipient_name', ''),
            recipient_email=checkout_data.get('recipient_email', ''),
            contact_number=checkout_data.get('contact_number', ''),
            shipping_address=checkout_data['shipping_address'],
            payment_method=payment_method,
            transaction_ref=payment['transaction_ref'] or '',
            shipping_fee=shipping_fee,
            total_amount=order_total,
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
                    size=item_options.get(str(item.pk), {}).get('size', ''),
                    color=item_options.get(str(item.pk), {}).get('color', ''),
                )
        except Exception:
            order.delete()
            raise
        cart.items.filter(pk__in=[entry.pk for entry in cart_items]).delete()
        # OBJ-07 / Criterion 8: record checkout completion on the tester's
        # active UAT session (if any). Only fires on the SUCCESS path — a
        # simulated decline must not count (UT-12).
        record_uat_commerce_event(request.user, EVENT_CHECKOUT_COMPLETED)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderViewSet(MongoRetryMixin, viewsets.ReadOnlyModelViewSet):
    """Read-only order history scoped to the authenticated owner.

    FIX (cancelled order reverted to Processing): the history/details pages
    could only cancel client-side, so the server row never changed and the
    next sync overwrote the local "Cancelled" status. A shopper-facing cancel
    action is now exposed; the DefaultRouter registers it automatically as
    POST /orders/<pk>/cancel/ (no urls.py change required).
    """

    serializer_class = OrderSerializer
    permission_classes = (IsAuthenticated,)

    # Lifecycle states that still allow a shopper-initiated cancellation.
    # Anything already shipped/delivered must go through seller support.
    CANCELLABLE_STATUSES = ('pending', 'paid', 'processing', 'to_ship')

    def get_queryset(self):
        """Never expose another user's orders, even by direct ID lookup."""
        return self.request.user.orders.all().prefetch_related('items')

    @extend_schema(
        request=None,
        responses={
            200: OrderSerializer,
            400: OpenApiTypes.OBJECT,
        },
    )
    @action(detail=True, methods=('post',), url_path='cancel')
    def cancel(self, request, pk=None):
        """Cancel a not-yet-shipped order owned by the authenticated shopper."""
        order = self.get_object()

        # Idempotent: re-cancelling an already cancelled order is a no-op 200.
        if order.status == 'cancelled':
            return Response(OrderSerializer(order).data)

        if order.status not in self.CANCELLABLE_STATUSES:
            return Response(
                {
                    'detail': (
                        'This order can no longer be cancelled '
                        f'(current status: {order.get_status_display()}).'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = 'cancelled'
        order.save()
        logger.info("Order %s cancelled by user %s", order.pk, request.user.pk)
        return Response(OrderSerializer(order).data)