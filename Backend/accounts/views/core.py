import csv
import io
import colorsys
import uuid
import os
import logging
import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db import transaction
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.core.files.base import ContentFile
from django.utils import timezone
from datetime import timedelta
from rest_framework import status, viewsets, parsers, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from PIL import Image
from rembg import remove
from bson.objectid import ObjectId
from pymongo import MongoClient

from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from ..models import User, CatalogItem, UploadBatch
from ..color_palette_config import get_palette_tags, COLOR_PALETTE_MAPPING

# HIGH PRIORITY FIX: Setup Python logging module
logger = logging.getLogger(__name__)

# ==========================================
# MongoDB Token Blacklist (Option B from Code Review)
# Bypasses Django ORM to avoid SimpleJWT admin autodiscover crashes.
# ==========================================
try:
    _mongo_client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
    _db = _mongo_client.get_database()
    token_blacklist_collection = _db['token_blacklist']
    # Create TTL index so expired tokens are automatically deleted by MongoDB
    token_blacklist_collection.create_index("expires_at", expireAfterSeconds=0)
except Exception as e:
    logger.warning(f"Could not connect to MongoDB for token blacklist: {e}")
    token_blacklist_collection = None

def _mongo_blacklist(self):
    """Custom blacklist method injected into SimpleJWT's RefreshToken"""
    if token_blacklist_collection is None:
        logger.warning("Token blacklist collection unavailable.")
        return
    jti = self['jti']
    exp = self['exp']
    token_blacklist_collection.update_one(
        {'jti': jti},
        {'$set': {'expires_at': datetime.datetime.fromtimestamp(exp, tz=datetime.timezone.utc)}},
        upsert=True
    )

# Monkey-patch SimpleJWT so BLACKLIST_AFTER_ROTATION = True works without the official app
RefreshToken.blacklist = _mongo_blacklist

# ==========================================
# Existing Function-Based Views (Preserved)
# ==========================================
def home(request):
    return render(request, 'accounts/test_upload.html')

def register_view(request):
    if request.method == 'POST':
        pass
    return render(request, 'accounts/register.html')

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('/')
        else:
            messages.error(request, 'Invalid username or password')
    return render(request, 'accounts/login.html')

@login_required
def seller_dashboard(request):
    return render(request, 'accounts/seller_dashboard.html')

def logout_view(request):
    logout(request)
    return redirect('/')

# ==========================================
# DRF Serializers
# ==========================================
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'store_name']
    
    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not any(c.isupper() for c in value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not any(c.islower() for c in value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not any(c.isdigit() for c in value):
            raise serializers.ValidationError("Password must contain at least one number.")
        if not any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        return value
    
    def create(self, validated_data):
        role = validated_data.get('role', 'user')
        if role == 'seller' and not validated_data.get('store_name'):
            raise serializers.ValidationError({"store_name": "Store name is required for sellers."})
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role=role,
            store_name=validated_data.get('store_name', '')
        )
        return user

class CatalogItemSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    seller = serializers.CharField(read_only=True, source='seller_id')
    batch = serializers.CharField(read_only=True, source='batch_id', allow_null=True)

    class Meta:
        model = CatalogItem
        fields = '__all__'
        read_only_fields = ['seller', 'store_name', 'status', 'rejection_reasons', 'created_at', 'updated_at', 'batch']

class UploadBatchSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    seller = serializers.CharField(read_only=True, source='seller_id')

    class Meta:
        model = UploadBatch
        fields = ['id', 'seller', 'store_name', 'status', 'total_items', 'accepted_count', 'rejected_count', 'rejection_report', 'created_at', 'completed_at']
        read_only_fields = ['seller', 'created_at']

class CSVUploadSerializer(serializers.Serializer):
    csv_file = serializers.FileField()
    images = serializers.ListField(
        child=serializers.FileField(),
        max_length=30,
        write_only=True
    )
    
    def validate_csv_file(self, value):
        if not value.name.lower().endswith('.csv'):
            raise serializers.ValidationError("File must be a CSV.")
        return value

# ==========================================
# DRF Views
# ==========================================
class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': {
                    'id': str(user.id), 'username': user.username, 'email': user.email,
                    'role': user.role, 'store_name': user.store_name
                },
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(TokenObtainPairView):
    pass

class CustomTokenRefreshView(TokenRefreshView):
    """
    Overrides default token refresh to check our raw MongoDB blacklist.
    """
    def post(self, request, *args, **kwargs):
        refresh_token_str = request.data.get('refresh')
        if refresh_token_str and token_blacklist_collection is not None:
            try:
                token = RefreshToken(refresh_token_str)
                jti = token['jti']
                if token_blacklist_collection.find_one({'jti': jti}):
                    raise InvalidToken('Token is blacklisted or has been rotated.')
            except TokenError:
                raise InvalidToken('Token is invalid or expired.')
        
        return super().post(request, *args, **kwargs)

class LogoutView(APIView):
    """
    Secure logout using raw PyMongo collection (Option B from Code Review).
    Bypasses SimpleJWT's incompatible ORM blacklist to satisfy RA 10173.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token_str = request.data.get("refresh")
            if refresh_token_str:
                token = RefreshToken(refresh_token_str)
                token.blacklist() # Calls our monkey-patched _mongo_blacklist
        except Exception as e:
            logger.warning(f"Logout token blacklist error: {e}")
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        return Response({
            'id': str(user.id), 'username': user.username, 'email': user.email,
            'role': user.role, 'store_name': user.store_name,
            'skin_tone': user.skin_tone, 'height': user.height,
            'weight': user.weight, 'body_proportions': user.body_proportions
        })
    
    def put(self, request):
        user = request.user
        user.skin_tone = request.data.get('skin_tone', user.skin_tone)
        user.height = request.data.get('height', user.height)
        user.weight = request.data.get('weight', user.weight)
        user.body_proportions = request.data.get('body_proportions', user.body_proportions)
        if user.role == 'seller':
            user.store_name = request.data.get('store_name', user.store_name)
        user.save()
        return Response({'detail': 'Profile updated successfully'})

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
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = CatalogItem.objects.filter(status='active')
        if category := self.request.query_params.get('category'):
            queryset = queryset.filter(category=category)
        if color := self.request.query_params.get('color'):
            queryset = queryset.filter(color_family__iexact=color)
        if size := self.request.query_params.get('size'):
            queryset = queryset.filter(size__icontains=size)
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
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], parser_classes=[parsers.MultiPartParser, parsers.FormParser])
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
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='batch-report')
    def batch_report(self, request):
        batch_id = request.query_params.get('batch_id')
        if not batch_id:
            return Response({'error': 'Batch ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            batch = UploadBatch.objects.get(id=batch_id, seller=request.user)
            return Response(UploadBatchSerializer(batch).data)
        except UploadBatch.DoesNotExist:
            try:
                batch = UploadBatch.objects.get(id=ObjectId(batch_id), seller=request.user)
                return Response(UploadBatchSerializer(batch).data)
            except UploadBatch.DoesNotExist:
                return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                return Response({'error': f'Invalid batch ID format: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Error retrieving batch: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        summary="Get seller's catalog items",
        description="Returns ALL catalog items (active and rejected) for the authenticated seller. Rejected items include rejection reasons.",
        responses={200: CatalogItemSerializer(many=True), 403: OpenApiTypes.OBJECT},
        tags=['Seller Listings']
    )
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
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
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='my-listings/(?P<item_id>[^/.]+)')
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
    @action(detail=False, methods=['put', 'patch'], permission_classes=[IsAuthenticated], url_path='my-listings/(?P<item_id>[^/.]+)')
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
    @action(detail=False, methods=['delete'], permission_classes=[IsAuthenticated], url_path='my-listings/(?P<item_id>[^/.]+)')
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
        if self.action in ['list', 'retrieve', 'download_template']:
            return [AllowAny()]
        return [IsAuthenticated()]

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