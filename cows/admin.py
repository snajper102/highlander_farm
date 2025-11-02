# cows/admin.py
from django.contrib import admin
from .models import Cow, Event, CowDocument, Task 

@admin.register(Cow)
class CowAdmin(admin.ModelAdmin):
    list_display = ['tag_id', 'name', 'status', 'dam', 'sire', 'birth_date', 'gender']
    list_filter = ['status', 'breed', 'gender', 'birth_date']
    search_fields = ['tag_id', 'name']
    ordering = ['-created_at']
    autocomplete_fields = ['dam', 'sire']

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['cow', 'event_type', 'date', 'user']
    list_filter = ['event_type', 'date', 'user']
    search_fields = ['cow__name', 'cow__tag_id', 'notes']
    autocomplete_fields = ['cow'] 

@admin.register(CowDocument)
class CowDocumentAdmin(admin.ModelAdmin):
    list_display = ['cow', 'title', 'filename', 'user', 'uploaded_at']
    list_filter = ['user', 'uploaded_at']
    search_fields = ['cow__name', 'cow__tag_id', 'title']
    autocomplete_fields = ['cow']

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'cow', 'task_type', 'due_date', 'is_completed', 'user']
    list_filter = ['is_completed', 'task_type', 'due_date', 'user']
    search_fields = ['title', 'cow__name', 'cow__tag_id', 'notes']
    autocomplete_fields = ['cow']
    list_editable = ['is_completed'] 
