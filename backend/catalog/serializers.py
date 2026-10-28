from rest_framework import serializers

from catalog.models import CatalogItem, UploadBatch
# Display-only size ranges + size-label format rule (pure module: no cycle risk).
from recommendations.knowledge_table import get_size_ranges, validate_size_label


class CatalogItemSerializer(serializers.ModelSerializer):
    # ObjectId-safe string fields (prevents int(ObjectId) crash)
    id = serializers.CharField(read_only=True)
    seller = serializers.CharField(read_only=True, source='seller_id')
    batch = serializers.CharField(read_only=True, source='batch_id', allow_null=True)

    # Computed at serialization time - NOT stored in MongoDB.
    # Gives the UI the cm bracket representation: "(96-102 cm)".
    size_cm = serializers.SerializerMethodField()
    # Footwear only: the triple regional display string, e.g.
    # "EU 40 · US 9 · UK 7". None for clothing sizes.
    size_regions = serializers.SerializerMethodField()

    class Meta:
        model = CatalogItem
        fields = '__all__'
        read_only_fields = ['seller', 'store_name', 'status', 'rejection_reasons',
                            'created_at', 'updated_at', 'batch']

    def get_size_cm(self, obj):
        ranges = get_size_ranges(obj.size)
        return ranges['cm'] if ranges else None

    def get_size_regions(self, obj):
        ranges = get_size_ranges(obj.size)
        return ranges['regions'] if ranges else None

    def validate_size(self, value):
        """Sellers may only store S/M/L labels (footwear: prefixed regional
        codes). Inch/cm entries are rejected on PUT/PATCH exactly as on CSV upload."""
        category = ''
        if isinstance(getattr(self, 'initial_data', None), dict):
            category = str(self.initial_data.get('category') or '').strip().lower()
        if not category and self.instance is not None:
            category = str(getattr(self.instance, 'category', '') or '').strip().lower()
        is_valid, error = validate_size_label(value, category)
        if not is_valid:
            raise serializers.ValidationError(error)
        return value


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
        max_length=20,  # 2 views (Front, Rear) x 10 items (MAX_BATCH_ITEMS)
        write_only=True
    )

    def validate_csv_file(self, value):
        if not value.name.lower().endswith('.csv'):
            raise serializers.ValidationError("File must be a CSV.")
        return value