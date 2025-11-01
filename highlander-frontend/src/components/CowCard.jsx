// src/components/CowCard.jsx
import { Calendar, Tag, Edit2, Trash2, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom'; // <-- IMPORTUJ useNavigate

// Dodajemy nowe propsy: onEdit, onDelete, onAddEvent
export function CowCard({ cow, onEdit, onDelete, onAddEvent, onClick }) {
  
  const navigate = useNavigate(); // <-- Użyj hooka nawigacji

  const formatDate = (dateString) => {
    if (!dateString) return 'Brak danych';
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  const ageLabel = (age) => {
    if (!age && age !== 0) return '';
    if (age === 1) return 'rok';
    if (age >= 2 && age <= 4) return 'lata';
    return 'lat';
  };

  // Zapobiega kliknięciu "karty" gdy klikamy na przycisk
  const handleActionClick = (e, actionFn) => {
    e.stopPropagation(); // Kluczowe!
    if (actionFn) {
      actionFn(cow);
    } else {
      console.warn('Brak przypisanej akcji dla tego przycisku');
    }
  };

  // Kliknięcie głównej karty
  const handleCardClick = () => {
    // Jeśli przekazano własny 'onClick', użyj go (jak w starym skanerze)
    if (onClick) {
      onClick(cow);
    } else {
      // Domyślna akcja: nawiguj do strony szczegółów
      navigate(`/cow/${cow.id}`); 
    }
  };

  return (
    <Card
      onClick={handleCardClick}
      className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/90 backdrop-blur-sm border-2 border-emerald-100 hover:border-emerald-300 cursor-pointer"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl font-bold text-gray-800 truncate">
            {cow.name}
          </span>
          <Badge
            variant={cow.gender === 'F' ? 'default' : 'secondary'}
            className="ml-2"
          >
            {cow.gender === 'F' ? '♀' : '♂'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Zdjęcie */}
        {cow.photo ? (
          <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={cow.photo}
              alt={cow.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-48 rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
            <span className="text-6xl">🐄</span>
          </div>
        )}

        {/* Informacje */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <Tag className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">Tag:</span>
            <span className="font-mono bg-emerald-50 px-2 py-1 rounded text-emerald-700">
              {cow.tag_id}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-semibold">Ur.:</span>
            <span>{formatDate(cow.birth_date)}</span>
            {cow.age || cow.age === 0 ? (
                <Badge variant="outline" className="ml-auto">
                    {cow.age} {ageLabel(cow.age)}
                </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="font-semibold">Rasa:</span>
            <span className="text-gray-600">{cow.breed}</span>
          </div>
        </div>

        {/* --- PRZYCISKI AKCJI --- */}
        <div className="flex gap-2 pt-3">
          {onAddEvent && (
            <Button
              size="sm"
              variant="default"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={(e) => handleActionClick(e, onAddEvent)}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Zdarzenie
            </Button>
          )}
          
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => handleActionClick(e, onEdit)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edytuj
            </Button>
          )}

          {onDelete && (
            <Button
              size="sm"
              variant="destructive"
              className="px-3"
              onClick={(e) => handleActionClick(e, onDelete)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
