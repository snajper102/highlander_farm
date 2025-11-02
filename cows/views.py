# cows/views.py

from rest_framework import viewsets, status, filters, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
# === POPRAWKA: Usunięto CowDocument ===
from .models import Cow, Event 
from .serializers import (
    CowSerializer, 
    CowCreateUpdateSerializer, 
    CowListSerializer,
    EventSerializer,
    # Usunięto CowDocumentSerializer
    UserSerializer, 
    UserCreateSerializer, 
    UserPasswordUpdateSerializer 
)
from django.db import transaction, IntegrityError
import logging
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.contrib.auth.models import User 

# === NOWE IMPORTY DLA STATYSTYK ===
from datetime import date, timedelta
from django.db.models import Count
# ==================================

logger = logging.getLogger(__name__)

# === WIDOK SYNCHRONIZACJI (POPRAWIONY) ===
class SyncView(views.APIView):
    parser_classes = [JSONParser]
    permission_classes = [IsAuthenticated] 

    def post(self, request, *args, **kwargs):
        jobs = request.data.get('jobs', [])
        results = []
        temp_id_map = {} 
        try:
            with transaction.atomic():
                for job in jobs:
                    action = job.get('action'); payload = job.get('payload', {}); temp_id = job.get('tempId'); entity_id = job.get('entityId'); queue_id = job.get('id') 
                    job_result = {"queueId": queue_id, "tempId": temp_id, "entityId": entity_id, "action": action, "status": "pending"}
                    try:
                        if action == 'createCow':
                            payload.pop('id', None) 
                            serializer = CowCreateUpdateSerializer(data=payload)
                            if serializer.is_valid(raise_exception=True):
                                new_cow = serializer.save(); temp_id_map[temp_id] = new_cow.id; job_result.update(status="ok", realId=new_cow.id)
                        elif action == 'updateCow':
                            real_id = temp_id_map.get(entity_id, entity_id) 
                            if real_id < 0: job_result.update(status="merged", realId=real_id) 
                            else:
                                cow = Cow.objects.get(id=real_id); serializer = CowCreateUpdateSerializer(cow, data=payload, partial=True)
                                if serializer.is_valid(raise_exception=True): serializer.save(); job_result.update(status="ok", realId=real_id)
                        elif action == 'deleteCow': # Archiwizacja
                            real_id = temp_id_map.get(entity_id, entity_id)
                            if real_id > 0: 
                                cow = Cow.objects.get(id=real_id); cow.status = 'ARCHIVED'; cow.save()
                            job_result.update(status="ok", realId=real_id)
                        elif action == 'createEvent':
                            payload.pop('id', None); cow_id = payload.get('cow')
                            if cow_id in temp_id_map: payload['cow'] = temp_id_map[cow_id]
                            serializer = EventSerializer(data=payload, context={'request': request})
                            if serializer.is_valid(raise_exception=True):
                                new_event = serializer.save(); temp_id_map[temp_id] = new_event.id; job_result.update(status="ok", realId=new_event.id)
                        
                        # Usunięto 'deleteDocument'
                            
                        else: raise Exception(f"Nieznana akcja: {action}")
                    except IntegrityError as e: logger.warning(f"Błąd walidacji {job}: {str(e)}"); job_result.update(status="error", error=f"Błąd walidacji: {str(e)}")
                    # === POPRAWKA: Usunięto CowDocument.DoesNotExist ===
                    except Cow.DoesNotExist as e: 
                        logger.warning(f"Nie znaleziono obiektu {job}: {str(e)}"); job_result.update(status="error", error=str(e))
                    except Exception as e: logger.error(f"Błąd przetwarzania zadania {job}: {str(e)}"); job_result.update(status="error", error=str(e))
                    results.append(job_result)
            return Response({"status": "ok", "results": results}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Krytyczny błąd transakcji: {str(e)}")
            return Response({"status": "error", "message": f"Transakcja nie powiodła się: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

# === UserViewSet (BEZ ZMIAN) ===
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    permission_classes = [IsAuthenticated, IsAdminUser] 
    def get_serializer_class(self):
        if self.action == 'create': return UserCreateSerializer
        if self.action == 'set_password': return UserPasswordUpdateSerializer
        return UserSerializer
    @action(detail=True, methods=['post'], url_path='set-password')
    def set_password(self, request, pk=None):
        user = self.get_object(); serializer = self.get_serializer(user, data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save(); return Response({'status': 'hasło zmienione pomyślnie'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# === CowViewSet (Z POPRAWIONĄ AKCJĄ 'stats') ===
class CowViewSet(viewsets.ModelViewSet):
    queryset = Cow.objects.all().order_by('-created_at') 
    permission_classes = [IsAuthenticated] 
    pagination_class = None 
    parser_classes = (MultiPartParser, FormParser, JSONParser) 
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['gender', 'breed', 'status'] 
    search_fields = ['name', 'tag_id', 'breed']
    ordering_fields = ['created_at', 'birth_date', 'name', 'status'] 
    ordering = ['-created_at'] 
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']: return CowCreateUpdateSerializer
        if self.action == 'list': return CowListSerializer
        return CowSerializer 
    def get_serializer_context(self):
        context = super().get_serializer_context(); context.update({'request': self.request}); return context
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data); serializer.is_valid(raise_exception=True)
        instance = serializer.save(); headers = self.get_success_headers(serializer.data)
        response_serializer = CowSerializer(instance, context=self.get_serializer_context()) 
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False); instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial); serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        response_serializer = CowSerializer(instance, context=self.get_serializer_context())
        return Response(response_serializer.data)
    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True; return self.update(request, *args, **kwargs)
    def destroy(self, request, *args, **kwargs): # Archiwizacja
        instance = self.get_object(); cow_name = instance.name
        instance.status = 'ARCHIVED'; instance.save()
        return Response({'message': f'Krowa "{cow_name}" została zarchiwizowana'}, status=status.HTTP_200_OK)
    @action(detail=False, methods=['get'])
    def search(self, request):
        tag_id = request.query_params.get('tag_id', None)
        if not tag_id: return Response({'error': 'Brak parametru tag_id'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            cow = Cow.objects.get(tag_id=tag_id); serializer = CowSerializer(cow, context=self.get_serializer_context()); return Response(serializer.data)
        except Cow.DoesNotExist:
            return Response({'error': f'Krowa z tag_id "{tag_id}" nie została znaleziona'}, status=status.HTTP_404_NOT_FOUND)
    
    # === AKCJA 'stats' (DLA DASHBOARDU) ===
    @action(detail=False, methods=['get'])
    def stats(self, request):
        today = date.today()
        # Filtrujemy tylko aktywne krowy
        active_cows = Cow.objects.filter(status='ACTIVE')
        
        # 1. Podstawowe statystyki
        total = active_cows.count()
        by_gender = active_cows.values('gender').annotate(count=Count('id'))
        
        # 2. Histogram wieku
        age_bins = {'0-1': 0, '1-2': 0, '2-5': 0, '5-8': 0, '8+': 0}
        avg_age_sum = 0
        for cow in active_cows:
            age = today.year - cow.birth_date.year - ((today.month, today.day) < (cow.birth_date.month, cow.birth_date.day))
            avg_age_sum += age
            if age <= 1: age_bins['0-1'] += 1
            elif age <= 2: age_bins['1-2'] += 1
            elif age <= 5: age_bins['2-5'] += 1
            elif age <= 8: age_bins['5-8'] += 1
            else: age_bins['8+'] += 1
        
        avg_age = (avg_age_sum / total) if total > 0 else 0
        
        age_histogram_data = [
            {"name": "0-1 lat", "ilość": age_bins['0-1']},
            {"name": "1-2 lat", "ilość": age_bins['1-2']},
            {"name": "2-5 lat", "ilość": age_bins['2-5']},
            {"name": "5-8 lat", "ilość": age_bins['5-8']},
            {"name": "8+ lat", "ilość": age_bins['8+']},
        ]
        
        # 3. Nadchodzące zdarzenia (z 7 dni)
        next_7_days = today + timedelta(days=7)
        upcoming_events_qs = Event.objects.filter(
            cow__status='ACTIVE',
            date__gte=today, 
            date__lte=next_7_days
        ).order_by('date')
        
        # Używamy get_serializer_context, aby przekazać 'request'
        upcoming_events_data = EventSerializer(upcoming_events_qs, many=True, context=self.get_serializer_context()).data
        
        return Response({
            'total_active': total,
            'by_gender': list(by_gender),
            'average_age': round(avg_age, 1),
            'age_histogram': age_histogram_data,
            'upcoming_events': upcoming_events_data
        })
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_photo(self, request, pk=None):
        cow = self.get_object()
        if 'photo' not in request.FILES: return Response({'error': 'Brak pliku photo'}, status=status.HTTP_400_BAD_REQUEST)
        if cow.photo: cow.photo.delete(save=False)
        cow.photo = request.FILES['file']
        cow.save()
        serializer = CowSerializer(cow, context=self.get_serializer_context())
        return Response(serializer.data)

# === EventViewSet (BEZ ZMIAN) ===
class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated] 
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['cow'] 
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']
    def get_serializer_context(self):
        context = super().get_serializer_context(); context.update({'request': self.request}); return context

# === CowDocumentViewSet (USUNIĘTY) ===
# ...
