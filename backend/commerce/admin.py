from django.contrib import admin

from .models import Cart, CartItem, Order, OrderItem


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'item_count', 'created_at', 'updated_at']
    search_fields = ['user__username']
    readonly_fields = ['created_at', 'updated_at']

    def item_count(self, obj):
        return obj.items.count()

    item_count.short_description = 'Items'


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ['cart', 'item', 'quantity', 'added_at']
    search_fields = ['cart__user__username', 'item__name']
    list_filter = ['added_at']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id_display', 'user', 'status', 'payment_method', 'total_amount', 'created_at']
    list_filter = ['status', 'payment_method', 'created_at']
    search_fields = ['user__username', 'transaction_ref']
    ordering = ['-created_at']
    readonly_fields = ['id_display', 'user', 'shipping_address', 'payment_method', 'transaction_ref', 'total_amount', 'created_at']

    def id_display(self, obj):
        return str(obj.id)

    id_display.short_description = 'Order ID'


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'item_name', 'store_name', 'unit_price', 'quantity']
    search_fields = ['item_name', 'store_name', 'order__user__username']
    readonly_fields = ['order', 'catalog_item', 'item_name', 'store_name', 'unit_price', 'quantity']
