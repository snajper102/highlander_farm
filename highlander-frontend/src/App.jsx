// src/App.jsx
import { Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom';
import { CowListPage } from './pages/CowListPage';
import { ScannerPage } from './pages/ScannerPage';
import { CowDetailPage } from './pages/CowDetailPage'; 
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute'; 
import { AdminRoute } from './components/AdminRoute'; 
import { UserManagementPage } from './pages/UserManagementPage'; 
import { DashboardPage } from './pages/DashboardPage'; // <-- IMPORT DASHBOARDU
import { NavBar } from './components/NavBar';
import { Button } from './components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { ReloadPrompt } from './components/ReloadPrompt'; 
import { useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner'; 
import { ModeToggle } from './components/ModeToggle'; 

// Komponent Głównego Layoutu
function MainLayout() {
  // Przycisk "Dodaj Krowę" został przeniesiony do CowListPage
  // Ten layout jest teraz "głupszy"
  const location = useLocation();
  const isExcludedPage = location.pathname.startsWith('/cow/') || location.pathname.startsWith('/admin');

  if (isExcludedPage) {
    return <Outlet />; 
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                🐄 Highlander Farm
              </h1>
              <p className="text-muted-foreground mt-1">Zarządzanie stadem krów Highland Cattle</p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              {/* Przycisk "Dodaj" został przeniesiony */}
              <ModeToggle /> 
            </div>
          </div>
        </div>
      </div>

      {/* ZMIANA: context jest już niepotrzebny */}
      <main className="pb-20"> 
        <Outlet />
      </main>

      <div>
        <NavBar />
      </div>
    </div>
  );
}

function App() {
  const { isLoggedIn } = useAuth(); 

  return (
    <> 
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route element={<ProtectedRoute />}>
          {/* === ZMIANA ROUTINGU === */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<DashboardPage />} /> {/* <-- Dashboard jest teraz stroną główną */}
            <Route path="herd" element={<CowListPage />} /> {/* <-- Lista krów jest na /herd */}
            <Route path="scan" element={<ScannerPage />} />
          </Route>
          
          <Route path="cow/:id" element={<CowDetailPage />} />
          
          <Route path="/admin" element={<AdminRoute />}>
            <Route path="users" element={<UserManagementPage />} />
          </Route>
        </Route>
        
        <Route path="*" element={isLoggedIn ? <Navigate to="/" /> : <Navigate to="/login" />} />
      </Routes>
      
      <ReloadPrompt /> 
      <Toaster position="top-center" richColors />
    </>
  );
}

export default App
