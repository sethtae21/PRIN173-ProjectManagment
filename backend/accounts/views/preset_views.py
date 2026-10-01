import logging

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from outfits.models import AvatarPreset
from accounts.serializers import AvatarPresetSerializer

logger = logging.getLogger(__name__)


class AvatarPresetViewSet(viewsets.ModelViewSet):
    """
    Preset CRUD endpoints (FR-2.5, FR-2.8–2.10).
    - Guests rejected: IsAuthenticated → 401 without a valid JWT
    - Owner-only: queryset scoped to request.user → other users get 404
    """
    serializer_class = AvatarPresetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AvatarPreset.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        preset = serializer.save(user=self.request.user)
        logger.info(f"Preset {preset.id} created by user {self.request.user.id}")