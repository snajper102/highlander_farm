// src/components/AdminRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

export function AdminRoute() {
  const { isLoggedIn, user, isLoading } = useAuth();

  if (isLoading) {
    // Czekaj na załadowanie stanu autoryzacji
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!isLoggedIn) {
    // Nie jest zalogowany -> do logowania
    return <Navigate to="/login" replace />;
  }

  if (isLoggedIn && !user.is_staff) {
    // Jest zalogowany, ale NIE JEST adminem
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <Alert variant="destructive">
          <AlertDescription>
            Nie masz uprawnień do tej sekcji.
          </AlertDescription>
        </Alert>
        <Navigate to="/" replace />
      </div>
    );
  }

  // Jest zalogowany i jest adminem -> renderuj stronę
  return <Outlet />;
}
