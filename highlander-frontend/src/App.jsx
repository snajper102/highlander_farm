// src/App.jsx
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { CowListPage } from './pages/CowListPage';
import { ScannerPage } from './pages/ScannerPage';
import { CowDetailPage } from './pages/CowDetailPage'; 
import { NavBar } from './components/NavBar';
import { Button } from './components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';

// Komponent Głównego Layoutu
function MainLayout() {
  // Stan "Dodaj Krowę" musi żyć tutaj, aby MainLayout mógł go przekazać do CowListPage
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const openAddDialog = () => setIsAddDialogOpen(true);

  // Sprawdź aktualną lokalizację, aby ukryć przycisk "Dodaj"
  const location = useLocation();
  const showAddButton = location.pathname === '/';
  
  // Ukryj cały layout na stronie szczegółów (desktop)
  // Strona szczegółów ma własny header
  const isDetailPage = location.pathname.startsWith('/cow/');

  if (isDetailPage) {
    return <Outlet />; // Strona szczegółów renderuje się sama
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-emerald-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                🐄 Highlander Farm
              </h1>
              <p className="text-gray-600 mt-1">Zarządzanie stadem krów Highland Cattle</p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              {showAddButton && (
                <Button onClick={openAddDialog} className="w-full sm:w-auto hidden sm:flex">
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj krowę
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Główna zawartość strony + padding na dolny navbar */}
      <main className="pb-20 sm:pb-0"> 
        {/* Przekazujemy stan modala do Outletu za pomocą "context" */}
        <Outlet context={{ isAddDialogOpen, setIsAddDialogOpen, openAddDialog }} />
      </main>

      {/* Dolna Nawigacja (tylko na mobile) */}
      <div className="sm:hidden">
        <NavBar />
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Główny Layout (dla listy i skanera) */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<CowListPage />} />
        <Route path="scan" element={<ScannerPage />} />
      </Route>
      
      {/* Strona szczegółów (bez głównego layoutu) */}
      <Route path="cow/:id" element={<CowDetailPage />} />
    </Routes>
  );
}

export default App
