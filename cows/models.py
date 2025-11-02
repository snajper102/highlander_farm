# cows/models.py
from django.db import models
from django.conf import settings

class Cow(models.Model):
    GENDER_CHOICES = [
        ('M', 'Samiec'),
        ('F', 'Samica'),
    ]
    
    # === NOWE POLE STATUS ===
    STATUS_CHOICES = [
        ('ACTIVE', 'Aktywna'),
        ('SOLD', 'Sprzedana'),
        ('ARCHIVED', 'Zarchiwizowana'),
    ]
    
    tag_id = models.CharField(max_length=50, unique=True, verbose_name="Numer kolczyka")
    name = models.CharField(max_length=100, verbose_name="Imię")
    breed = models.CharField(max_length=100, default="Highland Cattle", verbose_name="Rasa")
    birth_date = models.DateField(verbose_name="Data urodzenia")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='F', verbose_name="Płeć")
    photo = models.ImageField(upload_to='cows/', blank=True, null=True, verbose_name="Zdjęcie")
    
    # Dodajemy status, domyślnie 'Aktywna'
    status = models.CharField(
        max_length=10, 
        choices=STATUS_CHOICES, 
        default='ACTIVE', 
        verbose_name="Status",
        db_index=True # Dodajemy indeks dla szybszego filtrowania
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        # Usuwamy domyślne sortowanie, będzie w widoku
        # ordering = ['-created_at'] 
        verbose_name = "Krowa"
        verbose_name_plural = "Krowy"
    
    def __str__(self):
        return f"{self.tag_id} - {self.name}"

# === Model Event (bez zmian) ===
class Event(models.Model):
    EVENT_TYPE_CHOICES = [
        ('LECZENIE', 'Leczenie'),
        ('SZCZEPIENIE', 'Szczepienie'),
        ('WYCIELENIE', 'Wycielenie'),
        ('KONTROLA', 'Kontrola'),
        ('INNE', 'Inne'),
    ]
    
    cow = models.ForeignKey(Cow, on_delete=models.CASCADE, related_name='events', verbose_name="Krowa")
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES, default='INNE', verbose_name="Typ zdarzenia")
    date = models.DateField(verbose_name="Data zdarzenia")
    notes = models.TextField(blank=True, null=True, verbose_name="Notatki")
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        verbose_name="Operator"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date', '-created_at'] 
        verbose_name = "Zdarzenie"
        verbose_name_plural = "Zdarzenia"

    def __str__(self):
        return f"[{self.cow.name}] - {self.event_type} ({self.date})"
