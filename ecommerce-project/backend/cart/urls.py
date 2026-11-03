from django.urls import path
from .views import CartItemDetailView, CartItemsView, CartView

urlpatterns = [
    path("", CartView.as_view()),
    path("items/", CartItemsView.as_view()),
    path("items/<int:pk>/", CartItemDetailView.as_view()),
]
