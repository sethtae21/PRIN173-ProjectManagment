import io
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

# STEP 0 FIX: Import User from accounts, not catalog
from accounts.models import User
from catalog.models import CatalogItem, UploadBatch


class CatalogValidationAndCRUDTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(
            username='seller1', email='seller@test.com', password='Test123!@#',
            role='seller', store_name='Test Store')
        self.user = User.objects.create_user(
            username='user1', email='user@test.com', password='Test123!@#', role='user')
        
        # Valid 1x1 pixel PNG (will fail dimension check, but good for structure)
        self.valid_img = SimpleUploadedFile(
            "test.jpg", b"fake_image_data", content_type="image/jpeg")
        # Simulate 5.1 MB file
        self.oversized_img = SimpleUploadedFile(
            "large.jpg", b"x" * (5 * 1024 * 1024 + 100), content_type="image/jpeg")

    def _get_valid_csv(self):
        return (
            "name,description,category,size,color,color_description,color_family,price,style_tags,occasion_tags,front_image_filename,side_image_filename,rear_image_filename\n"
            "Test Shirt,A nice shirt,tops,M,White,Pure white,neutral,20.00,casual,everyday,test_front.jpg,test_side.jpg,test_rear.jpg\n"
        )

    # --- PERMISSIONS ---
    def test_guest_cannot_upload(self):
        csv_file = SimpleUploadedFile("test.csv", self._get_valid_csv().encode(), content_type="text/csv")
        res = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': [self.valid_img]*3}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_regular_user_cannot_upload(self):
        self.client.force_authenticate(user=self.user)
        csv_file = SimpleUploadedFile("test.csv", self._get_valid_csv().encode(), content_type="text/csv")
        res = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': [self.valid_img]*3}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # --- VALIDATION: FILE SIZE ---
    def test_rejects_oversized_image(self):
        self.client.force_authenticate(user=self.seller)
        csv_file = SimpleUploadedFile("test.csv", self._get_valid_csv().encode(), content_type="text/csv")
        images = [self.valid_img, self.valid_img, self.oversized_img]
        res = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('5 MB', res.data['error'])

    # --- VALIDATION: MISSING VIEWS ---
    def test_rejects_missing_view_images(self):
        self.client.force_authenticate(user=self.seller)
        csv_file = SimpleUploadedFile("test.csv", self._get_valid_csv().encode(), content_type="text/csv")
        images = [self.valid_img, self.valid_img] # Only 2 images instead of 3
        res = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Missing view images', res.data['error'])

    # --- SELLER LISTING CRUD (Distinct Routes) ---
    def test_seller_can_list_and_manage_own_items(self):
        self.client.force_authenticate(user=self.seller)
        item = CatalogItem.objects.create(
            name='CRUD Test Item', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='active')
        item_id = str(item.id)

        # 1. GET Detail
        res = self.client.get(f'/catalog/my-listings/{item_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'CRUD Test Item')

        # 2. PATCH Update
        res = self.client.patch(f'/catalog/my-listings/{item_id}/', {'name': 'Updated Name', 'price': 15.0}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Updated Name')
        self.assertEqual(float(res.data['price']), 15.0)

        # 3. DELETE
        res = self.client.delete(f'/catalog/my-listings/{item_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify deletion
        res = self.client.get(f'/catalog/my-listings/{item_id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_seller_cannot_manage_other_sellers_items(self):
        other_seller = User.objects.create_user(username='seller2', email='s2@t.com', password='Test123!@#', role='seller', store_name='Other')
        item = CatalogItem.objects.create(
            name='Other Item', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=other_seller, store_name='Other Store', status='active')
        
        self.client.force_authenticate(user=self.seller)
        res = self.client.get(f'/catalog/my-listings/{item.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND) # Owner-only enforcement