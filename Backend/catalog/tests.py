from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from catalog.models import CatalogItem, User

class CatalogReadAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create a test seller and items
        self.seller = User.objects.create_user(
            username='teststore', password='TestPass123!', role='seller', store_name='Test Fashion Store'
        )
        self.item1 = CatalogItem.objects.create(
            name='Red Shirt', category='tops', color='Red', color_family='Warm', 
            size='M', price=15.99, store_name='Test Fashion Store', 
            seller=self.seller, status='active', style_tags=['casual', 'summer']
        )
        self.item2 = CatalogItem.objects.create(
            name='Blue Jeans', category='bottoms', color='Blue', color_family='Cool', 
            size='M', price=25.99, store_name='Test Fashion Store', 
            seller=self.seller, status='active', style_tags=['formal']
        )
        # Rejected item should NOT appear in the catalog
        self.item3 = CatalogItem.objects.create(
            name='Rejected Item', category='tops', color='Red', color_family='Warm', 
            size='M', price=10.00, store_name='Test Fashion Store', 
            seller=self.seller, status='rejected', style_tags=['casual']
        )

    def test_guest_can_read_catalog(self):
        """KAN-104: Guests (unauthenticated) can read active items."""
        response = self.client.get('/catalog/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Only active items should return (2 items, not the rejected one)
        self.assertEqual(len(response.data), 2) 

    def test_filter_by_store_name(self):
        """KAN-104: Filter by store name works."""
        response = self.client.get('/catalog/', {'store': 'Test Fashion'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        response = self.client.get('/catalog/', {'store': 'NonExistentStore'})
        self.assertEqual(len(response.data), 0)

    def test_filter_by_style_tag(self):
        """KAN-104: Filter by style tag works."""
        response = self.client.get('/catalog/', {'style': 'casual'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Only the Red Shirt has 'casual'
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Red Shirt')