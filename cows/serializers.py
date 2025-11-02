# cows/serializers.py

from rest_framework import serializers
from .models import Cow, Event, CowDocument, Task, Herd 
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User 

# === Auth Serializers (bez zmian) ===
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user); token['username'] = user.username; token['is_staff'] = user.is_staff; return token
class UserSerializer(serializers.ModelSerializer):
    class Meta: model = User; fields = ['id', 'username', 'is_staff', 'is_active', 'date_joined']; read_only_fields = ['date_joined']
class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User; fields = ['username', 'password', 'is_staff', 'is_active']; extra_kwargs = {'password': {'write_only': True}}
    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'], password=validated_data['password'],
            is_staff=validated_data.get('is_staff', False), is_active=validated_data.get('is_active', True)
        )
class UserPasswordUpdateSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    def update(self, instance, validated_data):
        instance.set_password(validated_data['password']); instance.save(); return instance

# === Herd Serializer ===
class HerdSerializer(serializers.ModelSerializer):
    class Meta: model = Herd; fields = ['id', 'name', 'description']

# === Serializery Krów (W PEŁNI ZAKTUALIZOWANE) ===

# Pola wspólne dla wszystkich serializerów krów
ALL_COW_FIELDS = [
    'id', 'tag_id', 'name', 'birth_date', 'gender', 'breed', 'color', 'passport_number', 
    'business_number', 'status', 'dam', 'sire', 'exit_date', 'exit_reason', 'sale_price', 
    'meat_delivery_date', 'weight', 'daily_weight_gain', 'pregnancy_duration',
    'is_pregnancy_possible', 'relocation_status', 'duplicates_to_make',
    'duplicates_to_order', 'relocation_after_drive', 'notes', 'photo', 'herd'
]

class CowSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField(); photo = serializers.SerializerMethodField() 
    dam_name = serializers.CharField(source='dam.name', read_only=True, allow_null=True)
    sire_name = serializers.CharField(source='sire.name', read_only=True, allow_null=True)
    herd_name = serializers.CharField(source='herd.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Cow
        fields = ALL_COW_FIELDS + [
            'age', 'dam_name', 'sire_name', 'herd_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'age', 'dam_name', 'sire_name', 'herd_name']
    
    def get_age(self, obj):
        if not obj.birth_date: return None
        from datetime import date
        today = date.today(); age = today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day)); return age
    
    def get_photo(self, obj):
        if obj.photo: request = self.context.get('request'); return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url
        return None

class CowCreateUpdateSerializer(serializers.ModelSerializer):
    dam = serializers.PrimaryKeyRelatedField(queryset=Cow.objects.all(), allow_null=True, required=False)
    sire = serializers.PrimaryKeyRelatedField(queryset=Cow.objects.all(), allow_null=True, required=False)
    herd = serializers.PrimaryKeyRelatedField(queryset=Herd.objects.all(), allow_null=True, required=False)

    class Meta:
        model = Cow
        fields = ALL_COW_FIELDS
        extra_kwargs = {'photo': {'required': False, 'allow_null': True, 'read_only': True} }
    
    def validate_tag_id(self, value):
        instance = getattr(self, 'instance', None)
        if instance and instance.tag_id == value: return value
        if Cow.objects.filter(tag_id=value).exists(): raise serializers.ValidationError(f"Krowa z tag_id '{value}' już istnieje")
        return value
    
    def validate_birth_date(self, value):
        from datetime import date
        if value and value > date.today():
            raise serializers.ValidationError("Data urodzenia nie może być w przyszłości")
        return value
    
    def validate(self, data):
        instance = getattr(self, 'instance', None)
        if instance:
            if data.get('dam') == instance: raise serializers.ValidationError("Krowa nie może być własną matką.")
            if data.get('sire') == instance: raise serializers.ValidationError("Krowa nie może być własnym ojcem.")
        return data

class CowListSerializer(serializers.ModelSerializer): 
    age = serializers.SerializerMethodField(); photo = serializers.SerializerMethodField()
    dam_name = serializers.CharField(source='dam.name', read_only=True, allow_null=True)
    sire_name = serializers.CharField(source='sire.name', read_only=True, allow_null=True)
    herd_name = serializers.CharField(source='herd.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Cow; 
        fields = [
            'id', 'tag_id', 'name', 'birth_date', 'gender', 'age', 'status', 
            'dam_name', 'sire_name', 'herd', 'herd_name', 'passport_number',
            'photo'
        ] 
    
    def get_age(self, obj):
        if not obj.birth_date: return None
        from datetime import date
        today = date.today(); age = today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day)); return age
    
    def get_photo(self, obj):
        if obj.photo: request = self.context.get('request'); return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url
        return None

# ... (Serializery Rodowodu - bez zmian) ...
class CowPedigreeSimpleSerializer(serializers.ModelSerializer):
    class Meta: model = Cow; fields = ['id', 'name', 'tag_id', 'gender']
class CowPedigreeParentSerializer(serializers.ModelSerializer):
    dam = CowPedigreeSimpleSerializer(read_only=True); sire = CowPedigreeSimpleSerializer(read_only=True)
    class Meta: model = Cow; fields = ['id', 'name', 'tag_id', 'gender', 'dam', 'sire']
class CowPedigreeSerializer(serializers.ModelSerializer):
    dam = CowPedigreeParentSerializer(read_only=True); sire = CowPedigreeParentSerializer(read_only=True)
    class Meta: model = Cow; fields = ['id', 'name', 'tag_id', 'gender', 'dam', 'sire']
class CowOffspringSerializer(serializers.ModelSerializer):
    class Meta: model = Cow; fields = ['id', 'name', 'tag_id', 'gender', 'status']

# ... (Serializery Event, Document, Task - bez zmian) ...
class EventSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True); cow = serializers.PrimaryKeyRelatedField(queryset=Cow.objects.all())
    class Meta:
        model = Event; fields = ['id', 'cow', 'event_type', 'date', 'notes', 'user', 'created_at']; read_only_fields = ['user', 'created_at'] 
    def create(self, validated_data):
        request = self.context.get('request');
        if request and hasattr(request, 'user') and request.user.is_authenticated: validated_data['user'] = request.user
        return super().create(validated_data)
class CowDocumentSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True); filename = serializers.CharField(source='filename', read_only=True); file_url = serializers.SerializerMethodField()
    class Meta:
        model = CowDocument; fields = ['id', 'cow', 'title', 'file', 'file_url', 'filename', 'uploaded_at', 'user']; read_only_fields = ['user', 'uploaded_at', 'filename', 'file_url']; extra_kwargs = {'file': {'write_only': True, 'required': True}}
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request: return request.build_absolute_uri(obj.file.url)
        return None
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated: validated_data['user'] = request.user
        return super().create(validated_data)
class TaskSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True); cow = serializers.PrimaryKeyRelatedField(queryset=Cow.objects.filter(status='ACTIVE'), allow_null=True, required=False)
    cow_name = serializers.CharField(source='cow.name', read_only=True, allow_null=True); cow_tag_id = serializers.CharField(source='cow.tag_id', read_only=True, allow_null=True)
    class Meta:
        model = Task; fields = ['id', 'cow', 'cow_name', 'cow_tag_id', 'title', 'task_type', 'due_date', 'notes', 'is_completed', 'user', 'created_at']; read_only_fields = ['user', 'created_at', 'cow_name', 'cow_tag_id']
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated: validated_data['user'] = request.user
        return super().create(validated_data)
