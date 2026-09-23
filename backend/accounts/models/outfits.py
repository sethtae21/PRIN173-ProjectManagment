from django.db import models

from .catalog import CatalogItem
from .user import User


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


class Outfit(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='outfits')
    name = models.CharField(max_length=100)
    items = models.ManyToManyField(CatalogItem, related_name='outfits', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # NOTE: No Meta.indexes on 'user' here.

    def __str__(self):
        return f"{self.name} ({self.user.username})"