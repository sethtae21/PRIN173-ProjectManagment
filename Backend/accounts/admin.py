from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, UploadBatch, CatalogItem

# Register User model with custom admin
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'store_name', 'is_staff']
    list_filter = ['role', 'is_staff', 'is_active']
    search_fields = ['username', 'email', 'store_name']
    ordering = ['username']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'store_name', 'skin_tone', 'height', 'weight', 'body_proportions')}),
    )

# Register UploadBatch model (the ticket system)
@admin.register(UploadBatch)
class UploadBatchAdmin(admin.ModelAdmin):
    list_display = ['id_display', 'seller', 'store_name', 'status', 'total_items', 'accepted_count', 'rejected_count', 'created_at', 'completed_at']
    list_filter = ['status', 'created_at', 'completed_at']
    search_fields = ['seller__username', 'store_name']
    readonly_fields = ['id_display', 'seller', 'store_name', 'created_at', 'completed_at', 'total_items', 'accepted_count', 'rejected_count', 'rejection_report']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Batch Information', {
            'fields': ('id_display', 'seller', 'store_name', 'status')
        }),
        ('Statistics', {
            'fields': ('total_items', 'accepted_count', 'rejected_count')
        }),
        ('Rejection Report', {
            'fields': ('rejection_report',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'completed_at')
        }),
    )
    
    def id_display(self, obj):
        """Display the MongoDB ObjectId"""
        return str(obj.id)
    id_display.short_description = 'Batch ID'
    
    def has_add_permission(self, request):
        """Prevent manual addition of batches - they should only be created via API"""
        return False

# Register CatalogItem model
@admin.register(CatalogItem)
class CatalogItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'color', 'price', 'store_name', 'seller', 'batch_display', 'status', 'created_at']
    list_filter = ['category', 'status', 'color_family', 'batch__status', 'created_at']
    search_fields = ['name', 'description', 'store_name', 'seller__username', 'batch__id']
    ordering = ['-created_at']
    readonly_fields = ['seller', 'store_name', 'batch', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Product Information', {
            'fields': ('name', 'description', 'category', 'size', 'color', 'color_description', 'color_family', 'price')
        }),
        ('Tags', {
            'fields': ('style_tags', 'occasion_tags', 'compatible_color_palette_tags'),
            'classes': ('collapse',)
        }),
        ('Images (GridFS)', {
            'fields': ('front_image', 'side_image', 'rear_image')
        }),
        ('Seller Information', {
            'fields': ('seller', 'store_name')
        }),
        ('Batch Tracking', {
            'fields': ('batch',)
        }),
        ('Status', {
            'fields': ('status', 'rejection_reasons')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def batch_display(self, obj):
        """Display batch ID if exists"""
        return str(obj.batch.id) if obj.batch else "No batch"
    batch_display.short_description = 'Batch ID'