from django.urls import path
from .views import OrderDetailView, OrderListCreateView

urlpatterns = [
    path("", OrderListCreateView.as_view()),
    path("<int:pk>/", OrderDetailView.as_view()),
]
