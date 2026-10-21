"""
accounts/views/preset_views.py
Avatar preset CRUD viewset.
Traceability: SRS FR-2.5, FR-2.8, FR-2.9, FR-2.10
"""

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response

# ✅ FIX: AvatarPreset lives in the 'outfits' app, not 'accounts'
from outfits.models import AvatarPreset
from accounts.serializers import AvatarPresetSerializer


class AvatarPresetViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for avatar presets.
    - list:   GET  /api/presets/
    - create: POST /api/presets/
    - read:   GET  /api/presets/{id}/
    - update: PUT/PATCH /api/presets/{id}/
    - delete: DELETE /api/presets/{id}/
    """

    serializer_class = AvatarPresetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Only return presets belonging to the authenticated user."""
        return AvatarPreset.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Automatically associate the preset with the requesting user."""
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """FR-2.10: Ensure users can only delete their own presets."""
        preset = self.get_object()
        if preset.user != request.user:
            return Response(
                {"error": "You can only delete your own presets."},
                status=status.HTTP_403_FORBIDDEN,
            )
        preset.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)