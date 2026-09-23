from django.contrib import admin

from .models import AvatarPreset, Outfit


@admin.register(AvatarPreset)
class AvatarPresetAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'gender', 'height', 'weight', 'skin_tone', 'undertone', 'is_default', 'created_at']
    list_filter = ['gender', 'is_default', 'undertone', 'skin_tone']
    search_fields = ['name', 'user__username']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Outfit)
class OutfitAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'item_count', 'created_at', 'updated_at']
    search_fields = ['name', 'user__username']
    ordering = ['-created_at']
    filter_horizontal = ('items',)
    readonly_fields = ['created_at', 'updated_at']

    def item_count(self, obj):
        return obj.items.count()

    item_count.short_description = 'Items'
