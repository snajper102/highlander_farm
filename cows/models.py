# cows/models.py
from django.db import models
from django.conf import settings
import os

# === NOWY MODEL: STADO ===
class Herd(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Nazwa stada")
    description = models.TextField(blank=True, null=True, verbose_name="Opis")
    
    class Meta:
        verbose_name = "Stado"
        verbose_name_plural = "Stada"
        ordering = ['name']
        
    def __str__(self):
        return self.name

# === ZAKTUALIZOWANY MODEL: KROWA (WSZYSTKIE POLA) ===
class Cow(models.Model):
    GENDER_CHOICES = [ ('M', 'Samiec'), ('F', 'Samica'), ]
    STATUS_CHOICES = [ 
        ('ACTIVE', 'Aktywna'), 
        ('SOLD', 'Sprzedana'), 
        ('ARCHIVED', 'Zarchiwizowana'), 
    ]
    
    # === Identyfikacja i Stado ===
    herd = models.ForeignKey(
        Herd, on_delete=models.SET_NULL, null=True, blank=True, 
        related_name='cows', verbose_name="Stado"
    )
    tag_id = models.CharField(max_length=50, unique=True, verbose_name="NR ARIMR")
    name = models.CharField(max_length=100, verbose_name="NAZWA")
    passport_number = models.CharField(max_length=100, blank=True, null=True, verbose_name="NR PASZPORTU")
    business_number = models.CharField(max_length=100, blank=True, null=True, verbose_name="Numer działalności")

    # === Podstawowe Dane ===
    birth_date = models.DateField(verbose_name="DATA UR", null=True, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, verbose_name="PŁEĆ", default='F')
    breed = models.CharField(max_length=100, blank=True, null=True, verbose_name="RASA")
    color = models.CharField(max_length=100, blank=True, null=True, verbose_name="MAŚĆ")
    
    # === Rodowód ===
    dam = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, 
        related_name='offspring_dam', verbose_name="NR MATKI"
    )
    sire = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, 
        related_name='offspring_sire', verbose_name="NR OJCA"
    )
    
    # === Status i Wyjście ===
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE', verbose_name="STATUS", db_index=True)
    exit_date = models.DateField(verbose_name="DATA SPRZEDAŻY/PADNIĘCIA", null=True, blank=True)
    exit_reason = models.CharField(max_length=255, blank=True, null=True, verbose_name="NABYWCA/PRZYCZYNA")
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="KWOTA")
    meat_delivery_date = models.DateField(verbose_name="DOSTAWA MIĘSA", null=True, blank=True)
    
    # === Dane Hodowlane ===
    weight = models.FloatField(null=True, blank=True, verbose_name="WAGA")
    daily_weight_gain = models.FloatField(null=True, blank=True, verbose_name="PRZYROST/DZIEŃ")
    pregnancy_duration = models.CharField(max_length=100, blank=True, null=True, verbose_name="DŁUGOŚĆ ISTNIEJĄCEJ CIĄŻY")
    is_pregnancy_possible = models.CharField(max_length=100, blank=True, null=True, verbose_name="MOŻLIWOŚĆ BYCIA CIELNĄ")

    # === Zarządzanie / Notatki ===
    relocation_status = models.CharField(max_length=255, blank=True, null=True, verbose_name="RELOKACJA")
    duplicates_to_make = models.CharField(max_length=255, blank=True, null=True, verbose_name="Duplikaty do założenia")
    duplicates_to_order = models.CharField(max_length=255, blank=True, null=True, verbose_name="Zamówić kolczyki duplikaty")
    relocation_after_drive = models.CharField(max_length=255, blank=True, null=True, verbose_name="Relokacja po przepędzie")
    notes = models.TextField(blank=True, null=True, verbose_name="UWAGI")

    # === Pola Aplikacji ===
    photo = models.ImageField(upload_to='cows/', blank=True, null=True, verbose_name="Zdjęcie (z aplikacji)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Krowa"
        verbose_name_plural = "Krowy"
        ordering = ['tag_id']
    
    def __str__(self):
        return f"{self.tag_id} - {self.name}"

# === Modele Event, Document, Task (BEZ ZMIAN) ===
class Event(models.Model):
    EVENT_TYPE_CHOICES = [
        ('LECZENIE', 'Leczenie'), ('SZCZEPIENIE', 'Szczepienie'),
        ('WYCIELENIE', 'Wycielenie'), ('KONTROLA', 'Kontrola'), ('INNE', 'Inne'),
    ]
    cow = models.ForeignKey(Cow, on_delete=models.CASCADE, related_name='events', verbose_name="Krowa")
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES, default='INNE', verbose_name="Typ zdarzenia")
    date = models.DateField(verbose_name="Data zdarzenia")
    notes = models.TextField(blank=True, null=True, verbose_name="Notatki")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Operator")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-date', '-created_at'] 
        verbose_name = "Zdarzenie (Historia)"
        verbose_name_plural = "Zdarzenia (Historia)"
    def __str__(self):
        return f"[{self.cow.name}] - {self.event_type} ({self.date})"

class CowDocument(models.Model):
    cow = models.ForeignKey(Cow, on_delete=models.CASCADE, related_name='documents', verbose_name="Krowa")
    title = models.CharField(max_length=200, verbose_name="Tytuł / Opis")
    file = models.FileField(upload_to='documents/', verbose_name="Plik")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Przesłane przez")
    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = "Dokument krowy"
        verbose_name_plural = "Dokumenty krów"
    def __str__(self):
        return f"{self.cow.name} - {self.title}"
    @property
    def filename(self):
        return os.path.basename(self.file.name)

class Task(models.Model):
    TASK_TYPE_CHOICES = [
        ('WETERYNARZ', 'Wizyta weterynarza'),
        ('SZCZEPIENIE', 'Zaplanuj szczepienie'),
        ('BADANIE', 'Zaplanuj badanie'),
        ('PIELĘGNACJA', 'Pielęgnacja (np. korekcja racic)'),
        ('INNE', 'Inne zadanie'),
    ]
    cow = models.ForeignKey(Cow, on_delete=models.CASCADE, related_name='tasks', verbose_name="Krowa", null=True, blank=True)
    title = models.CharField(max_length=200, verbose_name="Tytuł zadania")
    task_type = models.CharField(max_length=50, choices=TASK_TYPE_CHOICES, default='INNE', verbose_name="Typ zadania")
    due_date = models.DateField(verbose_name="Termin wykonania", db_index=True)
    notes = models.TextField(blank=True, null=True, verbose_name="Notatki")
    is_completed = models.BooleanField(default=False, verbose_name="Wykonane", db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Operator")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['due_date', 'created_at'] 
        verbose_name = "Zadanie (Kalendarz)"
        verbose_name_plural = "Zadania (Kalendarz)"
    def __str__(self):
        return f"{self.title} (do {self.due_date})"
