import csv
import colorsys
import hashlib
import io
import os
import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.core.files.base import ContentFile
from rest_framework import status, viewsets, parsers, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from accounts.permissions import IsSeller
from accounts.storage import gridfs_storage
from PIL import Image
from rembg import new_session, remove
from bson.objectid import ObjectId
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from catalog.models import CatalogItem, UploadBatch
from ..color_palette_config import get_palette_tags, COLOR_PALETTE_MAPPING
from catalog.serializers import CatalogItemSerializer, UploadBatchSerializer, CSVUploadSerializer
from recommendations.knowledge_table import validate_size_label
from catalog.color_rules import alignment_result, suggest_declared_color

logger = logging.getLogger(__name__)

UPLOAD_EXECUTOR = ThreadPoolExecutor(max_workers=settings.MAX_WORKERS)

REMBG_WORKING_SIZE = int(getattr(settings, 'REMBG_WORKING_SIZE', 1024))
REMBG_OUTPUT_CAP = int(getattr(settings, 'REMBG_OUTPUT_CAP', 1600))
IMAGE_WORKERS = int(getattr(settings, 'IMAGE_WORKERS', max(2, min(6, (os.cpu_count() or 4)))))
REMBG_CACHE_DIR = Path(getattr(settings, 'REMBG_CACHE_DIR', Path(settings.BASE_DIR) / 'rembg_cache'))
IMAGE_PROCESS_EXECUTOR = ThreadPoolExecutor(max_workers=IMAGE_WORKERS)

_REMBG_SESSION = None
_REMBG_SESSION_LOCK = threading.Lock()
MATTE_PIPELINE_VERSION = "v6-solid-aware-rescue"
TIGHTEN_SOLID = 96
FAINT_ALPHA_CEILING = 200
MIN_GARMENT_COVERAGE = 0.005


def _matte_cache_digest(original: bytes) -> str:
    return hashlib.sha256(MATTE_PIPELINE_VERSION.encode("utf-8") + original).hexdigest()


def get_shared_rembg_session():
    global _REMBG_SESSION
    if _REMBG_SESSION is not None:
        return _REMBG_SESSION
    with _REMBG_SESSION_LOCK:
        if _REMBG_SESSION is None:
            _REMBG_SESSION = new_session(settings.REMBG_MODEL)
    return _REMBG_SESSION


def warm_rembg_session():
    try:
        get_shared_rembg_session()
        logger.info("rembg session warmed (%s).", settings.REMBG_MODEL)
    except Exception as exc:
        logger.warning("rembg warmup deferred: %s", exc)


def _ensure_cache_dir() -> bool:
    try:
        REMBG_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        return True
    except Exception:
        return False


def _jpeg_working_copy(image_bytes, max_side):
    with Image.open(io.BytesIO(image_bytes)) as src:
        orig_w, orig_h = src.size
        if src.mode != 'RGB':
            src = src.convert('RGB')
        scale = min(1.0, float(max_side) / max(orig_w, orig_h))
        if scale < 1.0:
            src = src.resize((max(1, int(round(orig_w * scale))), max(1, int(round(orig_h * scale)))), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        src.save(buf, format='JPEG', quality=92)
        return buf.getvalue(), (orig_w, orig_h)


def _rescue_faint_alpha(img):
    alpha = img.getchannel('A')
    hist = alpha.histogram()
    total = img.width * img.height
    non_zero = sum(hist[1:])
    if non_zero == 0 or hist[0] == 0:
        return img, False
    solid_px = sum(hist[TIGHTEN_SOLID + 1:])
    if total and (solid_px / total) >= MIN_GARMENT_COVERAGE:
        return img, False
    target = max(1, (non_zero + 1) // 2)
    cum = 0
    median = 255
    for a in range(255, 0, -1):
        cum += hist[a]
        if cum >= target:
            median = a
            break
    if median >= FAINT_ALPHA_CEILING:
        return img, False
    gain = 255.0 / max(1, median)
    lut = [0] + [min(255, int(round(a * gain))) for a in range(1, 256)]
    img.putalpha(alpha.point(lut))
    return img, True


STYLE_TAG_OPTIONS = ('casual', 'smart', 'formal', 'sporty')
CATALOG_CSV_COLUMNS = [
    'name', 'description', 'category', 'size', 'color', 'color_description',
    'color_family', 'price', 'style_tags', 'front_image_filename', 'rear_image_filename',
]
CATALOG_EXAMPLE_ROW = [
    'Example Product', 'Replace with a product description.', 'tops', 'M',
    'White', 'Pure White', 'neutral', '599.00', 'casual', 'front.jpg', 'rear.jpg',
]
SELLER_IMAGE_GUIDELINES = (
    'FitFusion AI Seller Catalog Upload Guidelines\n'
    f'Use only these style_tags: {", ".join(STYLE_TAG_OPTIONS)}. '
    'Separate multiple tags with commas; tags are validated without regard to capitalization.\n'
    'Upload exactly two clear garment photographs per item: Front and Rear. '
    'Photograph the garment laid flat or on a mannequin against a plain, contrasting background.\n'
    'Each image must be at least 800 x 800 pixels and no larger than 5 MB. '
    'Use static JPG, PNG, or WEBP images; animated images are not accepted.\n'
    'Enter each uploaded filename in the matching CSV view column. The spelling must match; '
    'the file extension may differ when the base filename is the same.\n'
    'Declare the garment color accurately. The backend removes the background and checks '
    'the front image color automatically; you do not need to remove the background yourself.\n'
    'The Rear view must show the garment worn on a mannequin or hanging, photographed '
    'vertically (portrait orientation). Flat-lay photos rotated sideways are rejected automatically.\n'
    'SIZE RULE: clothing sizes are S, M, L, XL, 2XL, 3XL, or 4XL ONLY - cm measurements '
    '(e.g., "96 cm") and non-standard labels (e.g., XS, XXL) are rejected automatically. '
    'The product page displays the cm range bracket for standard sizes on its own.\n'
    'Supported categories: tops, bottoms, dresses, outerwear.\n'
)


def build_catalog_template_csv():
    output = io.StringIO(newline='')
    writer = csv.writer(output, lineterminator='\n')
    writer.writerow([
        (
            '📝 HOW TO UPLOAD: Replace the example row with your product details and matching Front and Rear image filenames. '
            f'Use style_tags from: {", ".join(STYLE_TAG_OPTIONS)}. '
            'Separate multiple tags with commas. '
            'SIZE RULE: clothing sizes are S, M, L, XL, 2XL, 3XL, or 4XL ONLY - cm measurements are rejected; '
            'the product page shows the cm range bracket automatically.'
        ),
        *([''] * (len(CATALOG_CSV_COLUMNS) - 1)),
    ])
    writer.writerow([])
    writer.writerow(CATALOG_CSV_COLUMNS)
    writer.writerow(CATALOG_EXAMPLE_ROW)
    return output.getvalue()


class CatalogValidator:
    MIN_IMAGE_DIMENSION = 800
    MAX_IMAGE_DIMENSION = 4096
    MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
    ALLOWED_FORMATS = ['JPEG', 'JPG', 'PNG', 'WEBP']
    REQUIRED_FIELDS = [
        'name', 'description', 'category', 'size', 'color',
        'color_description', 'color_family', 'price',
        'front_image_filename', 'rear_image_filename'
    ]
    TAG_OPTIONS = {'style_tags': frozenset(STYLE_TAG_OPTIONS)}
    ORIENTATION_MAX_W_H = 1.0
    ORIENTATION_CHECKED_VIEWS = ('Rear',)

    def validate_csv_row(self, row, row_number):
        errors = []
        for field in self.REQUIRED_FIELDS:
            if field not in row or not str(row[field]).strip():
                errors.append(f"Row {row_number}: Missing required field '{field}'")
        if row.get('price'):
            try:
                price = Decimal(str(row['price']))
                if not price.is_finite() or price <= 0:
                    errors.append(f"Row {row_number}: Price must be positive")
            except (InvalidOperation, ValueError):
                errors.append(f"Row {row_number}: Invalid price format")
        valid_categories = ['tops', 'bottoms', 'dresses', 'outerwear']
        category = str(row.get('category', '')).strip().lower()
        if category == 'dresses/one-piece':
            category = 'dresses'
        if category and category not in valid_categories:
            errors.append(f"Row {row_number}: Invalid category '{row['category']}'")
        size_valid, size_error = validate_size_label(row.get('size', ''), category)
        if not size_valid:
            errors.append(f"Row {row_number}: {size_error}")
        for field, allowed_tags in self.TAG_OPTIONS.items():
            submitted_tags = [tag.strip() for tag in str(row.get(field, '')).split(',') if tag.strip()]
            invalid_tags = [tag for tag in submitted_tags if tag.casefold() not in allowed_tags]
            if invalid_tags:
                choices = ', '.join(sorted(allowed_tags))
                errors.append(f"Row {row_number}: Invalid {field} value(s): {', '.join(invalid_tags)}. Choose from: {choices}.")
        return len(errors) == 0, errors

    def validate_image_format(self, image_file):
        try:
            image_file.seek(0)
            with Image.open(image_file) as img:
                format_upper = img.format.upper() if img.format else ''
                if format_upper == 'GIF':
                    return False, "GIF files are not allowed. Please use static images only."
                if format_upper not in self.ALLOWED_FORMATS:
                    return False, f"Unsupported format: {format_upper}. Only JPG, PNG, and WEBP are allowed."
                if format_upper in ['PNG', 'WEBP']:
                    try:
                        img.seek(1)
                        return False, f"Animated {format_upper} files are not allowed."
                    except EOFError:
                        pass
                return True, None
        except Exception as e:
            return False, f"Invalid or corrupted image: {str(e)}"

    def check_image_dimensions(self, image_file):
        try:
            image_file.seek(0)
            with Image.open(image_file) as img:
                width, height = img.size
                if width < self.MIN_IMAGE_DIMENSION or height < self.MIN_IMAGE_DIMENSION:
                    return False, f"Image too small ({width}x{height}). Minimum is {self.MIN_IMAGE_DIMENSION}x{self.MIN_IMAGE_DIMENSION}."
                return True, None
        except Exception as e:
            return False, f"Invalid or corrupted image: {str(e)}"

    def check_garment_orientation(self, image_bytes, view_label, category=''):
        if view_label not in self.ORIENTATION_CHECKED_VIEWS:
            return True, None
        try:
            image_bytes.seek(0)
            img = Image.open(image_bytes)
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            alpha = img.split()[3]
            bbox = alpha.getbbox()
            if not bbox:
                return False, f"{view_label}: no garment detected in the transparent PNG."
            width = bbox[2] - bbox[0]
            height = bbox[3] - bbox[1]
            if height <= 0:
                return False, f"{view_label}: invalid garment bounding box."
            ratio = width / height
            if ratio > self.ORIENTATION_MAX_W_H:
                return False, (
                    f"{view_label}: image looks like a flat-lay or rotated photo "
                    f"(garment wider than tall, w/h={ratio:.2f}). Upload a true "
                    f"{view_label.lower()} view: garment worn on a mannequin or hanging, "
                    f"photographed vertically (portrait orientation)."
                )
            return True, None
        except Exception as e:
            return False, f"{view_label}: orientation check failed: {str(e)}"

    def process_image_with_rembg(self, image_file, session=None):
        try:
            image_file.seek(0)
            original = image_file.read()
            digest = _matte_cache_digest(original)
            cache_path = REMBG_CACHE_DIR / f"{digest}.png"
            if cache_path.exists():
                try:
                    payload = cache_path.read_bytes()
                    if payload:
                        hit = io.BytesIO(payload)
                        hit.seek(0)
                        return hit
                except Exception:
                    pass
            orig_dims = None
            try:
                working, orig_dims = _jpeg_working_copy(original, REMBG_WORKING_SIZE)
            except Exception:
                working = original
            if session is not None:
                output = remove(working, session=session)
            else:
                output = remove(working, session=get_shared_rembg_session())
            img = Image.open(io.BytesIO(output))
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            alpha_channel = img.split()[3]
            alpha_min, alpha_max = alpha_channel.getextrema()
            if alpha_min == 255 or alpha_max == 0:
                raise ValueError("Background removal did not produce a valid transparent image.")
            img, rescued = _rescue_faint_alpha(img)
            if rescued:
                logger.info("Faint rembg matte rescued (alpha normalized) during upload.")
            hist = img.getchannel('A').histogram()
            total_px = img.width * img.height
            solid_px = sum(hist[25:])
            if total_px and (solid_px / total_px) < MIN_GARMENT_COVERAGE:
                raise ValueError(
                    "Background removal did not produce a valid transparent image: "
                    "no coherent garment detected. Re-photograph the garment against "
                    "a plain, contrasting background and re-upload."
                )
            if orig_dims:
                target_side = max(self.MIN_IMAGE_DIMENSION, min(max(orig_dims), REMBG_OUTPUT_CAP))
            else:
                target_side = max(self.MIN_IMAGE_DIMENSION, min(max(img.size), REMBG_OUTPUT_CAP))
            current_side = max(img.size)
            if current_side != target_side:
                ratio = target_side / float(current_side)
                img = img.resize((max(1, int(round(img.width * ratio))), max(1, int(round(img.height * ratio)))), Image.Resampling.LANCZOS)
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG', compress_level=1)
            payload = img_byte_arr.getvalue()
            if _ensure_cache_dir():
                try:
                    cache_path.write_bytes(payload)
                except Exception:
                    pass
            out = io.BytesIO(payload)
            out.seek(0)
            return out
        except Exception as e:
            raise Exception(f"Background removal failed: {str(e)}")

    def extract_dominant_color(self, image_bytes):
        try:
            img = Image.open(image_bytes)
            if img.mode == 'RGBA':
                bbox = img.getbbox()
                if bbox:
                    img = img.crop(bbox)
            img = img.resize((150, 150), Image.Resampling.LANCZOS)
            colors = img.getcolors(150 * 150)
            sorted_colors = sorted(colors, key=lambda x: x[0], reverse=True)
            for count, color in sorted_colors:
                if len(color) == 4 and color[3] < 128:
                    continue
                if len(color) >= 3:
                    r, g, b = color[:3]
                    return f"#{r:02x}{g:02x}{b:02x}"
            return "#000000"
        except Exception:
            return "#000000"

    def validate_color_alignment(self, declared_color, dominant_hex):
        return alignment_result(declared_color, dominant_hex)

    def suggest_declared_color(self, dominant_hex):
        return suggest_declared_color(dominant_hex)

    def generate_color_palette_tags(self, dominant_hex, color_family):
        return get_palette_tags(color_family)


# ============================================================================
# KAN-119 — cleanup + commit primitives shared by both background pipelines
# and the seller edit route.
# ============================================================================
ORPHAN_LOG_TAG = "KAN-119 ORPHAN_RISK"


def _purge_gridfs(storage, name, *, item_id=None):
    """Delete one stored object and report the outcome truthfully.

    GridFSStorage.delete() already treats an absent file as a harmless no-op
    and RAISES when the bucket is unreachable. We must not convert that raise
    into a silent 'clean' result: log it at ERROR with enough detail to find
    and sweep the orphan later. Returns True only when the object is gone.
    """
    if not name:
        return True
    try:
        storage.delete(name)
        return True
    except Exception as exc:
        logger.error("%s item=%s name=%s error=%s", ORPHAN_LOG_TAG, item_id, name, exc)
        return False


def _discard_written(names, item_id):
    """Remove objects this request/worker just wrote (compensation).

    Only ever pass names that are NOT referenced by the persisted row.
    """
    for field_name, name in names.items():
        _purge_gridfs(CatalogItem._meta.get_field(field_name).storage, name, item_id=item_id)


def _commit_item(item_id, **fields):
    """Write worker results WITHOUT resurrecting a deleted listing.

    Model.save() falls back to INSERT when its UPDATE matches zero rows, which
    is exactly how a listing deleted mid-pipeline came back to life.
    queryset.update() never inserts. It also bypasses auto_now, so updated_at
    is stamped explicitly - that additionally guarantees a real modification,
    making the return value a reliable 'the row was still there' signal.

    IMPORTANT: callers MUST pass every field they changed, including image
    names written with FieldFile.save(save=False). Those live only on the
    Python instance; omitting them here would orphan the new objects.
    """
    fields['updated_at'] = timezone.now()
    return CatalogItem.objects.filter(id=item_id).update(**fields) > 0


def process_batch_background(batch_id):
    start_time = time.time()
    deferred_deletes = []
    try:
        time.sleep(0.5)
        try:
            batch = UploadBatch.objects.get(id=batch_id)
        except (UploadBatch.DoesNotExist, ValueError, TypeError):
            batch = UploadBatch.objects.get(id=ObjectId(batch_id))
        batch.status = 'processing'
        batch.save()
        validator = CatalogValidator()
        rembg_session = get_shared_rembg_session()
        accepted_count = 0
        rejected_count = 0
        rejection_report = {}
        items = list(CatalogItem.objects.filter(batch=batch))
        total_items = len(items)
        inflight = {}
        inflight_lock = threading.Lock()

        def _image_pipeline(item, field_name, view_label):
            result = {'view': view_label, 'field': field_name, 'bytes': None,
                      'color': None, 'name': None, 'errors': []}
            img_field = getattr(item, field_name, None)
            original_name = getattr(img_field, 'name', None)
            if not img_field or not original_name:
                return result
            try:
                img_field.seek(0)
                original = img_field.read()
            except Exception as e:
                result['errors'].append(f"{view_label} read failed: {e}")
                return result
            digest = _matte_cache_digest(original)
            with inflight_lock:
                entry = inflight.get(digest)
                owner = entry is None
                if owner:
                    entry = {'event': threading.Event(), 'payload': None, 'error': None}
                    inflight[digest] = entry
            if owner:
                try:
                    buf = validator.process_image_with_rembg(io.BytesIO(original), rembg_session)
                    entry['payload'] = buf.getvalue()
                except Exception as e:
                    entry['error'] = e
                finally:
                    entry['event'].set()
            else:
                entry['event'].wait(timeout=600)
            if entry['error'] is not None:
                result['errors'].append(f"{view_label} processing failed: {entry['error']}")
                return result
            payload = entry['payload']
            result['bytes'] = payload
            if field_name == 'front_image':
                front_color = validator.extract_dominant_color(io.BytesIO(payload))
                result['color'] = front_color
                color_valid, color_msg = validator.validate_color_alignment(item.color, front_color)
                if not color_valid:
                    result['errors'].append(color_msg)
            else:
                orient_valid, orient_msg = validator.check_garment_orientation(io.BytesIO(payload), view_label, category=item.category)
                if not orient_valid:
                    result['errors'].append(orient_msg)
            try:
                processed_file = ContentFile(payload, name=f"{item.id}_{field_name}.png")
                image_field = getattr(item, field_name)
                image_field.save(processed_file.name, processed_file, save=False)
                # KAN-119: the batch commit uses queryset.update(), which cannot
                # see save=False instance changes. Carry the new stored name out
                # of this thread or the processed object becomes an orphan.
                result['name'] = image_field.name
                # KAN-119: carry the listing id so a failed deferred purge is
                # attributable instead of logging item=None.
                deferred_deletes.append((item.id, image_field, original_name))
            except Exception as e:
                result['errors'].append(f"{view_label} storage failed: {e}")
            return result

        futures = {}
        for item in items:
            if item.status == 'rejected':
                continue
            for field_name, view_label in [('front_image', 'Front'), ('rear_image', 'Rear')]:
                futures[(str(item.id), field_name)] = IMAGE_PROCESS_EXECUTOR.submit(_image_pipeline, item, field_name, view_label)

        for i, item in enumerate(items, 1):
            if item.status == 'rejected':
                rejected_count += 1
                rejection_report[str(item.id)] = item.rejection_reasons or ['Rejected at upload']
                continue
            item_errors = []
            front_color = "#000000"
            written = {}
            missing_assets = [
                view_label
                for field_name, view_label in (('front_image', 'Front'), ('rear_image', 'Rear'))
                if (str(item.id), field_name) not in futures
                and not getattr(getattr(item, field_name, None), 'name', None)
            ]
            if missing_assets:
                item_errors.append(
                    f"Missing stored image assets: {', '.join(missing_assets)}. "
                    "The original upload did not persist the images; re-upload this listing."
                )
            for field_name, view_label in [('front_image', 'Front'), ('rear_image', 'Rear')]:
                future = futures.get((str(item.id), field_name))
                if future is None:
                    continue
                try:
                    res = future.result()
                    item_errors.extend(res['errors'])
                    if res['color']:
                        front_color = res['color']
                    if res.get('name'):
                        written[res['field']] = res['name']
                except Exception as e:
                    item_errors.append(f"{view_label} processing failed: {e}")
            if item_errors:
                rejection_report[str(item.id)] = item_errors
                fields = {'status': 'rejected', 'rejection_reasons': item_errors}
                rejected_count += 1
            else:
                fields = {
                    'status': 'active',
                    'compatible_color_palette_tags': validator.generate_color_palette_tags(front_color, item.color_family),
                }
                accepted_count += 1
            fields.update(written)

            # KAN-119: a seller may delete a listing while the batch runs.
            # item.save() would re-INSERT the deleted row; _commit_item cannot.
            # Counters and rejection_report are intentionally left unchanged so
            # the batch report math and the frontend contract stay identical.
            if not _commit_item(item.id, **fields):
                if not CatalogItem.objects.filter(id=item.id).exists():
                    _discard_written(written, item.id)
        batch.accepted_count = accepted_count
        batch.rejected_count = rejected_count
        batch.rejection_report = rejection_report
        batch.status = 'completed'
        batch.completed_at = timezone.now()
        batch.save()
    except Exception as e:
        try:
            batch = UploadBatch.objects.get(id=batch_id)
            batch.status = 'failed'
            batch.rejection_report = {'error': str(e)}
            batch.save()
        except UploadBatch.DoesNotExist:
            pass
    finally:
        # KAN-119: a failed deferred delete must be attributable, not a warning
        # that leaves the batch looking clean while the object still exists.
        for deferred_item_id, image_field, original_name in deferred_deletes:
            _purge_gridfs(image_field.storage, original_name, item_id=deferred_item_id)


def _is_pipeline_matte(image_bytes: bytes) -> bool:
    """True when the stored image already went through rembg (real transparency).

    Re-matting a matte fails inside process_image_with_rembg: the RGBA->RGB
    working copy flattens transparency to a black background, rembg returns a
    fully opaque image, and the alpha-extrema guard raises ("Background removal
    did not produce a valid transparent image"). Detect mattes and skip
    straight to the semantic checks (color / orientation).
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            if img.mode != 'RGBA':
                return False
            hist = img.getchannel('A').histogram()
            total = img.width * img.height or 1
            return hist[0] / total >= 0.05 and sum(hist[25:]) / total >= 0.05
    except Exception:
        return False


def process_single_item_background(item_id):
    """Re-run the full validation pipeline for a single edited listing.

    GOAL 1: an edited/re-uploaded item must stay 'processing' until this
    pipeline passes. It ends 'active' only if every check succeeds, otherwise
    'rejected'. It never flips an item to 'active' as a shortcut.

    KAN-119: the seller may DELETE the listing while this runs. Every write is
    therefore guarded, and the final commit can never re-insert a deleted row.

    Matte-aware: images stored by a prior pipeline run are already transparent
    PNGs. Feeding them through rembg again fails the alpha-extrema guard, so
    mattes skip background removal and go straight to color/orientation checks.
    Only RAW replacement photos are matted here.
    """
    try:
        item = CatalogItem.objects.get(id=item_id)
    except CatalogItem.DoesNotExist:
        return
    if item.status != 'processing':
        return
    validator = CatalogValidator()
    rembg_session = None  # lazy: only load rembg when a RAW photo actually needs matting
    item_errors = []
    front_color = None
    written_names = {}
    for field_name, view_label in [('front_image', 'Front'), ('rear_image', 'Rear')]:
        img_field = getattr(item, field_name, None)
        original_name = getattr(img_field, 'name', None) if img_field else None
        if not img_field or not original_name:
            item_errors.append(
                f"Missing stored image asset: {view_label}. "
                "The original upload did not persist this image; re-upload this listing."
            )
            continue
        try:
            img_field.seek(0)
            original = img_field.read()
        except Exception as e:
            item_errors.append(f"{view_label} read failed: {e}")
            continue
        try:
            if _is_pipeline_matte(original):
                payload = original  # already matted by a prior run: do NOT re-run rembg
            else:
                if rembg_session is None:
                    rembg_session = get_shared_rembg_session()
                payload = validator.process_image_with_rembg(io.BytesIO(original), rembg_session).getvalue()
        except Exception as e:
            item_errors.append(f"{view_label} background removal failed: {e}")
            continue
        if field_name == 'front_image':
            front_color = validator.extract_dominant_color(io.BytesIO(payload))
            color_valid, color_msg = validator.validate_color_alignment(item.color, front_color)
            if not color_valid:
                item_errors.append(color_msg)
        else:
            orient_valid, orient_msg = validator.check_garment_orientation(io.BytesIO(payload), view_label, category=item.category)
            if not orient_valid:
                item_errors.append(orient_msg)
        if payload is not original:
            try:
                # Deleted while we were processing: stop before creating orphans.
                if not CatalogItem.objects.filter(id=item_id).exists():
                    _discard_written(written_names, item_id)
                    return
                processed_file = ContentFile(payload, name=f"{item.id}_{field_name}.png")
                img_field.save(processed_file.name, processed_file, save=False)
                written_names[field_name] = img_field.name
                if original_name and original_name != img_field.name:
                    _purge_gridfs(img_field.storage, original_name, item_id=item_id)
            except Exception as e:
                item_errors.append(f"{view_label} storage failed: {e}")

    fields = {}
    if item_errors:
        fields['status'] = 'rejected'
        fields['rejection_reasons'] = item_errors
    else:
        if front_color:
            fields['compatible_color_palette_tags'] = validator.generate_color_palette_tags(front_color, item.color_family)
        fields['status'] = 'active'
        fields['rejection_reasons'] = []
    fields.update(written_names)

    if not _commit_item(item_id, **fields):
        # Zero rows matched: the listing is gone. Drop what we just wrote.
        if not CatalogItem.objects.filter(id=item_id).exists():
            _discard_written(written_names, item_id)
        return
    # Deleted in the window between our commit and here: the post_delete signal
    # may have seen the OLD refs, so the NEW ones are ours to remove.
    if not CatalogItem.objects.filter(id=item_id).exists():
        _discard_written(written_names, item_id)


class CatalogViewSet(viewsets.ModelViewSet):
    queryset = CatalogItem.objects.filter(status='active')
    serializer_class = CatalogItemSerializer
    permission_classes = [IsSeller]

    def get_queryset(self):
        queryset = CatalogItem.objects.filter(status='active')
        if category := self.request.query_params.get('category'):
            queryset = queryset.filter(category=category)
        if color := self.request.query_params.get('color'):
            queryset = queryset.filter(color_family__iexact=color)
        if size := self.request.query_params.get('size'):
            queryset = queryset.filter(size__icontains=size)
        if store := self.request.query_params.get('store'):
            queryset = queryset.filter(store_name__icontains=store)
        if style := self.request.query_params.get('style'):
            style_query = style.strip().casefold()
            queryset = [
                item for item in queryset
                if isinstance(item.style_tags, list)
                and any(style_query in str(tag).casefold() for tag in item.style_tags)
            ]
        return queryset

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='download-template')
    def download_template(self, request):
        csv_content = build_catalog_template_csv()
        response = HttpResponse(csv_content, content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="catalog_products.csv"'
        return response

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='download-package')
    def download_package(self, request):
        archive = io.BytesIO()
        with ZipFile(archive, 'w', compression=ZIP_DEFLATED) as package:
            package.writestr('catalog_products.csv', build_catalog_template_csv())
            package.writestr('seller_image_guidelines.txt', SELLER_IMAGE_GUIDELINES)
        response = HttpResponse(archive.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="fitfusion_seller_upload_package.zip"'
        return response

    @extend_schema(
        summary="Upload catalog items via CSV and images",
        request={'multipart/form-data': CSVUploadSerializer},
        responses={202: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT, 403: OpenApiTypes.OBJECT},
        tags=['Catalog Upload']
    )
    @action(detail=False, methods=['post'], permission_classes=[IsSeller], parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def upload(self, request):
        if request.user.role != 'seller':
            return Response({'error': 'Only sellers can upload catalog items'}, status=status.HTTP_403_FORBIDDEN)
        csv_file = request.FILES.get('csv_file')
        if not csv_file:
            return Response({'error': 'CSV file is required'}, status=status.HTTP_400_BAD_REQUEST)
        image_files = request.FILES.getlist('images')
        for img in image_files:
            if img.size > 5 * 1024 * 1024:
                return Response({'error': f'Image "{img.name}" exceeds the 5 MB maximum file size limit.'}, status=status.HTTP_400_BAD_REQUEST)
        csv_content = csv_file.read().decode('utf-8')
        lines = csv_content.splitlines()
        header_index = None
        for i, line in enumerate(lines):
            columns = {value.strip().lower() for value in next(csv.reader([line]), [])}
            if {'category', 'front_image_filename', 'rear_image_filename'} <= columns:
                header_index = i
                break
        if header_index is None:
            return Response({'error': 'CSV header row is missing required columns.'}, status=status.HTTP_400_BAD_REQUEST)
        data_lines = lines[header_index:]
        reader = csv.DictReader(data_lines)
        rows = [row for row in reader if any(row.values())]
        for row in rows:
            rear_value = (row.get('rear_image_filename') or '').strip()
            side_value = (row.get('side_image_filename') or '').strip()
            side_stem = os.path.splitext(side_value)[0].lower() if side_value else ''
            if not rear_value and side_value and 'side' not in side_stem:
                row['rear_image_filename'] = side_value
                row['side_image_filename'] = ''
        if len(rows) > settings.MAX_BATCH_ITEMS:
            return Response({'error': f'Upload exceeds maximum of {settings.MAX_BATCH_ITEMS} items.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(rows) == 0:
            return Response({'error': 'CSV file is empty'}, status=status.HTTP_400_BAD_REQUEST)
        if len(image_files) < len(rows) * 2:
            return Response({'error': 'Missing view images. Each item requires 2 images (Front, Rear). Please upload all required views.'}, status=status.HTTP_400_BAD_REQUEST)
        batch = UploadBatch.objects.create(
            seller=request.user, store_name=request.user.store_name or "Unknown Store",
            status='processing', total_items=len(rows))
        batch_id = str(batch.id)
        image_map = {img.name: img for img in image_files}
        stem_map = {os.path.splitext(img.name)[0].lower(): img for img in image_files}

        def _resolve(csv_name, view_label):
            csv_name = (csv_name or '').strip()
            if not csv_name:
                return None, f"{view_label}: CSV filename column is empty"
            if csv_name in image_map:
                return image_map[csv_name], None
            stem = os.path.splitext(csv_name)[0].lower()
            if stem in stem_map:
                return stem_map[stem], None
            return None, f"{view_label}: '{csv_name}' not found among uploaded images"

        category_map = {'tops': 'tops', 'bottoms': 'bottoms', 'dresses/one-piece': 'dresses', 'dresses': 'dresses', 'outerwear': 'outerwear'}
        for row_number, row in enumerate(rows, start=2):
            try:
                if 'item_name' in row and 'name' not in row:
                    row['name'] = row.pop('item_name')
                item_name = row.get('name', '').strip()
                raw_category = str(row.get('category', '')).strip().lower()
                _, item_errors = CatalogValidator().validate_csv_row(row, row_number)
                resolved_images = {}
                for field_name, csv_col, label in [('front_image', 'front_image_filename', 'Front'), ('rear_image', 'rear_image_filename', 'Rear')]:
                    image_file, error = _resolve(row.get(csv_col, ''), label)
                    if error:
                        item_errors.append(error)
                        continue
                    format_valid, format_error = CatalogValidator().validate_image_format(image_file)
                    dimensions_valid, dimensions_error = CatalogValidator().check_image_dimensions(image_file)
                    if not format_valid:
                        item_errors.append(f"{label}: {format_error}")
                    if not dimensions_valid:
                        item_errors.append(f"{label}: {dimensions_error}")
                    resolved_images[field_name] = image_file
                try:
                    price = Decimal(str(row.get('price', '0')))
                    if not price.is_finite():
                        price = Decimal('0.00')
                except (InvalidOperation, ValueError):
                    price = Decimal('0.00')
                item = CatalogItem.objects.create(
                    name=item_name, description=row.get('description', ''),
                    category=category_map.get(raw_category, raw_category),
                    size=row.get('size', ''), color=row.get('color', ''),
                    color_description=row.get('color_description', ''),
                    color_family=row.get('color_family', ''),
                    price=price,
                    style_tags=[tag.strip() for tag in str(row.get('style_tags', '')).split(',') if tag.strip()],
                    seller=request.user, store_name=request.user.store_name or "Unknown Store",
                    batch=batch, status='rejected' if item_errors else 'processing',
                    rejection_reasons=item_errors
                )
                if not item_errors:
                    for field_name, image_file in resolved_images.items():
                        image_file.seek(0)
                        getattr(item, field_name).save(f"{batch_id}_{row_number}_{field_name}.jpg", image_file, save=False)
                    item.save()
            except Exception as e:
                logger.error(f"Error processing row {row_number}: {e}", exc_info=True)
        UPLOAD_EXECUTOR.submit(process_batch_background, batch_id)
        return Response({
            'batch_id': batch_id, 'status': 'processing',
            'message': f'Batch {batch_id} accepted for processing.',
            'total_items': len(rows)
        }, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['get'], permission_classes=[IsSeller], url_path='batch-report')
    def batch_report(self, request):
        batch_id = request.query_params.get('batch_id')
        if not batch_id:
            return Response({'error': 'Batch ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            batch = UploadBatch.objects.get(id=batch_id, seller=request.user)
        except Exception:
            try:
                batch = UploadBatch.objects.get(id=ObjectId(batch_id), seller=request.user)
            except Exception:
                return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(UploadBatchSerializer(batch).data)

    @action(detail=False, methods=['get'], permission_classes=[IsSeller])
    def my_listings(self, request):
        items = CatalogItem.objects.filter(seller=request.user).order_by('-created_at')
        return Response(CatalogItemSerializer(items, many=True).data)

    @extend_schema(
        summary="Manage a specific seller listing",
        description="GET details, PUT/PATCH update (with optional image replacement), or DELETE a specific catalog item.",
        parameters=[OpenApiParameter('item_id', OpenApiTypes.STR, OpenApiParameter.PATH, description="Item ID")],
        responses={200: CatalogItemSerializer, 204: None, 400: OpenApiTypes.OBJECT, 403: OpenApiTypes.OBJECT,
                   404: OpenApiTypes.OBJECT, 503: OpenApiTypes.OBJECT},
        tags=['Seller Listings']
    )
    @action(
        detail=False,
        methods=['get', 'put', 'patch', 'delete'],
        permission_classes=[IsSeller],
        url_path='my-listings/(?P<item_id>[^/.]+)',
        parser_classes=[parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    )
    def my_listing_manage(self, request, item_id=None):
        if request.user.role != 'seller':
            return Response({'error': 'Only sellers can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        try:
            item = CatalogItem.objects.get(id=item_id, seller=request.user)
        except CatalogItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)
        if request.method == 'GET':
            return Response(CatalogItemSerializer(item).data)
        elif request.method == 'DELETE':
            # KAN-119: post_delete runs AFTER the row is gone, so a cleanup
            # failure there can only be logged - it cannot un-delete the row.
            # Refuse up front instead: nothing is mutated, no orphan is created,
            # and the seller gets a retryable error rather than a misleading 204.
            # Private-access mirrors catalog.views.page_views.serve_gridfs_media.
            if item.front_image.name or item.rear_image.name:
                try:
                    gridfs_storage._require_fs()
                except Exception as exc:
                    logger.error(
                        "KAN-119 delete refused: image storage unreachable item=%s error=%s",
                        item.id, exc,
                    )
                    return Response(
                        {'error': 'Image storage is unavailable, so this listing was not deleted. Please try again shortly.'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )
            # GridFS cleanup is handled by the post_delete signal in catalog/models.py.
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        elif request.method in ['PUT', 'PATCH']:
            image_fields = ('front_image', 'rear_image')
            payload = request.data.copy()
            replacement_images = {field: request.FILES.get(field) for field in image_fields if request.FILES.get(field)}
            for field in image_fields:
                payload.pop(field, None)

            original_status = item.status
            serializer = CatalogItemSerializer(item, data=payload, partial=request.method == 'PATCH')
            serializer.is_valid(raise_exception=True)

            # Fast-fail only on cheap, deterministic file checks. Semantic checks
            # (rembg, orientation, color alignment) run in the background pipeline.
            validator = CatalogValidator()
            for field, image_file in replacement_images.items():
                if image_file.size > validator.MAX_FILE_SIZE_BYTES:
                    return Response({field: 'Image must not exceed 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)
                format_valid, format_error = validator.validate_image_format(image_file)
                dimensions_valid, dimensions_error = validator.check_image_dimensions(image_file)
                if not format_valid or not dimensions_valid:
                    return Response({field: format_error or dimensions_error}, status=status.HTTP_400_BAD_REQUEST)

            # GOAL 1: any meaningful edit re-enters validation. The item stays
            # 'processing' and only the background pipeline may promote it.
            needs_pipeline = (
                original_status == 'rejected'
                or bool(replacement_images)
                or 'color' in serializer.validated_data
                or 'color_family' in serializer.validated_data
            )
            if needs_pipeline:
                item.status = 'processing'
                item.rejection_reasons = []
            updated = serializer.save()

            # KAN-119: serializer.save() has ALREADY persisted 'processing'.
            # An unguarded storage failure below therefore stranded the listing
            # in 'processing' forever (nothing sweeps CatalogItem, only batches).
            # Track every object we write so a partial failure can be undone.
            old_image_names = {}
            new_image_names = {}
            try:
                for field, image_file in replacement_images.items():
                    old_name = getattr(updated, field).name
                    if old_name:
                        old_image_names[field] = old_name
                    image_file.seek(0)
                    getattr(updated, field).save(
                        f"{updated.id}_{field}.jpg",
                        ContentFile(image_file.read()),
                        save=False,
                    )
                    new_image_names[field] = getattr(updated, field).name
                updated.save()
            except Exception:
                logger.exception("KAN-119 could not store replacement image(s) for %s", updated.id)
                # updated.save() did NOT run, so the DB still references the OLD
                # images. Purge ONLY the new objects; deleting old_image_names
                # here would strip the listing's live references.
                _discard_written(new_image_names, updated.id)
                if needs_pipeline:
                    _commit_item(
                        updated.id,
                        status='rejected',
                        rejection_reasons=[
                            'The replacement image could not be stored. Please re-submit this listing.'
                        ],
                    )
                    return Response(
                        {'error': 'The replacement image could not be stored. Please try again.'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )
                raise

            # KAN-119: queue revalidation BEFORE any storage cleanup. Deleting the
            # old image first meant an unreachable bucket raised here, the task was
            # never submitted, and the listing stayed 'processing' forever.
            if needs_pipeline:
                try:
                    UPLOAD_EXECUTOR.submit(process_single_item_background, updated.id)
                except Exception:
                    logger.exception("KAN-119 could not queue revalidation for %s", updated.id)
                    _commit_item(
                        updated.id,
                        status='rejected',
                        rejection_reasons=['Revalidation could not be started. Please re-submit this listing.'],
                    )
                    # KAN-119: updated.save() DID run here, so the row references
                    # the NEW images and the superseded ones are unreferenced.
                    # Without this purge the failure branch creates the very
                    # orphan this ticket exists to prevent.
                    for field, old_name in old_image_names.items():
                        _purge_gridfs(getattr(updated, field).storage, old_name, item_id=updated.id)
                    return Response(
                        {'error': 'Revalidation could not be queued. Please try again.'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )

            # Cleanup can now fail without stranding the item. Failures are logged
            # at ERROR by _purge_gridfs and surfaced to the seller below.
            cleanup_failed = [
                old_name for field, old_name in old_image_names.items()
                if not _purge_gridfs(getattr(updated, field).storage, old_name, item_id=updated.id)
            ]

            data = CatalogItemSerializer(updated).data
            if cleanup_failed:
                data['image_cleanup_warning'] = (
                    'Previous image(s) could not be removed from storage. '
                    'The failure has been logged for cleanup.'
                )
            return Response(data)

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'download_template', 'download_package']:
            return [AllowAny()]
        return [IsSeller()]


def mark_stale_batches_as_failed():
    try:
        stale_time = timezone.now() - timedelta(minutes=10)
        stale_batches = UploadBatch.objects.filter(status='processing', created_at__lt=stale_time)
        count = stale_batches.update(status='failed', rejection_report={'error': 'Processing timeout'})
        if count > 0:
            logger.info(f"Marked {count} stale batches as failed")
    except Exception as e:
        logger.warning(f"Could not run startup sweep: {e}")