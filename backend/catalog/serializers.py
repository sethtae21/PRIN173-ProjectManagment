from rest_framework import serializers
from catalog.models import CatalogItem, UploadBatch


class CatalogItemSerializer(serializers.ModelSerializer):
    # ObjectId-safe string fields (prevents int(ObjectId) crash)
    id = serializers.CharField(read_only=True)
    seller = serializers.CharField(read_only=True, source='seller_id')
    batch = serializers.CharField(read_only=True, source='batch_id', allow_null=True)

    class Meta:
        model = CatalogItem
        fields = '__all__'
        read_only_fields = ['seller', 'store_name', 'status', 'rejection_reasons',
                            'created_at', 'updated_at', 'batch']


class UploadBatchSerializer(serializers.ModelSerializer):
    # ObjectId-safe string fields (prevents int(ObjectId) crash)
    id = serializers.CharField(read_only=True)
    seller = serializers.CharField(read_only=True, source='seller_id')

    class Meta:
        model = UploadBatch
        fields = ['id', 'seller', 'store_name', 'status', 'total_items',
                  'accepted_count', 'rejected_count', 'rejection_report',
                  'created_at', 'completed_at']
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