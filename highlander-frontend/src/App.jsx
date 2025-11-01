// src/App.jsx
import { Routes, Route, Outlet } from 'react-router-dom';
import { CowListPage } from './pages/CowListPage';
import { ScannerPage } from './pages/ScannerPage';
import { NavBar } from './components/NavBar';
import { Button } from './components/ui/button';
import { Plus } from 'lucide-react';

// Komponent Głównego Layoutu
function MainLayout({ onAddCowClick }) {
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
            {/* Przycisk "Dodaj" przeniesiony do głównego layoutu dla spójności */}
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Button onClick={onAddCowClick} className="w-full sm:w-auto hidden sm:flex">
                <Plus className="w-4 h-4 mr-2" />
                Dodaj krowę
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Główna zawartość strony + padding na dolny navbar */}
      <main className="pb-24">
        <Outlet /> {/* <-- Tutaj renderują się pod-strony (Lista lub Skaner) */}
      </main>

      {/* Dolna Nawigacja */}
      <NavBar />
    </div>
  );
}

function App() {
  // Stan i funkcja do otwierania modala "Dodaj krowę"
  // Muszą być w App.jsx, aby przekazać je do MainLayout i CowListPage
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const openAddDialog = () => setIsAddDialogOpen(true);

  return (
    <Routes>
      <Route path="/" element={<MainLayout onAddCowClick={openAddDialog} />}>
        <Route 
          index 
          element={
            <CowListPage 
              isAddDialogOpen={isAddDialogOpen} 
              setIsAddDialogOpen={setIsAddDialogOpen}
              openAddDialog={openAddDialog}
            />
          } 
        />
        <Route path="scan" element={<ScannerPage />} />
        {/* TODO: Dodać ścieżkę /cow/:id dla szczegółów */}
      </Route>
    </Routes>
  );
}

// Musimy dodać import useState
import { useState } from 'react';
export default App
