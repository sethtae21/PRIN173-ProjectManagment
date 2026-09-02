from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # NO manual 'id' field needed here. DEFAULT_AUTO_FIELD handles it globally.
    
    ROLE_CHOICES = (
        ('user', 'Regular User'),
        ('seller', 'Seller'),
        ('guest', 'Guest'),
    )
    
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    store_name = models.CharField(max_length=255, blank=True, null=True)
    skin_tone = models.CharField(max_length=7, blank=True, null=True)
    height = models.IntegerField(blank=True, null=True)
    weight = models.IntegerField(blank=True, null=True)
    body_proportions = models.CharField(max_length=255, blank=True, null=True)
    
    def __str__(self):
        return self.username


class CatalogItem(models.Model):
    # NO manual 'id' field needed here either.

    CATEGORY_CHOICES = [
        ('tops', 'Tops'),
        ('bottoms', 'Bottoms'),
        ('dresses', 'Dresses/One-Piece Outfits'),
        ('outerwear', 'Outerwear'),
        ('footwear', 'Footwear'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('rejected', 'Rejected'),
    ]
    
    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    size = models.CharField(max_length=50)
    color = models.CharField(max_length=100)
    color_description = models.TextField()
    color_family = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    style_tags = models.JSONField(default=list, blank=True)
    occasion_tags = models.JSONField(default=list, blank=True)
    color_palette_tags = models.JSONField(default=list, blank=True)
    
    front_image = models.ImageField(upload_to='catalog/front/', blank=True, null=True)
    side_image = models.ImageField(upload_to='catalog/side/', blank=True, null=True)
    rear_image = models.ImageField(upload_to='catalog/rear/', blank=True, null=True)
    
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='catalog_items', limit_choices_to={'role': 'seller'})
    store_name = models.CharField(max_length=255)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    rejection_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['category', 'status']),
            models.Index(fields=['seller', 'status']),
            models.Index(fields=['color_family']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.store_name}"