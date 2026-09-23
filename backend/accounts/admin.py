from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'store_name', 'is_staff']
    list_filter = ['role', 'is_staff', 'is_active']
    search_fields = ['username', 'email', 'store_name']
    ordering = ['username']
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'store_name', 'skin_tone', 'height', 'weight', 'body_proportions')}),
    )
