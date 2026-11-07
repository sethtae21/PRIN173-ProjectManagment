from django.conf import settings
from django.db import models


class AvatarPreset(models.Model):
    GENDER_CHOICES = [('male', 'Male'), ('female', 'Female')]
    UNDERTONE_CHOICES = [('warm', 'Warm'), ('cool', 'Cool'), ('neutral', 'Neutral')]
    SHOULDER_CHOICES = [('narrow', 'Narrow'), ('average', 'Average'), ('broad', 'Broad')]
    WAIST_CHOICES = [('slim', 'Slim'), ('average', 'Average'), ('curvy', 'Curvy')]
    HIP_CHOICES = [('slim', 'Slim'), ('average', 'Average'), ('wide', 'Wide')]
    CUP_CHOICES = [('', 'Not applicable'), ('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')]
    THIGH_CHOICES = [('slim', 'Slim'), ('average', 'Average'), ('thick', 'Thick')]
    STYLE_FOCUS_CHOICES = [
        ('casual', 'Casual'),
        ('formal', 'Formal'),
        ('sporty', 'Sporty'),
        ('glamorous', 'Glamorous'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='avatar_presets')
    name = models.CharField(max_length=100)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    # CHANGED: FloatField so the exact one-decimal slider value (e.g. 177.4 cm)
    # survives the round-trip instead of being truncated to 177.
    height = models.FloatField(help_text='Height in cm (decimal preserved)')
    weight = models.FloatField(help_text='Weight in kg (decimal preserved)')
    skin_tone = models.CharField(max_length=32, default='medium')
    undertone = models.CharField(max_length=10, choices=UNDERTONE_CHOICES, default='neutral')
    shoulder = models.CharField(max_length=10, choices=SHOULDER_CHOICES, default='average')
    waist = models.CharField(max_length=10, choices=WAIST_CHOICES, default='average')
    hip = models.CharField(max_length=10, choices=HIP_CHOICES, default='average')
    cup_size = models.CharField(max_length=2, choices=CUP_CHOICES, blank=True, default='')
    thigh = models.CharField(max_length=10, choices=THIGH_CHOICES, default='average')
    style_focus = models.CharField(max_length=12, choices=STYLE_FOCUS_CHOICES, default='casual')
    # CHANGED: FloatField so 95.7 cm stays 95.7 cm (was IntegerField -> 96).
    body_build_cm = models.FloatField(default=99, help_text='Body build (chest girth) in cm, 86-112 (decimal preserved)')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_avatarpreset'

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class Outfit(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='outfits')
    name = models.CharField(max_length=100)

    occasion = models.CharField(max_length=32, blank=True, default='Casual')
    description = models.TextField(blank=True, default='')

    avatar_preset = models.ForeignKey(
        AvatarPreset, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='outfits',
    )

    avatar_gender = models.CharField(max_length=10, choices=AvatarPreset.GENDER_CHOICES, blank=True, default='')
    avatar_height = models.IntegerField(null=True, blank=True)
    avatar_weight = models.IntegerField(null=True, blank=True)
    avatar_skin_tone = models.CharField(max_length=32, blank=True, default='')
    avatar_undertone = models.CharField(max_length=10, choices=AvatarPreset.UNDERTONE_CHOICES, blank=True, default='')
    avatar_shoulder = models.CharField(max_length=10, choices=AvatarPreset.SHOULDER_CHOICES, blank=True, default='')
    avatar_waist = models.CharField(max_length=10, choices=AvatarPreset.WAIST_CHOICES, blank=True, default='')
    avatar_hip = models.CharField(max_length=10, choices=AvatarPreset.HIP_CHOICES, blank=True, default='')
    avatar_thigh = models.CharField(max_length=10, choices=AvatarPreset.THIGH_CHOICES, blank=True, default='')
    avatar_cup_size = models.CharField(max_length=2, choices=AvatarPreset.CUP_CHOICES, blank=True, default='')
    avatar_view = models.CharField(max_length=8, blank=True, default='front')

    items = models.ManyToManyField('catalog.CatalogItem', related_name='outfits', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_outfit'

    def __str__(self):
        return f"{self.name} ({self.user.username})"