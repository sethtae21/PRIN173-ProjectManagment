from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible
import os

# ==========================================
# Part 4: GridFS Storage Class (Deconstructible & Lazy)
# ==========================================
@deconstructible
class GridFSStorage(Storage):
    """Custom storage class to store files in MongoDB GridFS with SQLite fallback"""
    def __init__(self):
        # Lazy initialization: Do not connect yet to avoid migration serialization errors
        self._client = None
        self._db = None
        self._fs = None
        self._use_gridfs = None

    def _setup(self):
        """Connect to MongoDB only when needed"""
        if self._fs is None and self._use_gridfs is None:
            try:
                from pymongo import MongoClient
                from gridfs import GridFS
                
                mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
                # Short timeout to fail fast if MongoDB is unreachable
                self._client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
                self._client.admin.command('ping') 
                self._db = self._client.get_database()
                self._fs = GridFS(self._db)
                self._use_gridfs = True
            except Exception:
                self._use_gridfs = False

    def _save(self, name, content):
        self._setup()
        if self._use_gridfs:
            file_id = self._fs.put(content, filename=name)
            return str(file_id)
        else:
            # Fallback to default storage (e.g., local filesystem for SQLite)
            from django.core.files.storage import default_storage
            return default_storage._save(name, content)

    def exists(self, name):
        self._setup()
        if self._use_gridfs:
            return self._fs.exists({'filename': name})
        from django.core.files.storage import default_storage
        return default_storage.exists(name)

    def url(self, name):
        return f'/media/{name}'

    def delete(self, name):
        self._setup()
        if self._use_gridfs:
            try:
                file = self._fs.find_one({'filename': name})
                if file:
                    self._fs.delete(file._id)
            except:
                pass
        else:
            from django.core.files.storage import default_storage
            default_storage.delete(name)

# Create the instance (it is now deconstructible and safe for migrations)
gridfs_storage = GridFSStorage()


class User(AbstractUser):
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


class UploadBatch(models.Model):
    """The ticket/tracking system for batch uploads"""
    STATUS_CHOICES = (
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )
    
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='upload_batches')
    store_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    total_items = models.IntegerField(default=0)
    accepted_count = models.IntegerField(default=0)
    rejected_count = models.IntegerField(default=0)
    rejection_report = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        batch_id = str(self.id) if self.id else 'new'
        return f"Batch {batch_id[:8]} - {self.seller.username}"
    
    # FIXED: Removed ObjectId override. Django's BigAutoField auto-generates
    # integer primary keys properly. Forcing ObjectId() broke SQLite migrations.
    # If you ever switch back to MongoDB backend, re-add the ObjectId logic here.


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
    
    # Basic metadata
    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    size = models.CharField(max_length=50)
    color = models.CharField(max_length=100)
    color_description = models.TextField()
    color_family = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Tags
    style_tags = models.JSONField(default=list, blank=True)
    occasion_tags = models.JSONField(default=list, blank=True)
    compatible_color_palette_tags = models.JSONField(default=list, blank=True)
    
    # Seller info
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='catalog_items')
    store_name = models.CharField(max_length=255)
    
    # Images (Part 4: Using GridFS Storage with automatic fallback)
    front_image = models.ImageField(storage=gridfs_storage, upload_to='catalog/front/', blank=True, null=True)
    side_image = models.ImageField(storage=gridfs_storage, upload_to='catalog/side/', blank=True, null=True)
    rear_image = models.ImageField(storage=gridfs_storage, upload_to='catalog/rear/', blank=True, null=True)
    
    # Status & Batch tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    rejection_reasons = models.JSONField(default=list, blank=True)
    batch = models.ForeignKey(UploadBatch, on_delete=models.SET_NULL, null=True, related_name='items')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['category', 'status']),
            models.Index(fields=['seller', 'status']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.store_name}"