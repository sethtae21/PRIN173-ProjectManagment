from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


class UserManager(BaseUserManager):
    """Custom user manager for MongoDB"""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        return self.create_user(email, password, **extra_fields)
    
    def get_by_natural_key(self, email):
        return self.get(email=email)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User model for FitFusion AI"""
    
    ROLE_CHOICES = (
        ('user', 'Regular User'),
        ('guest', 'Guest'),
        ('seller', 'Seller'),
        ('admin', 'Admin'),
    )
    
    # Required fields
    email = models.EmailField(unique=True, max_length=255)
    username = models.CharField(max_length=100, unique=True, blank=True, null=True)
    
    # Role-based access control
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    store_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Avatar customization fields (from second code)
    skin_tone = models.CharField(max_length=7, blank=True, null=True)  # e.g., #F1C27D
    height = models.IntegerField(blank=True, null=True)  # in cm
    weight = models.IntegerField(blank=True, null=True)  # in kg
    body_proportions = models.CharField(max_length=50, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Django required fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['role']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.email} ({self.role})"
    
    def get_full_name(self):
        return self.username or self.email
    
    def get_short_name(self):
        return self.email
    
    def is_seller(self):
        return self.role == 'seller'
    
    def is_regular_user(self):
        return self.role == 'user'
    
    def is_guest(self):
        return self.role == 'guest'