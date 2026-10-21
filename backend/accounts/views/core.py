"""
accounts/views/core.py
Profile management view — returns full user data including address fields
so the checkout page can auto-fill delivery information.
Traceability: SRS FR-1.2, FR-1.3
"""

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics

from accounts.models import User
from accounts.serializers import UserSerializer


class ProfileView(generics.RetrieveUpdateDestroyAPIView):
    """
    FR-1.2 / FR-1.3: Get and update the authenticated user's profile.
    
    GET  /api/profile/         → returns full user data (including address fields)
    PATCH /api/profile/        → updates editable profile fields
    DELETE /api/profile/       → hard-deletes the account (RA 10173 right to erasure)
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
        """FR-1.4: Hard-delete the account (RA 10173 right to erasure)."""
        user = self.get_object()
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)