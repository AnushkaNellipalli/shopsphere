import re
from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "product_image", "price", "quantity", "subtotal"]

    def get_product_image(self, item):
        if item.product and item.product.image:
            request = self.context.get("request")
            url = item.product.image.url
            return request.build_absolute_uri(url) if request else url
        return None


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Order
        fields = ["id", "username", "status", "full_name", "phone", "address_line", "city",
                  "state", "pincode", "total_amount", "created_at", "items"]


class CheckoutSerializer(serializers.Serializer):
    """Only the address comes from the browser. Prices and totals are NEVER accepted from it."""
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)
    address_line = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    pincode = serializers.CharField(max_length=10)

    def validate_phone(self, value):
        if not re.fullmatch(r"[0-9+\-\s]{10,15}", value):
            raise serializers.ValidationError("Enter a valid phone number (10-15 digits).")
        return value

    def validate_pincode(self, value):
        if not re.fullmatch(r"[0-9]{6}", value):
            raise serializers.ValidationError("Pincode must be 6 digits.")
        return value


class OrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["status"]
