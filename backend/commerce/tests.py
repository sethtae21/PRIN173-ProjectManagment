"""Acceptance tests for the KAN-118 commerce API."""

from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import CatalogItem
from commerce.models import Cart, CartItem, Order, OrderItem


class CommerceAPITests(TestCase):
    """Exercise the cart, mock checkout, and owner-only order history."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='shopper@example.com', full_name='Shopper',
            password='Test123!@#', role='shopper',
        )
        self.other_user = User.objects.create_user(
            email='other@example.com', full_name='Another Shopper',
            password='Test123!@#', role='shopper',
        )
        self.item = self.make_item()
        self.client.force_authenticate(self.user)

    def make_item(self, **overrides):
        data = {
            'name': 'Blue Jacket',
            'description': 'A jacket for testing.',
            'category': 'outerwear',
            'size': 'M',
            'color': 'Blue',
            'color_description': 'Navy blue',
            'color_family': 'blue',
            'price': Decimal('49.95'),
            'seller': self.user,
            'store_name': 'Test Store',
            'status': 'active',
        }
        data.update(overrides)
        return CatalogItem.objects.create(**data)

    def test_cart_crud_round_trip(self):
        response = self.client.get('/cart/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['item_count'], 0)

        response = self.client.post(
            '/cart/add_item/', {'catalog_item': str(self.item.pk), 'quantity': 2}, format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['item_count'], 2)
        self.assertEqual(Decimal(response.data['total_amount']), Decimal('99.90'))
        self.assertTrue(Cart.objects.filter(user=self.user).exists())
        self.assertTrue(
            CartItem.objects.filter(
                cart__user=self.user, item=self.item, quantity=2
            ).exists()
        )
        cart_item = response.data['items'][0]
        self.assertEqual(cart_item['name'], 'Blue Jacket')
        self.assertEqual(cart_item['store_name'], 'Test Store')
        self.assertEqual(cart_item['quantity'], 2)
        self.assertEqual(Decimal(cart_item['price']), Decimal('49.95'))

        response = self.client.patch(
            '/cart/update_quantity/',
            {'catalog_item': str(self.item.pk), 'quantity': 3}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['item_count'], 3)
        self.assertEqual(Decimal(response.data['total_amount']), Decimal('149.85'))
        self.assertEqual(
            CartItem.objects.get(cart__user=self.user, item=self.item).quantity,
            3,
        )

        response = self.client.post(
            '/cart/remove_item/', {'catalog_item': str(self.item.pk)}, format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['items'], [])
        self.assertFalse(
            CartItem.objects.filter(cart__user=self.user, item=self.item).exists()
        )

        self.client.post(
            '/cart/add_item/', {'catalog_item': str(self.item.pk), 'quantity': 1}, format='json'
        )
        response = self.client.delete('/cart/clear/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['item_count'], 0)

    def test_guest_rejected_from_cart_and_checkout(self):
        self.client.force_authenticate(None)
        payload = {'catalog_item': str(self.item.pk), 'quantity': 1}
        requests = (
            self.client.get('/cart/'),
            self.client.post('/cart/add_item/', payload, format='json'),
            self.client.patch('/cart/update_quantity/', payload, format='json'),
            self.client.delete('/cart/remove_item/', payload, format='json'),
            self.client.post(
                '/cart/remove_selected/',
                {'catalog_items': [str(self.item.pk)]},
                format='json',
            ),
            self.client.delete('/cart/clear/', {}, format='json'),
            self.client.post(
                '/checkout/',
                {'shipping_address': '1 Test Street', 'payment_method': 'card'},
                format='json',
            ),
        )
        for response in requests:
            self.assertIn(response.status_code, (401, 403))

    def test_remove_selected_items_only_removes_current_users_selection(self):
        second_item = self.make_item(name='Red Shirt')
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, item=self.item, quantity=2)
        CartItem.objects.create(cart=cart, item=second_item, quantity=1)
        CartItem.objects.create(
            cart=Cart.objects.create(user=self.other_user),
            item=self.item,
            quantity=4,
        )

        response = self.client.post(
            '/cart/remove_selected/',
            {'catalog_items': [str(self.item.pk)]},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [entry['catalog_item'] for entry in response.data['items']],
            [str(second_item.pk)],
        )
        self.assertFalse(
            CartItem.objects.filter(cart=cart, item=self.item).exists()
        )
        self.assertTrue(
            CartItem.objects.filter(
                cart__user=self.other_user, item=self.item, quantity=4
            ).exists()
        )

    def test_checkout_approval_snapshots_and_clears_cart(self):
        CartItem.objects.create(
            cart=Cart.objects.create(user=self.user), item=self.item, quantity=2
        )
        response = self.client.post(
            '/checkout/',
            {
                'recipient_name': 'Shopper',
                'recipient_email': 'shopper@example.com',
                'contact_number': '09123456789',
                'shipping_address': '1 Test Street',
                'payment_method': 'card',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'paid')
        self.assertEqual(Decimal(response.data['shipping_fee']), Decimal('80.00'))
        self.assertEqual(Decimal(response.data['total_amount']), Decimal('179.90'))
        self.assertEqual(response.data['recipient_name'], 'Shopper')
        self.assertEqual(response.data['recipient_email'], 'shopper@example.com')
        self.assertEqual(response.data['contact_number'], '09123456789')
        order_item = OrderItem.objects.get(order_id=response.data['id'])
        self.assertEqual(order_item.item_name, 'Blue Jacket')
        self.assertEqual(order_item.store_name, 'Test Store')
        self.assertEqual(order_item.unit_price, Decimal('49.95'))
        self.assertEqual(order_item.quantity, 2)
        self.assertFalse(CartItem.objects.filter(cart__user=self.user).exists())

    def test_checkout_persists_selected_items_and_leaves_unselected_cart_items(self):
        other_item = self.make_item(name='Red Shirt')
        cart = Cart.objects.create(user=self.user)
        selected_entry = CartItem.objects.create(
            cart=cart, item=self.item, quantity=2
        )
        unselected_entry = CartItem.objects.create(
            cart=cart, item=other_item, quantity=1
        )

        response = self.client.post(
            '/checkout/',
            {
                'recipient_name': 'Shopper',
                'contact_number': '09123456789',
                'shipping_address': '1 Test Street',
                'payment_method': 'Cash on Delivery',
                'items': [
                    {
                        'catalog_item': str(self.item.pk),
                        'size': 'L',
                        'color': 'Blue',
                    }
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'pending')
        order_item = OrderItem.objects.get(order_id=response.data['id'])
        self.assertEqual(order_item.catalog_item_id, self.item.pk)
        self.assertEqual(order_item.size, 'L')
        self.assertEqual(order_item.color, 'Blue')
        self.assertFalse(CartItem.objects.filter(pk=selected_entry.pk).exists())
        self.assertTrue(CartItem.objects.filter(pk=unselected_entry.pk).exists())
        self.assertEqual(
            Decimal(response.data['total_amount']),
            Decimal('179.90'),
        )

    def test_checkout_decline_keeps_cart_and_creates_no_order(self):
        CartItem.objects.create(
            cart=Cart.objects.create(user=self.user), item=self.item, quantity=1
        )
        response = self.client.post(
            '/checkout/',
            {'shipping_address': '1 Test Street', 'payment_method': 'decline-card'},
            format='json',
        )
        self.assertEqual(response.status_code, 402)
        self.assertEqual(Order.objects.filter(user=self.user).count(), 0)
        self.assertEqual(CartItem.objects.filter(cart__user=self.user).count(), 1)

    def test_checkout_rejects_empty_cart(self):
        response = self.client.post(
            '/checkout/',
            {'shipping_address': '1 Test Street', 'payment_method': 'card'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.filter(user=self.user).count(), 0)

    def test_user_cannot_read_another_users_order(self):
        order = Order.objects.create(
            user=self.other_user,
            status='paid',
            shipping_address='2 Private Street',
            payment_method='card',
            total_amount=Decimal('12.00'),
        )
        response = self.client.get(f'/orders/{order.pk}/')
        self.assertEqual(response.status_code, 404)
        response = self.client.get('/orders/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])