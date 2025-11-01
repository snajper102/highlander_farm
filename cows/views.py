# cows/views.py

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Cow, Event # Importuj Event
# Zmień importy serializerów
from .serializers import (
    CowSerializer, 
    CowCreateUpdateSerializer, 
    CowListSerializer,
    EventSerializer # Importuj EventSerializer
)

class CowViewSet(viewsets.ModelViewSet):
    """
    ViewSet dla pełnego CRUD krów.
    """
    queryset = Cow.objects.all()
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['gender', 'breed']
    search_fields = ['name', 'tag_id', 'breed']
    ordering_fields = ['created_at', 'birth_date', 'name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Użyj innego serializera dla różnych akcji"""
        if self.action in ['create', 'update', 'partial_update']:
            return CowCreateUpdateSerializer
        if self.action == 'list': 
            return CowListSerializer
        return CowSerializer # Domyślny (dla retrieve)
    
    def get_serializer_context(self):
        """Dodaj 'request' do kontekstu serializera"""
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save() 
        headers = self.get_success_headers(serializer.data)
        response_serializer = CowSerializer(instance, context=self.get_serializer_context()) 
        return Response(
            response_serializer.data, 
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        response_serializer = CowSerializer(instance, context=self.get_serializer_context())
        return Response(response_serializer.data)
    
    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        cow_name = instance.name
        self.perform_destroy(instance)
        return Response(
            {'message': f'Krowa "{cow_name}" została usunięta'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        tag_id = request.query_params.get('tag_id', None)
        if not tag_id:
            return Response(
                {'error': 'Brak parametru tag_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            cow = Cow.objects.get(tag_id=tag_id)
            serializer = CowSerializer(cow, context=self.get_serializer_context()) 
            return Response(serializer.data)
        except Cow.DoesNotExist:
            return Response(
                {'error': f'Krowa z tag_id "{tag_id}" nie została znaleziona'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        from django.db.models import Count
        from datetime import date
        total = Cow.objects.count()
        by_gender = Cow.objects.values('gender').annotate(count=Count('id'))
        by_breed = Cow.objects.values('breed').annotate(count=Count('id'))
        cows = Cow.objects.all()
        if cows.exists():
            ages = []
            today = date.today()
            for cow in cows:
                age = today.year - cow.birth_date.year - (
                    (today.month, today.day) < (cow.birth_date.month, cow.birth_date.day)
                )
                ages.append(age)
            avg_age = sum(ages) / len(ages) if ages else 0
        else:
            avg_age = 0
        return Response({
            'total': total,
            'by_gender': list(by_gender),
            'by_breed': list(by_breed),
            'average_age': round(avg_age, 1)
        })
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_photo(self, request, pk=None):
        cow = self.get_object()
        if 'photo' not in request.FILES:
            return Response(
                {'error': 'Brak pliku photo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if cow.photo:
            cow.photo.delete(save=False)
        cow.photo = request.FILES['photo']
        cow.save()
        serializer = CowSerializer(cow, context=self.get_serializer_context())
        return Response(serializer.data)

# === NOWY VIEWSET ===
class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet dla CRUD Zdarzeń.
    Filtruj po krowie: /api/events/?cow=1
    """
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    # TODO: Zmień na IsAuthenticated, gdy dodamy logowanie
    permission_classes = [] 
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['cow'] # Kluczowe dla /api/events/?cow=1
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']
