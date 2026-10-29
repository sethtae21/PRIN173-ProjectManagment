from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


class UserManager(BaseUserManager):
    def create_user(self, email, full_name, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        if not full_name:
            raise ValueError("Users must have a full name")
        
        email = self.normalize_email(email)
        user = self.model(email=email, full_name=full_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_seller(self, email, full_name, store_name, password=None, **extra_fields):
        extra_fields.setdefault('role', 'seller')
        if not store_name:
            raise ValueError("Sellers must have a store name")
        
        user = self.create_user(email, full_name, password, **extra_fields)
        user.store_name = store_name
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('shopper', 'Shopper'),
        ('seller', 'Seller'),
    )
    
    # Authentication
    email = models.EmailField(unique=True, max_length=255)
    full_name = models.CharField(max_length=255)
    
    # Role
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='shopper')
    store_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Contact Information
    mobile = models.CharField(max_length=20, blank=True, null=True)
    
    # Address Fields
    street = models.CharField(max_length=255, blank=True, null=True)
    barangay = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=255, blank=True, null=True)
    province = models.CharField(max_length=255, blank=True, null=True)
    postal_code = models.CharField(max_length=10, blank=True, null=True)
    
    # NOTE (avatar refactor): the legacy body attributes
    #   skin_tone / height / weight / body_proportions
    # were REMOVED from this model. They are owned exclusively by
    # outfits.AvatarPreset (SRS FR-2.3, FR-2.4, FR-2.7, FR-2.9), which is now
    # the single source of truth for body/skin data. See migration
    # accounts/0002_remove_user_body_fields.py.
    
    # Django required fields (simplified - no username)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # For Django admin access
    date_joined = models.DateTimeField(auto_now_add=True)
    
    # Custom manager
    objects = UserManager()
    
    # Use email as the username field
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']
    
    class Meta:
        db_table = 'accounts_user'
        verbose_name = 'user'
        verbose_name_plural = 'users'

    def __str__(self):
        return f"{self.full_name} ({self.email})"
    
    def get_full_name(self):
        return self.full_name
    
    def get_short_name(self):
        return self.email