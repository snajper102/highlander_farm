from rest_framework import serializers
from .models import Cow


class CowSerializer(serializers.ModelSerializer):
    """Serializer do odczytu (GET) - z obliczonym wiekiem"""
    age = serializers.SerializerMethodField()

    class Meta:
        model = Cow
        fields = ['id', 'tag_id', 'name', 'breed', 'birth_date', 'gender', 'photo', 'age', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'age']

    def get_age(self, obj):
        from datetime import date
        today = date.today()
        age = today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day))
        return age


class CowCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer do tworzenia/aktualizacji (POST/PUT/PATCH)"""

    class Meta:
        model = Cow
        fields = ['id', 'tag_id', 'name', 'breed', 'birth_date', 'gender', 'photo']
        extra_kwargs = {
            'photo': {'required': False, 'allow_null': True}
        }

    def validate_tag_id(self, value):
        """Sprawdź unikalność tag_id przy tworzeniu/aktualizacji"""
        instance = getattr(self, 'instance', None)
        if instance and instance.tag_id == value:
            return value

        if Cow.objects.filter(tag_id=value).exists():
            raise serializers.ValidationError(f"Krowa z tag_id '{value}' już istnieje")
        return value

    def validate_birth_date(self, value):
        """Sprawdź czy data urodzenia nie jest w przyszłości"""
        from datetime import date
        if value > date.today():
            raise serializers.ValidationError("Data urodzenia nie może być w przyszłości")
        return value


class CowListSerializer(serializers.ModelSerializer):
    """Serializer dla listy (uproszczony, bez zdjęć)"""
    age = serializers.SerializerMethodField()

    class Meta:
        model = Cow
        fields = ['id', 'tag_id', 'name', 'breed', 'birth_date', 'gender', 'age']

    def get_age(self, obj):
        from datetime import date
        today = date.today()
        age = today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day))
        return age