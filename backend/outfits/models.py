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

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='avatar_presets')
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

    class Meta:
        db_table = 'accounts_avatarpreset'

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class Outfit(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='outfits')
    name = models.CharField(max_length=100)

    # === ADDITIVE (FR-5.4 optional description / occasion; FR-5.6 avatar re-equip) ===
    # These three are NEW columns; `items` below is byte-for-byte the original M2M, so
    # the ObjectIdListField read/write contract and its green tests are untouched.
    occasion = models.CharField(max_length=32, blank=True, default='Casual')
    description = models.TextField(blank=True, default='')

    # Optional traceability link to the preset the look was built on (SRS data
    # dictionary SAVED_OUTFITS.avatar_preset_id). Nullable: a look may be saved on a
    # live, never-saved avatar, in which case only the inline snapshot below is set.
    avatar_preset = models.ForeignKey(
        AvatarPreset, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='outfits',
    )

    # Inline avatar SNAPSHOT (self-contained so a saved look re-renders exactly as
    # saved even if the linked preset is later edited/deleted -> FR-5.6 fidelity).
    # Mirrors AvatarPreset's field set; all blank/null so pre-migration rows migrate
    # cleanly and the frontend falls back to its standard avatar for legacy looks.
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
    avatar_view = models.CharField(max_length=8, blank=True, default='front')  # front|rear (side removed)

    items = models.ManyToManyField('catalog.CatalogItem', related_name='outfits', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts_outfit'

    def __str__(self):
        return f"{self.name} ({self.user.username})"