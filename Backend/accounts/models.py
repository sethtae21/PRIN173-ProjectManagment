from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom User model for FitFusion.
    Adds fields for avatar customization.
    """
    ROLE_CHOICES = (
        ('user', 'Regular User'),
        ('guest', 'Guest'),
    )
    
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    skin_tone = models.CharField(max_length=7, blank=True, null=True) # e.g., #F1C27D
    height = models.IntegerField(blank=True, null=True) # in cm
    weight = models.IntegerField(blank=True, null=True) # in kg
    body_proportions = models.CharField(max_length=50, blank=True, null=True)
    
    def __str__(self):
        return self.username