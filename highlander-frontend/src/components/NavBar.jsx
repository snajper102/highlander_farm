// src/components/NavBar.jsx
import { NavLink } from 'react-router-dom';
import { List, QrCode, RefreshCw, LogOut, Settings, LayoutDashboard, Calendar } from 'lucide-react'; 
import { cn } from '../lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { syncService } from '../services/api';
import { useAuth } from '../contexts/AuthContext'; 

export function NavBar() {
  const commonStyle = "flex flex-col items-center justify-center h-16 w-full text-gray-500 dark:text-gray-400 rounded-none transition-colors duration-200";
  const activeStyle = "text-primary bg-primary/10 border-t-2 border-primary";
  
  const syncQueueCount = useLiveQuery(() => db.syncQueue.count(), [], 0);
  const { logout, user } = useAuth(); 

  const handleSyncClick = () => {
    console.log("Ręczna synchronizacja...");
    syncService.processSyncQueue();
  };
  
  const isAdmin = user && user.is_staff;
  
  // === POPRAWKA LOGIKI SIATKI ===
  const gridColsClass = isAdmin ? "grid-cols-6" : "grid-cols-5";

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-50 grid shadow-inner-top",
      gridColsClass // Użyj dynamicznej klasy
    )}>
      
      {/* 1. Panel */}
      <NavLink to="/" end className={({ isActive }) => cn(commonStyle, isActive && activeStyle)}>
        <LayoutDashboard className="w-6 h-6 mb-1" />
        <span className="text-xs">Panel</span>
      </NavLink>
      
      {/* 2. Stado */}
      <NavLink to="/herd" className={({ isActive }) => cn(commonStyle, isActive && activeStyle)}>
        <List className="w-6 h-6 mb-1" />
        <span className="text-xs">Stado</span>
      </NavLink>
      
      {/* 3. Kalendarz */}
      <NavLink to="/calendar" className={({ isActive }) => cn(commonStyle, isActive && activeStyle)}>
        <Calendar className="w-6 h-6 mb-1" />
        <span className="text-xs">Kalendarz</span>
      </NavLink>
      
      {/* 4. Skaner */}
      <NavLink to="/scan" className={({ isActive }) => cn(commonStyle, isActive && activeStyle)}>
        <QrCode className="w-6 h-6 mb-1" />
        <span className="text-xs">Skanuj</span>
      </NavLink>

      {/* 5. Przycisk Synchronizacji */}
      <button 
        onClick={handleSyncClick}
        className={cn(commonStyle, "relative hover:bg-muted")}
      >
        {syncQueueCount > 0 && (
          <div className="absolute top-2 right-1/4 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {syncQueueCount}
          </div>
        )}
        <RefreshCw className={cn("w-6 h-6 mb-1", syncQueueCount > 0 && "text-blue-600 animate-spin-slow")} />
        <span className="text-xs">Synchronizuj</span>
      </button>
      
      {/* 6. Admin LUB Wyloguj */}
      {isAdmin ? (
        <NavLink to="/admin/users" className={({ isActive }) => cn(commonStyle, isActive && activeStyle)}>
          <Settings className="w-6 h-6 mb-1" />
          <span className="text-xs">Admin</span>
        </NavLink>
      ) : (
        <button onClick={logout} className={cn(commonStyle, "hover:bg-muted text-red-500 hover:text-red-600")}>
          <LogOut className="w-6 h-6 mb-1" />
          <span className="text-xs">Wyloguj</span>
        </button>
      )}
    </nav>
  );
}
