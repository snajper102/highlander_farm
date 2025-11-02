// src/components/NavBar.jsx
import { NavLink } from 'react-router-dom';
import { List, QrCode, RefreshCw, LogOut, Settings, LayoutDashboard } from 'lucide-react'; // <-- Import LayoutDashboard
import { cn } from '../lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { syncService } from '../services/api';
import { useAuth } from '../contexts/AuthContext'; 

export function NavBar() {
  const commonStyle = "flex flex-col items-center justify-center h-16 w-full text-gray-500 dark:text-gray-400 rounded-none transition-colors duration-200";
  const activeStyle = "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-semibold border-t-2 border-emerald-500";
  
  const syncQueueCount = useLiveQuery(() => db.syncQueue.count(), [], 0);
  const { logout, user } = useAuth(); 

  const handleSyncClick = () => {
    console.log("Ręczna synchronizacja...");
    syncService.processSyncQueue();
  };
  
  const isAdmin = user && user.is_staff;

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-50 grid shadow-inner",
      isAdmin ? "grid-cols-6" : "grid-cols-5" // ZMIANA: 6 lub 5 kolumn
    )}>
      
      {/* 1. Panel (NOWY) */}
      <NavLink 
        to="/" 
        end
        className={({ isActive }) => cn(commonStyle, isActive && activeStyle)}
      >
        <LayoutDashboard className="w-6 h-6 mb-1" />
        <span className="text-xs">Panel</span>
      </NavLink>
      
      {/* 2. Stado (ZMIANA LINKU) */}
      <NavLink 
        to="/herd" 
        className={({ isActive }) => cn(commonStyle, isActive && activeStyle)}
      >
        <List className="w-6 h-6 mb-1" />
        <span className="text-xs">Stado</span>
      </NavLink>
      
      {/* 3. Skaner */}
      <NavLink 
        to="/scan" 
        className={({ isActive }) => cn(commonStyle, isActive && activeStyle)}
      >
        <QrCode className="w-6 h-6 mb-1" />
        <span className="text-xs">Skanuj</span>
      </NavLink>

      {/* 4. Przycisk Synchronizacji */}
      <button 
        onClick={handleSyncClick}
        className={cn(commonStyle, "relative")}
      >
        {syncQueueCount > 0 && (
          <div className="absolute top-2 right-[25%] w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {syncQueueCount}
          </div>
        )}
        <RefreshCw className={cn("w-6 h-6 mb-1", syncQueueCount > 0 && "text-blue-600 animate-spin-slow")} />
        <span className="text-xs">Synchronizuj</span>
      </button>
      
      {/* 5. Panel Admina (Warunkowy) */}
      {isAdmin && (
        <NavLink to="/admin/users" className={({ isActive }) => cn(commonStyle, isActive && activeStyle)}>
          <Settings className="w-6 h-6 mb-1" />
          <span className="text-xs">Admin</span>
        </NavLink>
      )}
      
      {/* 6. Przycisk Wyloguj */}
      <button 
        onClick={logout}
        className={cn(commonStyle, "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30")}
      >
        <LogOut className="w-6 h-6 mb-1" />
        <span className="text-xs">Wyloguj</span>
      </button>
    </nav>
  );
}
