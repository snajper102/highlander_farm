# cows/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CowViewSet, EventViewSet, SyncView, UserViewSet, 
    CowDocumentViewSet, TaskViewSet 
)

router = DefaultRouter()
router.register(r'cows', CowViewSet) 
router.register(r'events', EventViewSet) 
router.register(r'users', UserViewSet) 
router.register(r'documents', CowDocumentViewSet) # <-- ZAREJESTRUJ
router.register(r'tasks', TaskViewSet) 

urlpatterns = [
    path('', include(router.urls)),
    path('sync/', SyncView.as_view(), name='sync'),
]
