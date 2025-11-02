// src/pages/CowListPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks'; 
import { Loader2, AlertCircle, Plus, WifiOff, RefreshCw, SlidersHorizontal, ChevronDown, Search, LayoutGrid, List } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "../components/ui/dropdown-menu"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { CowForm } from '../components/CowForm';
import { DeleteCowDialog } from '../components/DeleteCowDialog';
import { AddEventDialog } from '../components/AddEventDialog';
import { repository, syncService } from '../services/api';
import { db } from '../db'; 
import { toast } from 'sonner';

import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from "@tanstack/react-table"
import { DataTable } from './cow-list/data-table';
import { getColumns } from './cow-list/columns';
import { CowCard } from '../components/CowCard'; 

export function CowListPage() {
  const navigate = useNavigate();
  
  // === STAN PRZYCISKU "DODAJ" (PRZENIESIONY Z App.jsx) ===
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const openAddDialog = () => setIsAddDialogOpen(true);
  
  const [statusFilter, setStatusFilter] = useState('ACTIVE'); 
  const cows = useLiveQuery(
    () => repository.getCowsQuery(statusFilter),
    [statusFilter], 
    undefined 
  );
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncQueueCount = useLiveQuery(() => db.syncQueue.count(), [], 0);
  const [viewMode, setViewMode] = useState('table'); 
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])
  const [globalFilter, setGlobalFilter] = useState("") 
  const [columnVisibility, setColumnVisibility] = useState({})
  const [rowSelection, setRowSelection] = useState({})

  // Efekty (bez zmian)
  useEffect(() => {
    const runSync = () => { if (navigator.onLine) syncService.processSyncQueue(); };
    window.addEventListener('online', runSync); runSync(); repository.syncCows();
    return () => window.removeEventListener('online', runSync);
  }, []);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true); const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);
  
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedCow, setSelectedCow] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);

  const closeAllDialogs = () => {
    setIsAddDialogOpen(false); 
    setIsEditDialogOpen(false);
    setIsArchiveDialogOpen(false); 
    setIsEventDialogOpen(false); 
    setSelectedCow(null);
    setPhotoFile(null); 
  };

  // Handlery (bez zmian)
  const handleAddCow = async (formData) => {
    try { setFormLoading(true); const { photo, ...dataToSend } = formData; const newCow = await repository.createCow(dataToSend);
      if (photoFile && newCow.id && navigator.onLine) { await repository.uploadPhoto(newCow.id, photoFile); }
      closeAllDialogs();
    } catch (err) { toast.error(err.message); } 
    finally { setFormLoading(false); }
  };
  const handleEditCow = async (formData) => {
    try { setFormLoading(true); const { photo, ...dataToSend } = formData; await repository.updateCow(selectedCow.id, dataToSend);
      if (photoFile && selectedCow.id && navigator.onLine) { await repository.uploadPhoto(selectedCow.id, photoFile); }
      closeAllDialogs();
    } catch (err) { toast.error(err.message); } 
    finally { setFormLoading(false); }
  };
  const handleArchiveCow = async () => {
    if (!selectedCow) return;
    try { setFormLoading(true); await repository.archiveCow(selectedCow.id); toast.success(`Krowa ${selectedCow.name} została zarchiwizowana.`); closeAllDialogs();
    } catch (err) { toast.error(err.message); } 
    finally { setFormLoading(false); }
  };
  const handleAddEvent = async (eventData) => {
    try { setFormLoading(true); await repository.createEvent(eventData); closeAllDialogs();
    } catch (err) { toast.error(err.message); } 
    finally { setFormLoading(false); }
  };
  const openEditDialog = (cow) => { setSelectedCow(cow); setPhotoFile(null); setIsEditDialogOpen(true); };
  const openArchiveDialog = (cow) => { setSelectedCow(cow); setPhotoFile(null); setIsArchiveDialogOpen(true); };
  const openAddEventDialog = (cow) => { setSelectedCow(cow); setIsEventDialogOpen(true); };
  const navigateToDetails = (cow) => {
    if (cow.id < 0) { toast.warning("Krowa niezsynchronizowana. Szczegóły niedostępne."); return; }
    navigate(`/cow/${cow.id}`);
  };

  const columns = useMemo( () => getColumns({ onEdit: openEditDialog, onArchive: openArchiveDialog, onAddEvent: openAddEventDialog, onNavigate: navigateToDetails, }), [] );
  const table = useReactTable({
    data: cows || [], columns, onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility, onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, globalFilter, columnVisibility, rowSelection },
  });
  const handleGenderFilterChange = (gender, isChecked) => {
    const currentFilter = (table.getColumn('gender')?.getFilterValue() || [])
    let newFilter = [...currentFilter]
    if (isChecked) { if (!newFilter.includes(gender)) newFilter.push(gender) }
    else { newFilter = newFilter.filter(v => v !== gender) }
    table.getColumn('gender')?.setFilterValue(newFilter.length > 0 ? newFilter : undefined)
  };
  const getCowCountLabel = (count) => {
    if (count === 1) return 'krowa';
    if (count > 1 && count < 5) return 'krowy';
    return 'krów';
  };

  if (cows === undefined) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Wczytywanie lokalnej bazy danych...</p>
        </div>
      </div>
    );
  }

  const filteredRows = table.getRowModel().rows;

  return (
    <div className="relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Wskaźniki statusu */}
        {!isOnline && ( <Alert variant="destructive" className="mb-4 bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300"> <WifiOff className="h-4 w-4" /> <AlertDescription> Jesteś offline. Zmiany zostaną zapisane lokalnie. </AlertDescription> </Alert> )}
        {isOnline && syncQueueCount > 0 && ( <Alert className="mb-4 bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"> <RefreshCw className="h-4 w-4 animate-spin" /> <AlertDescription> Synchronizowanie {syncQueueCount} {syncQueueCount === 1 ? 'zmiany' : 'zmian'}... </AlertDescription> </Alert> )}

        {/* Pasek Narzędzi */}
        <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Szukaj po tagu lub imieniu..." value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(String(event.target.value))} className="pl-10" />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <SlidersHorizontal className="mr-2 h-4 w-4" /> 
                  {statusFilter === 'ACTIVE' ? 'Aktywne' : statusFilter === 'SOLD' ? 'Sprzedane' : statusFilter === 'ARCHIVED' ? 'Archiwum' : 'Wszystkie'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filtruj status</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                  <DropdownMenuRadioItem value="ACTIVE">Aktywne</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="SOLD">Sprzedane</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="ARCHIVED">Zarchiwizowana</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="ALL">Wszystkie</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {viewMode === 'table' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex-1 hidden sm:flex">
                    Widok <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => {
                      let columnName = column.id;
                      if(column.id === 'tag_id') columnName = 'Kolczyk';
                      if(column.id === 'name') columnName = 'Imię';
                      if(column.id === 'gender') columnName = 'Płeć';
                      if(column.id === 'age') columnName = 'Wiek';
                      if(column.id === 'breed') columnName = 'Rasa';
                      if(column.id === 'status') columnName = 'Status';
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id} className="capitalize" checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        > {columnName} </DropdownMenuCheckboxItem>
                      )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('table')}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>

            {/* === DODANO PRZYCISK "DODAJ" === */}
            <Button onClick={openAddDialog} className="flex-1 sm:flex-grow-0">
              <Plus className="mr-2 h-4 w-4" />
              <span className="sm:hidden">Dodaj</span>
              <span className="hidden sm:inline">Dodaj krowę</span>
            </Button>
          </div>
        </div>
        
        {/* Kontener na widok */}
        <div>
          {viewMode === 'table' ? (
            <DataTable table={table} columns={columns} />
          ) : (
            filteredRows.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg shadow">
                <p className="text-muted-foreground text-lg">Nie znaleziono krów pasujących do filtrów.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRows.map((row) => (
                  <CowCard
                    key={row.original.id}
                    cow={row.original}
                    onEdit={openEditDialog}
                    onDelete={openArchiveDialog} 
                    onAddEvent={openAddEventDialog}
                    isOffline={row.original.id < 0}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* --- Dialogi (bez zmian) --- */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent onClose={closeAllDialogs}>
          <DialogHeader><DialogTitle>Dodaj nową krowę</DialogTitle></DialogHeader>
          <CowForm onSubmit={handleAddCow} onCancel={closeAllDialogs} loading={formLoading} onPhotoChange={setPhotoFile} />
        </DialogContent>
      </Dialog>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent onClose={closeAllDialogs}>
          <DialogHeader><DialogTitle>Edytuj krowę</DialogTitle></DialogHeader>
          <CowForm cow={selectedCow} onSubmit={handleEditCow} onCancel={closeAllDialogs} loading={formLoading} onPhotoChange={setPhotoFile} />
        </DialogContent>
      </Dialog>
      <DeleteCowDialog
        cow={selectedCow}
        open={isArchiveDialogOpen}
        onOpenChange={setIsArchiveDialogOpen}
        onConfirm={handleArchiveCow}
        loading={formLoading}
        error={null} 
      />
      <AddEventDialog cow={selectedCow} open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen} onSubmit={handleAddEvent} loading={formLoading} error={null} />
    </div>
  );
}
