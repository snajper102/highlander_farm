# cows/serializers.py

from rest_framework import serializers
# === POPRAWKA: Usunięto CowDocument ===
from .models import Cow, Event 
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User 

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['is_staff'] = user.is_staff 
        return token

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'is_staff', 'is_active', 'date_joined']
        read_only_fields = ['date_joined']

class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'password', 'is_staff', 'is_active']
        extra_kwargs = {'password': {'write_only': True}}
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            is_staff=validated_data.get('is_staff', False),
            is_active=validated_data.get('is_active', True)
        )
        return user

class UserPasswordUpdateSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    def update(self, instance, validated_data):
        instance.set_password(validated_data['password'])
        instance.save()
        return instance

class CowSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField() 
    class Meta:
        model = Cow
        fields = ['id', 'tag_id', 'name', 'breed', 'birth_date', 'gender', 'photo', 'age', 'status', 'created_at', 'updated_at'] 
        read_only_fields = ['created_at', 'updated_at', 'age']
    def get_age(self, obj):
        from datetime import date
        today = date.today()
        age = today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day))
        return age
    def get_photo(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request: return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

class CowCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cow
        fields = ['id', 'tag_id', 'name', 'breed', 'birth_date', 'gender', 'photo', 'status'] 
        extra_kwargs = {'photo': {'required': False, 'allow_null': True, 'read_only': True} }
    def validate_tag_id(self, value):
        instance = getattr(self, 'instance', None)
        if instance and instance.tag_id == value: return value
        if Cow.objects.filter(tag_id=value).exists():
            raise serializers.ValidationError(f"Krowa z tag_id '{value}' już istnieje")
        return value
    def validate_birth_date(self, value):
        from datetime import date
        if value > date.today():
            raise serializers.ValidationError("Data urodzenia nie może być w przyszłości")
        return value

class CowListSerializer(serializers.ModelSerializer): 
    age = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    class Meta:
        model = Cow
        fields = ['id', 'tag_id', 'name', 'breed', 'birth_date', 'gender', 'photo', 'age', 'status'] 
    def get_age(self, obj):
        from datetime import date
        today = date.today()
        age = today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day))
        return age
    def get_photo(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request: return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

class EventSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    cow = serializers.PrimaryKeyRelatedField(queryset=Cow.objects.all())
    class Meta:
        model = Event
        fields = ['id', 'cow', 'event_type', 'date', 'notes', 'user', 'created_at']
        read_only_fields = ['user', 'created_at'] 
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)

# === CowDocumentSerializer (USUNIĘTY) ===
# ...
