// src/components/CowCard.jsx
import { Calendar, Tag, Edit2, Archive, PlusCircle, Eye, CloudOff } from 'lucide-react'; // ZMIANA
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils'; 

export function CowCard({ cow, onEdit, onDelete, onAddEvent, onClick, isOffline }) {
  
  const navigate = useNavigate(); 

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

  const handleActionClick = (e, actionFn) => {
    e.stopPropagation(); 
    if (actionFn) {
      actionFn(cow);
    } else {
      console.warn('Brak przypisanej akcji dla tego przycisku');
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(cow);
    } else {
      if (isOffline) {
        console.log("Krowa czeka na synchronizację, szczegóły niedostępne.");
        return; 
      }
      navigate(`/cow/${cow.id}`); 
    }
  };

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        "transition-all duration-300 shadow-md hover:shadow-xl",
        "bg-card backdrop-blur-sm border-l-4", // <-- NOWY STYL
        isOffline ? "border-l-yellow-400 opacity-80" : 
        cow.gender === 'F' ? "border-l-pink-400" : "border-l-blue-400",
        !isOffline && "cursor-pointer"
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl font-bold text-foreground truncate">
            {cow.name}
          </span>
          {isOffline ? (
            <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-600">
              <CloudOff className="w-4 h-4 mr-1" />
              Offline
            </Badge>
          ) : (
            <Badge
              variant={cow.gender === 'F' ? 'default' : 'secondary'}
              className={cn(
                  "ml-2",
                  cow.gender === 'F' ? "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200" : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
              )}
            >
              {cow.gender === 'F' ? '♀' : '♂'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {cow.photo ? (
          <div className="w-full h-48 rounded-lg overflow-hidden bg-muted">
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

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Tag className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">Tag:</span>
            <span className="font-mono bg-primary/10 px-2 py-1 rounded text-primary">
              {cow.tag_id}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-foreground">Ur.:</span>
            <span>{formatDate(cow.birth_date)}</span>
            {cow.age || cow.age === 0 ? (
                <Badge variant="outline" className="ml-auto">
                    {cow.age} {ageLabel(cow.age)}
                </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-semibold text-foreground">Rasa:</span>
            <span className="text-card-foreground">{cow.breed}</span>
          </div>
        </div>

        {/* Przyciski Akcji */}
        <div className="flex gap-2 pt-3">
          {onAddEvent && (
            <Button
              size="sm"
              variant="default"
              className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-sm"
              onClick={(e) => handleActionClick(e, onAddEvent)}
              disabled={isOffline} 
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

          {onDelete && cow.status === 'ACTIVE' && (
            <Button
              size="sm"
              variant="destructive"
              className="px-3"
              onClick={(e) => handleActionClick(e, onDelete)}
            >
              <Archive className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
