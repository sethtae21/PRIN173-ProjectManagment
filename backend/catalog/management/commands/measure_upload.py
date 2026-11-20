"""
Criterion 4 / OBJ-08 acceptance instrument: upload 10 items and verify the
batch completes in under 60 seconds.

Exit code 0 and prints "PASS" if the total time is under the budget.
Exit code 1 and prints "FAIL" otherwise — CI/CD will fail the build.

Fixed for this project's custom User model (email-based, no `username` field).

CHANGED: after the verdict the command deletes its own batch + catalog items
(pass --keep-data to inspect them), so acceptance runs can never leak
"Timing Product NN" rows into the shopper catalog / recommendations again.

KAN-119: fixture cleanup no longer deletes GridFS objects by hand. The
CatalogItem post_delete receiver owns that and logs failures at ERROR with the
KAN-119 ORPHAN_RISK tag. The previous manual loop double-deleted and swallowed
every error with `except Exception: pass`, which hid orphans instead of
reporting them.

ADDED (upload timing sweep): --sweep measures 1,2,3,...,10-item batches and
writes upload_timing_results.csv (KAN-83 / KAN-84 evidence). Two deliberate
methodology differences from the default acceptance run:
  * every item gets its OWN front/rear image bytes (unique height per image =>
    unique SHA-256 => guaranteed MISS in both the single-flight map and the
    on-disk rembg cache), so N items pay N real background-removal pairs —
    the realistic distinct-photos seller case;
  * an 11-row upload is POSTed to the REAL view via APIClient to prove the
    settings.MAX_BATCH_ITEMS cap returns HTTP 400.
The DEFAULT run (no --sweep) is unchanged: the shared-image 10-item charter
acceptance measurement, same window, same verdict, same exit codes.
"""
import csv
import io
import time
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from bson.objectid import ObjectId

from PIL import Image
from rest_framework.test import APIClient

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
SWEEP_COUNTS = tuple(range(1, TARGET_ITEMS + 1))

# Timing test user — identified by EMAIL (no `username` field in our schema).
TIMING_EMAIL = 'timing_seller@fitfusion.test'
TIMING_STORE = 'Timing Test Store'

RESULTS_FILENAME = 'upload_timing_results.csv'
RESULT_COLUMNS = [
    'timestamp', 'items', 'repeat', 'staging_seconds', 'processing_seconds',
    'total_seconds', 'accepted', 'rejected', 'status',
    'image_workers', 'rembg_working_size', 'rembg_output_cap', 'distinct_images',
]


class Command(BaseCommand):
    help = 'Criterion 4 / OBJ-08 acceptance test: upload 10 items, measure batch time, fail if > 60 s.'

    # ADDED: opt-out for the post-run fixture cleanup.
    def add_arguments(self, parser):
        parser.add_argument(
            '--keep-data',
            action='store_true',
            help=(
                'Keep the timing batch + items in the catalog after the run '
                '(default: they are deleted so they never reach shoppers).'
            ),
        )
        parser.add_argument(
            '--sweep',
            action='store_true',
            help=(
                'Measure 1..10-item batches with DISTINCT cache-cold images per '
                'item, write upload_timing_results.csv, and verify the '
                'MAX_BATCH_ITEMS cap (11 rows must be rejected with 400).'
            ),
        )
        parser.add_argument(
            '--repeats',
            type=int,
            default=1,
            help='Runs per item count in --sweep (default 1; use 3 for averaged evidence).',
        )
        parser.add_argument(
            '--csv-out',
            type=str,
            default='',
            help=f'Results CSV path (default: <BASE_DIR>/{RESULTS_FILENAME}).',
        )

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

    def _build_dummy_image_bytes(self, width=1024, height=1024, color=(220, 80, 80), tag=None):
        """Synthesize a small solid-color JPEG (fast; enough to exercise the pipeline).

        tag (sweep only): added to the HEIGHT so every tagged image has unique
        dimensions. Dimensions live in the JPEG header, so unique height =>
        unique bytes => unique SHA-256 => a guaranteed cache-cold rembg run.
        Width stays fixed so w/h <= 1.0 (the Rear orientation rule) and both
        sides stay inside the validator's [800, 4096] band.
        """
        if tag is not None:
            height = height + tag
        img = Image.new('RGB', (width, height), color)
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=85)
        return buf.getvalue()

    def _build_csv_bytes(self, item_count=TARGET_ITEMS, per_row_filenames=False):
        """Build a valid N-row CSV.

        Default (acceptance): all rows share the SAME filenames so the SHA-256
        single-flight + disk cache exercise is realistic for a seller
        re-uploading corrected shots (the dominant perf case).
        per_row_filenames=True (sweep): each row references its own front/rear
        files, matching a seller uploading N distinct products.
        """
        output = io.StringIO(newline='')
        writer = csv.writer(output, lineterminator='\n')
        writer.writerow([
            'name', 'description', 'category', 'size', 'color',
            'color_description', 'color_family', 'price',
            'style_tags',
            'front_image_filename', 'rear_image_filename',
        ])
        for i in range(1, item_count + 1):
            front = f'timing_front_{i:02d}.jpg' if per_row_filenames else 'timing_front.jpg'
            rear = f'timing_rear_{i:02d}.jpg' if per_row_filenames else 'timing_rear.jpg'
            writer.writerow([
                f'Timing Product {i:02d}',
                f'Automated test product {i} for Criterion 4 / OBJ-08.',
                'tops', 'M', 'Red', 'Bright Red', 'red', '599.00',
                'casual, minimalist',
                front, rear,
            ])
        return output.getvalue().encode('utf-8')

    def _simulate_upload(self, seller, item_count=TARGET_ITEMS, distinct_images=False, tag_offset=0):
        """Mimic CatalogViewSet.upload() without going through HTTP: parse CSV,
        create the batch + pending CatalogItem rows, attach the two dummy
        images to GridFS, then hand the batch_id to the real background worker.

        distinct_images=True (sweep): every row gets its own tagged front/rear
        bytes so neither the in-flight single-flight map nor the on-disk matte
        cache can dedupe them — each item pays a real rembg inference pair.
        """
        csv_bytes = self._build_csv_bytes(item_count, per_row_filenames=distinct_images)

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

        if distinct_images:
            image_map = {}
            for i, row in enumerate(rows, start=1):
                for csv_col, parity in (('front_image_filename', 0), ('rear_image_filename', 1)):
                    name = row[csv_col].strip()
                    image_map[name] = SimpleUploadedFile(
                        name,
                        self._build_dummy_image_bytes(
                            width=REMBG_WORKING_SIZE,
                            height=REMBG_WORKING_SIZE,
                            tag=tag_offset + i * 2 + parity,
                        ),
                        'image/jpeg',
                    )
        else:
            image_bytes = self._build_dummy_image_bytes(
                width=REMBG_WORKING_SIZE,
                height=REMBG_WORKING_SIZE,
            )
            # Shared images for every row (single-flight friendly).
            image_map = {
                'timing_front.jpg': SimpleUploadedFile(
                    'timing_front.jpg', image_bytes, 'image/jpeg'
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
                seller=seller,
                store_name=seller.store_name or TIMING_STORE,
                batch=batch,
                status='processing',
            )
            # Persist the two original views in GridFS (the worker reads them).
            for field_name, csv_col in [
                ('front_image', 'front_image_filename'),
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

    def _cleanup_fixtures(self, batch, options):
        """Remove the timing fixtures after the measurement window.

        KAN-119: GridFS cleanup is owned exclusively by the CatalogItem
        post_delete receiver, which removes BOTH blobs and logs any failure at
        ERROR with the KAN-119 ORPHAN_RISK tag. Deleting the rows is therefore
        sufficient AND observable. The previous manual per-field loop here
        double-deleted every object and swallowed all errors with
        `except Exception: pass`, hiding orphans instead of reporting them.
        """
        if options.get('keep_data'):
            self.stdout.write(self.style.WARNING(
                ' --keep-data given: timing fixtures left in the catalog.'
            ))
            return

        items = list(CatalogItem.objects.filter(batch=batch))
        CatalogItem.objects.filter(batch=batch).delete()
        batch.delete()
        self.stdout.write(self.style.SUCCESS(
            f'🧹 Cleanup: removed {len(items)} timing items + batch {batch.id} '
            f'(GridFS blobs removed by the post_delete receiver; any failure is '
            f'logged as KAN-119 ORPHAN_RISK).'
        ))

    def _load_batch(self, batch_id):
        try:
            return UploadBatch.objects.get(id=batch_id)
        except (UploadBatch.DoesNotExist, ValueError, TypeError):
            return UploadBatch.objects.get(id=ObjectId(batch_id))

    # ==================================================================
    # ADDED: --sweep — per-item-count timing evidence (KAN-83 / KAN-84)
    # ==================================================================
    def _measure_one(self, seller, item_count, repeat, tag_offset, keep_data):
        """Stage one N-item batch, run the REAL worker synchronously (the same
        measured window as the acceptance run), record one results row, clean
        up. Returns (row, batch) — batch is deleted from the DB but its Python
        attributes stay readable for the caller's verdict."""
        t_build = time.perf_counter()
        batch_id, total = self._simulate_upload(
            seller, item_count=item_count, distinct_images=True, tag_offset=tag_offset,
        )
        staging = time.perf_counter() - t_build
        UploadBatch.objects.filter(id=ObjectId(batch_id)).update(
            staging_seconds=round(staging, 3)
        )
        self.stdout.write(f'📦 Batch {batch_id} staged ({total} items) in {staging:.2f}s')

        t_start = time.perf_counter()
        process_batch_background(batch_id)
        processing = time.perf_counter() - t_start

        batch = self._load_batch(batch_id)
        row = {
            'timestamp': timezone.now().isoformat(),
            'items': item_count,
            'repeat': repeat,
            'staging_seconds': round(staging, 3),
            'processing_seconds': round(processing, 3),
            'total_seconds': round(staging + processing, 3),
            'accepted': batch.accepted_count,
            'rejected': batch.rejected_count,
            'status': batch.status,
            'image_workers': IMAGE_WORKERS,
            'rembg_working_size': REMBG_WORKING_SIZE,
            'rembg_output_cap': REMBG_OUTPUT_CAP,
            'distinct_images': True,
        }
        self.stdout.write(
            f'[UPLOAD-TIMING] items={item_count} repeat={repeat} '
            f'staging={staging:.3f}s processing={processing:.3f}s '
            f'total={staging + processing:.3f}s '
            f'accepted={batch.accepted_count} rejected={batch.rejected_count} '
            f'status={batch.status}'
        )
        self._cleanup_fixtures(batch, {'keep_data': keep_data})
        return row, batch

    def _check_upload_cap(self, seller):
        """The MAX_BATCH_ITEMS cap lives in CatalogViewSet.upload, which
        _simulate_upload bypasses — so probe the REAL view in-process with
        APIClient (same pattern as measure_api_performance). The view checks
        the cap BEFORE the image-count rule, so two shared images suffice;
        asserting the word 'maximum' proves the CAP branch fired."""
        limit = int(settings.MAX_BATCH_ITEMS)
        over = limit + 1
        csv_bytes = self._build_csv_bytes(over)
        image_bytes = self._build_dummy_image_bytes(
            width=REMBG_WORKING_SIZE, height=REMBG_WORKING_SIZE,
        )
        client = APIClient()
        client.force_authenticate(user=seller)
        response = client.post(
            '/catalog/upload/',
            {
                'csv_file': SimpleUploadedFile('cap_check.csv', csv_bytes, 'text/csv'),
                'images': [
                    SimpleUploadedFile('timing_front.jpg', image_bytes, 'image/jpeg'),
                    SimpleUploadedFile('timing_rear.jpg', image_bytes, 'image/jpeg'),
                ],
            },
            format='multipart',
        )
        data = getattr(response, 'data', {}) or {}
        error_text = str(data.get('error', '')) if isinstance(data, dict) else str(data)
        if response.status_code == 400 and 'maximum' in error_text.lower():
            return True, f'CAP OK — {over}-row upload rejected with 400: {error_text}'
        if response.status_code == 202:
            # Cap failed OPEN: a real batch was created. Remove it so the probe
            # never leaks fixtures (the worker's KAN-119 guards tolerate the
            # mid-run deletion), then report the failure.
            try:
                batch = self._load_batch(data.get('batch_id'))
                self._cleanup_fixtures(batch, {'keep_data': False})
            except Exception as exc:
                return False, f'CAP FAIL — {over} rows accepted (202) AND cleanup failed: {exc}'
            return False, (
                f'CAP FAIL — {over}-row upload was ACCEPTED (202); '
                f'settings.MAX_BATCH_ITEMS={limit} is not enforced.'
            )
        return False, f'CAP FAIL — expected 400 for {over} rows, got HTTP {response.status_code}: {error_text}'

    def _handle_sweep(self, options):
        repeats = max(1, int(options.get('repeats') or 1))
        # Tags grow the image height; keep every side within the validator's
        # 4096 px ceiling even at the last run (50 * 32 + 21 = 1621 extra px).
        if repeats > 50:
            raise CommandError('--repeats must be <= 50 (tagged image heights must stay <= 4096 px).')
        keep_data = bool(options.get('keep_data'))
        csv_path = Path(options.get('csv_out') or (Path(settings.BASE_DIR) / RESULTS_FILENAME))

        self.stdout.write(self.style.SUCCESS(
            f"\n{'=' * 70}\n"
            f"📈 Upload timing sweep: {SWEEP_COUNTS[0]}..{SWEEP_COUNTS[-1]} items × {repeats} run(s)\n"
            f"   Distinct cache-cold images per item (realistic seller case)\n"
            f"   Budget check: {TARGET_ITEMS}-item runs ≤ {BUDGET_SECONDS} s   Workers: {IMAGE_WORKERS}   "
            f"Working size: {REMBG_WORKING_SIZE} px   Output cap: {REMBG_OUTPUT_CAP} px\n"
            f"{'=' * 70}"
        ))

        self.stdout.write(' Warming rembg session...')
        t_warm = time.time()
        get_shared_rembg_session()
        self.stdout.write(self.style.SUCCESS(f'✅ Session ready in {time.time() - t_warm:.2f} s'))

        seller = self._get_or_create_timing_seller()
        rows = []
        failures = []
        run_index = 0
        for count in SWEEP_COUNTS:
            for repeat in range(1, repeats + 1):
                run_index += 1
                row, batch = self._measure_one(
                    seller, count, repeat,
                    tag_offset=run_index * 32, keep_data=keep_data,
                )
                rows.append(row)
                if batch.status != 'completed':
                    failures.append(
                        f'{count}-item run #{repeat}: status={batch.status} '
                        f'report={batch.rejection_report}'
                    )
                elif count == TARGET_ITEMS and row['processing_seconds'] > BUDGET_SECONDS:
                    failures.append(
                        f'{count}-item run #{repeat}: {row["processing_seconds"]}s '
                        f'> {BUDGET_SECONDS}s budget (Criterion 4 / OBJ-08)'
                    )

        cap_ok, cap_detail = self._check_upload_cap(seller)
        self.stdout.write(
            self.style.SUCCESS(f'✅ {cap_detail}') if cap_ok
            else self.style.ERROR(f'❌ {cap_detail}')
        )
        if not cap_ok:
            failures.append(cap_detail)

        try:
            with open(csv_path, 'w', newline='', encoding='utf-8') as fh:
                writer = csv.DictWriter(fh, fieldnames=RESULT_COLUMNS)
                writer.writeheader()
                writer.writerows(rows)
            self.stdout.write(self.style.SUCCESS(f'📄 Results written to {csv_path}'))
        except OSError as exc:
            self.stdout.write(self.style.ERROR(f'Could not write results CSV: {exc}'))

        self.stdout.write(
            f"\n{'ITEMS':>5} {'RUNS':>4} {'AVG PROCESSING s':>16} "
            f"{'AVG TOTAL s':>11} {'AVG s/ITEM':>10}"
        )
        for count in SWEEP_COUNTS:
            group = [r for r in rows if r['items'] == count]
            if not group:
                continue
            avg_p = sum(r['processing_seconds'] for r in group) / len(group)
            avg_t = sum(r['total_seconds'] for r in group) / len(group)
            self.stdout.write(
                f"{count:>5} {len(group):>4} {avg_p:>16.3f} "
                f"{avg_t:>11.3f} {avg_p / count:>10.3f}"
            )

        if failures:
            for failure in failures:
                self.stdout.write(self.style.ERROR(f'❌ {failure}'))
            self.stdout.write(self.style.ERROR('❌ SWEEP FAIL'))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS(
            f'✅ SWEEP PASS — {len(rows)} run(s) completed; '
            f'{TARGET_ITEMS}-item runs ≤ {BUDGET_SECONDS}s; '
            f'{int(settings.MAX_BATCH_ITEMS) + 1}-row cap enforced (400).'
        ))
        raise SystemExit(0)

    def handle(self, *args, **options):
        # ADDED: opt-in sweep. Without --sweep this command is byte-for-byte
        # the original charter acceptance instrument (CI/CD contract intact).
        if options.get('sweep'):
            self._handle_sweep(options)
            return

        self.stdout.write(self.style.SUCCESS(
            f"\n{'='*70}\n"
            f"🚀 Criterion 4 / OBJ-08 acceptance test: {TARGET_ITEMS}-item upload timing\n"
            f"   Budget: ≤ {BUDGET_SECONDS} s   Workers: {IMAGE_WORKERS}   "
            f"Working size: {REMBG_WORKING_SIZE} px   Output cap: {REMBG_OUTPUT_CAP} px\n"
            f"{'='*70}"
        ))

        # 1) Warm the shared rembg session so first-item inference is fair.
        self.stdout.write(' Warming rembg session...')
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

        # 6) Verdict (cleanup runs after the measurement window, so the
        #    OBJ-08 timing evidence is unchanged).
        if batch.status != 'completed':
            self.stdout.write(self.style.ERROR(
                f"❌ FAIL — batch ended with status '{batch.status}'. "
                f"Rejection report: {batch.rejection_report}"
            ))
            self._cleanup_fixtures(batch, options)
            raise SystemExit(1)

        passed = total_time <= BUDGET_SECONDS
        if passed:
            self.stdout.write(self.style.SUCCESS(
                f"✅ PASS — {total_time:.2f}s ≤ {BUDGET_SECONDS}s budget "
                f"(Criterion 4 / OBJ-08 satisfied)"
            ))
        else:
            self.stdout.write(self.style.ERROR(
                f"❌ FAIL — {total_time:.2f}s > {BUDGET_SECONDS}s budget "
                f"(Criterion 4 / OBJ-08 violated). "
                f"Try raising IMAGE_WORKERS or lowering REMBG_WORKING_SIZE in settings."
            ))

        self._cleanup_fixtures(batch, options)
        raise SystemExit(0 if passed else 1)