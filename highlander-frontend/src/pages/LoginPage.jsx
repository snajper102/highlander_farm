// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner'; 

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, isLoggedIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Zalogowano pomyślnie!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    // === ZMIANA: Ładny gradient tła ===
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 dark:from-stone-900 dark:via-emerald-950 dark:to-stone-950 p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-lg shadow-xl border border-border">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-3">
            🐄 Highlander Farm
          </h1>
          <p className="text-muted-foreground mt-2">Zaloguj się, aby kontynuować</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Nazwa użytkownika</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="np. admin"
              required
              disabled={loading}
              className="mt-1"
            />
          </div>
          
          <div className="relative">
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="mt-1"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-muted-foreground"
              disabled={loading}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {/* === ZMIANA: Ładniejszy przycisk === */}
          <Button type="submit" className="w-full shadow-sm hover:scale-[1.02] transition-transform" disabled={loading}>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              'Zaloguj się'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
