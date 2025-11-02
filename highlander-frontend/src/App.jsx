// src/App.jsx
import { Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom';
import { CowListPage } from './pages/CowListPage';
import { ScannerPage } from './pages/ScannerPage';
import { CowDetailPage } from './pages/CowDetailPage'; 
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute'; 
import { AdminRoute } from './components/AdminRoute'; 
import { UserManagementPage } from './pages/UserManagementPage'; 
import { DashboardPage } from './pages/DashboardPage';
import { CalendarPage } from './pages/CalendarPage';
import { NavBar } from './components/NavBar';
import { Button } from './components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { ReloadPrompt } from './components/ReloadPrompt'; 
import { useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner'; 
import { ModeToggle } from './components/ModeToggle'; 
import { cn } from './lib/utils'; 

// Komponent Głównego Layoutu
function MainLayout() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const openAddDialog = () => setIsAddDialogOpen(true);
  const location = useLocation();
  const showAddButton = location.pathname === '/herd'; 
  
  // === POPRAWKA BŁĘDU ===
  // Usunęliśmy `|| location.pathname.startsWith('/admin')`
  // Strona admina POWINNA używać tego layoutu.
  const isDetailPage = location.pathname.startsWith('/cow/');

  if (isDetailPage) {
    // Tylko strona szczegółów jest renderowana bez layoutu
    return <Outlet />; 
  }

  return (
    <div className={cn("min-h-screen text-foreground", 
        location.pathname === '/' ? 'bg-background' : 'bg-stone-50 dark:bg-stone-950'
    )}>
      <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                🐄 Highlander Farm
              </h1>
              <p className="text-muted-foreground mt-1">Zarządzanie stadem krów Highland Cattle</p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              {showAddButton && (
                <Button onClick={openAddDialog} className="w-full sm:w-auto hidden sm:flex shadow-sm hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj krowę
                </Button>
              )}
              <ModeToggle /> 
            </div>
          </div>
        </div>
      </div>
      <main className="pb-20"> 
        <Outlet context={{ isAddDialogOpen, setIsAddDialogOpen, openAddDialog }} />
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
          {/* === POPRAWKA: Wszystkie trasy admina są teraz w MainLayout === */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="herd" element={<CowListPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="scan" element={<ScannerPage />} />
            
            <Route path="/admin" element={<AdminRoute />}>
              <Route path="users" element={<UserManagementPage />} />
            </Route>
          </Route>
          
          <Route path="cow/:id" element={<CowDetailPage />} />
        </Route>
        
        <Route path="*" element={isLoggedIn ? <Navigate to="/" /> : <Navigate to="/login" />} />
      </Routes>
      
      <ReloadPrompt /> 
      <Toaster position="top-center" richColors />
    </>
  );
}
export default App
