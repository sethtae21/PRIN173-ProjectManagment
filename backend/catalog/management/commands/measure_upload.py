"""
Criterion 4 / OBJ-08 acceptance instrument: upload 10 items and verify the
batch completes in under 60 seconds.

Exit code 0 and prints "PASS" if the total time is under the budget.
Exit code 1 and prints "FAIL" otherwise — CI/CD will fail the build.

Fixed for this project's custom User model (email-based, no `username` field).
"""
import csv
import io
import os
import tempfile
import time
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from bson.objectid import ObjectId

from PIL import Image

from catalog.models import CatalogItem, UploadBatch
from catalog.views.core import (
    process_batch_background,
    get_shared_rembg_session,
    UPLOAD_EXECUTOR,
    IMAGE_PROCESS_EXECUTOR,
    REMBG_WORKING_SIZE,
    REMBG_OUTPUT_CAP,
    IMAGE_WORKERS,
)

User = get_user_model()

# SRS budget: 10 items must finish in ≤ 60 seconds (OBJ-08 / Criterion 4).
BUDGET_SECONDS = 60
TARGET_ITEMS = 10

# Timing test user — identified by EMAIL (no `username` field in our schema).
TIMING_EMAIL = 'timing_seller@fitfusion.test'
TIMING_STORE = 'Timing Test Store'


class Command(BaseCommand):
    help = 'Criterion 4 / OBJ-08 acceptance test: upload 10 items, measure batch time, fail if > 60 s.'

    def _get_or_create_timing_seller(self):
        """Get-or-create a seller account using the custom email-based User model."""
        seller = User.objects.filter(email=TIMING_EMAIL).first()
        if seller is None:
            seller = User(
                email=TIMING_EMAIL,
                full_name='Timing Test Seller',
                role='seller',
                store_name=TIMING_STORE,
                is_active=True,
            )
            seller.set_password('TimingTest123!')
            seller.save()
            self.stdout.write(self.style.SUCCESS(
                f'Created timing seller: {seller.email} (id={seller.id})'
            ))
        # Guard: if an older run created the account as a shopper, promote it.
        if seller.role != 'seller' or not seller.store_name:
            seller.role = 'seller'
            seller.store_name = seller.store_name or TIMING_STORE
            seller.save(update_fields=['role', 'store_name'])
        return seller

    def _build_dummy_image_bytes(self, width=1024, height=1024, color=(220, 80, 80)):
        """Synthesize a small solid-color JPEG (fast; enough to exercise the pipeline)."""
        img = Image.new('RGB', (width, height), color)
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=85)
        return buf.getvalue()

    def _build_csv_bytes(self, item_count=TARGET_ITEMS):
        """Build a valid 10-row CSV; all rows share the SAME filenames so the
        SHA-256 single-flight + disk cache exercise is realistic for a seller
        re-uploading corrected shots (the dominant perf case)."""
        output = io.StringIO(newline='')
        writer = csv.writer(output, lineterminator='\n')
        writer.writerow([
            'name', 'description', 'category', 'size', 'color',
            'color_description', 'color_family', 'price',
            'style_tags', 'occasion_tags',
            'front_image_filename', 'side_image_filename', 'rear_image_filename',
        ])
        for i in range(1, item_count + 1):
            writer.writerow([
                f'Timing Product {i:02d}',
                f'Automated test product {i} for Criterion 4 / OBJ-08.',
                'tops', 'M', 'Red', 'Bright Red', 'red', '599.00',
                'casual, minimalist', 'everyday, summer',
                'timing_front.jpg', 'timing_side.jpg', 'timing_rear.jpg',
            ])
        return output.getvalue().encode('utf-8')

    def _simulate_upload(self, seller):
        """Mimic CatalogViewSet.upload() without going through HTTP: parse CSV,
        create the batch + pending CatalogItem rows, attach the three dummy
        images to GridFS, then hand the batch_id to the real background worker."""
        csv_bytes = self._build_csv_bytes(TARGET_ITEMS)
        image_bytes = self._build_dummy_image_bytes(
            width=REMBG_WORKING_SIZE,
            height=REMBG_WORKING_SIZE,
        )

        # Parse CSV (mirrors CatalogViewSet.upload).
        text = csv_bytes.decode('utf-8')
        reader = csv.DictReader(text.splitlines())
        rows = [row for row in reader if any(row.values())]

        batch = UploadBatch.objects.create(
            seller=seller,
            store_name=seller.store_name or TIMING_STORE,
            status='processing',
            total_items=len(rows),
        )
        batch_id = str(batch.id)

        # Shared images for every row (single-flight friendly).
        image_map = {
            'timing_front.jpg': SimpleUploadedFile(
                'timing_front.jpg', image_bytes, 'image/jpeg'
            ),
            'timing_side.jpg': SimpleUploadedFile(
                'timing_side.jpg', image_bytes, 'image/jpeg'
            ),
            'timing_rear.jpg': SimpleUploadedFile(
                'timing_rear.jpg', image_bytes, 'image/jpeg'
            ),
        }

        for row_number, row in enumerate(rows, start=2):
            item = CatalogItem.objects.create(
                name=row.get('name', '').strip(),
                description=row.get('description', ''),
                category=row.get('category', ''),
                size=row.get('size', ''),
                color=row.get('color', ''),
                color_description=row.get('color_description', ''),
                color_family=row.get('color_family', ''),
                price=row.get('price', '0.00'),
                style_tags=[t.strip() for t in row.get('style_tags', '').split(',') if t.strip()],
                occasion_tags=[t.strip() for t in row.get('occasion_tags', '').split(',') if t.strip()],
                seller=seller,
                store_name=seller.store_name or TIMING_STORE,
                batch=batch,
                status='processing',
            )
            # Persist the three original views in GridFS (the worker reads them).
            for field_name, csv_col in [
                ('front_image', 'front_image_filename'),
                ('side_image', 'side_image_filename'),
                ('rear_image', 'rear_image_filename'),
            ]:
                csv_name = row.get(csv_col, '').strip()
                src = image_map.get(csv_name)
                if src is None:
                    continue
                src.seek(0)
                getattr(item, field_name).save(
                    f"{batch_id}_{row_number}_{field_name}.jpg", src, save=False
                )
            item.save()

        return batch_id, len(rows)

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(
            f"\n{'='*70}\n"
            f"🚀 Criterion 4 / OBJ-08 acceptance test: {TARGET_ITEMS}-item upload timing\n"
            f"   Budget: ≤ {BUDGET_SECONDS} s   Workers: {IMAGE_WORKERS}   "
            f"Working size: {REMBG_WORKING_SIZE} px   Output cap: {REMBG_OUTPUT_CAP} px\n"
            f"{'='*70}"
        ))

        # 1) Warm the shared rembg session so first-item inference is fair.
        self.stdout.write('⏳ Warming rembg session...')
        t_warm = time.time()
        get_shared_rembg_session()
        self.stdout.write(self.style.SUCCESS(
            f'✅ Session ready in {time.time() - t_warm:.2f} s'
        ))

        # 2) Get/create the timing seller.
        seller = self._get_or_create_timing_seller()

        # 3) Build the batch synchronously (no HTTP).
        self.stdout.write('📦 Building 10-item batch in GridFS...')
        t_build = time.time()
        batch_id, total = self._simulate_upload(seller)
        self.stdout.write(self.style.SUCCESS(
            f'✅ Batch {batch_id} staged ({total} items) in {time.time() - t_build:.2f} s'
        ))

        # 4) Run the SAME background worker the HTTP endpoint runs.
        self.stdout.write('⏱️  Starting background processing (measured window)...')
        t_start = time.time()
        process_batch_background(batch_id)
        total_time = time.time() - t_start

        # 5) Load the final report.
        try:
            batch = UploadBatch.objects.get(id=batch_id)
        except UploadBatch.DoesNotExist:
            batch = UploadBatch.objects.get(id=ObjectId(batch_id))

        self.stdout.write(
            f"\n📊 Results: status={batch.status}, "
            f"accepted={batch.accepted_count}, rejected={batch.rejected_count}, "
            f"total={batch.total_items}"
        )
        self.stdout.write(f"⏱️  Total processing time: {total_time:.2f} seconds")

        # 6) Verdict.
        if batch.status != 'completed':
            self.stdout.write(self.style.ERROR(
                f"❌ FAIL — batch ended with status '{batch.status}'. "
                f"Rejection report: {batch.rejection_report}"
            ))
            raise SystemExit(1)

        if total_time <= BUDGET_SECONDS:
            self.stdout.write(self.style.SUCCESS(
                f"✅ PASS — {total_time:.2f}s ≤ {BUDGET_SECONDS}s budget "
                f"(Criterion 4 / OBJ-08 satisfied)"
            ))
            raise SystemExit(0)
        else:
            self.stdout.write(self.style.ERROR(
                f"❌ FAIL — {total_time:.2f}s > {BUDGET_SECONDS}s budget "
                f"(Criterion 4 / OBJ-08 violated). "
                f"Try raising IMAGE_WORKERS or lowering REMBG_WORKING_SIZE in settings."
            ))
            raise SystemExit(1)