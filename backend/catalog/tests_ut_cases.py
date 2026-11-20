"""Unit cases UT-08, UT-13 and UT-15 from Software Testing & QA Plan §3.3.

Test-only additions for KAN-82 / KAN-86 / KAN-119 evidence.  Application source
is not modified: every external dependency (GridFS, rembg, executor) is faked or
patched exactly as in the existing catalog test suite.
"""
import io
from unittest.mock import patch

from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from catalog.color_palette_config import COLOR_PALETTE_MAPPING, get_palette_tags
from catalog.models import CatalogItem, UploadBatch
from catalog.serializers import CSVUploadSerializer
from catalog.tests import _GridFSIsolatedMixin
from catalog.views.core import CatalogValidator


def _png_bytes(size=(800, 800), color=(210, 24, 35, 128)):
    image = Image.new('RGBA', size, color)
    output = io.BytesIO()
    image.save(output, format='PNG')
    return output.getvalue()


class _SellerAPITestCase(TestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.seller = User.objects.create_user(
            full_name='UT Seller', email='ut-seller@test.com', password='Test123!@#',
            role='seller', store_name='UT Store')
        self.client.force_authenticate(user=self.seller)


class UT08PaletteDerivationTests(_SellerAPITestCase):
    """UT-08: color_family='red' on publish -> palette tags from knowledge table."""

    def test_ut08_red_family_palette_tags_come_from_knowledge_table(self):
        expected = list(COLOR_PALETTE_MAPPING['red']['tags'])
        self.assertEqual(CatalogValidator().generate_color_palette_tags('red', 'red'), expected)
        self.assertEqual(get_palette_tags('red'), expected)

        csv_content = (
            'name,description,category,size,color,color_description,color_family,price,style_tags,front_image_filename,rear_image_filename\n'
            'Red Shirt,desc,tops,M,Red,Bright red,red,20.00,casual,front.png,rear.png\n'
        )
        csv_file = SimpleUploadedFile('red.csv', csv_content.encode(), content_type='text/csv')
        image_bytes = _png_bytes(color=(210, 24, 35, 128))
        images = [
            SimpleUploadedFile(f'{view}.png', image_bytes, content_type='image/png')
            for view in ('front', 'rear')
        ]
        with (
            patch('catalog.views.core.UPLOAD_EXECUTOR.submit',
                  side_effect=lambda function, *args: function(*args)),
            patch('catalog.views.core.new_session', return_value=object()),
            patch('catalog.views.core.remove', return_value=image_bytes),
        ):
            response = self.client.post(
                '/catalog/upload/', {'csv_file': csv_file, 'images': images}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        item = CatalogItem.objects.get(batch_id=response.data['batch_id'])
        self.assertEqual(item.status, 'active')
        self.assertEqual(item.color_family, 'red')
        self.assertEqual(item.compatible_color_palette_tags, expected)


class UT13GridFSCleanupTests(_GridFSIsolatedMixin, TestCase):
    """UT-13: replace image then delete listing -> old ObjectIds gone from BOTH
    fs.files and fs.chunks (in-memory bucket stand-in; no live Atlas access).
    """

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.seller = User.objects.create_user(
            full_name='UT13 Seller', email='ut13-seller@test.com', password='Test123!@#',
            role='seller', store_name='UT13 Store')
        self.client.force_authenticate(user=self.seller)

    def test_ut13_replace_then_delete_removes_old_objectids_from_files_and_chunks(self):
        item = CatalogItem.objects.create(
            name='UT13 Shirt', description='desc', category='tops', size='M',
            color='White', color_description='white', color_family='neutral', price=10.0,
            seller=self.seller, store_name='UT13 Store', status='active')
        item.rear_image.save('rear.png', ContentFile(self._png_bytes()), save=True)
        item.front_image.save('old_front.png', ContentFile(self._png_bytes()), save=True)
        item.refresh_from_db()
        old_front_id = str(item.front_image.name)
        rear_id = str(item.rear_image.name)
        self.assertIsNotNone(self._gridfs_file(old_front_id))
        self.assertIn(str(old_front_id), [str(k) for k in self.gridfs.files])

        new_bytes = self._png_bytes(color=(20, 20, 255, 128))
        replacement = SimpleUploadedFile('new_front.png', new_bytes, content_type='image/png')
        with (
            patch('catalog.views.core.remove', return_value=new_bytes),
            patch('catalog.views.core.UPLOAD_EXECUTOR.submit',
                  side_effect=lambda function, *args: function(*args)),
        ):
            response = self.client.patch(
                f'/catalog/my-listings/{item.id}/', {'front_image': replacement},
                format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        new_front_id = str(item.front_image.name)
        self.assertNotEqual(new_front_id, old_front_id)

        # After replacement the superseded ObjectId is absent from both collections.
        self.assertNotIn(old_front_id, [str(k) for k in self.gridfs.files])
        self.assertNotIn(old_front_id, [str(k) for k in self.gridfs.chunks])
        self.assertIsNone(self._gridfs_file(old_front_id))

        response = self.client.delete(f'/catalog/my-listings/{item.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CatalogItem.objects.filter(id=item.id).exists())

        # After deletion every ObjectId from the listing is absent from both.
        for object_id in (old_front_id, new_front_id, rear_id):
            self.assertNotIn(object_id, [str(k) for k in self.gridfs.files])
            self.assertNotIn(object_id, [str(k) for k in self.gridfs.chunks])
        self.assertEqual(self.gridfs.files, {})
        self.assertEqual(self.gridfs.chunks, {})


class UT15CSVFileTypeGuardTests(_SellerAPITestCase):
    """UT-15: .xlsx/.xls/.ods uploads are rejected with 'File must be a CSV' and
    no UploadBatch is created.
    """

    def test_ut15_serializer_rejects_spreadsheet_extensions(self):
        for filename in ('items.xlsx', 'items.xls', 'items.ods'):
            with self.subTest(filename=filename):
                data = {
                    'csv_file': SimpleUploadedFile(filename, b'not a csv',
                                                   content_type='application/octet-stream'),
                    'images': [SimpleUploadedFile('front.png', _png_bytes(), content_type='image/png')],
                }
                serializer = CSVUploadSerializer(data=data)
                self.assertFalse(serializer.is_valid())
                self.assertIn('File must be a CSV.', str(serializer.errors['csv_file']))

    def test_ut15_upload_endpoint_rejects_spreadsheet_and_creates_no_batch(self):
        # CSV-shaped content with a spreadsheet extension: if the documented
        # extension guard is enforced, the upload must still be rejected.
        csv_content = (
            'name,description,category,size,color,color_description,color_family,price,style_tags,front_image_filename,rear_image_filename\n'
            'Red Shirt,desc,tops,M,Red,Bright red,red,20.00,casual,front.png,rear.png\n'
        )
        spreadsheet = SimpleUploadedFile('items.xlsx', csv_content.encode(),
                                         content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        images = [
            SimpleUploadedFile(f'{view}.png', _png_bytes(), content_type='image/png')
            for view in ('front', 'rear')
        ]
        with patch('catalog.views.core.UPLOAD_EXECUTOR.submit'):
            response = self.client.post(
                '/catalog/upload/', {'csv_file': spreadsheet, 'images': images},
                format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('File must be a CSV', str(response.data))
        self.assertEqual(UploadBatch.objects.count(), 0)
