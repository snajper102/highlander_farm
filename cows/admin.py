# cows/admin.py
from django.contrib import admin
from .models import Cow, Event, CowDocument, Task, Herd 

@admin.register(Herd)
class HerdAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name']

@admin.register(Cow)
class CowAdmin(admin.ModelAdmin):
    list_display = ['tag_id', 'name', 'herd', 'status', 'dam', 'sire', 'birth_date', 'gender']
    list_filter = ['status', 'herd', 'breed', 'gender', 'birth_date']
    search_fields = ['tag_id', 'name', 'passport_number', 'business_number']
    ordering = ['tag_id']
    autocomplete_fields = ['dam', 'sire', 'herd']
    
    fieldsets = (
        (None, {
            'fields': ('tag_id', 'name', 'herd', 'status')
        }),
        ('Dane Podstawowe', {
            'fields': ('birth_date', 'gender', 'breed', 'color', 'passport_number', 'business_number', 'photo')
        }),
        ('Rodowód', {
            'fields': ('dam', 'sire')
        }),
        ('Dane Hodowlane', {
            'classes': ('collapse',),
            'fields': ('weight', 'daily_weight_gain', 'pregnancy_duration', 'is_pregnancy_possible')
        }),
        ('Zarządzanie', {
            'classes': ('collapse',),
            'fields': ('relocation_status', 'duplicates_to_make', 'duplicates_to_order', 'relocation_after_drive', 'notes')
        }),
        ('Dane Wyjścia', {
            'classes': ('collapse',),
            'fields': ('exit_date', 'exit_reason', 'sale_price', 'meat_delivery_date')
        }),
    )

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
