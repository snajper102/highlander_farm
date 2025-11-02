// src/pages/cow-detail/PedigreeChart.jsx
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

// Mały komponent karty dla przodka
function PedigreeCard({ cow, gender }) {
  if (!cow) {
    return (
      <div className={cn(
        "flex items-center justify-center p-4 h-20 rounded-lg border border-dashed",
        "bg-muted/50 text-muted-foreground"
      )}>
        Nieznany
      </div>
    );
  }
  
  const isMale = gender === 'sire' || cow.gender === 'M';
  
  return (
    <Link to={`/cow/${cow.id}`} className="block">
      <div className={cn(
        "p-4 h-20 rounded-lg border shadow-sm transition-colors",
        isMale 
          ? "bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:border-blue-800 dark:hover:bg-blue-900"
          : "bg-pink-50 border-pink-200 hover:bg-pink-100 dark:bg-pink-900/30 dark:border-pink-800 dark:hover:bg-pink-900"
      )}>
        <div className="font-bold text-lg truncate">{isMale ? '♂' : '♀'} {cow.name}</div>
        <div className="text-sm text-muted-foreground font-mono">{cow.tag_id}</div>
      </div>
    </Link>
  );
}

export function PedigreeChart({ ancestors }) {
  if (!ancestors) return null;
  
  const { dam, sire } = ancestors;
  const grandDamDam = dam?.dam;
  const grandDamSire = dam?.sire;
  const grandSireDam = sire?.dam;
  const grandSireSire = sire?.sire;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Przodkowie</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          
          {/* Poziom 0: Krowa (Główna) */}
          <div className="flex items-center justify-center md:w-1/3">
            <PedigreeCard cow={ancestors} gender={ancestors.gender === 'F' ? 'dam' : 'sire'} />
          </div>
          
          {/* Linie łączące */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-8 h-full border-l-2 border-b-2 border-gray-300 dark:border-gray-700 -ml-4"></div>
            <div className="w-8 h-full border-t-2 border-b-2 border-gray-300 dark:border-gray-700"></div>
            <div className="w-8 h-full border-r-2 border-t-2 border-gray-300 dark:border-gray-700 -mr-4"></div>
          </div>

          {/* Poziom 1: Rodzice */}
          <div className="flex md:w-1/3 flex-col gap-4 justify-around">
            <PedigreeCard cow={sire} gender="sire" />
            <PedigreeCard cow={dam} gender="dam" />
          </div>
          
          {/* Linie łączące */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-8 h-full border-l-2 border-gray-300 dark:border-gray-700 -ml-4"></div>
            <div className="w-8 h-full border-r-2 border-gray-300 dark:border-gray-700 -mr-4"></div>
          </div>

          {/* Poziom 2: Dziadkowie */}
          <div className="flex md:w-1/3 flex-col gap-4 justify-around">
            <div className="flex flex-col gap-2">
              <PedigreeCard cow={grandSireSire} gender="sire" />
              <PedigreeCard cow={grandSireDam} gender="dam" />
            </div>
            <div className="flex flex-col gap-2">
              <PedigreeCard cow={grandDamSire} gender="sire" />
              <PedigreeCard cow={grandDamDam} gender="dam" />
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
