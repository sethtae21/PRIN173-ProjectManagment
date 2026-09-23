import os
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible

# ==========================================
# Part 4: GridFS Storage Class (Deconstructible & Lazy)
# ==========================================
@deconstructible
class GridFSStorage(Storage):
    """
    Custom storage class to store files in MongoDB GridFS.
    """
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

    def _open(self, name, mode='rb'):
        """Open a file from GridFS for reading"""
        self._setup()
        if self._use_gridfs:
            from django.core.files.base import ContentFile
            try:
                from bson.objectid import ObjectId
                file = self._fs.find_one({'_id': ObjectId(name)})
            except Exception:
                file = self._fs.find_one({'filename': name})
            if file:
                return ContentFile(file.read())
            raise FileNotFoundError(f"File {name} not found in GridFS")
        raise FileNotFoundError(f"GridFS not available and file {name} not found")

    def _save(self, name, content):
        self._setup()
        if self._use_gridfs:
            file_id = self._fs.put(content, filename=name)
            return str(file_id)
        raise Exception("GridFS not available - cannot save file")

    def exists(self, name):
        self._setup()
        if self._use_gridfs:
            return self._fs.exists({'filename': name})
        return False

    def url(self, name):
        return f'/media/{name}'

    def delete(self, name):
        self._setup()
        if self._use_gridfs:
            try:
                file = self._fs.find_one({'filename': name})
                if file:
                    self._fs.delete(file._id)
            except Exception:
                pass

# Create the singleton instance
gridfs_storage = GridFSStorage()

# ==========================================
# 1. User Model (FR-1.1 / RBAC)
# ==========================================
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

# ==========================================
# 2. Upload Batch (Ticket/Tracking System)
# ==========================================
class UploadBatch(models.Model):
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

# ==========================================
# 3. Catalog Item (Seller Listings)
# ==========================================
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
    # Metadata
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

    # Images (GridFS Storage)
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
        # Composite indexes are safe. Single field indexes on FKs are auto-created by Django.
        indexes = [
            models.Index(fields=['category', 'status']),
            models.Index(fields=['seller', 'status']),
        ]

    def __str__(self):
        return f"{self.name} - {self.store_name}"

# ==========================================
# 4. Avatar Presets (WBS 1.3.2 / FR-2.1–2.10)
# ==========================================
class AvatarPreset(models.Model):
    GENDER_CHOICES = [('male', 'Male'), ('female', 'Female')]
    UNDERTONE_CHOICES = [('warm', 'Warm'), ('cool', 'Cool'), ('neutral', 'Neutral')]
    SHOULDER_CHOICES = [('narrow', 'Narrow'), ('average', 'Average'), ('broad', 'Broad')]
    WAIST_CHOICES = [('slim', 'Slim'), ('average', 'Average'), ('curvy', 'Curvy')]
    HIP_CHOICES = [('slim', 'Slim'), ('average', 'Average'), ('wide', 'Wide')]
    CUP_CHOICES = [('', 'Not applicable'), ('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')]
    THIGH_CHOICES = [('slim', 'Slim'), ('average', 'Average'), ('thick', 'Thick')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='avatar_presets')
    name = models.CharField(max_length=100)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    height = models.IntegerField(help_text='Height in cm')
    weight = models.IntegerField(help_text='Weight in kg')
    skin_tone = models.CharField(max_length=32, default='medium')
    undertone = models.CharField(max_length=10, choices=UNDERTONE_CHOICES, default='neutral')
    shoulder = models.CharField(max_length=10, choices=SHOULDER_CHOICES, default='average')
    waist = models.CharField(max_length=10, choices=WAIST_CHOICES, default='average')
    hip = models.CharField(max_length=10, choices=HIP_CHOICES, default='average')
    cup_size = models.CharField(max_length=2, choices=CUP_CHOICES, blank=True, default='')
    thigh = models.CharField(max_length=10, choices=THIGH_CHOICES, default='average')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # NOTE: No Meta.indexes on 'user' here. Django auto-creates the FK index.
    # Adding it explicitly causes MongoDB Error 85 (IndexOptionsConflict).

    def __str__(self):
        return f"{self.name} ({self.user.username})"

# ==========================================
# 5. Saved Outfits (WBS 1.3.8 / FR-5.4–5.8)
# ==========================================
class Outfit(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='outfits')
    name = models.CharField(max_length=100)
    items = models.ManyToManyField(CatalogItem, related_name='outfits', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # NOTE: No Meta.indexes on 'user' here.

    def __str__(self):
        return f"{self.name} ({self.user.username})"

# ==========================================
# 6. Shopping Cart (WBS 1.3.6 / FR-6.1–6.4)
# ==========================================
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

# ==========================================
# 7. Orders + Mock Payment (WBS 1.3.6 / FR-6.5–6.9)
# ==========================================
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