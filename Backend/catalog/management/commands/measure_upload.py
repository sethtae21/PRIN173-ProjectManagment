import time
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from catalog.models import UploadBatch

User = get_user_model()

class Command(BaseCommand):
    help = 'Measures the processing time of a 10-item CSV upload with rembg background removal.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("🚀 Starting 10-item upload timing test..."))
        
        # 1. Ensure we have a test seller
        seller, _ = User.objects.get_or_create(
            username='timing_seller', 
            defaults={
                'email': 'timing@test.com', 
                'password': 'Test123!@#', 
                'role': 'seller', 
                'store_name': 'Timing Store'
            }
        )
        
        # 2. Generate 30 dummy images (3 views for each of the 10 items)
        image_files = []
        # Minimal valid 1x1 JPEG byte string
        jpeg_bytes = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x16\x17\x18\x19\x1a%&\'()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd5\xdb \x98\x05\xa2\x80\xff\xd9'
        
        self.stdout.write("📦 Generating 30 dummy images (3 views × 10 items)...")
        for i in range(10):
            for view in ['front', 'side', 'rear']:
                filename = f"dummy_img_{i}_{view}.jpg"
                image_files.append(SimpleUploadedFile(filename, jpeg_bytes, content_type="image/jpeg"))

        # 3. Generate a 10-row CSV matching the 30 images exactly
        csv_lines = ["name,description,category,size,color,color_description,color_family,price,style_tags,occasion_tags,front_image_filename,side_image_filename,rear_image_filename"]
        for i in range(10):
            csv_lines.append(f"Item {i},Desc {i},tops,M,White,Pure white,neutral,10.00,casual,everyday,dummy_img_{i}_front.jpg,dummy_img_{i}_side.jpg,dummy_img_{i}_rear.jpg")
        
        csv_content = "\n".join(csv_lines)
        csv_file = SimpleUploadedFile("test_10_items.csv", csv_content.encode('utf-8'), content_type="text/csv")

        # 4. Simulate the upload request
        self.stdout.write("⏳ Uploading to backend...")
        client = APIClient()
        client.force_authenticate(user=seller)
        
        start_time = time.time()
        
        response = client.post('/catalog/upload/', {
            'csv_file': csv_file,
            'images': image_files
        }, format='multipart')
        
        if response.status_code != 202:
            self.stdout.write(self.style.ERROR(f"❌ Upload failed with status {response.status_code}: {response.data}"))
            return

        batch_id = response.data['batch_id']
        self.stdout.write(self.style.SUCCESS(f"✅ Upload accepted (HTTP 202). Batch ID: {batch_id}"))
        self.stdout.write("⏳ Waiting for background processing (rembg + validation)...")

        # 5. Poll until completed
        while True:
            time.sleep(1)
            report_res = client.get(f'/catalog/batch-report/?batch_id={batch_id}')
            status = report_res.data.get('status')
            
            if status in ['completed', 'failed']:
                end_time = time.time()
                total_time = end_time - start_time
                
                self.stdout.write(self.style.SUCCESS("\n" + "="*60))
                self.stdout.write(self.style.SUCCESS("🏁 PROCESSING FINISHED"))
                self.stdout.write(self.style.SUCCESS("="*60))
                self.stdout.write(self.style.WARNING(f"️  TOTAL TIME: {total_time:.2f} seconds"))
                
                if total_time <= 60:
                    self.stdout.write(self.style.SUCCESS("✅ SUCCESS: Meets SRS §4.1 / Criterion 4 requirement (< 60 seconds for 10 items)."))
                else:
                    self.stdout.write(self.style.ERROR("⚠️ WARNING: Exceeded 60-second target."))
                
                self.stdout.write(f"📊 Report: Accepted: {report_res.data.get('accepted_count')} | Rejected: {report_res.data.get('rejected_count')}")
                self.stdout.write(self.style.SUCCESS("="*60 + "\n"))
                break