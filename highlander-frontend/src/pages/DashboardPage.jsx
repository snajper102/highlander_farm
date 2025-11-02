// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { networkApi, repository } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, AlertCircle, Users, BarChart3, PieChart, CalendarCheck } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TaskList } from '../components/TaskList'; // <-- ZMIANA
import { toast } from 'sonner';

// ... (StatCard, GenderChart, AgeHistogram - bez zmian) ...
function StatCard({ title, value, icon, description }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (<p className="text-xs text-muted-foreground">{description}</p>)}
      </CardContent>
    </Card>
  );
}
function GenderChart({ data }) {
  const COLORS = { 'F': '#ec4899', 'M': '#3b82f6' }; 
  const chartData = data.map(item => ({
    name: item.gender === 'F' ? 'Samice' : 'Samce',
    value: item.count
  }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <RePieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name === 'Samice' ? 'F' : 'M']} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </RePieChart>
    </ResponsiveContainer>
  );
}
function AgeHistogram({ data }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" fontSize={12} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="ilość" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
}


export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await networkApi.getStats();
      setStats(data);
      // Synchronizuj zadania w tle
      repository.syncTasks();
      repository.syncCows();
    } catch (err) {
      setError(err.message);
      toast.error(`Błąd ładowania statystyk: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Nie można załadować statystyk."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const femaleCount = stats.by_gender.find(g => g.gender === 'F')?.count || 0;
  const maleCount = stats.by_gender.find(g => g.gender === 'M')?.count || 0;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">
        Witaj, {user?.username}!
      </h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Aktywnych krów" value={stats.total_active} icon={<Users className="h-4 w-4 text-muted-foreground" />} description="Sztuki w stadzie" />
        <StatCard title="Samice" value={femaleCount} icon={<span className="text-pink-500 text-xl font-bold">♀</span>} description={`${maleCount} Samców`} />
        <StatCard title="Średni wiek" value={`${stats.average_age} lat`} icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />} description="Dla aktywnych krów" />
        <StatCard title="Nadchodzące zadania" value={stats.upcoming_events.length} icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />} description="W ciągu 7 dni" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Struktura płci</CardTitle></CardHeader>
          <CardContent><GenderChart data={stats.by_gender} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Piramida wieku stada</CardTitle></CardHeader>
          <CardContent><AgeHistogram data={stats.age_histogram} /></CardContent>
        </Card>
      </div>

      {/* === ZMIANA: Używamy TaskList === */}
      <Card>
        <CardHeader>
          <CardTitle>Nadchodzące zadania (7 dni)</CardTitle>
          <CardDescription>
            Zaplanowane kontrole, wizyty weterynarza i inne akcje.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Przekazujemy 'tasks' i mapujemy pola, aby pasowały */}
          <TaskList 
            tasks={stats.upcoming_events} 
            onTaskUpdated={fetchStats} // Odśwież statystyki po zmianie
            showCowName={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
