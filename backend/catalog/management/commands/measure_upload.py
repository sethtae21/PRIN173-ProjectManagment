import time
from io import BytesIO

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from PIL import Image, ImageDraw
from bson.objectid import ObjectId
from catalog.models import CatalogItem, UploadBatch

User = get_user_model()

class Command(BaseCommand):
    help = 'Measures the processing time of a 10-item CSV upload with rembg background removal.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("🚀 Starting 10-item upload timing test..."))
        
        # 1. Ensure we have a test seller
        seller = User.objects.filter(username='timing_seller').first()
        created_seller = seller is None
        if seller is None:
            seller = User.objects.create_user(
                username='timing_seller', email='timing@test.com',
                password='Test123!@#', role='seller', store_name='Timing Store')
        
        # 2. Generate 30 dummy images (3 views for each of the 10 items)
        image_files = []
        garment = Image.new('RGB', (800, 800), (35, 150, 65))
        draw = ImageDraw.Draw(garment)
        draw.polygon(
            [(280, 150), (350, 110), (450, 110), (520, 150),
             (610, 280), (535, 330), (500, 265), (500, 690),
             (300, 690), (300, 265), (265, 330), (190, 280)],
            fill=(210, 25, 35),
        )
        image_buffer = BytesIO()
        garment.save(image_buffer, format='JPEG', quality=90)
        jpeg_bytes = image_buffer.getvalue()
        
        self.stdout.write("📦 Generating 30 dummy images (3 views × 10 items)...")
        for i in range(10):
            for view in ['front', 'side', 'rear']:
                filename = f"dummy_img_{i}_{view}.jpg"
                image_files.append(SimpleUploadedFile(filename, jpeg_bytes, content_type="image/jpeg"))

        # 3. Generate a 10-row CSV matching the 30 images exactly
        csv_lines = ["name,description,category,size,color,color_description,color_family,price,style_tags,occasion_tags,front_image_filename,side_image_filename,rear_image_filename"]
        for i in range(10):
            csv_lines.append(f"Item {i},Desc {i},tops,M,Red,Bright red,red,10.00,casual,everyday,dummy_img_{i}_front.jpg,dummy_img_{i}_side.jpg,dummy_img_{i}_rear.jpg")
        
        csv_content = "\n".join(csv_lines)
        csv_file = SimpleUploadedFile("test_10_items.csv", csv_content.encode('utf-8'), content_type="text/csv")

        # 4. Simulate the upload request
        self.stdout.write("⏳ Uploading to backend...")
        client = APIClient()
        client.force_authenticate(user=seller)
        
        start_time = time.perf_counter()
        
        response = client.post('/catalog/upload/', {
            'csv_file': csv_file,
            'images': image_files
        }, format='multipart')
        
        if response.status_code != 202:
            self.stdout.write(self.style.ERROR(f"❌ Upload failed with status {response.status_code}: {response.data}"))
            if created_seller:
                seller.delete()
            raise CommandError('Timing upload was not accepted.')

        batch_id = response.data['batch_id']
        self.stdout.write(self.style.SUCCESS(f"✅ Upload accepted (HTTP 202). Batch ID: {batch_id}"))
        self.stdout.write("⏳ Waiting for background processing (rembg + validation)...")

        try:
            deadline = time.monotonic() + 180
            while time.monotonic() < deadline:
                time.sleep(1)
                report_res = client.get(f'/catalog/batch-report/?batch_id={batch_id}')
                batch_status = report_res.data.get('status')
                if batch_status not in ('completed', 'failed'):
                    continue

                total_time = time.perf_counter() - start_time
                accepted = report_res.data.get('accepted_count')
                rejected = report_res.data.get('rejected_count')
                self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
                self.stdout.write(self.style.SUCCESS('PROCESSING FINISHED'))
                self.stdout.write(self.style.WARNING(f'TOTAL TIME: {total_time:.2f} seconds'))
                self.stdout.write(f'Report: Accepted: {accepted} | Rejected: {rejected}')
                self.stdout.write(self.style.SUCCESS("=" * 60 + "\n"))

                if batch_status != 'completed' or accepted != 10 or rejected != 0:
                    raise CommandError('Timing run did not successfully publish all 10 test items.')
                if total_time > 60:
                    raise CommandError('10-item upload exceeded the 60-second acceptance target.')
                return
            raise CommandError('Upload batch did not complete within the 180-second timing-run limit.')
        finally:
            batch = UploadBatch.objects.filter(id=ObjectId(batch_id)).first()
            if batch:
                for item in CatalogItem.objects.filter(batch=batch):
                    for field in ('front_image', 'side_image', 'rear_image'):
                        image = getattr(item, field)
                        if image:
                            image.delete(save=False)
                    item.delete()
                batch.delete()
            if created_seller:
                seller.delete()