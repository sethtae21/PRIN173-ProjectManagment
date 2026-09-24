import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


def validate_password_strength(password):
    """
    Validate password meets FitFusion AI requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    """
    if len(password) < 8:
        raise ValidationError(
            _('Password must be at least 8 characters long.'),
            code='password_too_short'
        )
    
    if not re.search(r'[A-Z]', password):
        raise ValidationError(
            _('Password must contain at least one uppercase letter.'),
            code='password_no_upper'
        )
    
    if not re.search(r'[a-z]', password):
        raise ValidationError(
            _('Password must contain at least one lowercase letter.'),
            code='password_no_lower'
        )
    
    if not re.search(r'\d', password):
        raise ValidationError(
            _('Password must contain at least one number.'),
            code='password_no_number'
        )
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValidationError(
            _('Password must contain at least one special character (!@#$%^&*...).'),
            code='password_no_special'
        )
    
    return True


def validate_email_format(email):
    """Validate email format"""
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        raise ValidationError(
            _('Enter a valid email address.'),
            code='invalid_email'
        )
    return True