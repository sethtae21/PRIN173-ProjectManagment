from django.conf import settings
from django.db import models

from accounts.storage import gridfs_storage


class UploadBatch(models.Model):
    STATUS_CHOICES = (
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='upload_batches')
    store_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    total_items = models.IntegerField(default=0)
    accepted_count = models.IntegerField(default=0)
    rejected_count = models.IntegerField(default=0)
    rejection_report = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'accounts_uploadbatch'
        ordering = ['-created_at']

    def __str__(self):
        batch_id = str(self.id) if self.id else 'new'
        return f"Batch {batch_id[:8]} - {self.seller.username}"


class CatalogItem(models.Model):
    CATEGORY_CHOICES = [
        ('tops', 'Tops'),
        ('bottoms', 'Bottoms'),
        ('dresses', 'Dresses'),
        ('outerwear', 'Outerwear'),
        ('footwear', 'Footwear'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('rejected', 'Rejected'),
        ('processing', 'Processing'),
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
    compatible_color_palette_tags = models.JSONField(default=list, blank=True)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='catalog_items')
    store_name = models.CharField(max_length=255)
    front_image = models.ImageField(storage=gridfs_storage, upload_to='catalog/front/', blank=True, null=True)
    side_image = models.ImageField(storage=gridfs_storage, upload_to='catalog/side/', blank=True, null=True)
    rear_image = models.ImageField(storage=gridfs_storage, upload_to='catalog/rear/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    rejection_reasons = models.JSONField(default=list, blank=True)
    batch = models.ForeignKey('catalog.UploadBatch', on_delete=models.SET_NULL, null=True, related_name='items')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_catalogitem'
        indexes = [
            models.Index(fields=['category', 'status']),
            models.Index(fields=['seller', 'status']),
        ]

    def __str__(self):
        return f"{self.name} - {self.store_name}"
