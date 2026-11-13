"""
measure_gridfs_stability — KAN-119 acceptance criterion 4 instrument.

    "Atlas storage metric remains stable across N replace/delete cycles
     (no orphan growth)."

WHY LOGICAL BYTES, NOT storageSize
    WiredTiger does not return freed space to the OS after a delete, so Atlas's
    storageSize / db.stats().storageSize stays flat even when cleanup worked
    perfectly. Measuring it would produce a FALSE FAILURE. This command measures
    deterministic logical values instead:
        fs.files document count, fs.chunks document count,
        catalog-prefix file count, sum(fs.files.length) for catalog prefixes.

METHOD
    1. Snapshot the baseline.
    2. Create a throwaway seller + listing with BOTH views in real GridFS.
    3. N cycles: PATCH a replacement front image through the real endpoint and
       wait for the background worker to leave 'processing'.
    4. DELETE the listing through the real endpoint.
    5. Snapshot again and compare against the baseline.
    PASS iff every counter returns to its baseline value.

    The verdict does not depend on rembg accepting the probe image: whether the
    worker promotes or rejects it, the superseded blob is purged either way, so
    the counters must still return to baseline after the delete.

OPERATIONAL WARNING
    Run with the app quiesced. Concurrent uploads by teammates change the
    counters and will produce a false failure.

Usage:
    python manage.py measure_gridfs_stability
    python manage.py measure_gridfs_stability --cycles 5
    python manage.py measure_gridfs_stability --keep-data
"""
import io
import time

from django.core.management.base import BaseCommand
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from PIL import Image
from rest_framework.test import APIClient

from accounts.storage import gridfs_storage
from catalog.models import CatalogItem
from catalog.management.commands.sweep_orphan_gridfs import CATALOG_PREFIXES

User = get_user_model()

STABILITY_EMAIL = 'gridfs_stability@fitfusion.test'
STABILITY_STORE = 'GridFS Stability Store'
WORKER_TIMEOUT_SECONDS = 180


def snapshot(db):
    """Deterministic logical GridFS counters (never storageSize)."""
    docs = list(db['fs.files'].find({}))
    catalog_docs = [
        doc for doc in docs
        if str(doc.get('filename') or '').startswith(CATALOG_PREFIXES)
    ]
    return {
        'fs_files_total': len(docs),
        'fs_chunks_total': db['fs.chunks'].count_documents({}),
        'catalog_files': len(catalog_docs),
        'catalog_bytes': sum(int(doc.get('length') or 0) for doc in catalog_docs),
    }


class Command(BaseCommand):
    help = (
        "KAN-119 criterion 4: run N image-replace cycles then a listing delete "
        "against real GridFS and assert every logical counter returns to its "
        "baseline (no orphan growth). Uses logical bytes, NOT storageSize."
    )

    def add_arguments(self, parser):
        parser.add_argument('--cycles', type=int, default=3,
                            help='Number of replacement cycles (default 3).')
        parser.add_argument('--keep-data', action='store_true',
                            help='Leave the throwaway seller/listing behind for inspection.')

    def _png(self, color):
        image = Image.new('RGBA', (800, 800), color)
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        return buffer.getvalue()

    def _seller(self):
        seller = User.objects.filter(email=STABILITY_EMAIL).first()
        if seller is None:
            seller = User(email=STABILITY_EMAIL, full_name='GridFS Stability Seller',
                          role='seller', store_name=STABILITY_STORE, is_active=True)
            seller.set_password('StabilityTest123!')
            seller.save()
        elif seller.role != 'seller' or not seller.store_name:
            seller.role = 'seller'
            seller.store_name = seller.store_name or STABILITY_STORE
            seller.save(update_fields=['role', 'store_name'])
        return seller

    def _wait_for_worker(self, item_id):
        deadline = time.time() + WORKER_TIMEOUT_SECONDS
        while time.time() < deadline:
            row = CatalogItem.objects.filter(pk=item_id).first()
            if row is None:
                return 'deleted'
            if row.status != 'processing':
                return row.status
            time.sleep(1.0)
        return 'timeout'

    def _report(self, label, values):
        self.stdout.write(f"  {label}")
        for key, value in values.items():
            self.stdout.write(f"    {key:18} {value:,}")

    def handle(self, *args, **options):
        cycles = max(1, options['cycles'])
        keep_data = options['keep_data']

        gridfs_storage._require_fs()
        db = gridfs_storage._db

        self.stdout.write(self.style.SUCCESS(
            f"\n{'=' * 70}\n"
            f"KAN-119 criterion 4 — GridFS stability across {cycles} replace/delete cycle(s)\n"
            f"Metric: logical document counts + sum(fs.files.length). NOT storageSize.\n"
            f"{'=' * 70}"
        ))

        baseline = snapshot(db)
        self._report('BASELINE', baseline)

        seller = self._seller()
        client = APIClient()
        client.force_authenticate(user=seller)

        item = None
        failure = None
        try:
            item = CatalogItem.objects.create(
                name='GridFS Stability Probe', description='KAN-119 criterion 4 probe',
                category='tops', size='M', color='White', color_description='white',
                color_family='neutral', price='1.00', seller=seller,
                store_name=STABILITY_STORE, status='active',
            )
            item.front_image.save(
                f'{item.id}_front.png',
                SimpleUploadedFile('f.png', self._png((255, 255, 255, 128)), 'image/png'),
                save=False,
            )
            item.rear_image.save(
                f'{item.id}_rear.png',
                SimpleUploadedFile('r.png', self._png((255, 255, 255, 128)), 'image/png'),
                save=True,
            )
            item.refresh_from_db()
            self.stdout.write(self.style.SUCCESS(f"\nProbe listing created: {item.pk}"))

            url = f'/catalog/my-listings/{item.pk}/'
            for cycle in range(1, cycles + 1):
                payload = self._png((255, 255, 255, 128))
                response = client.patch(
                    url,
                    {'front_image': SimpleUploadedFile(f'cycle{cycle}.png', payload, 'image/png')},
                    format='multipart',
                )
                if response.status_code != 200:
                    failure = f'cycle {cycle}: PATCH returned {response.status_code} {response.data}'
                    break
                verdict = self._wait_for_worker(item.pk)
                after = snapshot(db)
                self.stdout.write(
                    f"  cycle {cycle}: worker={verdict}  "
                    f"catalog_files={after['catalog_files']}  "
                    f"catalog_bytes={after['catalog_bytes']:,}"
                )
                if verdict == 'timeout':
                    failure = f'cycle {cycle}: worker did not finish within {WORKER_TIMEOUT_SECONDS}s'
                    break

            if failure is None:
                response = client.delete(url)
                if response.status_code != 204:
                    failure = f'DELETE returned {response.status_code} {getattr(response, "data", None)}'
                else:
                    self.stdout.write(self.style.SUCCESS("\nProbe listing deleted (HTTP 204)."))
                    item = None
        except Exception as exc:  # noqa: BLE001
            failure = f'{type(exc).__name__}: {exc}'
        finally:
            if item is not None and not keep_data:
                try:
                    CatalogItem.objects.filter(pk=item.pk).delete()
                except Exception:  # noqa: BLE001
                    self.stderr.write(self.style.WARNING(
                        'Could not remove the probe listing; delete it manually.'))
            if not keep_data:
                try:
                    User.objects.filter(email=STABILITY_EMAIL).delete()
                except Exception:  # noqa: BLE001
                    pass

        final = snapshot(db)
        self.stdout.write("")
        self._report('FINAL', final)

        deltas = {key: final[key] - baseline[key] for key in baseline}
        self.stdout.write("\n  DELTA (final - baseline)")
        for key, value in deltas.items():
            self.stdout.write(f"    {key:18} {value:+,}")

        if failure:
            self.stderr.write(self.style.ERROR(f"\nFAIL — {failure}"))
            raise SystemExit(1)

        if all(value == 0 for value in deltas.values()):
            self.stdout.write(self.style.SUCCESS(
                "\nPASS — every logical counter returned to baseline. "
                "No orphan growth across the replace/delete cycles "
                "(KAN-119 criterion 4)."
            ))
            raise SystemExit(0)

        self.stderr.write(self.style.ERROR(
            "\nFAIL — orphan growth detected. Run "
            "`python manage.py sweep_orphan_gridfs` to see the surviving objects."
        ))
        raise SystemExit(1)