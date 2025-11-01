# cows/admin.py
from django.contrib import admin
from .models import Cow, Event # Dodaj Event

@admin.register(Cow)
class CowAdmin(admin.ModelAdmin):
    list_display = ['tag_id', 'name', 'breed', 'birth_date', 'gender', 'created_at']
    list_filter = ['breed', 'gender', 'birth_date']
    search_fields = ['tag_id', 'name']
    ordering = ['-created_at']

# === NOWA REJESTRACJA ===
@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['cow', 'event_type', 'date', 'user']
    list_filter = ['event_type', 'date', 'user']
    search_fields = ['cow__name', 'cow__tag_id', 'notes']
    autocomplete_fields = ['cow'] # Lepsze wyszukiwanie krowy
