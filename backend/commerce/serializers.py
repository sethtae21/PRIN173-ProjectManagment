"""Serializers for shopping carts, checkout, and order history."""

from decimal import Decimal

from rest_framework import serializers

from catalog.models import CatalogItem
from commerce.models import Cart, CartItem, Order, OrderItem


def _image_url(image_field):
    if not image_field:
        return None
    try:
        return image_field.url
    except (ValueError, OSError):
        return None


class CartItemSerializer(serializers.ModelSerializer):
    """Current catalog details for a cart entry."""

    id = serializers.CharField(read_only=True)
    catalog_item = serializers.CharField(source='item_id', read_only=True)
    name = serializers.CharField(source='item.name', read_only=True)
    store_name = serializers.CharField(source='item.store_name', read_only=True)
    price = serializers.DecimalField(
        source='item.price', max_digits=10, decimal_places=2, read_only=True
    )
    front_image_url = serializers.SerializerMethodField()
    side_image_url = serializers.SerializerMethodField()
    rear_image_url = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = (
            'id', 'catalog_item', 'name', 'store_name', 'price', 'quantity',
            'front_image_url', 'side_image_url', 'rear_image_url',
        )
        read_only_fields = fields

    def get_front_image_url(self, obj):
        return _image_url(obj.item.front_image)

    def get_side_image_url(self, obj):
        return _image_url(obj.item.side_image)

    def get_rear_image_url(self, obj):
        return _image_url(obj.item.rear_image)


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
        total = sum(
            (entry.item.price * entry.quantity for entry in obj.items.all()),
            Decimal('0.00'),
        )
        return total

    def get_item_count(self, obj):
        return sum(entry.quantity for entry in obj.items.all())


class AddToCartSerializer(serializers.Serializer):
    """Validate a catalog item and quantity for adding to a cart."""

    catalog_item = serializers.CharField()
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate_catalog_item(self, value):
        try:
            return CatalogItem.objects.get(pk=value)
        except (CatalogItem.DoesNotExist, TypeError, ValueError):
            raise serializers.ValidationError('Catalog item does not exist.')


class UpdateCartItemSerializer(AddToCartSerializer):
    """Validate the item and replacement quantity for a cart entry."""


class OrderItemSerializer(serializers.ModelSerializer):
    """Immutable item details captured when an order was placed."""

    id = serializers.CharField(read_only=True)
    catalog_item = serializers.CharField(source='catalog_item_id', read_only=True, allow_null=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'catalog_item', 'item_name', 'store_name', 'unit_price', 'quantity')
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    """Read-only order representation, including purchase-time item snapshots."""

    id = serializers.CharField(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'status', 'shipping_address', 'payment_method', 'transaction_ref',
            'total_amount', 'created_at', 'items',
        )
        read_only_fields = fields


class CheckoutSerializer(serializers.Serializer):
    """Validate the customer-provided shipping and payment details."""

    shipping_address = serializers.CharField(trim_whitespace=True)
    payment_method = serializers.CharField(max_length=32, trim_whitespace=True)

    def validate_shipping_address(self, value):
        if not value:
            raise serializers.ValidationError('Shipping address is required.')
        return value

    def validate_payment_method(self, value):
        if not value:
            raise serializers.ValidationError('Payment method is required.')
        return value