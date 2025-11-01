# cows/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CowViewSet, EventViewSet # Importuj EventViewSet

router = DefaultRouter()
router.register(r'cows', CowViewSet)
router.register(r'events', EventViewSet) # Rejestrujemy nowy endpoint

urlpatterns = [
    path('', include(router.urls)),
]
