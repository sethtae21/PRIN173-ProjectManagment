"""Outfit CRUD endpoints (FR-5.4-5.8). Clones the KAN-58 AvatarPresetViewSet pattern:
ModelViewSet + IsAuthenticated + owner-scoped queryset (foreign IDs -> 404) +
perform_create binding the user server-side (clients can never spoof ownership).

Guests get 401 on every method: outfit save/list/load/edit/delete are persistence,
which FR-1.8/FR-1.9 reserve for Registered Users (no anonymous rows in the DB).
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Outfit
from .serializers import OutfitSerializer


class OutfitViewSet(viewsets.ModelViewSet):
    serializer_class = OutfitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Owner-only + deterministic order (stable list for the UI + tests).
        return Outfit.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)