from rest_framework import permissions

class IsSeller(permissions.BasePermission):
    """
    Allows access only to authenticated users with the 'seller' role.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'role', None) == 'seller'
        )