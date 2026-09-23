from django.db import models
from django.contrib.auth.models import AbstractUser


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

    class Meta:
        db_table = 'accounts_user'
        verbose_name = 'user'
        verbose_name_plural = 'users'

    def __str__(self):
        return self.username