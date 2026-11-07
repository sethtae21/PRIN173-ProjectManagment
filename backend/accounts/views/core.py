"""
accounts/views/core.py
Profile management view — returns full user data including address fields
so the checkout page can auto-fill delivery information.
Traceability: SRS FR-1.2, FR-1.3
"""

from django.utils import timezone  # stamp the archive grace-window clock

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from accounts.serializers import UserSerializer
from accounts.utils import blacklist_refresh_token
from catalog.models import CatalogItem
from commerce.models import CartItem, Order


class ProfileView(generics.RetrieveUpdateDestroyAPIView):
    """
    FR-1.2 / FR-1.3: Get and update the authenticated user's profile.

    GET  /api/profile/         → returns full user data (including address fields)
    PATCH /api/profile/        → updates editable profile fields
    DELETE /api/profile/       → ARCHIVE (grace window): status='archive',
                                 is_active=False, archived_at=now. ALL linked
                                 data is retained so support can restore within
                                 90 days; the prune sweep (accounts/archive.py)
                                 relocates the profile to accounts_archiveduser
                                 after the window closes.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Return the authenticated user."""
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        """Return the authenticated user's full profile including address."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'user': serializer.data
        }, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        """Update editable profile fields (name, mobile, address, etc.)."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({
            'success': True,
            'message': 'Profile updated successfully',
            'user': serializer.data
        }, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        """
        FR-1.4 archive (grace window): flip status + is_active and stamp
        archived_at so the 90-day cold-relocation clock starts. No linked data
        is touched here — that is the prune sweep's job after the window.
        """
        user = self.get_object()
        refresh_raw = request.data.get('refresh')
        if refresh_raw:
            try:
                blacklist_refresh_token(RefreshToken(refresh_raw))
            except TokenError:
                pass

        user.status = 'archive'
        user.is_active = False
        user.archived_at = timezone.now()  # start the 90-day window
        user.save(update_fields=['status', 'is_active', 'archived_at'])

        return Response({
            'success': True,
            'message': 'Your account has been archived. All your data is retained.',
        }, status=status.HTTP_200_OK)