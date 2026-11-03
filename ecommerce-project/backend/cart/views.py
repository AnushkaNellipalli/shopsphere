from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product
from .models import Cart, CartItem
from .serializers import AddToCartSerializer, CartSerializer, UpdateQuantitySerializer


def get_user_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def cart_response(user, code=status.HTTP_200_OK):
    return Response(CartSerializer(get_user_cart(user)).data, status=code)


class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """GET /api/cart/  show my cart"""
        return cart_response(request.user)

    def delete(self, request):
        """DELETE /api/cart/  empty my cart"""
        get_user_cart(request.user).items.all().delete()
        return cart_response(request.user)


class CartItemsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """POST /api/cart/items/  body: {product_id, quantity}"""
        s = AddToCartSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        product = get_object_or_404(Product, pk=s.validated_data["product_id"])
        cart = get_user_cart(request.user)
        item, _ = CartItem.objects.get_or_create(cart=cart, product=product, defaults={"quantity": 0})
        new_qty = item.quantity + s.validated_data["quantity"]
        if new_qty > product.stock:
            if item.quantity == 0:
                item.delete()
            return Response({"detail": f"Only {product.stock} in stock for {product.name}."},
                            status=status.HTTP_400_BAD_REQUEST)
        item.quantity = new_qty
        item.save()
        return cart_response(request.user, status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_item(self, request, pk):
        # Only items inside MY cart can be found, so I can't touch other people's carts.
        return get_object_or_404(CartItem, pk=pk, cart__user=request.user)

    def patch(self, request, pk):
        """PATCH /api/cart/items/<id>/  body: {quantity}"""
        item = self.get_item(request, pk)
        s = UpdateQuantitySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        qty = s.validated_data["quantity"]
        if qty > item.product.stock:
            return Response({"detail": f"Only {item.product.stock} in stock."},
                            status=status.HTTP_400_BAD_REQUEST)
        item.quantity = qty
        item.save()
        return cart_response(request.user)

    def delete(self, request, pk):
        """DELETE /api/cart/items/<id>/"""
        self.get_item(request, pk).delete()
        return cart_response(request.user)
