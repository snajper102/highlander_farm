from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CowViewSet

router = DefaultRouter()
router.register(r'cows', CowViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
