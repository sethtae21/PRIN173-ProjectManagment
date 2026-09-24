import csv
import io
import os
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets, parsers, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from accounts.permissions import IsSeller
from PIL import Image
from rembg import remove
from bson.objectid import ObjectId

from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from catalog.models import CatalogItem, UploadBatch
from ..color_palette_config import get_palette_tags, COLOR_PALETTE_MAPPING
from catalog.serializers import CatalogItemSerializer, UploadBatchSerializer, CSVUploadSerializer

# HIGH PRIORITY FIX: Setup Python logging module
logger = logging.getLogger(__name__)

# ==========================================
# Catalog Validator Logic
# ==========================================
class CatalogValidator:
    MIN_IMAGE_DIMENSION = 512
    MAX_IMAGE_DIMENSION = 4096
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
        
        if 'price' in row:
            try:
                if float(row['price']) <= 0:
                    errors.append(f"Row {row_number}: Price must be positive")
            except ValueError:
                errors.append(f"Row {row_number}: Invalid price format")
        
        valid_categories = ['tops', 'bottoms', 'dresses', 'outerwear', 'footwear']
        if 'category' in row and str(row['category']).lower() not in valid_categories:
            errors.append(f"Row {row_number}: Invalid category '{row['category']}'")
        
        return len(errors) == 0, errors
    
    def validate_image_format(self, image_file):
        """Check if image is a static picture (not animated GIF)"""
        try:
            img = Image.open(image_file)
            format_upper = img.format.upper() if img.format else ''
            
            if format_upper == 'GIF':
                return False, "GIF files are not allowed. Please use static images only (JPG, PNG, or WEBP)."
            
            if format_upper not in self.ALLOWED_FORMATS:
                return False, f"Unsupported format: {format_upper}. Only JPG, PNG, and WEBP are allowed."
            
            if format_upper in ['PNG', 'WEBP']:
                try:
                    img.seek(1)
                    return False, f"Animated {format_upper} files are not allowed. Please use static images only."
                except EOFError:
                    pass
            
            return True, None
        except Exception as e:
            return False, f"Invalid or corrupted image: {str(e)}"

    def check_image_dimensions(self, image_file):
        try:
            with Image.open(image_file) as img:
                width, height = img.size
                if width < self.MIN_IMAGE_DIMENSION or height < self.MIN_IMAGE_DIMENSION:
                    return False, f"Image too small ({width}x{height}). Minimum is {self.MIN_IMAGE_DIMENSION}x{self.MIN_IMAGE_DIMENSION}."
                if width > self.MAX_IMAGE_DIMENSION or height > self.MAX_IMAGE_DIMENSION:
                    return False, f"Image too large ({width}x{height}). Maximum is {self.MAX_IMAGE_DIMENSION}x{self.MAX_IMAGE_DIMENSION}."
                return True, None
        except Exception as e:
            return False, f"Invalid or corrupted image: {str(e)}"
    
    def process_image_with_rembg(self, image_file):
        try:
            img_data = image_file.read()
            output = remove(img_data)
            img = Image.open(io.BytesIO(output))
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            alpha_channel = img.split()[3]
            if alpha_channel.getbbox() is None:
                raise Exception("No transparency detected after background removal. Image may be fully opaque.")
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
        # Off-white (#ed, #ee, #ef, #f5, #f8) and light gray prefixes included
        color_map = {
            'red': ['#ff', '#dc', '#e0'], 
            'blue': ['#00', '#1e', '#41'],
            'green': ['#00', '#22', '#2e'], 
            'black': ['#00', '#1a', '#2f'],
            'white': ['#ff', '#fa', '#f0', '#f5', '#f8', '#ed', '#ee', '#ef', '#dc', '#d3'], 
            'gray': ['#80', '#a9', '#c0', '#69', '#77', '#70', '#80', '#88', '#8b', '#99', '#a0', '#a8', '#aa', '#b0', '#b8', '#c0', '#c8', '#d0', '#d3', '#d8', '#dc', '#e0', '#e5', '#e8', '#ea', '#ed', '#ee', '#f0', '#f5'],
            'brown': ['#65', '#8b', '#a0'],
        }
        declared_lower = str(declared_color).lower()
        for color_name, hex_prefixes in color_map.items():
            if color_name in declared_lower:
                if not any(dominant_hex.startswith(prefix) for prefix in hex_prefixes):
                    return False, f"Color mismatch: declared '{declared_color}' but image appears to be different color ({dominant_hex})"
        return True, "Color alignment OK"
    
    def generate_color_palette_tags(self, dominant_hex, color_family):
        return get_palette_tags(color_family)

# ==========================================
# Background Processing Function
# ==========================================
def process_batch_background(batch_id):
    import time
    temp_files = []
    try:
        time.sleep(0.5)
        
        # FIX: Replaced bare except with specific exceptions
        try:
            batch = UploadBatch.objects.get(id=batch_id)
        except (UploadBatch.DoesNotExist, ValueError, TypeError):
            try:
                batch = UploadBatch.objects.get(id=ObjectId(batch_id))
            except Exception as e:
                logger.error(f"Batch {batch_id} not found: {e}")
                return
        
        batch.status = 'processing'
        batch.save()
        
        validator = CatalogValidator()
        accepted_count = 0
        rejected_count = 0
        rejection_report = {}
        
        try:
            items = CatalogItem.objects.filter(batch=batch)
        except Exception:
            items = CatalogItem.objects.filter(batch_id=batch_id)
        
        for item in items:
            item_errors = []
            
            for img_field, view_name in [(item.front_image, 'Front'), (item.side_image, 'Side'), (item.rear_image, 'Rear')]:
                if img_field:
                    valid_format, format_error = validator.validate_image_format(img_field)
                    if not valid_format:
                        item_errors.append(f"{view_name}: {format_error}")
                        continue
                    
                    img_field.seek(0)
                    valid_dim, dim_error = validator.check_image_dimensions(img_field)
                    if not valid_dim:
                        item_errors.append(f"{view_name}: {dim_error}")
            
            if item_errors:
                rejection_report[str(item.id)] = item_errors
                item.status = 'rejected'
                item.rejection_reasons = item_errors
                item.save()
                rejected_count += 1
                continue
            
            try:
                item.front_image.seek(0)
                front_processed = validator.process_image_with_rembg(item.front_image)
                front_color = validator.extract_dominant_color(front_processed)
                
                color_valid, color_msg = validator.validate_color_alignment(item.color, front_color)
                if not color_valid:
                    item_errors.append(color_msg)
                
                if item_errors:
                    rejection_report[str(item.id)] = item_errors
                    item.status = 'rejected'
                    item.rejection_reasons = item_errors
                    item.save()
                    rejected_count += 1
                    continue
                
                palette_tags = validator.generate_color_palette_tags(front_color, item.color_family)
                item.compatible_color_palette_tags = palette_tags
                item.status = 'active'
                item.save()
                accepted_count += 1
            except Exception as e:
                rejection_report[str(item.id)] = [f"Processing error: {str(e)}"]
                item.status = 'rejected'
                item.rejection_reasons = [str(e)]
                item.save()
                rejected_count += 1
        
        batch.accepted_count = accepted_count
        batch.rejected_count = rejected_count
        batch.rejection_report = rejection_report
        batch.status = 'completed'
        batch.completed_at = timezone.now()
        batch.save()
    except Exception as e:
        # FIX: Replaced bare except and print with logger
        try:
            try:
                batch = UploadBatch.objects.get(id=batch_id)
            except (UploadBatch.DoesNotExist, ValueError, TypeError):
                batch = UploadBatch.objects.get(id=ObjectId(batch_id))
            batch.status = 'failed'
            batch.rejection_report = {'error': str(e)}
            batch.save()
        except UploadBatch.DoesNotExist:
            logger.error(f"Batch {batch_id} not found when trying to mark as failed")
        except Exception as update_error:
            logger.error(f"Failed to update batch {batch_id}: {update_error}")
    finally:
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception as cleanup_error:
                # FIX: Replaced print with logger.warning
                logger.warning(f"Failed to clean up temp file {temp_file}: {cleanup_error}")

# ==========================================
# Catalog ViewSet
# ==========================================
class CatalogViewSet(viewsets.ModelViewSet):
    queryset = CatalogItem.objects.filter(status='active')
    serializer_class = CatalogItemSerializer
    permission_classes = [IsSeller] # Default to Seller, overridden in get_permissions for reads
    
    def get_queryset(self):
        # Base queryset: only active items (read-only for everyone)
        queryset = CatalogItem.objects.filter(status='active')
        
        # Existing filters
        if category := self.request.query_params.get('category'):
            queryset = queryset.filter(category=category)
        if color := self.request.query_params.get('color'):
            queryset = queryset.filter(color_family__iexact=color)
        if size := self.request.query_params.get('size'):
            queryset = queryset.filter(size__icontains=size)
            
        # ==========================================
        # KAN-104: New filters for Store and Style
        # ==========================================
        if store := self.request.query_params.get('store'):
            queryset = queryset.filter(store_name__icontains=store)
            
        if style := self.request.query_params.get('style'):
            # style_tags is a JSONField list; icontains matches the string within the JSON array
            queryset = queryset.filter(style_tags__icontains=style)
            
        return queryset
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='download-template')
    def download_template(self, request):
        """Download the clean, 1-item CSV Template"""
        csv_content = (
            '"INSTRUCTIONS: Fill out the columns below. Type your photo filenames in the last 3 columns. Upload this CSV and your 3 photos (front, side, rear) on the dashboard.",,,,,,,,,,,,\n'
            ',,,,,,,,,,,,\n'
            'item_name,description,category,size,color,color_description,color_family,price,style_tags,occasion_tags,front_image_filename,side_image_filename,rear_image_filename\n'
            'Classic White Shirt,"A comfortable, breathable cotton t-shirt perfect for daily wear.",Tops,M,White,Pure White,Neutral,15.99,"casual, minimalist","everyday, summer",front.jpeg,side.jpeg,rear.jpeg\n'
        )
        response = HttpResponse(csv_content, content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="fitfusion_catalog_template.csv"'
        return response

    @extend_schema(
        summary="Upload catalog items via CSV and images",
        description="Upload a CSV file containing item metadata along with corresponding images. Returns a batch ID for tracking.",
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

        csv_file.seek(0)
        csv_content = csv_file.read().decode('utf-8')

        # ─ Skip instruction rows ──
        lines = csv_content.splitlines()
        header_index = 0
        for i, line in enumerate(lines):
            if 'item_name' in line:
                header_index = i
                break

        data_lines = lines[header_index:]
        reader = csv.DictReader(data_lines)
        rows = [row for row in reader if any(row.values())]

        if len(rows) > settings.MAX_BATCH_ITEMS:
            return Response({
                'error': f'Upload exceeds maximum of {settings.MAX_BATCH_ITEMS} items. You submitted {len(rows)} items.',
                'max_allowed': settings.MAX_BATCH_ITEMS,
                'submitted': len(rows)
            }, status=status.HTTP_400_BAD_REQUEST)

        if len(rows) == 0:
            return Response({'error': 'CSV file is empty'}, status=status.HTTP_400_BAD_REQUEST)

        batch = UploadBatch.objects.create(
            seller=request.user,
            store_name=request.user.store_name or "Unknown Store",
            status='processing',
            total_items=len(rows),
        )
        batch_id = str(batch.id)
        image_files = request.FILES.getlist('images')
        image_map = {img.name: img for img in image_files}

        # Category mapping: CSV value → model choice
        category_map = {
            'tops': 'tops',
            'bottoms': 'bottoms',
            'dresses/one-piece': 'dresses',
            'dresses': 'dresses',
            'outerwear': 'outerwear',
            'footwear': 'footwear',
        }

        for row_number, row in enumerate(rows, start=2):
            try:
                item_name = row.get('item_name', row.get('name', '')).strip()
                raw_category = str(row.get('category', '')).strip().lower()
                mapped_category = category_map.get(raw_category, raw_category)

                item = CatalogItem.objects.create(
                    name=item_name,
                    description=row.get('description', ''),
                    category=mapped_category,
                    size=row.get('size', ''),
                    color=row.get('color', ''),
                    color_description=row.get('color_description', ''),
                    color_family=row.get('color_family', ''),
                    price=float(row.get('price', 0)),
                    style_tags=[tag.strip() for tag in str(row.get('style_tags', '')).split(',') if tag.strip()],
                    occasion_tags=[tag.strip() for tag in str(row.get('occasion_tags', '')).split(',') if tag.strip()],
                    seller=request.user,
                    store_name=request.user.store_name or "Unknown Store",
                    batch=batch,
                    status='processing'
                )

                front_filename = row.get('front_image_filename', '').strip()
                side_filename = row.get('side_image_filename', '').strip()
                rear_filename = row.get('rear_image_filename', '').strip()

                if front_filename in image_map:
                    item.front_image.save(f"{batch_id}_{row_number}_front.jpg", image_map[front_filename], save=False)
                if side_filename in image_map:
                    item.side_image.save(f"{batch_id}_{row_number}_side.jpg", image_map[side_filename], save=False)
                if rear_filename in image_map:
                    item.rear_image.save(f"{batch_id}_{row_number}_rear.jpg", image_map[rear_filename], save=False)

                item.save()
            except Exception as e:
                # FIX: Replaced print with logger.error
                logger.error(f"Error processing row {row_number}: {e}", exc_info=True)

        with ThreadPoolExecutor(max_workers=2) as executor:
            executor.submit(process_batch_background, batch_id)

        return Response({
            'batch_id': batch_id,
            'status': 'processing',
            'message': f'Batch {batch_id} accepted for processing. Check status at /catalog/batch-report/?batch_id={batch_id}',
            'total_items': len(rows)
        }, status=status.HTTP_202_ACCEPTED)
    
    @action(detail=False, methods=['get'], permission_classes=[IsSeller], url_path='batch-report')
    def batch_report(self, request):
        batch_id = request.query_params.get('batch_id')
        if not batch_id:
            return Response({'error': 'Batch ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Robust lookup: string id first, then ObjectId conversion
        batch = None
        try:
            batch = UploadBatch.objects.get(id=batch_id, seller=request.user)
        except (UploadBatch.DoesNotExist, ValueError, TypeError):
            try:
                batch = UploadBatch.objects.get(id=ObjectId(batch_id), seller=request.user)
            except Exception:
                batch = None
        except Exception as e:
            logger.error(f"batch_report lookup error for {batch_id}: {e}")
            batch = None

        if batch is None:
            return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            return Response(UploadBatchSerializer(batch).data)
        except Exception as e:
            # Fallback: manual ObjectId-safe payload (same fields the HTML test page reads)
            # Prevents int(ObjectId) crash if serializer isn't fully patched
            logger.warning(f"Serializer fallback used for batch {batch_id}: {e}")
            return Response({
                'id': str(batch.id),
                'seller': str(batch.seller_id),
                'store_name': batch.store_name,
                'status': batch.status,
                'total_items': batch.total_items,
                'accepted_count': batch.accepted_count,
                'rejected_count': batch.rejected_count,
                'rejection_report': batch.rejection_report or {},
                'created_at': batch.created_at,
                'completed_at': batch.completed_at,
            })
    
    @extend_schema(
        summary="Get seller's catalog items",
        description="Returns ALL catalog items (active and rejected) for the authenticated seller. Rejected items include rejection reasons.",
        responses={200: CatalogItemSerializer(many=True), 403: OpenApiTypes.OBJECT},
        tags=['Seller Listings']
    )
    @action(detail=False, methods=['get'], permission_classes=[IsSeller])
    def my_listings(self, request):
        if request.user.role != 'seller':
            return Response({'error': 'Only sellers can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        items = CatalogItem.objects.filter(seller=request.user).order_by('-created_at')
        return Response(CatalogItemSerializer(items, many=True).data)
    
    @extend_schema(
        summary="Get specific listing details",
        description="Get details of a specific catalog item owned by the seller",
        parameters=[OpenApiParameter('item_id', OpenApiTypes.STR, OpenApiParameter.PATH, description='Item ID')],
        responses={200: CatalogItemSerializer, 403: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
        tags=['Seller Listings']
    )
    @action(detail=False, methods=['get'], permission_classes=[IsSeller], url_path='my-listings/(?P<item_id>[^/.]+)')
    def my_listing_detail(self, request, item_id=None):
        if request.user.role != 'seller':
            return Response({'error': 'Only sellers can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            item = CatalogItem.objects.get(id=item_id, seller=request.user)
            return Response(CatalogItemSerializer(item).data)
        except CatalogItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @extend_schema(
        summary="Update a listing",
        description="Update metadata of a specific catalog item.",
        parameters=[OpenApiParameter('item_id', OpenApiTypes.STR, OpenApiParameter.PATH, description='Item ID')],
        request=CatalogItemSerializer,
        responses={200: CatalogItemSerializer, 400: OpenApiTypes.OBJECT, 403: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
        tags=['Seller Listings']
    )
    @action(detail=False, methods=['put', 'patch'], permission_classes=[IsSeller], url_path='my-listings/(?P<item_id>[^/.]+)')
    def my_listing_update(self, request, item_id=None):
        if request.user.role != 'seller':
            return Response({'error': 'Only sellers can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            item = CatalogItem.objects.get(id=item_id, seller=request.user)
            allowed_fields = ['name', 'description', 'price', 'style_tags', 'occasion_tags']
            for field in allowed_fields:
                if field in request.data:
                    setattr(item, field, request.data[field])
            item.save()
            return Response(CatalogItemSerializer(item).data)
        except CatalogItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @extend_schema(
        summary="Delete a listing",
        description="Delete a specific catalog item",
        parameters=[OpenApiParameter('item_id', OpenApiTypes.STR, OpenApiParameter.PATH, description='Item ID')],
        responses={204: None, 403: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
        tags=['Seller Listings']
    )
    @action(detail=False, methods=['delete'], permission_classes=[IsSeller], url_path='my-listings/(?P<item_id>[^/.]+)')
    def my_listing_delete(self, request, item_id=None):
        if request.user.role != 'seller':
            return Response({'error': 'Only sellers can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            item = CatalogItem.objects.get(id=item_id, seller=request.user)
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except CatalogItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def perform_create(self, serializer):
        if self.request.user.role != 'seller':
            raise serializers.ValidationError("Only sellers can create catalog items")
        serializer.save(seller=self.request.user, store_name=self.request.user.store_name or "Unknown Store")
    
    def get_permissions(self):
        # KAN-104: Allow Guests/Anyone to read the catalog (list, retrieve) and download template
        if self.action in ['list', 'retrieve', 'download_template']:
            return [AllowAny()]
        return [IsSeller()]

# ==========================================
# Startup Sweep (run on app boot)
# ==========================================
def mark_stale_batches_as_failed():
    try:
        stale_time = timezone.now() - timedelta(minutes=10)
        stale_batches = UploadBatch.objects.filter(status='processing', created_at__lt=stale_time)
        count = stale_batches.update(status='failed', rejection_report={'error': 'Processing timeout - batch stuck for more than 10 minutes'})
        if count > 0:
            # FIX: Replaced print with logger.info
            logger.info(f"Marked {count} stale batches as failed")
    except Exception as e:
        # FIX: Replaced print with logger.warning
        logger.warning(f"Could not run startup sweep: {e}")