# cows/serializers.py

from rest_framework import serializers
from .models import Cow, Event # Importuj Event

class CowSerializer(serializers.ModelSerializer):
    """Serializer do odczytu (GET) - z obliczonym wiekiem i pełnym URL zdjęcia"""
    age = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField() 

    class Meta:
        model = Cow
        fields = ['id', 'tag_id', 'name', 'breed', 'birth_date', 'gender', 'photo', 'age', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'age']

    def get_age(self, obj):
        from datetime import date
        today = date.today()
        age = today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day))
        return age

    def get_photo(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

class CowCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer do tworzenia/aktualizacji (POST/PUT/PATCH)"""
    
    class Meta:
        model = Cow
        fields = ['id', 'tag_id', 'name', 'breed', 'birth_date', 'gender', 'photo']
        extra_kwargs = {
            'photo': {'required': False, 'allow_null': True, 'read_only': True} 
        }

    def validate_tag_id(self, value):
        instance = getattr(self, 'instance', None)
        if instance and instance.tag_id == value:
            return value
                
        if Cow.objects.filter(tag_id=value).exists():
            raise serializers.ValidationError(f"Krowa z tag_id '{value}' już istnieje")
        return value
        
    def validate_birth_date(self, value):
        from datetime import date
        if value > date.today():
            raise serializers.ValidationError("Data urodzenia nie może być w przyszłości")
        return value

class CowListSerializer(serializers.ModelSerializer): 
    """Serializer dla listy (uproszczony)"""
    age = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()

    class Meta:
        model = Cow
        fields = ['id', 'tag_id', 'name', 'breed', 'birth_date', 'gender', 'photo', 'age'] 

    def get_age(self, obj):
        from datetime import date
        today = date.today()
        age = today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day))
        return age
    
    def get_photo(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

# === NOWY SERIALIZER ===
class EventSerializer(serializers.ModelSerializer):
    """Serializer dla zdarzeń"""
    
    # Wyświetlamy nazwę użytkownika, jeśli istnieje
    user = serializers.StringRelatedField(read_only=True)
    
    # Przekazujemy 'cow' jako ID przy tworzeniu
    cow = serializers.PrimaryKeyRelatedField(queryset=Cow.objects.all())

    class Meta:
        model = Event
        fields = ['id', 'cow', 'event_type', 'date', 'notes', 'user', 'created_at']
        read_only_fields = ['user', 'created_at'] # User będzie ustawiany automatycznie

    def create(self, validated_data):
        # TODO: Ustaw usera na podstawie requestu, gdy będzie logowanie
        # request = self.context.get('request')
        # if request and hasattr(request, 'user'):
        #     validated_data['user'] = request.user
        return super().create(validated_data)
