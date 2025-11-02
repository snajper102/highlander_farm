// src/pages/cow-detail/OffspringList.jsx
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

export function OffspringList({ offspring }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Potomstwo ({offspring.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {offspring.length === 0 ? (
          <p className="text-muted-foreground">Brak zarejestrowanego potomstwa.</p>
        ) : (
          <div className="space-y-2">
            {offspring.map(child => (
              <Link to={`/cow/${child.id}`} key={child.id} className="block">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted transition-colors">
                  <div>
                    <span className="font-medium">{child.name}</span>
                    <span className="ml-2 font-mono text-sm text-emerald-700 dark:text-emerald-300">{child.tag_id}</span>
                  </div>
                  <Badge variant={child.gender === 'F' ? 'default' : 'secondary'}>
                    {child.gender === 'F' ? '♀ Samica' : '♂ Samiec'}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
