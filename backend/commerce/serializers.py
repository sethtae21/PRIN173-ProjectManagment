"""Serializers for shopping carts, checkout, and order history."""
from decimal import Decimal, InvalidOperation

from django.conf import settings
from rest_framework import serializers

from catalog.models import CatalogItem
from commerce.models import Cart, CartItem, Order, OrderItem


def _safe_decimal(value, default=Decimal("0.00")):
    """KAN-FIX: a catalog row with a missing/invalid price must never 500 the
    cart (None * quantity previously raised TypeError in get_total_amount)."""
    if value is None:
        return default
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return default


def _safe_quantity(value):
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _image_url(image_field):
    """Best-effort image URL: NEVER let a storage quirk 500 the cart."""
    if not image_field:
        return None
    try:
        return image_field.url
    except Exception:  # noqa: BLE001 - GridFS/storage errors must not crash carts
        try:
            name = getattr(image_field, "name", "") or ""
            if name:
                return f"{settings.MEDIA_URL}{str(name).lstrip('/')}"
        except Exception:  # noqa: BLE001
            return None
        return None


class CartItemSerializer(serializers.ModelSerializer):
    """Current catalog details for a cart entry.

    KAN-FIX: the Side view was permanently removed, so CatalogItem has NO
    side_image field. The old side_image_url attribute read raised
    AttributeError on every cart render ("The cart was updated but could not
    be rendered"). Side image is fully removed; remaining images are read via
    getattr so a missing column degrades to null instead of crashing.
    """
    id = serializers.CharField(read_only=True)
    catalog_item = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    store_name = serializers.SerializerMethodField()
    available = serializers.SerializerMethodField()
    unavailable_reason = serializers.SerializerMethodField()
    seller_account_deleted = serializers.BooleanField(read_only=True)
    price = serializers.SerializerMethodField()
    front_image_url = serializers.SerializerMethodField()
    rear_image_url = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = (
            'id', 'catalog_item', 'name', 'store_name', 'price', 'quantity',
            'available', 'unavailable_reason', 'seller_account_deleted',
            'front_image_url', 'rear_image_url',
        )
        read_only_fields = fields

    def get_catalog_item(self, obj):
        return obj.catalog_item_id or (str(obj.item_id) if obj.item_id else '')

    def get_name(self, obj):
        return obj.item_name or getattr(obj.item, 'name', 'Unavailable item')

    def get_store_name(self, obj):
        return obj.store_name or getattr(obj.item, 'store_name', 'FitFusion Seller')

    def get_available(self, obj):
        return obj.item is not None and not obj.seller_account_deleted

    def get_unavailable_reason(self, obj):
        return obj.unavailable_reason if obj.seller_account_deleted else ''

    def get_price(self, obj):
        return str(_safe_decimal(getattr(obj.item, "price", None) if obj.item else None))

    def get_front_image_url(self, obj):
        return _image_url(getattr(obj.item, "front_image", None) if obj.item else None)

    def get_rear_image_url(self, obj):
        return _image_url(getattr(obj.item, "rear_image", None) if obj.item else None)


class CartSerializer(serializers.ModelSerializer):
    """Cart contents with a total based on current catalog prices."""
    id = serializers.CharField(read_only=True)
    items = CartItemSerializer(many=True, read_only=True)
    total_amount = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ('id', 'items', 'total_amount', 'item_count', 'created_at', 'updated_at')
        read_only_fields = fields

    def get_total_amount(self, obj):
        # KAN-FIX: defensive arithmetic; None prices/quantities no longer raise.
        total = Decimal("0.00")
        for entry in obj.items.all():
            if entry.item is None or entry.seller_account_deleted:
                continue
            total += _safe_decimal(getattr(entry.item, "price", None)) * _safe_quantity(entry.quantity)
        return total

    def get_item_count(self, obj):
        return sum(
            _safe_quantity(entry.quantity)
            for entry in obj.items.all()
            if entry.item is not None and not entry.seller_account_deleted
        )


class AddToCartSerializer(serializers.Serializer):
    """Validate a catalog item and quantity for adding to a cart."""
    catalog_item = serializers.CharField()
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate_catalog_item(self, value):
        try:
            item = CatalogItem.objects.get(pk=value)
        except (CatalogItem.DoesNotExist, TypeError, ValueError):
            raise serializers.ValidationError('Catalog item does not exist.')
        if item.status != 'active':
            raise serializers.ValidationError('This item is no longer available.')
        return item


class UpdateCartItemSerializer(AddToCartSerializer):
    """Validate the item and replacement quantity for a cart entry."""


class RemoveSelectedCartItemsSerializer(serializers.Serializer):
    """Validate catalog item identifiers selected for removal."""
    catalog_items = serializers.ListField(
        child=serializers.CharField(), allow_empty=False
    )


class OrderItemSerializer(serializers.ModelSerializer):
    """Immutable item details captured at purchase time."""
    id = serializers.CharField(read_only=True)
    catalog_item = serializers.CharField(source='catalog_item_id', read_only=True, allow_null=True)

    class Meta:
        model = OrderItem
        fields = (
            'id', 'catalog_item', 'item_name', 'store_name', 'unit_price',
            'quantity', 'size', 'color',
        )
        read_only_fields = fields


class CheckoutItemSerializer(serializers.Serializer):
    """Validate selected cart product options to snapshot on the order."""
    catalog_item = serializers.CharField()
    size = serializers.CharField(max_length=32, allow_blank=True, required=False)
    color = serializers.CharField(max_length=64, allow_blank=True, required=False)


class OrderSerializer(serializers.ModelSerializer):
    """Read-only order representation, including purchase-time item snapshots."""
    id = serializers.CharField(read_only=True)
    order_number = serializers.CharField(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'order_number', 'status', 'recipient_name', 'recipient_email',
            'contact_number', 'shipping_address', 'payment_method',
            'transaction_ref', 'shipping_fee', 'total_amount', 'created_at', 'items',
        )
        read_only_fields = fields


class CheckoutSerializer(serializers.Serializer):
    """Validate the customer-provided shipping and payment details."""
    recipient_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    recipient_email = serializers.EmailField(required=False, allow_blank=True)
    contact_number = serializers.CharField(max_length=32, required=False, allow_blank=True)
    shipping_address = serializers.CharField(trim_whitespace=True)
    payment_method = serializers.CharField(max_length=32, trim_whitespace=True)
    items = CheckoutItemSerializer(many=True, required=False)

    def validate_shipping_address(self, value):
        if not value:
            raise serializers.ValidationError('Shipping address is required.')
        return value

    def validate_payment_method(self, value):
        if not value:
            raise serializers.ValidationError('Payment method is required.')
        return value