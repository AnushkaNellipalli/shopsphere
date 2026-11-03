from rest_framework import viewsets
from .models import Category, Product
from .permissions import IsAdminOrReadOnly
from .serializers import CategorySerializer, ProductSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    """GET /api/categories/  (public)   POST/PUT/DELETE (admin only)"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None  # the category list is small, so return it all


class ProductViewSet(viewsets.ModelViewSet):
    """
    GET /api/products/                     list
    GET /api/products/?search=shoe         search by name/description
    GET /api/products/?category=shoes      filter by category slug
    GET /api/products/?ordering=price      sort by price (use -price for high to low)
    GET /api/products/?featured=true       featured products only
    GET /api/products/5/                   details
    POST/PUT/PATCH/DELETE                  admin only
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = Product.objects.select_related("category")
        params = self.request.query_params

        search = params.get("search")
        if search:
            # SQL: WHERE name LIKE '%search%' OR description LIKE '%search%'
            from django.db.models import Q
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))

        category = params.get("category")
        if category:
            qs = qs.filter(category__slug=category)

        if params.get("featured") == "true":
            qs = qs.filter(is_featured=True)

        ordering = params.get("ordering")
        if ordering in ("price", "-price", "created_at", "-created_at"):
            qs = qs.order_by(ordering)
        return qs
