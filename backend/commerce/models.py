import random
import string

from django.conf import settings
from django.db import models


def generate_order_number():
    """Generate a unique human-readable order number, e.g. FF-48291037.

    Called from Order.save() so EVERY order row always stores a
    non-null, non-empty order number in MongoDB.
    """
    while True:
        candidate = "FF-" + "".join(random.choices(string.digits, k=8))
        if not Order.objects.filter(order_number=candidate).exists():
            return candidate


class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_cart'

    def __str__(self):
        return f"Cart of {self.user.username}"


class CartItem(models.Model):
    cart = models.ForeignKey('commerce.Cart', on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey('catalog.CatalogItem', on_delete=models.CASCADE, related_name='cart_entries')
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_cartitem'
        unique_together = ('cart', 'item')

    def __str__(self):
        return f"{self.quantity} x {self.item.name}"


class Order(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('paid', 'Paid'), ('cancelled', 'Cancelled')]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    # Human-readable order number, stored NOT NULL and unique.
    # FIX: callable default stops `makemigrations` from prompting for a
    # one-off value when this field is added to pre-existing rows.
    order_number = models.CharField(max_length=32, unique=True, editable=False, default=generate_order_number)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    recipient_name = models.CharField(max_length=255, blank=True)
    recipient_email = models.EmailField(blank=True)
    contact_number = models.CharField(max_length=32, blank=True)
    shipping_address = models.TextField()
    payment_method = models.CharField(max_length=32)
    transaction_ref = models.CharField(max_length=64, blank=True, help_text='Mock gateway reference')
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_order'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', 'created_at'])]

    def save(self, *args, **kwargs):
        # Guarantee the order number is never null/empty in the database.
        if not self.order_number:
            self.order_number = generate_order_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order {self.order_number} - {self.user.username}"


class OrderItem(models.Model):
    order = models.ForeignKey('commerce.Order', on_delete=models.CASCADE, related_name='items')
    catalog_item = models.ForeignKey('catalog.CatalogItem', on_delete=models.SET_NULL, null=True, blank=True)
    item_name = models.CharField(max_length=255)
    store_name = models.CharField(max_length=255)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    size = models.CharField(max_length=32, blank=True)
    color = models.CharField(max_length=64, blank=True)

    class Meta:
        db_table = 'accounts_orderitem'

    def __str__(self):
        return f"{self.quantity} x {self.item_name}"