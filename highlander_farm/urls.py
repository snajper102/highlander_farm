# highlander_farm/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# ZMIANA: Importujemy widok, ale NIE serializer
from rest_framework_simplejwt.views import TokenRefreshView

# === NOWY IMPORT ===
# Importujemy nasz niestandardowy serializer z aplikacji 'cows'
from cows.serializers import MyTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

# === NOWY WIDOK ===
# Tworzymy niestandardowy widok, który używa naszego serializera
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

urlpatterns = [
    path('admin/', admin.site.urls),
    
    path('api/', include('cows.urls')),
    
    # === ZMIANA ENDPOINTU LOGOWANIA ===
    # Podmieniamy domyślny widok na nasz
    path('api/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
