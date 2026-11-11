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

    # FIX regression (the "#6e8391 declared Blue" false rejection): muted but
    # clearly-hued garments used to fall in the saturation dead zone between
    # the achromatic ceiling (s <= 0.2) and the chromatic floors (blue 0.3,
    # red 0.35, green/brown 0.25), so NO mapped declaration passed. With
    # contiguous thresholds the light-wash denim resolves to Blue.
    def test_muted_blue_gray_denim_now_passes_as_blue(self):
        is_valid, _ = CatalogValidator().validate_color_alignment('Blue', '#6e8391')
        self.assertTrue(is_valid)

    def test_suggestion_names_the_passing_color_for_denim(self):
        suggestion = CatalogValidator().suggest_declared_color('#6e8391')
        self.assertEqual(suggestion['name'], 'Blue')
        self.assertEqual(suggestion['family'], 'blue')

    def test_mismatch_message_carries_the_correct_color_to_declare(self):
        is_valid, message = CatalogValidator().validate_color_alignment('Red', '#1e4fd8')
        self.assertFalse(is_valid)
        self.assertIn('Color mismatch', message)
        self.assertIn('Correct color to declare: "Blue"', message)

    def test_unmapped_hue_suggests_nearest_family_and_passes_when_declared(self):
        # Purple hue sits outside the seven strict bands; the classifier returns
        # the truthful fallback, which the validator trusts (unmapped name), so
        # re-uploading with the suggested color succeeds.
        suggestion = CatalogValidator().suggest_declared_color('#9000ff')
        self.assertEqual(suggestion['name'], 'Purple')
        is_valid, _ = CatalogValidator().validate_color_alignment('Purple', '#9000ff')
        self.assertTrue(is_valid)


class CatalogTagValidationTests(SimpleTestCase):
    def setUp(self):
        self.row = {
            'name': 'Test Shirt',
            'description': 'A nice shirt',
            'category': 'tops',
            'size': 'M',
            'color': 'White',
            'color_description': 'Pure white',
            'color_family': 'neutral',
            'price': '20.00',
            'style_tags': 'Casual, smart',
            'front_image_filename': 'front.png',
            'rear_image_filename': 'rear.png',
        }

    def test_accepts_approved_comma_separated_tags_case_insensitively(self):
        is_valid, errors = CatalogValidator().validate_csv_row(self.row, 2)

        self.assertTrue(is_valid)
        self.assertEqual(errors, [])

    def test_rejects_unapproved_style_tags(self):
        # KAN-FIX: occasion_tags removed from the pipeline; only the four
        # approved style tags (casual, smart, formal, sporty) are validated.
        self.row['style_tags'] = 'casual, unrelated'

        is_valid, errors = CatalogValidator().validate_csv_row(self.row, 2)

        self.assertFalse(is_valid)
        self.assertTrue(any('unrelated' in error and 'style_tags' in error for error in errors))


class CatalogSizePolicyTests(SimpleTestCase):
    """S..4XL accepted everywhere; cm entries, legacy labels and footwear
    regional codes rejected (footwear permanently removed)."""

    def _row(self, **overrides):
        row = {
            'name': 'Test Shirt',
            'description': 'A nice shirt',
            'category': 'tops',
            'size': 'M',
            'color': 'White',
            'color_description': 'Pure white',
            'color_family': 'neutral',
            'price': '20.00',
            'style_tags': 'casual',
            'front_image_filename': 'front.png',
            'rear_image_filename': 'rear.png',
        }
        row.update(overrides)
        return row

    def test_accepts_all_standard_clothing_sizes(self):
        for size in ('S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'):
            is_valid, errors = CatalogValidator().validate_csv_row(self._row(size=size), 2)
            self.assertTrue(is_valid, f"{size}: {errors}")

    def test_rejects_measured_and_nonstandard_sizes(self):
        for size in ('96 cm', '38 inches', 'XS', 'XXL', 'US 9', 'EU 40', 'UK 7'):
            is_valid, errors = CatalogValidator().validate_csv_row(self._row(size=size), 2)
            self.assertFalse(is_valid, f"{size} should be rejected")
            self.assertTrue(any('size' in error.lower() for error in errors))

    def test_rejects_footwear_category(self):
        is_valid, errors = CatalogValidator().validate_csv_row(self._row(category='footwear'), 2)
        self.assertFalse(is_valid)
        self.assertTrue(any('Invalid category' in error for error in errors))


class CatalogValidationAndCRUDTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # FIX: Added full_name and removed invalid 'username' argument
        self.seller = User.objects.create_user(
            full_name='Test Seller', email='seller@test.com', password='Test123!@#',
            role='seller', store_name='Test Store')
        self.user = User.objects.create_user(
            full_name='Test User', email='user@test.com', password='Test123!@#', role='user')

        # Valid 1x1 pixel PNG (will fail dimension check, but good for structure)
        self.valid_img = SimpleUploadedFile(
            "test.jpg", b"fake_image_data", content_type="image/jpeg")
        # Simulate 5.1 MB file
        self.oversized_img = SimpleUploadedFile(
            "large.jpg", b"x" * (5 * 1024 * 1024 + 100), content_type="image/jpeg")

    def _get_valid_csv(self):
        return (
            "name,description,category,size,color,color_description,color_family,price,style_tags,front_image_filename,rear_image_filename\n"
            "Test Shirt,A nice shirt,tops,M,White,Pure white,neutral,20.00,casual,test_front.jpg,test_rear.jpg\n"
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
        res = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': [self.valid_img]*2}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_regular_user_cannot_upload(self):
        self.client.force_authenticate(user=self.user)
        csv_file = SimpleUploadedFile("test.csv", self._get_valid_csv().encode(), content_type="text/csv")
        res = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': [self.valid_img]*2}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # --- VALIDATION: FILE SIZE ---
    def test_rejects_oversized_image(self):
        self.client.force_authenticate(user=self.seller)
        csv_file = SimpleUploadedFile("test.csv", self._get_valid_csv().encode(), content_type="text/csv")
        images = [self.valid_img, self.oversized_img]
        res = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('5 MB', res.data['error'])

    # --- VALIDATION: MISSING VIEWS ---
    def test_rejects_missing_view_images(self):
        self.client.force_authenticate(user=self.seller)
        csv_file = SimpleUploadedFile("test.csv", self._get_valid_csv().encode(), content_type="text/csv")
        images = [self.valid_img]
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
                {'catalog_products.csv', 'seller_image_guidelines.txt'},
            )
            template = package.read('catalog_products.csv').decode()
            guidelines = package.read('seller_image_guidelines.txt').decode()
        template_response = self.client.get('/catalog/download-template/')
        self.assertEqual(template, template_response.content.decode('utf-8'))
        self.assertIn('front_image_filename,rear_image_filename', template)
        self.assertIn('Front and Rear', guidelines)
        self.assertIn('800 x 800 pixels', guidelines)
        # UPDATED: four-tag style vocabulary + S..4XL size rule, no footwear.
        self.assertIn('Use style_tags from: casual, smart, formal, sporty', template)
        self.assertIn('Use only these style_tags: casual, smart, formal, sporty', guidelines)
        self.assertIn('S, M, L, XL, 2XL, 3XL, or 4XL', template)
        self.assertIn('S, M, L, XL, 2XL, 3XL, or 4XL', guidelines)
        self.assertIn('Supported categories: tops, bottoms, dresses, outerwear.', guidelines)
        self.assertNotIn('footwear', template.lower())
        self.assertNotIn('footwear', guidelines.lower())
        self.assertNotIn('occasion_tags', template)
        self.assertNotIn('occasion_tags', guidelines)

    def test_download_template_contains_header_and_single_example_row(self):
        response = self.client.get('/catalog/download-template/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lines = response.content.decode('utf-8').splitlines()
        self.assertEqual(len(lines), 4)
        self.assertTrue(lines[0].startswith('"📝 HOW TO UPLOAD:'))
        self.assertEqual(lines[1], '')
        # UPDATED: header matches CATALOG_CSV_COLUMNS (no occasion_tags).
        self.assertEqual(
            lines[2],
            'name,description,category,size,color,color_description,color_family,price,style_tags,front_image_filename,rear_image_filename',
        )
        self.assertTrue(lines[3].startswith('Example Product,'))
        self.assertIn('Replace the example row', lines[0])
        self.assertIn('S, M, L, XL, 2XL, 3XL, or 4XL', lines[0])
        self.assertNotIn('Footwear', lines[0])

    def test_upload_recognizes_header_after_template_instruction_rows(self):
        self.client.force_authenticate(user=self.seller)
        template = self.client.get('/catalog/download-template/').content.decode()
        csv_file = SimpleUploadedFile('template.csv', template.encode(), content_type='text/csv')
        images = [
            SimpleUploadedFile(f'{view}.png', self._png_bytes((10, 10)), content_type='image/png')
            for view in ('front', 'rear')
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
        self.assertEqual(item.name, 'Example Product')
        self.assertIn('Image too small', str(item.rejection_reasons))

    def test_upload_reports_missing_fields_and_undersized_images(self):
        self.client.force_authenticate(user=self.seller)
        csv_content = (
            'name,description,category,size,color,color_description,color_family,price,style_tags,front_image_filename,rear_image_filename\n'
            'Test Shirt,,tops,M,White,Pure white,neutral,20.00,casual,front.png,rear.png\n'
        )
        csv_file = SimpleUploadedFile('test.csv', csv_content.encode(), content_type='text/csv')
        images = [
            SimpleUploadedFile(f'{view}.png', self._png_bytes((10, 10)), content_type='image/png')
            for view in ('front', 'rear')
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
            for view in ('different_front', 'different_rear')
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
            'name,description,category,size,color,color_description,color_family,price,style_tags,front_image_filename,rear_image_filename\n'
            'Red Shirt,desc,tops,M,Red,Bright red,red,20.00,casual,front.png,rear.png\n'
        )
        csv_file = SimpleUploadedFile('test.csv', csv_content.encode(), content_type='text/csv')
        image_bytes = self._png_bytes(color=(210, 24, 35, 128))
        images = [
            SimpleUploadedFile(f'{view}.png', image_bytes, content_type='image/png')
            for view in ('front', 'rear')
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

        # 2. PATCH Update (extended size 2XL now valid)
        res = self.client.patch(f'/catalog/my-listings/{item_id}/', {
            'name': 'Updated Name', 'price': 15.0, 'category': 'outerwear',
            'size': '2XL', 'color': 'Blue', 'color_description': 'Navy blue',
            'color_family': 'blue', 'style_tags': ['casual'],
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Updated Name')
        self.assertEqual(float(res.data['price']), 15.0)
        self.assertEqual(res.data['category'], 'outerwear')
        self.assertEqual(res.data['size'], '2XL')
        self.assertEqual(res.data['color'], 'Blue')

        # 3. DELETE
        res = self.client.delete(f'/catalog/my-listings/{item_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Verify deletion
        res = self.client.get(f'/catalog/my-listings/{item_id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_accepts_extended_sizes_and_rejects_legacy_formats(self):
        self.client.force_authenticate(user=self.seller)
        item = CatalogItem.objects.create(
            name='Size Policy Item', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='active')

        for size in ('S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'):
            res = self.client.patch(
                f'/catalog/my-listings/{item.id}/', {'size': size}, format='json')
            self.assertEqual(res.status_code, status.HTTP_200_OK, f"{size}: {res.data}")
            self.assertEqual(res.data['size'], size)

        for bad_size in ('96 cm', 'XS', 'XXL', 'US 9', 'EU 40', 'UK 7'):
            res = self.client.patch(
                f'/catalog/my-listings/{item.id}/', {'size': bad_size}, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, bad_size)
            self.assertIn('size', res.data)

        # Footwear category permanently removed -> invalid choice.
        res = self.client.patch(
            f'/catalog/my-listings/{item.id}/', {'category': 'footwear'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('category', res.data)

    def test_seller_cannot_manage_other_sellers_items(self):
        other_seller = User.objects.create_user(full_name='Other Seller', email='s2@t.com', password='Test123!@#', role='seller', store_name='Other')
        item = CatalogItem.objects.create(
            name='Other Item', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=other_seller, store_name='Other Store', status='active')

        self.client.force_authenticate(user=self.seller)
        res = self.client.get(f'/catalog/my-listings/{item.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)  # Owner-only enforcement

    def test_public_catalog_style_filter_matches_json_array_tags(self):
        matching = CatalogItem.objects.create(
            name='Casual Shirt', description='desc', category='tops', size='M',
            color='Red', color_description='red', color_family='red', price=10.0,
            style_tags=['Casual', 'Streetwear'],
            seller=self.seller, store_name='Test Store', status='active')
        CatalogItem.objects.create(
            name='Formal Shirt', description='desc', category='tops', size='M',
            color='Blue', color_description='blue', color_family='blue', price=12.0,
            style_tags=['formal'],
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