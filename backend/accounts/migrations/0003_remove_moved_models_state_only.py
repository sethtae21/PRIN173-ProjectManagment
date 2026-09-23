from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0002_avatarpreset_cart_order_orderitem_outfit_cartitem_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.DeleteModel(name='AvatarPreset'),
                migrations.DeleteModel(name='Cart'),
                migrations.DeleteModel(name='CartItem'),
                migrations.DeleteModel(name='CatalogItem'),
                migrations.DeleteModel(name='Order'),
                migrations.DeleteModel(name='OrderItem'),
                migrations.DeleteModel(name='Outfit'),
                migrations.DeleteModel(name='UploadBatch'),
            ],
        ),
    ]
