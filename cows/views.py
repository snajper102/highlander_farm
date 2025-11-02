# cows/views.py

from rest_framework import viewsets, status, filters, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Cow, Event, CowDocument, Task, Herd 
from .serializers import (
    CowSerializer, 
    CowCreateUpdateSerializer, 
    CowListSerializer,
    EventSerializer,
    CowDocumentSerializer, 
    TaskSerializer, 
    HerdSerializer, 
    UserSerializer, 
    UserCreateSerializer, 
    UserPasswordUpdateSerializer,
    CowPedigreeSerializer,
    CowOffspringSerializer
)
from django.db import transaction, IntegrityError
import logging
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.contrib.auth.models import User 
from datetime import date, timedelta
from django.db.models import Count, Q 
import pandas as pd 

logger = logging.getLogger(__name__)

# === WIDOK SYNCHRONIZACJI (BEZ ZMIAN) ===
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
                        if action == 'createCow' or action == 'updateCow':
                            if 'dam' in payload and payload['dam'] in temp_id_map: payload['dam'] = temp_id_map[payload['dam']]
                            if 'sire' in payload and payload['sire'] in temp_id_map: payload['sire'] = temp_id_map[payload['sire']]
                            if action == 'createCow':
                                payload.pop('id', None); serializer = CowCreateUpdateSerializer(data=payload)
                            else: 
                                real_id = temp_id_map.get(entity_id, entity_id) 
                                if real_id < 0: job_result.update(status="merged", realId=real_id); continue
                                cow = Cow.objects.get(id=real_id); serializer = CowCreateUpdateSerializer(cow, data=payload, partial=True)
                            if serializer.is_valid(raise_exception=True):
                                saved_cow = serializer.save(); temp_id_map[temp_id or entity_id] = saved_cow.id; job_result.update(status="ok", realId=saved_cow.id)
                        elif action == 'deleteCow': # Archiwizacja
                            real_id = temp_id_map.get(entity_id, entity_id)
                            if real_id > 0: cow = Cow.objects.get(id=real_id); cow.status = 'ARCHIVED'; cow.save()
                            job_result.update(status="ok", realId=real_id)
                        elif action == 'createEvent':
                            payload.pop('id', None); cow_id = payload.get('cow')
                            if cow_id in temp_id_map: payload['cow'] = temp_id_map[payload['cow']]
                            serializer = EventSerializer(data=payload, context={'request': request})
                            if serializer.is_valid(raise_exception=True):
                                new_event = serializer.save(); temp_id_map[temp_id] = new_event.id; job_result.update(status="ok", realId=new_event.id)
                        elif action == 'deleteDocument':
                            real_id = temp_id_map.get(entity_id, entity_id)
                            if real_id > 0: CowDocument.objects.get(id=real_id).delete()
                            job_result.update(status="ok", realId=real_id)
                        elif action == 'createTask':
                            payload.pop('id', None); cow_id = payload.get('cow')
                            if cow_id and cow_id in temp_id_map: payload['cow'] = temp_id_map[cow_id]
                            serializer = TaskSerializer(data=payload, context={'request': request})
                            if serializer.is_valid(raise_exception=True):
                                new_task = serializer.save(); temp_id_map[temp_id] = new_task.id; job_result.update(status="ok", realId=new_task.id)
                        elif action == 'updateTask':
                            real_id = temp_id_map.get(entity_id, entity_id)
                            if real_id < 0: job_result.update(status="merged", realId=real_id)
                            else:
                                cow_id = payload.get('cow');
                                if cow_id and cow_id in temp_id_map: payload['cow'] = temp_id_map[cow_id]
                                task = Task.objects.get(id=real_id); serializer = TaskSerializer(task, data=payload, partial=True)
                                if serializer.is_valid(raise_exception=True): serializer.save(); job_result.update(status="ok", realId=real_id)
                        elif action == 'deleteTask':
                            real_id = temp_id_map.get(entity_id, entity_id)
                            if real_id > 0: Task.objects.get(id=real_id).delete()
                            job_result.update(status="ok", realId=real_id)
                        else: raise Exception(f"Nieznana akcja: {action}")
                    except IntegrityError as e: logger.warning(f"Błąd walidacji {job}: {str(e)}"); job_result.update(status="error", error=f"Błąd walidacji: {str(e)}")
                    except (Cow.DoesNotExist, CowDocument.DoesNotExist, Task.DoesNotExist) as e: 
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

# === HerdViewSet (BEZ ZMIAN) ===
class HerdViewSet(viewsets.ModelViewSet):
    queryset = Herd.objects.all()
    serializer_class = HerdSerializer
    permission_classes = [IsAuthenticated] 
    pagination_class = None

# === CowViewSet (POPRAWIONY IMPORT) ===
class CowViewSet(viewsets.ModelViewSet):
    queryset = Cow.objects.all().order_by('tag_id') 
    permission_classes = [IsAuthenticated] 
    pagination_class = None 
    parser_classes = (MultiPartParser, FormParser, JSONParser) 
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['gender', 'breed', 'status', 'herd'] 
    search_fields = ['name', 'tag_id', 'passport_number'] 
    ordering_fields = ['tag_id', 'name', 'birth_date', 'status', 'herd'] 
    ordering = ['tag_id'] 
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']: return CowCreateUpdateSerializer
        if self.action == 'list': return CowListSerializer
        if self.action == 'retrieve': return CowSerializer
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
    @action(detail=False, methods=['get'])
    def stats(self, request):
        today = date.today(); active_cows = Cow.objects.filter(status='ACTIVE')
        total = active_cows.count(); by_gender = active_cows.values('gender').annotate(count=Count('id'))
        age_bins = {'0-1': 0, '1-2': 0, '2-5': 0, '5-8': 0, '8+': 0}; avg_age_sum = 0
        for cow in active_cows:
            if not cow.birth_date: continue 
            age = today.year - cow.birth_date.year - ((today.month, today.day) < (cow.birth_date.month, cow.birth_date.day)); avg_age_sum += age
            if age <= 1: age_bins['0-1'] += 1
            elif age <= 2: age_bins['1-2'] += 1
            elif age <= 5: age_bins['2-5'] += 1
            elif age <= 8: age_bins['5-8'] += 1
            else: age_bins['8+'] += 1
        avg_age = (avg_age_sum / total) if total > 0 else 0
        age_histogram_data = [ {"name": "0-1 lat", "ilość": age_bins['0-1']}, {"name": "1-2 lat", "ilość": age_bins['1-2']}, {"name": "2-5 lat", "ilość": age_bins['2-5']}, {"name": "5-8 lat", "ilość": age_bins['5-8']}, {"name": "8+ lat", "ilość": age_bins['8+']}, ]
        next_7_days = today + timedelta(days=7)
        upcoming_tasks_qs = Task.objects.filter(is_completed=False, due_date__gte=today, due_date__lte=next_7_days).order_by('due_date')
        upcoming_tasks_data = TaskSerializer(upcoming_tasks_qs, many=True, context={'request': request}).data
        return Response({
            'total_active': total, 'by_gender': list(by_gender), 'average_age': round(avg_age, 1),
            'age_histogram': age_histogram_data, 'upcoming_events': upcoming_tasks_data
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
    @action(detail=True, methods=['get'])
    def pedigree(self, request, pk=None):
        try: cow = self.get_object()
        except Cow.DoesNotExist: return Response({"error": "Krowa nie znaleziona"}, status=status.HTTP_4LAG_NOT_FOUND)
        context = {'request': request} 
        ancestors_serializer = CowPedigreeSerializer(cow, context=context)
        offspring_qs = Cow.objects.filter(Q(dam=cow) | Q(sire=cow)).distinct()
        offspring_serializer = CowOffspringSerializer(offspring_qs, many=True, context=context)
        return Response({ "ancestors": ancestors_serializer.data, "offspring": offspring_serializer.data })

    # === POPRAWIONA AKCJA: IMPORT EXCEL ===
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser], url_path='import-excel')
    def import_excel(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "Brak pliku 'file'."}, status=status.HTTP_400_BAD_REQUEST)

        # === POPRAWKA: Funkcje czyszczące ===
        def clean_date(date_val):
            if pd.isna(date_val) or pd.isnull(date_val): return None
            try:
                dt = pd.to_datetime(date_val, errors='coerce')
                if pd.isna(dt): return None # Zwróć None jeśli data jest NaT
                return dt.date()
            except Exception: return None
                
        def clean_string(str_val):
            if pd.isna(str_val) or pd.isnull(str_val): return None
            return str(str_val).strip()
            
        def clean_float(float_val):
            if pd.isna(float_val) or pd.isnull(float_val): return None
            try: return float(float_val)
            except: return None
        # ========================================

        try:
            xls = pd.ExcelFile(file)
            created_count = 0; updated_count = 0; errors = []; parent_link_map = {}; all_imported_tags = set()
            with transaction.atomic():
                # --- PIERWSZA PĘTLA ---
                for sheet_name in xls.sheet_names:
                    herd_name = sheet_name.split(' ')[0].strip().upper()
                    if not herd_name:
                        errors.append(f"Arkus_ {sheet_name} ma nieprawidłową nazwę.")
                        continue
                    
                    herd, _ = Herd.objects.get_or_create(name=herd_name)
                    df = pd.read_excel(xls, sheet_name=sheet_name)
                    df.columns = [str(col).strip().upper() for col in df.columns]
                    
                    COLUMN_MAP = {
                        'NR ARIMR': 'tag_id', 'NAZWA': 'name', 'DATA UR': 'birth_date',
                        'PŁEĆ': 'gender', 'RASA': 'breed', 'NR PASZPORTU': 'passport_number',
                        'STATUS': 'status', 'NR MATKI': 'dam_tag', 'NR OJCA': 'sire_tag',
                        'DATA SPRZEDAŻY/PADNIĘCIA': 'exit_date', 'NABYWCA/PRZYCZYNA': 'exit_reason',
                        'KWOTA': 'sale_price', 'DOSTAWA MIĘSA': 'meat_delivery_date', 'UWAGI': 'notes',
                    }
                    df.rename(columns=COLUMN_MAP, inplace=True)
                    
                    for index, row in df.iterrows():
                        tag_id = clean_string(row.get('tag_id'))
                        if not tag_id:
                            errors.append(f"Arkus_ {sheet_name}, Wiersz {index + 2}: Brak 'NR ARIMR'")
                            continue
                        all_imported_tags.add(tag_id)
                        
                        gender_raw = clean_string(row.get('gender', '')) or ''
                        gender = 'F' if 'SAMICA' in gender_raw or 'JAŁÓWKA' in gender_raw else 'M'
                        status_raw = clean_string(row.get('status', '')) or ''
                        status = 'SOLD' if 'SPRZEDAN' in status_raw else \
                                 'ARCHIVED' if 'PADŁ' in status_raw else 'ACTIVE'

                        defaults = {
                            'herd': herd, 'name': row.get('name', f"Krowa {tag_id}"),
                            'gender': gender, 'status': status, 'breed': row.get('breed', 'Highland Cattle'),
                            'passport_number': clean_string(row.get('passport_number')),
                            'exit_reason': clean_string(row.get('exit_reason')), 'notes': clean_string(row.get('notes')),
                            'birth_date': clean_date(row.get('birth_date')), 'exit_date': clean_date(row.get('exit_date')),
                            'meat_delivery_date': clean_date(row.get('meat_delivery_date')),
                            'sale_price': clean_float(row.get('sale_price')),
                        }
                        
                        final_defaults = {k: v for k, v in defaults.items() if v is not None}
                        
                        try:
                            cow, created = Cow.objects.update_or_create(tag_id=tag_id, defaults=final_defaults)
                            if created: created_count += 1
                            else: updated_count += 1
                            parent_link_map[cow.id] = (
                                clean_string(row.get('dam_tag')), clean_string(row.get('sire_tag'))
                            )
                        except Exception as e:
                            errors.append(f"Arkus_ {sheet_name}, Wiersz {index + 2} (Tag: {tag_id}): Błąd zapisu - {str(e)}")

                # --- DRUGA PĘTLA: Łączenie Rodziców ---
                logger.info("Import: Rozpoczynam łączenie rodziców...")
                all_parent_tags = set()
                for dam_tag, sire_tag in parent_link_map.values():
                    if dam_tag: all_parent_tags.add(dam_tag)
                    if sire_tag: all_parent_tags.add(sire_tag)
                
                parents_in_db = Cow.objects.in_bulk(list(all_parent_tags), field_name='tag_id')
                
                for cow_id, (dam_tag, sire_tag) in parent_link_map.items():
                    dam = parents_in_db.get(dam_tag)
                    sire = parents_in_db.get(sire_tag)
                    if dam or sire:
                        Cow.objects.filter(id=cow_id).update(dam=dam, sire=sire)
                        
            return Response({
                "status": "ok", "created": created_count, "updated": updated_count, "errors": errors
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Krytyczny błąd importu Excela: {str(e)}")
            return Response({"error": f"Błąd przetwarzania pliku: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

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

# === CowDocumentViewSet (BEZ ZMIAN) ===
class CowDocumentViewSet(viewsets.ModelViewSet):
    queryset = CowDocument.objects.all()
    serializer_class = CowDocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser) 
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['cow']
    def get_serializer_context(self):
        context = super().get_serializer_context(); context.update({'request': self.request}); return context
    def create(self, request, *args, **kwargs):
        if 'file' not in request.FILES: return Response({"error": "Brak pliku 'file'."}, status=status.HTTP_400_BAD_REQUEST)
        if 'cow' not in request.data: return Response({"error": "Brak 'cow' ID."}, status=status.HTTP_400_BAD_REQUEST)
        file_obj = request.FILES['file']; title = request.data.get('title', file_obj.name)
        data = {'cow': request.data.get('cow'), 'title': title, 'file': file_obj}
        serializer = self.get_serializer(data=data); serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

# === TaskViewSet (BEZ ZMIAN) ===
class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = { 'cow': ['exact'], 'is_completed': ['exact'], 'due_date': ['gte', 'lte'], 'task_type': ['exact'], }
    search_fields = ['title', 'notes', 'cow__name', 'cow__tag_id']
    ordering_fields = ['due_date', 'created_at']
    ordering = ['due_date'] 
    def get_serializer_context(self):
        context = super().get_serializer_context(); context.update({'request': self.request}); return context
