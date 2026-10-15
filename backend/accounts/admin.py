from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    # Fields to display in the list view
    list_display = ('email', 'full_name', 'role', 'store_name', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    
    # Fields to show when editing an existing user
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('full_name', 'mobile', 'skin_tone', 'height', 'weight', 'body_proportions')}),
        ('Address', {'fields': ('street', 'barangay', 'city', 'province', 'postal_code')}),
        ('Role Information', {'fields': ('role', 'store_name')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    # Fields to show when creating a new user
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'password1', 'password2', 'role', 'store_name', 'is_staff', 'is_active'),
        }),
    )
    
    search_fields = ('email', 'full_name', 'store_name')
    ordering = ('email',)
    filter_horizontal = ('groups', 'user_permissions',)