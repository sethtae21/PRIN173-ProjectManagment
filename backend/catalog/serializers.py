from rest_framework import serializers

from .models import CatalogItem, UploadBatch


class CatalogItemSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    seller = serializers.CharField(source='seller_id', read_only=True)
    batch = serializers.CharField(source='batch_id', read_only=True, allow_null=True)

    class Meta:
        model = CatalogItem
        fields = '__all__'


class UploadBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadBatch
        fields = '__all__'


class CSVUploadSerializer(serializers.Serializer):
    csv_file = serializers.FileField()
    images = serializers.ListField(child=serializers.ImageField(), required=False)
