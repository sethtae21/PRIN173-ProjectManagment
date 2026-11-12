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


class _GridFSIsolatedMixin:
    """Shared KAN-119 fixture: fake bucket, private rembg cache, GridFS helpers.

    Subclasses define their own setUp and MUST call super().setUp() so the
    isolation is installed before any image is written.
    """

    def setUp(self):
        super().setUp()
        stack, self.gridfs = isolated_gridfs()
        self.addCleanup(stack.close)
        self.assertIs(
            gridfs_storage, CatalogItem._meta.get_field('front_image').storage,
            'Injected GridFS double must be the same object the model fields use.',
        )
        # A shared on-disk rembg cache can serve a stale matte and skip the
        # patched remove() entirely. Give each test a private cache dir.
        cache_dir = tempfile.TemporaryDirectory(prefix='kan119-rembg-')
        self.addCleanup(cache_dir.cleanup)
        stack.enter_context(patch('catalog.views.core.REMBG_CACHE_DIR', Path(cache_dir.name)))

    @staticmethod
    def _png_bytes(size=(800, 800), color=(255, 255, 255, 128)):
        image = Image.new('RGBA', size, color)
        output = io.BytesIO()
        image.save(output, format='PNG')
        return output.getvalue()

    def _gridfs_file(self, storage_name):
        """Return the GridFS file document for a stored field name, or None."""
        if not storage_name:
            return None
        fs = gridfs_storage._require_fs()
        if ObjectId.is_valid(storage_name):
            return fs.find_one({'_id': ObjectId(storage_name)})
        return fs.find_one({'filename': storage_name})

    def _item_gridfs_files(self, item_id):
        """All GridFS file documents whose filename contains this item's ID.

        Django's ImageField prepends the upload_to prefix (e.g. 'catalog/front/')
        to the filename, so we search fs.files for the 24-char item_id anywhere
        in the path.
        """
        gridfs_storage._require_fs()
        db = gridfs_storage._db
        return list(db['fs.files'].find({'filename': {'$regex': str(item_id)}}))

    def _item_with_images(self, **overrides):
        """Active listing with BOTH views already persisted."""
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


class CatalogValidationAndCRUDTests(_GridFSIsolatedMixin, TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(
            full_name='Test Seller', email='seller@test.com', password='Test123!@#',
            role='seller', store_name='Test Store')
        self.user = User.objects.create_user(
            full_name='Test User', email='user@test.com', password='Test123!@#', role='user')
        self.valid_img = SimpleUploadedFile("test.jpg", b"fake_image_data", content_type="image/jpeg")
        self.oversized_img = SimpleUploadedFile("large.jpg", b"x" * (5 * 1024 * 1024 + 100), content_type="image/jpeg")
        super().setUp()

    def _get_valid_csv(self):
        return (
            "name,description,category,size,color,color_description,color_family,price,style_tags,occasion_tags,front_image_filename,rear_image_filename\n"
            "Test Shirt,A nice shirt,tops,M,White,Pure white,neutral,20.00,casual,everyday,test_front.jpg,test_rear.jpg\n"
        )

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
             patch('catalog.views.core.get_shared_rembg_session', return_value=object()), \
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
             patch('catalog.views.core.get_shared_rembg_session', return_value=object()), \
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
             patch('catalog.views.core.get_shared_rembg_session', return_value=object()), \
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
        old_front = item.front_image.name
        replacement = SimpleUploadedFile('new.png', self._png_bytes(), content_type='image/png')
    
        with patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=RuntimeError('executor down')), \
             self.assertLogs('catalog', level='ERROR'):
            response = self.client.patch(
                f'/catalog/my-listings/{item.id}/', {'front_image': replacement}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        item.refresh_from_db()
        self.assertEqual(item.status, 'rejected')
        self.assertTrue(item.rejection_reasons)
        # KAN-119: this branch must not create the orphan it exists to prevent.
        self.assertNotIn(ObjectId(old_front), self.gridfs.files,
                         'Superseded image was left orphaned by the submit-failure branch')
        self.assertIsNotNone(self._gridfs_file(item.front_image.name),
                             'The persisted replacement reference does not resolve')
    # ==========================================
    # KAN-119 DELETE PRE-FLIGHT (no misleading 204)
    # ==========================================
    def test_delete_refused_when_gridfs_unreachable_leaves_listing_intact(self):
        self.client.force_authenticate(user=self.seller)
        item = self._item_with_images()
        before = dict(self.gridfs.files)

        with patch.object(gridfs_storage, '_require_fs',
                          side_effect=FileNotFoundError('GridFS is not reachable right now')), \
             self.assertLogs('catalog', level='ERROR') as logs:
            response = self.client.delete(f'/catalog/my-listings/{item.id}/')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertTrue(CatalogItem.objects.filter(id=item.id).exists(),
                        'Listing was deleted even though image cleanup was impossible')
        self.assertEqual(self.gridfs.files, before, 'Objects were removed on a refused delete')
        self.assertTrue(any('delete refused' in message for message in logs.output))

    def test_delete_without_images_still_succeeds_when_gridfs_unreachable(self):
        self.client.force_authenticate(user=self.seller)
        item = CatalogItem.objects.create(
            name='No Image Shirt', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='rejected')

        with patch.object(gridfs_storage, '_require_fs',
                          side_effect=FileNotFoundError('GridFS is not reachable right now')):
            response = self.client.delete(f'/catalog/my-listings/{item.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CatalogItem.objects.filter(id=item.id).exists())
    # ==========================================
    # KAN-119 REPLACEMENT-WRITE FAILURE (no stuck 'processing')
    # ==========================================
    def test_replacement_storage_failure_does_not_strand_processing(self):
        self.client.force_authenticate(user=self.seller)
        item = self._item_with_images()
        old_front = item.front_image.name
        old_rear = item.rear_image.name
        before = set(self.gridfs.files)
        replacement = SimpleUploadedFile('new.png', self._png_bytes(), content_type='image/png')

        with patch.object(type(gridfs_storage), '_save',
                          side_effect=FileNotFoundError('GridFS is not reachable right now')), \
             self.assertLogs('catalog', level='ERROR'):
            response = self.client.patch(
                f'/catalog/my-listings/{item.id}/', {'front_image': replacement}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        item.refresh_from_db()
        self.assertNotEqual(item.status, 'processing',
                            'Replacement write failure stranded the listing in processing')
        self.assertEqual(item.status, 'rejected')
        self.assertTrue(item.rejection_reasons)
        # updated.save() never ran: the row must still reference the ORIGINALS.
        self.assertEqual(item.front_image.name, old_front)
        self.assertEqual(item.rear_image.name, old_rear)
        self.assertIsNotNone(self._gridfs_file(old_front))
        self.assertIsNotNone(self._gridfs_file(old_rear))
        self.assertEqual(set(self.gridfs.files), before,
                         'A partially written replacement was left orphaned')

    def test_partial_replacement_write_is_compensated(self):
        """Front succeeds, rear fails: the new front must be purged, originals kept."""
        self.client.force_authenticate(user=self.seller)
        item = self._item_with_images()
        old_front = item.front_image.name
        old_rear = item.rear_image.name
        before = set(self.gridfs.files)
        payload = self._png_bytes()

        real_save = type(gridfs_storage)._save

        def flaky_save(storage_self, name, content):
            if 'rear_image' in name:
                raise FileNotFoundError('GridFS is not reachable right now')
            return real_save(storage_self, name, content)

        with patch.object(type(gridfs_storage), '_save', flaky_save), \
             self.assertLogs('catalog', level='ERROR'):
            response = self.client.patch(
                f'/catalog/my-listings/{item.id}/',
                {'front_image': SimpleUploadedFile('f.png', payload, content_type='image/png'),
                 'rear_image': SimpleUploadedFile('r.png', payload, content_type='image/png')},
                format='multipart')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        item.refresh_from_db()
        self.assertEqual(item.status, 'rejected')
        self.assertEqual(item.front_image.name, old_front)
        self.assertEqual(item.rear_image.name, old_rear)
        self.assertEqual(set(self.gridfs.files), before,
                         'The successfully written front replacement was not compensated')
        self.assertEqual(set(self.gridfs.chunks), before)

    def test_rejected_listing_with_missing_assets_cannot_be_promoted(self):
        """Acceptance rule: a rejected item with no stored assets stays rejected."""
        self.client.force_authenticate(user=self.seller)
        item = CatalogItem.objects.create(
            name='Assetless Shirt', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='Test Store', status='rejected',
            rejection_reasons=['Missing stored image assets'])

        with patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda f, *a: f(*a)), \
             patch('catalog.views.core.get_shared_rembg_session', return_value=object()):
            response = self.client.patch(
                f'/catalog/my-listings/{item.id}/', {'description': 'Now described'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.status, 'rejected')
        self.assertTrue(any('Missing stored image asset' in str(r) for r in item.rejection_reasons))
        self.assertEqual(self.gridfs.files, {})
        self.assertEqual(self.gridfs.chunks, {})


class CatalogBatchGuardTests(_GridFSIsolatedMixin, TestCase):
    """KAN-119: the batch worker must not resurrect a deleted listing, and its
    guarded commit must still persist the processed image names."""

    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(
            full_name='Batch Seller', email='batch-seller@test.com', password='Test123!@#',
            role='seller', store_name='Batch Store')
        super().setUp()

    def _csv(self):
        return (
            'name,description,category,size,color,color_description,color_family,price,style_tags,front_image_filename,rear_image_filename\n'
            'Batch Shirt,desc,tops,M,Red,Bright red,red,20.00,casual,front.png,rear.png\n'
        )

    def _upload(self, payload):
        csv_file = SimpleUploadedFile('batch.csv', self._csv().encode(), content_type='text/csv')
        images = [
            SimpleUploadedFile(f'{view}.png', payload, content_type='image/png')
            for view in ('front', 'rear')
        ]
        with patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda f, *a: f(*a)), \
             patch('catalog.views.core.get_shared_rembg_session', return_value=object()), \
             patch('catalog.views.core.CatalogValidator.process_image_with_rembg',
                   lambda s, f, session=None: io.BytesIO(payload)):
            return self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart')

    def test_batch_commit_persists_processed_image_names(self):
        """Guards the orphan trap: _commit_item must carry the new image names."""
        self.client.force_authenticate(user=self.seller)
        payload = self._png_bytes(color=(210, 24, 35, 128))

        response = self._upload(payload)

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        item = CatalogItem.objects.get(batch_id=response.data['batch_id'])
        self.assertEqual(item.status, 'active')
        for field_name in ('front_image', 'rear_image'):
            name = getattr(item, field_name).name
            self.assertTrue(name, f'{field_name} reference was not persisted by the batch commit')
            self.assertTrue(ObjectId.is_valid(name))
            self.assertIsNotNone(self._gridfs_file(name), f'{field_name} points at a missing object')
        self.assertEqual(len(self._item_gridfs_files(item.id)), 2)
        self.assertEqual(len(self.gridfs.files), 2)
        self.assertEqual(len(self.gridfs.chunks), 2)

    def test_delete_during_batch_processing_does_not_resurrect_item(self):
        self.client.force_authenticate(user=self.seller)
        payload = self._png_bytes(color=(210, 24, 35, 128))
        csv_file = SimpleUploadedFile('batch.csv', self._csv().encode(), content_type='text/csv')
        images = [
            SimpleUploadedFile(f'{view}.png', payload, content_type='image/png')
            for view in ('front', 'rear')
        ]
        state = {'deleted': False}

        def process_then_delete(validator_self, image_file, session=None):
            if not state['deleted']:
                state['deleted'] = True
                CatalogItem.objects.filter(batch__isnull=False).delete()
            return io.BytesIO(payload)

        with patch('catalog.views.core.UPLOAD_EXECUTOR.submit', side_effect=lambda f, *a: f(*a)), \
             patch('catalog.views.core.get_shared_rembg_session', return_value=object()), \
             patch('catalog.views.core.CatalogValidator.process_image_with_rembg', process_then_delete):
            response = self.client.post('/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(state['deleted'], 'Race was never exercised')
        self.assertFalse(CatalogItem.objects.filter(batch_id=response.data['batch_id']).exists(),
                         'Batch worker resurrected a deleted listing')
        self.assertEqual(self.gridfs.files, {})
        self.assertEqual(self.gridfs.chunks, {})

    def test_batch_deferred_purge_failure_is_attributable_to_the_listing(self):
        """A failed deferred purge must name the listing, not log item=None."""
        self.client.force_authenticate(user=self.seller)
        payload = self._png_bytes(color=(210, 24, 35, 128))

        def refuse(storage_self, name):
            raise FileNotFoundError('GridFS is not reachable right now')

        with patch.object(type(gridfs_storage), 'delete', refuse), \
             self.assertLogs('catalog', level='ERROR') as logs:
            response = self._upload(payload)

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        item = CatalogItem.objects.get(batch_id=response.data['batch_id'])
        self.assertTrue(
            any('KAN-119 ORPHAN_RISK' in m and f'item={item.id}' in m for m in logs.output),
            f'Deferred purge failure was not attributable to the listing: {logs.output}',
        )