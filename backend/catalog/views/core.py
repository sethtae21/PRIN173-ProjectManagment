import csv
import colorsys
import io
import os
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal, InvalidOperation
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
from PIL import Image
from rembg import new_session, remove
from bson.objectid import ObjectId

from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from catalog.models import CatalogItem, UploadBatch
from ..color_palette_config import get_palette_tags, COLOR_PALETTE_MAPPING
from catalog.serializers import CatalogItemSerializer, UploadBatchSerializer, CSVUploadSerializer

logger = logging.getLogger(__name__)
UPLOAD_EXECUTOR = ThreadPoolExecutor(max_workers=settings.MAX_WORKERS)
IMAGE_PROCESS_EXECUTOR = ThreadPoolExecutor(max_workers=settings.MAX_WORKERS * 3)

CATALOG_TEMPLATE_CSV = (
    '"INSTRUCTIONS: Fill out the columns below. Type your photo filenames in the last 3 columns.",,,,,,,,,,,,\n'
    ',,,,,,,,,,,,\n'
    'name,description,category,size,color,color_description,color_family,price,style_tags,occasion_tags,front_image_filename,side_image_filename,rear_image_filename\n'
    'Classic White Shirt,"A comfortable shirt.",tops,M,White,Pure White,Neutral,15.99,"casual, minimalist","everyday, summer",front.jpeg,side.jpeg,rear.jpeg\n'
)
SELLER_IMAGE_GUIDELINES = (
    'FitFusion AI Seller Catalog Upload Guidelines\n\n'
    'Upload exactly three clear garment photographs per item: Front, Side, and Rear. '
    'Photograph the garment laid flat or on a mannequin against a plain, contrasting background.\n'
    'Each image must be at least 800 x 800 pixels and no larger than 5 MB. '
    'Use static JPG, PNG, or WEBP images; animated images are not accepted.\n'
    'Enter each uploaded filename in the matching CSV view column. The spelling must match; '
    'the file extension may differ when the base filename is the same.\n'
    'Declare the garment color accurately. The backend removes the background and checks '
    'the front image color automatically; you do not need to remove the background yourself.\n'
    'Supported categories: tops, bottoms, dresses, outerwear, footwear.\n'
)

# ==========================================
# Catalog Validator Logic
# ==========================================
class CatalogValidator:
    MIN_IMAGE_DIMENSION = 800
    MAX_IMAGE_DIMENSION = 4096
    MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
    ALLOWED_FORMATS = ['JPEG', 'JPG', 'PNG', 'WEBP']
    REQUIRED_FIELDS = [
        'name', 'description', 'category', 'size', 'color',
        'color_description', 'color_family', 'price',
        'front_image_filename', 'side_image_filename', 'rear_image_filename'
    ]
    
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
        
        valid_categories = ['tops', 'bottoms', 'dresses', 'outerwear', 'footwear']
        category = str(row.get('category', '')).strip().lower()
        if category == 'dresses/one-piece':
            category = 'dresses'
        if category and category not in valid_categories:
            errors.append(f"Row {row_number}: Invalid category '{row['category']}'")
        
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
    
    def process_image_with_rembg(self, image_file, session=None):
        try:
            img_data = image_file.read()
            output = remove(img_data, session=session) if session else remove(img_data)
            img = Image.open(io.BytesIO(output))
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            alpha_channel = img.split()[3]
            alpha_min, alpha_max = alpha_channel.getextrema()
            if alpha_min == 255 or alpha_max == 0:
                raise ValueError("Background removal did not produce a valid transparent image.")
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            return img_byte_arr
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
        color_map = {
            'red': lambda h, s, v: (h <= 0.06 or h >= 0.94) and s >= 0.35,
            'blue': lambda h, s, v: 0.54 <= h <= 0.75 and s >= 0.3,
            'green': lambda h, s, v: 0.2 <= h <= 0.46 and s >= 0.25,
            'black': lambda h, s, v: v <= 0.22,
            'white': lambda h, s, v: v >= 0.78 and s <= 0.2,
            'gray': lambda h, s, v: s <= 0.2 and 0.2 < v < 0.85,
            'brown': lambda h, s, v: 0.035 <= h <= 0.13 and s >= 0.25 and 0.12 < v < 0.62,
        }
        declared_lower = str(declared_color).lower()
        declared_colors = [name for name in color_map if name in declared_lower]
        if not declared_colors:
            return True, 'Color alignment OK'
        try:
            red, green, blue = (
                int(dominant_hex[index:index + 2], 16) / 255
                for index in (1, 3, 5)
            )
            hsv = colorsys.rgb_to_hsv(red, green, blue)
        except (ValueError, TypeError):
            return False, f"Invalid dominant color value: {dominant_hex}"
        if not any(color_map[name](*hsv) for name in declared_colors):
            return False, f"Color mismatch: declared '{declared_color}' but image appears to be different color ({dominant_hex})"
        return True, "Color alignment OK"
    
    def generate_color_palette_tags(self, dominant_hex, color_family):
        return get_palette_tags(color_family)

# ==========================================
# Background Processing Function
# ==========================================
def process_batch_background(batch_id):
    start_time = time.time()
    print(f"\n{'='*60}")
    print(f"🚀 Starting batch {batch_id} processing...")
    
    try:
        time.sleep(0.5)
        try:
            batch = UploadBatch.objects.get(id=batch_id)
        except (UploadBatch.DoesNotExist, ValueError, TypeError):
            batch = UploadBatch.objects.get(id=ObjectId(batch_id))
        
        batch.status = 'processing'
        batch.save()
        
        validator = CatalogValidator()
        rembg_session = None
        accepted_count = 0
        rejected_count = 0
        rejection_report = {}
        
        items = CatalogItem.objects.filter(batch=batch)
        total_items = items.count()
        print(f"📦 Processing {total_items} items in batch {batch_id}...")
        
        for i, item in enumerate(items, 1):
            item_start = time.time()
            
            if item.status == 'rejected':
                rejected_count += 1
                rejection_report[str(item.id)] = item.rejection_reasons or ['Rejected at upload']
                continue

            item_errors = []
            front_color = "#000000"
            image_jobs = {}
            for field_name, view_label in [('front_image', 'Front'), ('side_image', 'Side'), ('rear_image', 'Rear')]:
                img_field = getattr(item, field_name, None)
                if img_field:
                    img_field.seek(0)
                    if rembg_session is None:
                        rembg_session = new_session(settings.REMBG_MODEL)
                    image_jobs[field_name] = (
                        view_label,
                        img_field.name,
                        IMAGE_PROCESS_EXECUTOR.submit(
                            validator.process_image_with_rembg, img_field, rembg_session
                        ),
                    )

            for field_name, (view_label, original_name, future) in image_jobs.items():
                try:
                    processed_bytes = future.result()
                    processed_file = ContentFile(
                        processed_bytes.read(), name=f"{item.id}_{field_name}.png"
                    )
                    image_field = getattr(item, field_name)
                    image_field.save(processed_file.name, processed_file, save=False)
                    if original_name:
                        image_field.storage.delete(original_name)

                    if field_name == 'front_image':
                        processed_bytes.seek(0)
                        front_color = validator.extract_dominant_color(processed_bytes)
                        color_valid, color_msg = validator.validate_color_alignment(
                            item.color, front_color
                        )
                        if not color_valid:
                            item_errors.append(color_msg)
                except Exception as e:
                    item_errors.append(f"{view_label} processing failed: {str(e)}")
            
            if item_errors:
                rejection_report[str(item.id)] = item_errors
                item.status = 'rejected'
                item.rejection_reasons = item_errors
                item.save()
                rejected_count += 1
                print(f"❌ Item {i}/{total_items} ({item.name}) REJECTED: {', '.join(item_errors)}")
            else:
                palette_tags = validator.generate_color_palette_tags(front_color, item.color_family)
                item.compatible_color_palette_tags = palette_tags
                item.status = 'active'
                item.save()
                accepted_count += 1
                item_time = time.time() - item_start
                print(f"✅ Item {i}/{total_items} ({item.name}) processed in {item_time:.2f}s")
        
        total_time = time.time() - start_time
        batch.accepted_count = accepted_count
        batch.rejected_count = rejected_count
        batch.rejection_report = rejection_report
        batch.status = 'completed'
        batch.completed_at = timezone.now()
        batch.save()
        
        print(f"🏁 BATCH {batch_id} PROCESSING COMPLETE")
        print(f"⏱️  Total Time: {total_time:.2f} seconds")
        print(f"📊 Accepted: {accepted_count} | Rejected: {rejected_count}")
        print(f"⚡ Average per item: {total_time/max(total_items,1):.2f} seconds")
        print(f"{'='*60}\n")
        
    except Exception as e:
        total_time = time.time() - start_time
        print(f"❌ Batch {batch_id} failed after {total_time:.2f}s: {e}")
        try:
            batch = UploadBatch.objects.get(id=batch_id)
            batch.status = 'failed'
            batch.rejection_report = {'error': str(e)}
            batch.save()
        except UploadBatch.DoesNotExist:
            pass

# ==========================================
# Catalog ViewSet
# ==========================================
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
        csv_content = CATALOG_TEMPLATE_CSV
        response = HttpResponse(csv_content, content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="fitfusion_catalog_template.csv"'
        return response

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='download-package')
    def download_package(self, request):
        archive = io.BytesIO()
        with ZipFile(archive, 'w', compression=ZIP_DEFLATED) as package:
            package.writestr('fitfusion_catalog_template.csv', CATALOG_TEMPLATE_CSV)
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
            if {'category', 'front_image_filename', 'side_image_filename', 'rear_image_filename'} <= columns:
                header_index = i
                break

        if header_index is None:
            return Response({'error': 'CSV header row is missing required columns.'}, status=status.HTTP_400_BAD_REQUEST)

        data_lines = lines[header_index:]
        reader = csv.DictReader(data_lines)
        rows = [row for row in reader if any(row.values())]

        if len(rows) > settings.MAX_BATCH_ITEMS:
            return Response({'error': f'Upload exceeds maximum of {settings.MAX_BATCH_ITEMS} items.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(rows) == 0:
            return Response({'error': 'CSV file is empty'}, status=status.HTTP_400_BAD_REQUEST)
            
        if len(image_files) < len(rows) * 3:
            return Response({
                'error': 'Missing view images. Each item requires 3 images (Front, Side, Rear). Please upload all required views.'
            }, status=status.HTTP_400_BAD_REQUEST)

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

        category_map = {'tops': 'tops', 'bottoms': 'bottoms', 'dresses/one-piece': 'dresses', 'dresses': 'dresses', 'outerwear': 'outerwear', 'footwear': 'footwear'}

        for row_number, row in enumerate(rows, start=2):
            try:
                item_name = row.get('name', row.get('item_name', '')).strip()
                raw_category = str(row.get('category', '')).strip().lower()
                _, item_errors = CatalogValidator().validate_csv_row(row, row_number)
                resolved_images = {}
                for field_name, csv_col, label in [('front_image', 'front_image_filename', 'Front'), ('side_image', 'side_image_filename', 'Side'), ('rear_image', 'rear_image_filename', 'Rear')]:
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
                    occasion_tags=[tag.strip() for tag in str(row.get('occasion_tags', '')).split(',') if tag.strip()],
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
    
    # COMBINED ROUTE FIX: Handles GET/PUT/PATCH/DELETE + File Uploads (FR-4.5 / FR-4.6 / FR-4.7)
    @extend_schema(
        summary="Manage a specific seller listing",
        description="GET details, PUT/PATCH update (with optional image replacement), or DELETE a specific catalog item.",
        parameters=[OpenApiParameter('item_id', OpenApiTypes.STR, OpenApiParameter.PATH, description='Item ID')],
        responses={200: CatalogItemSerializer, 204: None, 400: OpenApiTypes.OBJECT, 403: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
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
            # FR-4.6: Explicit storage.delete calls (post_delete signal also handles this as a safety net)
            for field in ('front_image', 'side_image', 'rear_image'):
                image = getattr(item, field)
                if image and image.name:
                    image.delete(save=False)
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        elif request.method in ['PUT', 'PATCH']:
            # FR-4.7: Any edited/re-uploaded item must return to status "processing" 
            # and re-enter the validation pipeline.
            item.status = 'processing'
            item.rejection_reasons = []
            item.save()

            image_fields = ('front_image', 'side_image', 'rear_image')
            payload = request.data.copy()
            replacement_images = {field: request.FILES.get(field) for field in image_fields if request.FILES.get(field)}
            for field in image_fields:
                payload.pop(field, None)

            serializer = CatalogItemSerializer(
                item, data=payload, partial=request.method == 'PATCH'
            )
            serializer.is_valid(raise_exception=True)
            
            # Save text fields first
            updated = serializer.save()
            validator = CatalogValidator()
            
            # Process any new images
            processed_images = {}
            for field, image_file in replacement_images.items():
                if image_file.size > validator.MAX_FILE_SIZE_BYTES:
                    updated.status = 'rejected'
                    updated.rejection_reasons = ['Image must not exceed 5 MB.']
                    updated.save()
                    return Response({field: 'Image must not exceed 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)
                
                format_valid, format_error = validator.validate_image_format(image_file)
                dimensions_valid, dimensions_error = validator.check_image_dimensions(image_file)
                if not format_valid or not dimensions_valid:
                    updated.status = 'rejected'
                    updated.rejection_reasons = [format_error or dimensions_error]
                    updated.save()
                    return Response({field: format_error or dimensions_error}, status=status.HTTP_400_BAD_REQUEST)
                
                image_file.seek(0)
                try:
                    processed_images[field] = validator.process_image_with_rembg(image_file)
                except Exception as error:
                    updated.status = 'rejected'
                    updated.rejection_reasons = [str(error)]
                    updated.save()
                    return Response({field: str(error)}, status=status.HTTP_400_BAD_REQUEST)

            # FR-4.5: Delete old GridFS objects before saving new file references
            old_image_names = {
                field: getattr(updated, field).name for field in processed_images
            }
            for field, processed_bytes in processed_images.items():
                processed_bytes.seek(0)
                getattr(updated, field).save(
                    f"{updated.id}_{field}.png",
                    ContentFile(processed_bytes.read()),
                    save=False,
                )
                old_name = old_image_names.get(field)
                if old_name:
                    getattr(updated, field).storage.delete(old_name)

            # Re-validate color if front image or color changed, OR if the item was previously rejected
            needs_color_check = (
                'color_family' in serializer.validated_data
                or 'color' in serializer.validated_data
                or 'front_image' in processed_images
                or item.status == 'rejected'
            )
            
            if needs_color_check:
                front_image = processed_images.get('front_image') or updated.front_image
                if front_image:
                    front_image.seek(0)
                    front_color = validator.extract_dominant_color(front_image)
                    declared_color = serializer.validated_data.get('color', updated.color)
                    
                    color_valid, color_message = validator.validate_color_alignment(
                        declared_color, front_color
                    )
                    if not color_valid:
                        updated.status = 'rejected'
                        updated.rejection_reasons = [color_message]
                        updated.save()
                        return Response({'front_image': color_message}, status=status.HTTP_400_BAD_REQUEST)
                    
                    updated.compatible_color_palette_tags = validator.generate_color_palette_tags(
                        front_color, updated.color_family
                    )

            # If we reach here, validation passed
            updated.status = 'active'
            updated.rejection_reasons = []
            updated.save()
            
            return Response(CatalogItemSerializer(updated).data)
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'download_template', 'download_package']:
            return [AllowAny()]
        return [IsSeller()]

# ==========================================
# Startup Sweep (run on app boot)
# ==========================================
def mark_stale_batches_as_failed():
    try:
        stale_time = timezone.now() - timedelta(minutes=10)
        stale_batches = UploadBatch.objects.filter(status='processing', created_at__lt=stale_time)
        count = stale_batches.update(status='failed', rejection_report={'error': 'Processing timeout'})
        if count > 0:
            logger.info(f"Marked {count} stale batches as failed")
    except Exception as e:
        logger.warning(f"Could not run startup sweep: {e}")