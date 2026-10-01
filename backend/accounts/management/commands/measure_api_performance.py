import json
import math
import time
from decimal import Decimal
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from rest_framework.test import APIClient

from catalog.models import CatalogItem


class Command(BaseCommand):
    help = 'Measure local Django API p95 latency with temporary MongoDB fixtures.'

    def add_arguments(self, parser):
        parser.add_argument('--samples', type=int, default=30)
        parser.add_argument('--max-p95-ms', type=float, default=500)

    def handle(self, *args, **options):
        sample_count = options['samples']
        max_p95_ms = options['max_p95_ms']
        if sample_count < 20:
            raise CommandError('Use at least 20 samples for a p95 estimate.')

        User = get_user_model()
        suffix = uuid4().hex[:12]
        user = None
        results = {}

        def measure(label, request, expected_status=200):
            durations = []
            for _ in range(sample_count):
                started = time.perf_counter()
                response = request()
                durations.append((time.perf_counter() - started) * 1000)
                if response.status_code != expected_status:
                    raise CommandError(
                        f'{label} returned HTTP {response.status_code}; expected {expected_status}.'
                    )
            ordered = sorted(durations)
            p95_index = min(math.ceil(0.95 * len(ordered)) - 1, len(ordered) - 1)
            results[label] = {
                'samples': len(ordered),
                'p50_ms': round(ordered[len(ordered) // 2], 2),
                'p95_ms': round(ordered[p95_index], 2),
                'max_ms': round(ordered[-1], 2),
            }

        try:
            user = User.objects.create_user(
                username=f'api_perf_{suffix}',
                email=f'api_perf_{suffix}@example.invalid',
                password=f'Perf-{suffix}-A1!',
                role='user',
            )
            item = CatalogItem.objects.create(
                name=f'API Performance Fixture {suffix}',
                description='Temporary API performance fixture.',
                category='tops',
                size='M',
                color='Red',
                color_description='Bright red',
                color_family='red',
                price=Decimal('19.99'),
                style_tags=['casual'],
                occasion_tags=['everyday'],
                seller=user,
                store_name='API Performance Fixture Store',
                status='active',
            )
            client = APIClient()
            client.force_authenticate(user=user)

            measure('catalog_list', lambda: client.get('/catalog/'))
            measure('catalog_filter', lambda: client.get('/catalog/', {
                'category': 'tops', 'size': 'M', 'color': 'red',
                'store': 'API Performance Fixture Store', 'style': 'casual',
            }))
            measure('recommendations', lambda: client.get('/api/recommendations/', {
                'undertone': 'warm', 'height_cm': '170', 'body_shape': 'balanced',
                'styles': 'casual', 'occasions': 'everyday', 'limit': '10',
            }))
            measure('cart_read', lambda: client.get('/cart/'))
            measure('cart_add', lambda: client.post('/cart/add_item/', {
                'catalog_item': str(item.id), 'quantity': 1,
            }, format='json'))

            checkout_durations = []
            for _ in range(sample_count):
                add_response = client.post('/cart/add_item/', {
                    'catalog_item': str(item.id), 'quantity': 1,
                }, format='json')
                if add_response.status_code != 200:
                    raise CommandError(f'Could not prepare checkout fixture: HTTP {add_response.status_code}.')
                started = time.perf_counter()
                response = client.post('/checkout/', {
                    'shipping_address': '1 Temporary Test Street',
                    'payment_method': 'card',
                }, format='json')
                checkout_durations.append((time.perf_counter() - started) * 1000)
                if response.status_code != 201:
                    raise CommandError(f'Checkout returned HTTP {response.status_code}; expected 201.')

            ordered = sorted(checkout_durations)
            p95_index = min(math.ceil(0.95 * len(ordered)) - 1, len(ordered) - 1)
            results['checkout'] = {
                'samples': len(ordered),
                'p50_ms': round(ordered[len(ordered) // 2], 2),
                'p95_ms': round(ordered[p95_index], 2),
                'max_ms': round(ordered[-1], 2),
            }
            measure('orders_list', lambda: client.get('/orders/'))

            failed = {
                label: values['p95_ms']
                for label, values in results.items()
                if values['p95_ms'] > max_p95_ms
            }
            self.stdout.write(json.dumps({
                'target_p95_ms': max_p95_ms,
                'samples_per_endpoint': sample_count,
                'endpoints': results,
                'passed': not failed,
                'over_target': failed,
            }, indent=2))
            if failed:
                raise CommandError('One or more API endpoint p95 values exceeded the configured target.')
        finally:
            if user is not None:
                user.delete()