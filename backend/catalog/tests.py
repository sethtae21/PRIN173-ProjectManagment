import io
import zipfile
from unittest.mock import patch
from django.test import SimpleTestCase, TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from PIL import Image

# STEP 0 FIX: Import User from accounts, not catalog
from accounts.models import User
from catalog.models import CatalogItem, UploadBatch
from catalog.views.core import CatalogValidator


class CatalogColorAlignmentTests(SimpleTestCase):
    def test_accepts_dominant_shade_of_declared_color(self):
        is_valid, _ = CatalogValidator().validate_color_alignment('Red', '#d21823')
        self.assertTrue(is_valid)

    def test_rejects_a_different_dominant_color(self):
        is_valid, message = CatalogValidator().validate_color_alignment('Red', '#0000ff')
        self.assertFalse(is_valid)
        self.assertIn('Color mismatch', message)


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

    @staticmethod
    def _png_bytes(size=(800, 800), color=(255, 255, 255, 255)):
        image = Image.new('RGBA', size, color)
        output = io.BytesIO()
        image.save(output, format='PNG')
        return output.getvalue()

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

    def test_download_package_contains_template_and_image_guidelines(self):
        response = self.client.get('/catalog/download-package/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/zip')
        with zipfile.ZipFile(io.BytesIO(response.content)) as package:
            self.assertEqual(
                set(package.namelist()),
                {'fitfusion_catalog_template.csv', 'seller_image_guidelines.txt'},
            )
            template = package.read('fitfusion_catalog_template.csv').decode()
            guidelines = package.read('seller_image_guidelines.txt').decode()
        self.assertIn('front_image_filename,side_image_filename,rear_image_filename', template)
        self.assertIn('Front, Side, and Rear', guidelines)
        self.assertIn('800 x 800 pixels', guidelines)

    def test_upload_recognizes_header_after_template_instruction_rows(self):
        self.client.force_authenticate(user=self.seller)
        template = self.client.get('/catalog/download-template/').content.decode()
        csv_file = SimpleUploadedFile('template.csv', template.encode(), content_type='text/csv')
        images = [
            SimpleUploadedFile(f'{view}.png', self._png_bytes((10, 10)), content_type='image/png')
            for view in ('front', 'side', 'rear')
        ]

        with patch(
            'catalog.views.core.UPLOAD_EXECUTOR.submit',
            side_effect=lambda function, *args: function(*args),
        ):
            response = self.client.post(
                '/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart'
            )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        item = CatalogItem.objects.get(batch_id=response.data['batch_id'])
        self.assertEqual(item.name, 'Classic White Shirt')
        self.assertIn('Image too small', str(item.rejection_reasons))

    def test_upload_reports_missing_fields_and_undersized_images(self):
        self.client.force_authenticate(user=self.seller)
        csv_content = (
            'name,description,category,size,color,color_description,color_family,price,style_tags,occasion_tags,front_image_filename,side_image_filename,rear_image_filename\n'
            'Test Shirt,,tops,M,White,Pure white,neutral,20.00,casual,everyday,front.png,side.png,rear.png\n'
        )
        csv_file = SimpleUploadedFile('test.csv', csv_content.encode(), content_type='text/csv')
        images = [
            SimpleUploadedFile(f'{view}.png', self._png_bytes((10, 10)), content_type='image/png')
            for view in ('front', 'side', 'rear')
        ]

        with patch(
            'catalog.views.core.UPLOAD_EXECUTOR.submit',
            side_effect=lambda function, *args: function(*args),
        ):
            response = self.client.post(
                '/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart'
            )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        report = self.client.get(
            f"/catalog/batch-report/?batch_id={response.data['batch_id']}"
        )
        self.assertEqual(report.data['rejected_count'], 1)
        reasons = str(report.data['rejection_report'])
        self.assertIn("Missing required field 'description'", reasons)
        self.assertIn('Image too small', reasons)

    def test_upload_reports_csv_filename_mismatch(self):
        self.client.force_authenticate(user=self.seller)
        csv_content = self._get_valid_csv()
        csv_file = SimpleUploadedFile('test.csv', csv_content.encode(), content_type='text/csv')
        images = [
            SimpleUploadedFile(f'{view}.png', self._png_bytes(), content_type='image/png')
            for view in ('different_front', 'different_side', 'different_rear')
        ]

        with patch(
            'catalog.views.core.UPLOAD_EXECUTOR.submit',
            side_effect=lambda function, *args: function(*args),
        ):
            response = self.client.post(
                '/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart'
            )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        report = self.client.get(
            f"/catalog/batch-report/?batch_id={response.data['batch_id']}"
        )
        self.assertEqual(report.data['rejected_count'], 1)
        self.assertIn('not found among uploaded images', str(report.data['rejection_report']))

    def test_successful_upload_derives_color_palette_tags(self):
        self.client.force_authenticate(user=self.seller)
        csv_content = (
            'name,description,category,size,color,color_description,color_family,price,style_tags,occasion_tags,front_image_filename,side_image_filename,rear_image_filename\n'
            'Red Shirt,desc,tops,M,Red,Bright red,red,20.00,casual,everyday,front.png,side.png,rear.png\n'
        )
        csv_file = SimpleUploadedFile('test.csv', csv_content.encode(), content_type='text/csv')
        image_bytes = self._png_bytes(color=(210, 24, 35, 128))
        images = [
            SimpleUploadedFile(f'{view}.png', image_bytes, content_type='image/png')
            for view in ('front', 'side', 'rear')
        ]

        with (
            patch(
                'catalog.views.core.UPLOAD_EXECUTOR.submit',
                side_effect=lambda function, *args: function(*args),
            ),
            patch('catalog.views.core.new_session', return_value=object()),
            patch('catalog.views.core.remove', return_value=image_bytes),
        ):
            response = self.client.post(
                '/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart'
            )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        item = CatalogItem.objects.get(batch_id=response.data['batch_id'])
        self.assertEqual(item.status, 'active')
        self.assertTrue(item.compatible_color_palette_tags)

    def test_rejects_opaque_background_removal_output(self):
        uploaded = SimpleUploadedFile('input.png', b'input', content_type='image/png')
        opaque_output = self._png_bytes(color=(255, 255, 255, 255))
        with patch('catalog.views.core.remove', return_value=opaque_output):
            with self.assertRaisesRegex(Exception, 'valid transparent image'):
                from catalog.views.core import CatalogValidator
                CatalogValidator().process_image_with_rembg(uploaded)

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
        res = self.client.patch(f'/catalog/my-listings/{item_id}/', {
            'name': 'Updated Name', 'price': 15.0, 'category': 'outerwear',
            'size': 'L', 'color': 'Blue', 'color_description': 'Navy blue',
            'color_family': 'blue', 'style_tags': ['casual'],
            'occasion_tags': ['everyday'],
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Updated Name')
        self.assertEqual(float(res.data['price']), 15.0)
        self.assertEqual(res.data['category'], 'outerwear')
        self.assertEqual(res.data['size'], 'L')
        self.assertEqual(res.data['color'], 'Blue')

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

    def test_public_catalog_style_filter_matches_json_array_tags(self):
        matching = CatalogItem.objects.create(
            name='Casual Shirt', description='desc', category='tops', size='M',
            color='Red', color_description='red', color_family='red', price=10.0,
            style_tags=['Casual', 'Streetwear'], occasion_tags=['everyday'],
            seller=self.seller, store_name='Test Store', status='active')
        CatalogItem.objects.create(
            name='Formal Shirt', description='desc', category='tops', size='M',
            color='Blue', color_description='blue', color_family='blue', price=12.0,
            style_tags=['formal'], occasion_tags=['work'],
            seller=self.seller, store_name='Test Store', status='active')

        response = self.client.get('/catalog/', {'style': 'casu'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([entry['id'] for entry in response.data], [str(matching.id)])

    def test_seller_can_replace_image_and_mismatch_does_not_partially_update(self):
        self.client.force_authenticate(user=self.seller)
        item = CatalogItem.objects.create(
            name='White Shirt', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='active')
        image = SimpleUploadedFile(
            'blue.png', self._png_bytes(color=(0, 0, 255, 128)), content_type='image/png')

        with patch('catalog.views.core.remove', return_value=self._png_bytes(color=(0, 0, 255, 128))):
            response = self.client.patch(
                f'/catalog/my-listings/{item.id}/',
                {'name': 'Should Not Persist', 'front_image': image}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        item.refresh_from_db()
        self.assertEqual(item.name, 'White Shirt')
        self.assertFalse(item.front_image)

        image = SimpleUploadedFile(
            'white.png', self._png_bytes(color=(255, 255, 255, 128)), content_type='image/png')
        with patch('catalog.views.core.remove', return_value=self._png_bytes(color=(255, 255, 255, 128))):
            response = self.client.patch(
                f'/catalog/my-listings/{item.id}/',
                {'front_image': image}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertTrue(item.front_image.name)