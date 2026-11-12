import io
import re
import tempfile
import zipfile
from contextlib import ExitStack
from decimal import Decimal
from pathlib import Path
from unittest.mock import Mock, patch

from bson.objectid import ObjectId
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import CatalogItem
from catalog.storage import gridfs_storage
from catalog.views import core as catalog_core
from catalog.views.core import CatalogValidator


# ============================================================================
# KAN-119 — isolated GridFS double.
# GridFSStorage builds its own MongoClient from MONGODB_URI and falls back to
# the 'fitfusion' database, so it is NOT covered by Django's test_<db> isolation.
# These tests inject an in-memory bucket instead, modelling BOTH collections.
# ============================================================================
class _FakeGridOut:
    def __init__(self, doc, payload):
        self._id = doc['_id']
        self.filename = doc['filename']
        self.length = len(payload)
        self._payload = payload

    def read(self):
        return self._payload


class _FakeFilesCollection:
    def __init__(self, bucket):
        self._bucket = bucket

    def find(self, query):
        pattern = (query.get('filename') or {}).get('$regex')
        docs = list(self._bucket.files.values())
        if pattern is not None:
            matcher = re.compile(pattern)
            docs = [doc for doc in docs if matcher.search(doc['filename'] or '')]
        return [dict(doc) for doc in docs]

    def count_documents(self, query):
        return len(self.find(query))


class _FakeChunksCollection:
    def __init__(self, bucket):
        self._bucket = bucket

    def find(self, query):
        ids = (query.get('files_id') or {}).get('$in', list(self._bucket.chunks))
        return [
            {'files_id': file_id, 'n': index, 'data': chunk}
            for file_id in ids
            for index, chunk in enumerate(self._bucket.chunks.get(file_id, []))
        ]

    def count_documents(self, query):
        return len(self.find(query))


class _FakeDB:
    name = 'test_fitfusion_gridfs'

    def __init__(self, bucket):
        self._bucket = bucket

    def __getitem__(self, key):
        if key == 'fs.files':
            return _FakeFilesCollection(self._bucket)
        if key == 'fs.chunks':
            return _FakeChunksCollection(self._bucket)
        raise KeyError(key)


class FakeGridFSBucket:
    """Minimal gridfs.GridFS stand-in. delete() removes files AND chunks."""

    def __init__(self):
        self.files = {}
        self.chunks = {}

    def put(self, content, filename=None, **kwargs):
        data = content.read() if hasattr(content, 'read') else bytes(content)
        file_id = ObjectId()
        self.files[file_id] = {'_id': file_id, 'filename': filename, 'length': len(data)}
        self.chunks[file_id] = [data]
        return file_id

    def _lookup(self, query):
        if '_id' in query:
            doc = self.files.get(query['_id'])
        else:
            doc = next(
                (d for d in self.files.values() if d['filename'] == query.get('filename')),
                None,
            )
        if doc is None:
            return None
        return _FakeGridOut(doc, b''.join(self.chunks[doc['_id']]))

    def find_one(self, query):
        return self._lookup(query)

    def exists(self, query):
        return self._lookup(query) is not None

    def delete(self, file_id):
        self.files.pop(file_id, None)
        self.chunks.pop(file_id, None)


def isolated_gridfs():
    """Return (ExitStack, bucket). Closing the stack restores real storage."""
    bucket = FakeGridFSBucket()
    stack = ExitStack()
    stack.enter_context(patch.object(gridfs_storage, '_fs', bucket))
    stack.enter_context(patch.object(gridfs_storage, '_db', _FakeDB(bucket)))
    stack.enter_context(patch.object(gridfs_storage, '_client', Mock()))
    stack.enter_context(patch(
        'accounts.storage.MongoClient',
        side_effect=AssertionError('KAN-119 tests must not open a real Mongo connection'),
    ))
    return stack, bucket


class CatalogColorAlignmentTests(SimpleTestCase):
    def test_accepts_dominant_shade_of_declared_color(self):
        is_valid, _ = CatalogValidator().validate_color_alignment('Red', '#d21823')
        self.assertTrue(is_valid)

    def test_rejects_a_different_dominant_color(self):
        is_valid, message = CatalogValidator().validate_color_alignment('Red', '#0000ff')
        self.assertFalse(is_valid)
        self.assertIn('Color mismatch', message)

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
            'style_tags': 'Casual, minimalist',
            'occasion_tags': 'Everyday, summer',
            'front_image_filename': 'front.png',
            'rear_image_filename': 'rear.png',
        }

    def test_accepts_approved_comma_separated_tags_case_insensitively(self):
        is_valid, errors = CatalogValidator().validate_csv_row(self.row, 2)
        self.assertTrue(is_valid)
        self.assertEqual(errors, [])

    def test_rejects_unapproved_style_and_occasion_tags(self):
        self.row['style_tags'] = 'casual, unrelated'
        self.row['occasion_tags'] = 'everyday, not-an-occasion'
        is_valid, errors = CatalogValidator().validate_csv_row(self.row, 2)
        self.assertFalse(is_valid)
        self.assertTrue(any('unrelated' in error and 'style_tags' in error for error in errors))
        self.assertTrue(any('not-an-occasion' in error and 'occasion_tags' in error for error in errors))


class CatalogValidationAndCRUDTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(
            full_name='Test Seller', email='seller@test.com', password='Test123!@#',
            role='seller', store_name='Test Store')
        self.user = User.objects.create_user(
            full_name='Test User', email='user@test.com', password='Test123!@#', role='user')
        self.valid_img = SimpleUploadedFile("test.jpg", b"fake_image_data", content_type="image/jpeg")
        self.oversized_img = SimpleUploadedFile("large.jpg", b"x" * (5 * 1024 * 1024 + 100), content_type="image/jpeg")

        # KAN-119: never touch the configured MONGODB_URI bucket from tests.
        stack, self.gridfs = isolated_gridfs()
        self.addCleanup(stack.close)
        self.assertIs(
            gridfs_storage, CatalogItem._meta.get_field('front_image').storage,
            'Injected GridFS double must be the same object the model fields use.',
        )

        # KAN-119: a shared on-disk rembg cache can serve a stale matte and skip
        # the patched remove() entirely. Give each test a private cache dir.
        cache_dir = tempfile.TemporaryDirectory(prefix='kan119-rembg-')
        self.addCleanup(cache_dir.cleanup)
        stack.enter_context(patch('catalog.views.core.REMBG_CACHE_DIR', Path(cache_dir.name)))

    def _get_valid_csv(self):
        return (
            "name,description,category,size,color,color_description,color_family,price,style_tags,occasion_tags,front_image_filename,rear_image_filename\n"
            "Test Shirt,A nice shirt,tops,M,White,Pure white,neutral,20.00,casual,everyday,test_front.jpg,test_rear.jpg\n"
        )

    @staticmethod
    def _png_bytes(size=(800, 800), color=(255, 255, 255, 128)):
        image = Image.new('RGBA', size, color)
        output = io.BytesIO()
        image.save(output, format='PNG')
        return output.getvalue()

    def _gridfs_file(self, storage_name):
        """Return the live GridFS file document for a stored field name, or None."""
        if not storage_name:
            return None
        fs = gridfs_storage._require_fs()
        if ObjectId.is_valid(storage_name):
            return fs.find_one({'_id': ObjectId(storage_name)})
        return fs.find_one({'filename': storage_name})

    def _item_gridfs_files(self, item_id):
        """Return all GridFS file documents associated with an item's ID.

        Django's ImageField prepends the `upload_to` prefix (e.g. 'catalog/front/')
        to the filename. We query the underlying MongoDB `fs.files` collection
        directly and search for the unique 24-char item_id anywhere in the path.
        """
        fs = gridfs_storage._require_fs()
        db = gridfs_storage._db
        item_id_str = str(item_id)
        files_collection = db['fs.files']
        return list(files_collection.find({'filename': {'$regex': item_id_str}}))

    def _item_with_images(self, **overrides):
        """Active listing with BOTH views already persisted (KAN-119 fixture)."""
        defaults = dict(
            name='Shirt', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='active')
        defaults.update(overrides)
        item = CatalogItem.objects.create(**defaults)
        item.front_image.save(f'{item.id}_front.png', ContentFile(self._png_bytes()), save=False)
        item.rear_image.save(f'{item.id}_rear.png', ContentFile(self._png_bytes()), save=True)
        item.refresh_from_db()
        return item

    # --- PERMISSIONS ---
    def test_guest_cannot_upload(self):
        csv_file = SimpleUploadedFile("test.csv", self._get_valid_csv().encode(), content_type="text/csv")
        res = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': [self.valid_img] * 2}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_regular_user_cannot_upload(self):
        self.client.force_authenticate(user=self.user)
        csv_file = SimpleUploadedFile("test.csv", self._get_valid_csv().encode(), content_type="text/csv")
        res = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': [self.valid_img] * 2}, format='multipart')
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
            self.assertEqual(set(package.namelist()), {'catalog_products.csv', 'seller_image_guidelines.txt'})
            template = package.read('catalog_products.csv').decode()
            guidelines = package.read('seller_image_guidelines.txt').decode()
        template_response = self.client.get('/catalog/download-template/')
        self.assertEqual(template, template_response.content.decode('utf-8'))
        self.assertIn('front_image_filename,rear_image_filename', template)
        self.assertIn('Front and Rear', guidelines)
        self.assertIn('800 x 800 pixels', guidelines)

    def test_download_template_contains_header_and_single_example_row(self):
        response = self.client.get('/catalog/download-template/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lines = response.content.decode('utf-8').splitlines()
        self.assertEqual(len(lines), 4)
        self.assertTrue(lines[0].startswith('"📝 HOW TO UPLOAD:'))
        self.assertEqual(lines[1], '')
        self.assertTrue(lines[3].startswith('Example Product,'))

    def test_upload_recognizes_header_after_template_instruction_rows(self):
        self.client.force_authenticate(user=self.seller)
        template = self.client.get('/catalog/download-template/').content.decode()
        csv_file = SimpleUploadedFile('template.csv', template.encode(), content_type='text/csv')
        images = [
            SimpleUploadedFile(f'{view}.png', self._png_bytes((10, 10)), content_type='image/png')
            for view in ('front', 'rear')
        ]
        with patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda function, *args: function(*args)):
            response = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        item = CatalogItem.objects.get(batch_id=response.data['batch_id'])
        self.assertEqual(item.name, 'Example Product')
        self.assertIn('Image too small', str(item.rejection_reasons))

    def test_upload_reports_missing_fields_and_undersized_images(self):
        self.client.force_authenticate(user=self.seller)
        csv_content = (
            'name,description,category,size,color,color_description,color_family,price,style_tags,occasion_tags,front_image_filename,rear_image_filename\n'
            'Test Shirt,,tops,M,White,Pure white,neutral,20.00,casual,everyday,front.png,rear.png\n'
        )
        csv_file = SimpleUploadedFile('test.csv', csv_content.encode(), content_type='text/csv')
        images = [
            SimpleUploadedFile(f'{view}.png', self._png_bytes((10, 10)), content_type='image/png')
            for view in ('front', 'rear')
        ]
        with patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda function, *args: function(*args)):
            response = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        report = self.client.get(f"/catalog/batch-report/?batch_id={response.data['batch_id']}")
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
        with patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda function, *args: function(*args)):
            response = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        report = self.client.get(f"/catalog/batch-report/?batch_id={response.data['batch_id']}")
        self.assertEqual(report.data['rejected_count'], 1)
        self.assertIn('not found among uploaded images', str(report.data['rejection_report']))

    def test_successful_upload_derives_color_palette_tags(self):
        self.client.force_authenticate(user=self.seller)
        csv_content = (
            'name,description,category,size,color,color_description,color_family,price,style_tags,occasion_tags,front_image_filename,rear_image_filename\n'
            'Red Shirt,desc,tops,M,Red,Bright red,red,20.00,casual,everyday,front.png,rear.png\n'
        )
        csv_file = SimpleUploadedFile('test.csv', csv_content.encode(), content_type='text/csv')
        image_bytes = self._png_bytes(color=(210, 24, 35, 128))
        images = [
            SimpleUploadedFile(f'{view}.png', image_bytes, content_type='image/png')
            for view in ('front', 'rear')
        ]
        with (
            patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda function, *args: function(*args)),
            patch('catalog.views.core.new_session', return_value=object()),
            patch('catalog.views.core.remove', return_value=image_bytes),
        ):
            response = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        item = CatalogItem.objects.get(batch_id=response.data['batch_id'])
        self.assertEqual(item.status, 'active')
        self.assertTrue(item.compatible_color_palette_tags)

    def test_rejects_opaque_background_removal_output(self):
        uploaded = SimpleUploadedFile('input.png', b'input', content_type='image/png')
        opaque_output = self._png_bytes(color=(255, 255, 255, 255))
        with patch('catalog.views.core.remove', return_value=opaque_output):
            with self.assertRaisesRegex(Exception, 'valid transparent image'):
                CatalogValidator().process_image_with_rembg(uploaded)

    # --- SELLER LISTING CRUD (Distinct Routes) ---
    def test_seller_can_list_and_manage_own_items(self):
        self.client.force_authenticate(user=self.seller)
        item = CatalogItem.objects.create(
            name='CRUD Test Item', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='active')
        item_id = str(item.id)

        res = self.client.get(f'/catalog/my-listings/{item_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'CRUD Test Item')

        with patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda function, *args: function(*args)), \
             patch('catalog.views.core.remove', return_value=self._png_bytes()):
            res = self.client.patch(f'/catalog/my-listings/{item_id}/', {
                'name': 'Updated Name', 'price': 15.0, 'category': 'outerwear',
                'size': 'L', 'color': 'Blue', 'color_description': 'Navy blue',
                'color_family': 'blue', 'style_tags': ['casual'], 'occasion_tags': ['everyday'],
            }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Updated Name')
        self.assertEqual(float(res.data['price']), 15.0)
        self.assertEqual(res.data['category'], 'outerwear')
        self.assertEqual(res.data['size'], 'L')
        self.assertEqual(res.data['color'], 'Blue')

        res = self.client.delete(f'/catalog/my-listings/{item_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        res = self.client.get(f'/catalog/my-listings/{item_id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_seller_cannot_manage_other_sellers_items(self):
        other_seller = User.objects.create_user(full_name='Other Seller', email='s2@t.com', password='Test123!@#', role='seller', store_name='Other')
        item = CatalogItem.objects.create(
            name='Other Item', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=other_seller, store_name='Other Store', status='active')
        self.client.force_authenticate(user=self.seller)
        res = self.client.get(f'/catalog/my-listings/{item.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

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

    def test_seller_color_mismatch_rejects_listing_not_activates(self):
        self.client.force_authenticate(user=self.seller)
        item = CatalogItem.objects.create(
            name='White Shirt', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='active')
        item.rear_image.save('rear.png', ContentFile(self._png_bytes()), save=True)
        item.refresh_from_db()
        image = SimpleUploadedFile('blue.png', self._png_bytes(color=(0, 0, 255, 128)), content_type='image/png')
        with patch('catalog.views.core.remove', return_value=self._png_bytes(color=(0, 0, 255, 128))), \
             patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda f, *a: f(*a)):
            response = self.client.patch(
                f'/catalog/my-listings/{item.id}/', {'front_image': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.status, 'rejected')
        self.assertNotEqual(item.status, 'active')
        self.assertTrue(any('Color mismatch' in str(r) for r in item.rejection_reasons))

    def test_seller_can_replace_image_and_it_revalidates(self):
        self.client.force_authenticate(user=self.seller)
        item = CatalogItem.objects.create(
            name='White Shirt', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='active')
        item.rear_image.save('rear.png', ContentFile(self._png_bytes()), save=True)
        item.refresh_from_db()
        image = SimpleUploadedFile('white.png', self._png_bytes(color=(255, 255, 255, 128)), content_type='image/png')
        with patch('catalog.views.core.remove', return_value=self._png_bytes(color=(255, 255, 255, 128))), \
             patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda f, *a: f(*a)):
            response = self.client.patch(
                f'/catalog/my-listings/{item.id}/', {'front_image': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertTrue(item.front_image.name)
        self.assertEqual(item.status, 'active')

    # ==========================================
    # GOAL 3 REGRESSION TESTS
    # ==========================================
    def test_replacing_image_deletes_old_gridfs_object(self):
        self.client.force_authenticate(user=self.seller)
        item = CatalogItem.objects.create(
            name='Shirt', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='active')
        item.rear_image.save('rear.png', ContentFile(self._png_bytes()), save=True)
        item.refresh_from_db()

        item.front_image.save('old_front.png', ContentFile(self._png_bytes()), save=True)
        item.refresh_from_db()
        old_storage_id = item.front_image.name
        self.assertTrue(ObjectId.is_valid(old_storage_id))

        new_bytes = self._png_bytes(color=(255, 255, 255, 128))
        new_image = SimpleUploadedFile('new.png', new_bytes, content_type='image/png')
        with patch('catalog.views.core.remove', return_value=new_bytes), \
             patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda f, *a: f(*a)):
            response = self.client.patch(
                f'/catalog/my-listings/{item.id}/', {'front_image': new_image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        new_storage_id = item.front_image.name

        self.assertTrue(ObjectId.is_valid(new_storage_id))
        self.assertNotEqual(new_storage_id, old_storage_id)
        self.assertIsNone(self._gridfs_file(old_storage_id), "Old GridFS object was not deleted after replacement")
        self.assertIsNotNone(self._gridfs_file(new_storage_id), "Replacement GridFS object is missing")

    def test_deleting_listing_removes_both_stored_images(self):
        self.client.force_authenticate(user=self.seller)
        item = CatalogItem.objects.create(
            name='Shirt', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='active')
        item.front_image.save('front.png', ContentFile(self._png_bytes()), save=False)
        item.rear_image.save('rear.png', ContentFile(self._png_bytes()), save=True)
        item.refresh_from_db()
        front_storage_id = item.front_image.name
        rear_storage_id = item.rear_image.name
        self.assertTrue(ObjectId.is_valid(front_storage_id))
        self.assertTrue(ObjectId.is_valid(rear_storage_id))

        response = self.client.delete(f'/catalog/my-listings/{item.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CatalogItem.objects.filter(id=item.id).exists())

        self.assertIsNone(self._gridfs_file(front_storage_id), "Front GridFS object survived listing deletion")
        self.assertIsNone(self._gridfs_file(rear_storage_id), "Rear GridFS object survived listing deletion")
        # KAN-119: both collections, not just fs.files.
        self.assertEqual(self.gridfs.files, {})
        self.assertEqual(self.gridfs.chunks, {})

    def test_deleting_listing_leaves_order_item_snapshots_intact(self):
        from commerce.models import Order, OrderItem
        self.client.force_authenticate(user=self.seller)
        item = CatalogItem.objects.create(
            name='Snap Shirt', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='active')
        order = Order.objects.create(
            user=self.user, status='paid', shipping_address='Addr',
            payment_method='card', total_amount=Decimal('10.00'))
        OrderItem.objects.create(
            order=order, catalog_item=item, item_name='Snap Shirt',
            store_name='Test Store', unit_price=Decimal('10.00'))

        self.client.delete(f'/catalog/my-listings/{item.id}/')
        self.assertFalse(CatalogItem.objects.filter(id=item.id).exists())

        order_item = OrderItem.objects.get(order=order)
        self.assertEqual(order_item.item_name, 'Snap Shirt')
        self.assertEqual(order_item.store_name, 'Test Store')
        self.assertEqual(order_item.unit_price, Decimal('10.00'))
        self.assertIsNone(order_item.catalog_item)

    def test_edited_rejected_listing_stays_processing_until_pipeline_passes(self):
        self.client.force_authenticate(user=self.seller)
        item = CatalogItem.objects.create(
            name='Bad Shirt', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='rejected',
            rejection_reasons=['Missing description'])
        with patch('catalog.views.core.UPLOAD_EXECUTOR.submit') as mock_submit:
            response = self.client.patch(
                f'/catalog/my-listings/{item.id}/', {'description': 'Now has description'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.status, 'processing')
        mock_submit.assert_called_once()

    def test_repeated_replace_then_delete_leaves_no_orphaned_lineage(self):
        self.client.force_authenticate(user=self.seller)
        item = CatalogItem.objects.create(
            name='Cycle Shirt', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='active')

        item.rear_image.save(f'{item.id}_rear.png', ContentFile(self._png_bytes()), save=True)
        item.refresh_from_db()

        item.front_image.save(f'{item.id}_front.png', ContentFile(self._png_bytes()), save=True)
        item.refresh_from_db()

        new_bytes = self._png_bytes(color=(255, 255, 255, 128))
        for cycle in range(3):
            replacement = SimpleUploadedFile(f'cycle_{cycle}.png', new_bytes, content_type='image/png')
            with patch('catalog.views.core.remove', return_value=new_bytes), \
                 patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda f, *a: f(*a)):
                response = self.client.patch(
                    f'/catalog/my-listings/{item.id}/', {'front_image': replacement}, format='multipart')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            item.refresh_from_db()

        pre_delete_files = self._item_gridfs_files(item.id)
        filenames = [f.get('filename') if isinstance(f, dict) else getattr(f, 'filename', str(f)) for f in pre_delete_files]
        self.assertEqual(len(pre_delete_files), 2,
                         f"Expected 2 active files, found {len(pre_delete_files)}: {filenames}")

        response = self.client.delete(f'/catalog/my-listings/{item.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CatalogItem.objects.filter(id=item.id).exists())

        post_delete_files = self._item_gridfs_files(item.id)
        post_filenames = [f.get('filename') if isinstance(f, dict) else getattr(f, 'filename', str(f)) for f in post_delete_files]
        self.assertEqual(post_delete_files, [],
                         f"Orphaned GridFS files after replace/delete cycles: {post_filenames}")
        # KAN-119: both collections, not just fs.files.
        self.assertEqual(self.gridfs.files, {})
        self.assertEqual(self.gridfs.chunks, {})

    # ==========================================
    # KAN-119 RACE + CLEANUP-FAILURE REGRESSIONS
    # ==========================================
    def test_delete_during_revalidation_does_not_resurrect_item(self):
        """Seller deletes the listing while rembg is still running."""
        self.client.force_authenticate(user=self.seller)
        item = self._item_with_images()
        item_id = item.id
        payload = self._png_bytes(color=(255, 255, 255, 128))
        replacement = SimpleUploadedFile('racy.png', payload, content_type='image/png')

        def process_then_delete(validator_self, image_file, session=None):
            CatalogItem.objects.filter(id=item_id).delete()
            return io.BytesIO(payload)

        with patch('catalog.views.core.CatalogValidator.process_image_with_rembg', process_then_delete), \
             patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda f, *a: f(*a)):
            response = self.client.patch(
                f'/catalog/my-listings/{item_id}/', {'front_image': replacement}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(CatalogItem.objects.filter(id=item_id).exists(),
                         'Deleted listing was resurrected by the background worker')
        self.assertEqual(self.gridfs.files, {})
        self.assertEqual(self.gridfs.chunks, {})

    def test_delete_between_processing_and_commit_purges_new_images(self):
        """Row disappears AFTER the new PNGs are written but BEFORE the commit."""
        self.client.force_authenticate(user=self.seller)
        item = self._item_with_images()
        item_id = item.id
        payload = self._png_bytes(color=(255, 255, 255, 128))
        replacement = SimpleUploadedFile('late.png', payload, content_type='image/png')

        real_commit = catalog_core._commit_item

        def delete_then_commit(commit_item_id, **fields):
            CatalogItem.objects.filter(id=commit_item_id).delete()
            return real_commit(commit_item_id, **fields)

        with patch('catalog.views.core.CatalogValidator.process_image_with_rembg',
                   lambda s, f, session=None: io.BytesIO(payload)), \
             patch('catalog.views.core._commit_item', side_effect=delete_then_commit), \
             patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda f, *a: f(*a)):
            response = self.client.patch(
                f'/catalog/my-listings/{item_id}/', {'front_image': replacement}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(CatalogItem.objects.filter(id=item_id).exists())
        self.assertEqual(self.gridfs.files, {})
        self.assertEqual(self.gridfs.chunks, {})

    def test_old_image_cleanup_failure_does_not_strand_processing(self):
        """An unreachable bucket during old-image cleanup must not block the pipeline."""
        self.client.force_authenticate(user=self.seller)
        item = self._item_with_images()
        old_front = item.front_image.name
        payload = self._png_bytes(color=(255, 255, 255, 128))
        replacement = SimpleUploadedFile('new.png', payload, content_type='image/png')

        real_delete = type(gridfs_storage).delete

        def flaky_delete(storage_self, name):
            if name == old_front:
                raise FileNotFoundError('GridFS is not reachable right now')
            return real_delete(storage_self, name)

        with patch('catalog.views.core.CatalogValidator.process_image_with_rembg',
                   lambda s, f, session=None: io.BytesIO(payload)), \
             patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda f, *a: f(*a)), \
             patch.object(type(gridfs_storage), 'delete', flaky_delete), \
             self.assertLogs('catalog', level='ERROR') as logs:
            response = self.client.patch(
                f'/catalog/my-listings/{item.id}/', {'front_image': replacement}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.status, 'active', 'Cleanup failure stranded the listing')
        self.assertTrue(any('KAN-119 ORPHAN_RISK' in message for message in logs.output))
        self.assertIn('image_cleanup_warning', response.data)
        # The orphan is REAL and reported - not silently pretended away.
        self.assertIn(ObjectId(old_front), self.gridfs.files)

    def test_pipeline_submission_failure_does_not_leave_item_processing(self):
        self.client.force_authenticate(user=self.seller)
        item = self._item_with_images()
        replacement = SimpleUploadedFile('new.png', self._png_bytes(), content_type='image/png')

        with patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=RuntimeError('executor down')):
            response = self.client.patch(
                f'/catalog/my-listings/{item.id}/', {'front_image': replacement}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        item.refresh_from_db()
        self.assertEqual(item.status, 'rejected')
        self.assertTrue(item.rejection_reasons)