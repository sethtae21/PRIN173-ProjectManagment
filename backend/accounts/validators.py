"""
accounts/validators.py
Field validators for the User model (accounts app).
"""
import re
from django.core.exceptions import ValidationError


def validate_mobile_number(value):
    """Validate Philippine mobile number format."""
    if value and not re.match(r'^(09|\+639)\d{9}$', value.replace(' ', '')):
        raise ValidationError('Enter a valid Philippine mobile number (e.g., 09123456789).')
    return value


def validate_postal_code(value):
    """Validate Philippine postal code (4 digits)."""
    if value and not re.match(r'^\d{4}$', value):
        raise ValidationError('Postal code must be 4 digits.')
    return value