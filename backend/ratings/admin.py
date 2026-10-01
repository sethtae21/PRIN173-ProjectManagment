from django.contrib import admin

from .models import Rating


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ('user', 'target_type', 'target_id', 'score', 'updated_at')
    list_filter = ('target_type', 'score')
    search_fields = ('target_id', 'user__username')