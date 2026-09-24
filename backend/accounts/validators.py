from PIL import Image
import io
from rembg import remove
import colorsys
from collections import Counter

class CatalogValidator:
    """
    Validation algorithm for Seller-uploaded catalog items (SRS FR-4.7)
    """
    
    MIN_IMAGE_DIMENSION = 512
    MAX_IMAGE_DIMENSION = 4096
    REQUIRED_FIELDS = [
        'name', 'description', 'category', 'size', 'color', 
        'color_description', 'color_family', 'price',
        'front_image_filename', 'side_image_filename', 'rear_image_filename'
    ]
    
    def __init__(self):
        self.errors = []
        self.warnings = []
    
    def validate_csv_row(self, row, row_number):
        """Validate a single CSV row"""
        self.errors = []
        self.warnings = []
        
        # Check required fields
        for field in self.REQUIRED_FIELDS:
            if field not in row or not row[field].strip():
                self.errors.append(f"Row {row_number}: Missing required field '{field}'")
        
        # Validate price
        if 'price' in row:
            try:
                price = float(row['price'])
                if price <= 0:
                    self.errors.append(f"Row {row_number}: Price must be positive")
            except ValueError:
                self.errors.append(f"Row {row_number}: Invalid price format")
        
        # Validate category
        valid_categories = ['tops', 'bottoms', 'dresses', 'outerwear', 'footwear']
        if 'category' in row and row['category'].lower() not in valid_categories:
            self.errors.append(f"Row {row_number}: Invalid category '{row['category']}'")
        
        return len(self.errors) == 0, self.errors
    
    def validate_image(self, image_file, expected_filename, row_number, view_type):
        """Validate a single image file"""
        errors = []
        
        # Check filename match
        if image_file.name != expected_filename:
            errors.append(f"Row {row_number}: {view_type} image filename mismatch. Expected: {expected_filename}, Got: {image_file.name}")
        
        # Open and validate image
        try:
            img = Image.open(image_file)
            
            # Check dimensions
            width, height = img.size
            if width < self.MIN_IMAGE_DIMENSION or height < self.MIN_IMAGE_DIMENSION:
                errors.append(f"Row {row_number}: {view_type} image too small. Min: {self.MIN_IMAGE_DIMENSION}px, Got: {width}x{height}px")
            
            if width > self.MAX_IMAGE_DIMENSION or height > self.MAX_IMAGE_DIMENSION:
                errors.append(f"Row {row_number}: {view_type} image too large. Max: {self.MAX_IMAGE_DIMENSION}px, Got: {width}x{height}px")
            
            # Check image mode
            if img.mode not in ['RGB', 'RGBA', 'L']:
                errors.append(f"Row {row_number}: {view_type} image has invalid color mode: {img.mode}")
        
        except Exception as e:
            errors.append(f"Row {row_number}: {view_type} image is corrupted or invalid: {str(e)}")
        
        return errors
    
    def process_image_with_rembg(self, image_file):
        """
        Remove background using rembg library
        Returns: processed image as bytes
        """
        try:
            # Read image
            img_data = image_file.read()
            
            # Remove background
            output = remove(img_data)
            
            # Verify transparency
            img = Image.open(io.BytesIO(output))
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # Ensure alpha channel exists
            if 'A' not in img.getbands():
                # Add alpha channel with full opacity
                img = img.convert('RGBA')
            
            # Convert back to bytes
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            
            return img_byte_arr
        
        except Exception as e:
            raise Exception(f"Background removal failed: {str(e)}")
    
    def extract_dominant_color(self, image_bytes):
        """
        Extract dominant color from image using Pillow
        Returns: hex color code
        """
        try:
            img = Image.open(image_bytes)
            
            # Resize for faster processing
            img = img.resize((150, 150), Image.Resampling.LANCZOS)
            
            # Get colors
            colors = img.getcolors(150 * 150)
            
            # Sort by frequency
            sorted_colors = sorted(colors, key=lambda x: x[0], reverse=True)
            
            # Get most common non-transparent color
            for count, color in sorted_colors:
                if len(color) == 4 and color[3] < 128:  # Skip transparent pixels
                    continue
                if len(color) >= 3:
                    r, g, b = color[:3]
                    return f"#{r:02x}{g:02x}{b:02x}"
            
            return "#000000"
        
        except Exception as e:
            return "#000000"
    
    def validate_color_alignment(self, declared_color, dominant_hex):
        """
        Basic image-text alignment check
        Compares declared color with dominant color from image
        Returns: (is_valid, message)
        """
        # Simple color name to hex mapping
        color_map = {
            'red': ['#ff', '#dc', '#e0'],
            'blue': ['#00', '#1e', '#41'],
            'green': ['#00', '#22', '#2e'],
            'black': ['#00', '#1a', '#2f'],
            'white': ['#ff', '#fa', '#f0'],
            'gray': ['#80', '#a9', '#c0'],
            'brown': ['#65', '#8b', '#a0'],
        }
        
        declared_lower = declared_color.lower()
        
        # Check if declared color matches dominant color
        for color_name, hex_prefixes in color_map.items():
            if color_name in declared_lower:
                if not any(dominant_hex.startswith(prefix) for prefix in hex_prefixes):
                    return False, f"Color mismatch: declared '{declared_color}' but image appears to be different color ({dominant_hex})"
        
        return True, "Color alignment OK"
    
    def generate_color_palette_tags(self, dominant_hex, color_family):
        """
        Auto-generate color palette tags based on dominant color
        Returns: list of palette tags
        """
        tags = []
        
        # Convert hex to RGB
        r = int(dominant_hex[1:3], 16)
        g = int(dominant_hex[3:5], 16)
        b = int(dominant_hex[5:7], 16)
        
        # Convert to HSV
        h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
        
        # Determine temperature
        if h < 0.15 or h > 0.83:
            tags.append('warm-tone')
        else:
            tags.append('cool-tone')
        
        # Determine saturation level
        if s > 0.6:
            tags.append('vibrant')
        elif s > 0.3:
            tags.append('muted')
        else:
            tags.append('neutral')
        
        # Determine brightness
        if v > 0.7:
            tags.append('light')
        elif v > 0.4:
            tags.append('medium')
        else:
            tags.append('dark')
        
        # Add color family
        if color_family:
            tags.append(f'{color_family.lower()}-family')
        
        return tags