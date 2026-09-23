from django.db import models

from .catalog import CatalogItem
from .user import User


class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart of {self.user.username}"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(CatalogItem, on_delete=models.CASCADE, related_name='cart_entries')
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cart', 'item')
        # NOTE: No indexes on 'cart' here.

    def __str__(self):
        return f"{self.quantity} x {self.item.name}"


class Order(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('paid', 'Paid'), ('cancelled', 'Cancelled')]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    shipping_address = models.TextField()
    payment_method = models.CharField(max_length=32)
    transaction_ref = models.CharField(max_length=64, blank=True, help_text='Mock gateway reference')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        # Composite index is safe and useful for "User's Order History" queries
        indexes = [models.Index(fields=['user', 'created_at'])]

    def __str__(self):
        return f"Order {self.id} - {self.user.username}"


class OrderItem(models.Model):
    """Snapshot of purchased item — keeps store name even if listing is deleted (FR-6.8)."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    catalog_item = models.ForeignKey(CatalogItem, on_delete=models.SET_NULL, null=True, blank=True)
    item_name = models.CharField(max_length=255)
    store_name = models.CharField(max_length=255)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.quantity} x {self.item_name}"