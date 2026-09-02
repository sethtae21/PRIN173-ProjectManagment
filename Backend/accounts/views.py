import csv
import io
import colorsys
from pathlib import Path
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db import transaction
from django.conf import settings
from django.http import HttpResponse
from django.core.files.base import ContentFile

from rest_framework import status, viewsets, parsers, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from PIL import Image
from rembg import remove

from .models import User, CatalogItem

# ==========================================
# Existing Function-Based Views (Preserved)
# ==========================================
def home(request):
    """Home page"""
    return render(request, 'accounts/home.html')

def register_view(request):
    """User registration (Function-based fallback)"""
    if request.method == 'POST':
        pass
    return render(request, 'accounts/register.html')

def login_view(request):
    """User login (Function-based fallback)"""
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
    """Seller dashboard - protected page"""
    return render(request, 'accounts/seller_dashboard.html')

def logout_view(request):
    """User logout"""
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
    class Meta:
        model = CatalogItem
        fields = '__all__'
        read_only_fields = ['seller', 'store_name', 'status', 'rejection_reason', 'created_at', 'updated_at']

class CSVUploadSerializer(serializers.Serializer):
    csv_file = serializers.FileField()
    images = serializers.ListField(
        child=serializers.FileField(),
        max_length=100,
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
    pass

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"detail": "Invalid token or already logged out."}, status=status.HTTP_400_BAD_REQUEST)

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
    
    def process_image_with_rembg(self, image_file):
        try:
            img_data = image_file.read()
            output = remove(img_data)
            img = Image.open(io.BytesIO(output))
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            return img_byte_arr
        except Exception as e:
            raise Exception(f"Background removal failed: {str(e)}")
    
    def extract_dominant_color(self, image_bytes):
        try:
            img = Image.open(image_bytes)
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
            'red': ['#ff', '#dc', '#e0'], 'blue': ['#00', '#1e', '#41'],
            'green': ['#00', '#22', '#2e'], 'black': ['#00', '#1a', '#2f'],
            'white': ['#ff', '#fa', '#f0'], 'gray': ['#80', '#a9', '#c0'],
            'brown': ['#65', '#8b', '#a0'],
        }
        declared_lower = str(declared_color).lower()
        for color_name, hex_prefixes in color_map.items():
            if color_name in declared_lower:
                if not any(dominant_hex.startswith(prefix) for prefix in hex_prefixes):
                    return False, f"Color mismatch: declared '{declared_color}' but image appears to be different color ({dominant_hex})"
        return True, "Color alignment OK"
        
    def generate_color_palette_tags(self, dominant_hex, color_family):
        tags = []
        try:
            r, g, b = int(dominant_hex[1:3], 16), int(dominant_hex[3:5], 16), int(dominant_hex[5:7], 16)
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
            tags.append('warm-tone' if h < 0.15 or h > 0.83 else 'cool-tone')
            tags.append('vibrant' if s > 0.6 else ('muted' if s > 0.3 else 'neutral'))
            tags.append('light' if v > 0.7 else ('medium' if v > 0.4 else 'dark'))
            if color_family:
                tags.append(f'{str(color_family).lower()}-family')
        except Exception:
            pass
        return tags


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
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def template(self, request):
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['name', 'description', 'category', 'size', 'color', 'color_description', 'color_family', 'price', 'style_tags', 'occasion_tags', 'front_image_filename', 'side_image_filename', 'rear_image_filename'])
        writer.writerow(['Classic White T-Shirt', 'Comfortable cotton t-shirt', 'tops', 'M', 'White', 'Pure white', 'white', '299.00', 'casual,basic', 'everyday', 'item1_front.jpg', 'item1_side.jpg', 'item1_rear.jpg'])
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="catalog_template.csv"'
        return response
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def instructions(self, request):
        instructions = """FITFUSION AI - SELLER CATALOG UPLOAD INSTRUCTIONS
1. Download the CSV template.
2. Fill in all required fields.
3. Provide 3 photos per item (Front, Side, Rear). Min 512x512px, Max 4096x4096px.
4. Filenames in CSV MUST match uploaded image files exactly.
5. Background removal is AUTOMATIC. Do not remove manually.
6. Upload CSV and images together. System will validate and generate a report."""
        response = HttpResponse(instructions, content_type='text/plain')
        response['Content-Disposition'] = 'attachment; filename="upload_instructions.txt"'
        return response
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def upload(self, request):
        if request.user.role != 'seller':
            return Response({'error': 'Only sellers can upload catalog items'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = CSVUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        csv_file = serializer.validated_data['csv_file']
        image_files = serializer.validated_data['images']
        image_map = {img.name: img for img in image_files}
        validator = CatalogValidator()
        
        accepted_items, rejected_items = [], []
        
        csv_file.seek(0)
        csv_content = csv_file.read().decode('utf-8')
        reader = csv.DictReader(io.StringIO(csv_content))
        
        with transaction.atomic():
            for row_number, row in enumerate(reader, start=2):
                item_errors = []
                row_valid, row_errors = validator.validate_csv_row(row, row_number)
                item_errors.extend(row_errors)
                
                if not row_valid:
                    rejected_items.append({'row': row_number, 'name': row.get('name', 'Unknown'), 'errors': item_errors})
                    continue
                
                front_filename, side_filename, rear_filename = row.get('front_image_filename', ''), row.get('side_image_filename', ''), row.get('rear_image_filename', '')
                
                for fname, view in [(front_filename, 'Front'), (side_filename, 'Side'), (rear_filename, 'Rear')]:
                    if fname not in image_map:
                        item_errors.append(f"Row {row_number}: {view} image not found: {fname}")
                
                if item_errors:
                    rejected_items.append({'row': row_number, 'name': row.get('name', 'Unknown'), 'errors': item_errors})
                    continue
                
                try:
                    front_img_bytes = validator.process_image_with_rembg(image_map[front_filename])
                    front_dominant_color = validator.extract_dominant_color(front_img_bytes)
                    side_img_bytes = validator.process_image_with_rembg(image_map[side_filename])
                    rear_img_bytes = validator.process_image_with_rembg(image_map[rear_filename])
                    
                    color_valid, color_msg = validator.validate_color_alignment(row.get('color', ''), front_dominant_color)
                    if not color_valid:
                        item_errors.append(color_msg)
                    
                    if item_errors:
                        rejected_items.append({'row': row_number, 'name': row.get('name', 'Unknown'), 'errors': item_errors})
                        continue
                    
                    palette_tags = validator.generate_color_palette_tags(front_dominant_color, row.get('color_family', ''))
                    style_tags = [tag.strip() for tag in str(row.get('style_tags', '')).split(',') if tag.strip()]
                    occasion_tags = [tag.strip() for tag in str(row.get('occasion_tags', '')).split(',') if tag.strip()]
                    
                    catalog_item = CatalogItem.objects.create(
                        name=row['name'], description=row['description'], category=str(row['category']).lower(),
                        size=row['size'], color=row['color'], color_description=row['color_description'],
                        color_family=row['color_family'], price=float(row['price']), style_tags=style_tags,
                        occasion_tags=occasion_tags, color_palette_tags=palette_tags, seller=request.user,
                        store_name=request.user.store_name or "Unknown Store", status='active'
                    )
                    
                    catalog_item.front_image.save(f"{row_number}_front.png", ContentFile(front_img_bytes.read()), save=False)
                    catalog_item.side_image.save(f"{row_number}_side.png", ContentFile(side_img_bytes.read()), save=False)
                    catalog_item.rear_image.save(f"{row_number}_rear.png", ContentFile(rear_img_bytes.read()), save=True)
                    
                    accepted_items.append({'row': row_number, 'name': row['name'], 'id': str(catalog_item.id), 'color_palette_tags': palette_tags})
                except Exception as e:
                    rejected_items.append({'row': row_number, 'name': row.get('name', 'Unknown'), 'errors': [f"Processing error: {str(e)}"]})
        
        return Response({
            'summary': {'total_processed': len(accepted_items) + len(rejected_items), 'accepted': len(accepted_items), 'rejected': len(rejected_items)},
            'accepted_items': accepted_items,
            'rejected_items': rejected_items,
            'message': f"Successfully processed {len(accepted_items)} items. {len(rejected_items)} items rejected."
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_listings(self, request):
        if request.user.role != 'seller':
            return Response({'error': 'Only sellers can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        return Response(CatalogItemSerializer(CatalogItem.objects.filter(seller=request.user), many=True).data)

    def perform_create(self, serializer):
        if self.request.user.role != 'seller':
            raise serializers.ValidationError("Only sellers can create catalog items")
        serializer.save(seller=self.request.user, store_name=self.request.user.store_name or "Unknown Store")

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'template', 'instructions']:
            return [AllowAny()]
        return [IsAuthenticated()]