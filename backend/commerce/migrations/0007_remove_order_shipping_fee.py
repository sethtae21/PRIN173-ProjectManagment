"""Drop Order.shipping_fee.

CHANGED: product discount and shipping fee were removed from the entire
commerce flow (cart, checkout, confirmation, order details, API). An order's
total_amount is now exactly the sum of its OrderItem prices, so the
shipping_fee column is no longer needed.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('commerce', '0006_cartitem_catalog_item_id_cartitem_item_name_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='order',
            name='shipping_fee',
        ),
    ]