"""Mock services used by the commerce application."""

from decimal import Decimal
from uuid import uuid4


class MockPaymentGateway:
    """Deterministic payment adapter for checkout until a real gateway is added."""

    @staticmethod
    def process_payment(payment_method: str, amount: Decimal) -> dict:
        """Approve payments unless the method includes ``decline``."""
        approved = 'decline' not in payment_method.casefold()
        return {
            'success': approved,
            'transaction_ref': f'MOCK-{uuid4().hex}' if approved else None,
            'message': 'Payment approved.' if approved else 'Payment declined.',
            'amount': amount,
        }