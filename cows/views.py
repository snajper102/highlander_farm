# cows/views.py

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Cow
# Zmień importy serializerów
from .serializers import (
    CowSerializer,
    CowCreateUpdateSerializer,
    CowListSerializer
)


class CowViewSet(viewsets.ModelViewSet):
    """
    ViewSet dla pełnego CRUD krów:
    - GET /api/cows/ - lista wszystkich krów
    - POST /api/cows/ - dodanie nowej krowy
    - GET /api/cows/{id}/ - szczegóły krowy
    - PUT /api/cows/{id}/ - aktualizacja krowy (całościowa)
    - PATCH /api/cows/{id}/ - aktualizacja krowy (częściowa)
    - DELETE /api/cows/{id}/ - usunięcie krowy
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
        if self.action == 'list':  # <-- DODAJ TO
            return CowListSerializer
        return CowSerializer  # Domyślny (dla retrieve)

    def get_serializer_context(self):
        """Dodaj 'request' do kontekstu serializera"""
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context

    def create(self, request, *args, **kwargs):
        """POST /api/cows/ - Dodanie nowej krowy"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Zmieniona logika: zapisz instancję
        instance = serializer.save()  # <-- ZMIANA

        headers = self.get_success_headers(serializer.data)

        # Zwróć dane używając pełnego serializera (z wiekiem i URL-em zdjęcia)
        response_serializer = CowSerializer(instance, context=self.get_serializer_context())  # <-- ZMIANA

        return Response(
            response_serializer.data,  # <-- ZMIANA
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    def update(self, request, *args, **kwargs):
        """PUT /api/cows/{id}/ - Pełna aktualizacja krowy"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Zwróć dane z głównym serializerem (z wyliczonym wiekiem)
        response_serializer = CowSerializer(instance, context=self.get_serializer_context())
        return Response(response_serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """PATCH /api/cows/{id}/ - Częściowa aktualizacja krowy"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """DELETE /api/cows/{id}/ - Usunięcie krowy"""
        instance = self.get_object()
        cow_name = instance.name
        self.perform_destroy(instance)
        return Response(
            {'message': f'Krowa "{cow_name}" została usunięta'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def search(self, request):
        """GET /api/cows/search/?tag_id=XXX - Wyszukiwanie krowy po tag_id"""
        tag_id = request.query_params.get('tag_id', None)
        if not tag_id:
            return Response(
                {'error': 'Brak parametru tag_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            cow = Cow.objects.get(tag_id=tag_id)
            serializer = CowSerializer(cow, context=self.get_serializer_context())  # <-- ZMIANA
            return Response(serializer.data)
        except Cow.DoesNotExist:
            return Response(
                {'error': f'Krowa z tag_id "{tag_id}" nie została znaleziona'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """GET /api/cows/stats/ - Statystyki stada"""
        from django.db.models import Count, Avg
        from datetime import date

        total = Cow.objects.count()
        by_gender = Cow.objects.values('gender').annotate(count=Count('id'))
        by_breed = Cow.objects.values('breed').annotate(count=Count('id'))

        # Średni wiek
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
        """POST /api/cows/{id}/upload_photo/ - Upload zdjęcia"""
        cow = self.get_object()
        if 'photo' not in request.FILES:
            return Response(
                {'error': 'Brak pliku photo'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Usuń stare zdjęcie, jeśli istnieje
        if cow.photo:
            cow.photo.delete(save=False)

        cow.photo = request.FILES['photo']
        cow.save()

        serializer = CowSerializer(cow, context=self.get_serializer_context())
        return Response(serializer.data)