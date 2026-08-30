from rest_framework.exceptions import APIException
from rest_framework import status


class CustomAPIException(APIException):
    """Custom API exception with standardized response format"""
    
    def __init__(self, message=None, code=None, status_code=None):
        if message:
            self.detail = {'message': message}
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        super().__init__()


class ValidationErrorException(CustomAPIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = 'validation_error'


class AuthenticationFailedException(CustomAPIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_code = 'authentication_failed'


class PermissionDeniedException(CustomAPIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_code = 'permission_denied'


class NotFoundException(CustomAPIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_code = 'not_found'