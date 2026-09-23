from django.contrib import admin

from .models import CatalogItem, UploadBatch


@admin.register(UploadBatch)
class UploadBatchAdmin(admin.ModelAdmin):
    list_display = ['id_display', 'seller', 'store_name', 'status', 'total_items', 'accepted_count', 'rejected_count', 'created_at', 'completed_at']
    list_filter = ['status', 'created_at', 'completed_at']
    search_fields = ['seller__username', 'store_name']
    readonly_fields = ['id_display', 'seller', 'store_name', 'created_at', 'completed_at', 'total_items', 'accepted_count', 'rejected_count', 'rejection_report']
    ordering = ['-created_at']

    def id_display(self, obj):
        return str(obj.id)

    id_display.short_description = 'Batch ID'

    def has_add_permission(self, request):
        return False


@admin.register(CatalogItem)
class CatalogItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'color', 'price', 'store_name', 'seller', 'batch_display', 'status', 'created_at']
    list_filter = ['category', 'status', 'color_family', 'batch__status', 'created_at']
    search_fields = ['name', 'description', 'store_name', 'seller__username', 'batch__id']
    ordering = ['-created_at']
    readonly_fields = ['seller', 'store_name', 'batch', 'created_at', 'updated_at']

    def batch_display(self, obj):
        return str(obj.batch.id) if obj.batch else 'No batch'

    batch_display.short_description = 'Batch ID'
