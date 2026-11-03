from django.db import transaction
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.models import Cart
from products.models import Product
from .models import Order, OrderItem
from .serializers import CheckoutSerializer, OrderSerializer, OrderStatusSerializer


def orders_for(user):
    """Customers see ONLY their own orders. Admins (staff) see all of them."""
    qs = Order.objects.prefetch_related("items__product").select_related("user")
    return qs if user.is_staff else qs.filter(user=user)


class OrderListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """GET /api/orders/  order history"""
        orders = orders_for(request.user)
        return Response(OrderSerializer(orders, many=True, context={"request": request}).data)

    @transaction.atomic  # all-or-nothing: if anything fails, nothing is saved
    def post(self, request):
        """POST /api/orders/  body: address fields. Builds the order from the saved cart."""
        s = CheckoutSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        cart = Cart.objects.filter(user=request.user).first()
        cart_items = list(cart.items.select_related("product")) if cart else []
        if not cart_items:
            return Response({"detail": "Your cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

        # Lock the product rows so two buyers can't both take the last item.
        products = {p.id: p for p in
                    Product.objects.select_for_update().filter(id__in=[i.product_id for i in cart_items])}

        total = 0
        for item in cart_items:
            product = products[item.product_id]
            if item.quantity > product.stock:
                return Response({"detail": f"Sorry, only {product.stock} of '{product.name}' left."},
                                status=status.HTTP_400_BAD_REQUEST)
            total += product.price * item.quantity  # price read from the DATABASE

        order = Order.objects.create(user=request.user, total_amount=total, **s.validated_data)
        for item in cart_items:
            product = products[item.product_id]
            OrderItem.objects.create(order=order, product=product, product_name=product.name,
                                     price=product.price, quantity=item.quantity)
            product.stock -= item.quantity
            product.save(update_fields=["stock"])

        cart.items.all().delete()
        return Response(OrderSerializer(order, context={"request": request}).data,
                        status=status.HTTP_201_CREATED)


class OrderDetailView(RetrieveUpdateAPIView):
    """
    GET   /api/orders/<id>/   a customer gets 404 for anyone else's order
    PATCH /api/orders/<id>/   admin only: change the status
    """
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return orders_for(self.request.user)

    def get_serializer_class(self):
        return OrderStatusSerializer if self.request.method == "PATCH" else OrderSerializer

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}

    def patch(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({"detail": "Only admins can update order status."},
                            status=status.HTTP_403_FORBIDDEN)
        return super().patch(request, *args, **kwargs)
