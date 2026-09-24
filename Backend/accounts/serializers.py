from rest_framework import serializers
from .models import User, CatalogItem
import csv
from io import StringIO

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'store_name', 'password']
        extra_kwargs = {'password': {'write_only': True}}
    
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class CatalogItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogItem
        fields = '__all__'
        read_only_fields = ['seller', 'store_name', 'status', 'rejection_reason']

class CSVUploadSerializer(serializers.Serializer):
    csv_file = serializers.FileField()
    images = serializers.ListField(
        child=serializers.FileField(),
        max_length=100,  # Max 10 items × 3 images × 3 (some buffer)
        write_only=True
    )
    
    def validate_csv_file(self, value):
        if not value.name.endswith('.csv'):
            raise serializers.ValidationError("File must be a CSV")
        return value
    
    def validate_images(self, value):
        # Validate image files
        allowed_extensions = ['.jpg', '.jpeg', '.png']
        for img in value:
            ext = Path(img.name).suffix.lower()
            if ext not in allowed_extensions:
                raise serializers.ValidationError(f"Invalid image format: {img.name}")
        return value