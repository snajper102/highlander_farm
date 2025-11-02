// src/pages/CowDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks'; 
import { repository, syncService } from '../services/api'; 
import { db } from '../db'; 
import { Loader2, AlertCircle, ArrowLeft, Calendar, Tag, Edit2, Archive, PlusCircle, WifiOff, RefreshCw, CalendarCheck, FileText, BadgeDollarSign, ArchiveX, FileBox } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EventTimeline } from '../components/EventTimeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { CowForm } from '../components/CowForm';
import { DeleteCowDialog } from '../components/DeleteCowDialog';
import { AddEventDialog } from '../components/AddEventDialog';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { PedigreeChart } from './cow-detail/PedigreeChart';
import { OffspringList } from './cow-detail/OffspringList';
import { TaskList } from '../components/TaskList'; 
import { TaskForm } from '../components/TaskForm';
import { DocumentList } from './cow-detail/DocumentList'; 

// Dialog do dodawania zadań (bez zmian)
function AddTaskDialog({ cow, open, onOpenChange, onSubmit, loading }) {
  if (!cow) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader><DialogTitle>Dodaj zadanie dla: {cow.name}</DialogTitle></DialogHeader>
        <TaskForm defaultCowId={cow.id} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} loading={loading} />
      </DialogContent>
    </Dialog>
  );
}

export function CowDetailPage() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const numericId = parseInt(id, 10);
  
  const cow = useLiveQuery(() => repository.getCowQuery(numericId), [numericId], undefined);
  const events = useLiveQuery(() => repository.getEventsQuery(numericId), [numericId], undefined);
  const tasks = useLiveQuery(() => repository.getTasksQuery({ cow: numericId }), [numericId], undefined);
  const documents = useLiveQuery(() => repository.getDocumentsQuery(numericId), [numericId], undefined);
  
  const [pedigreeData, setPedigreeData] = useState(null);
  const [pedigreeLoading, setPedigreeLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncQueueCount = useLiveQuery(() => db.syncQueue.count(), [], 0);

  // Efekt synchronizacji (bez zmian)
  useEffect(() => {
    const runSync = () => { if (navigator.onLine) syncService.processSyncQueue(); };
    window.addEventListener('online', runSync);
    if (numericId > 0) {
      repository.syncCow(numericId); repository.syncEvents(numericId);
      repository.syncTasks({ cow: numericId }); repository.syncDocuments(numericId);
      setPedigreeLoading(true);
      repository.getPedigree(numericId)
        .then(data => setPedigreeData(data))
        .catch(err => toast.error(`Błąd ładowania rodowodu: ${err.message}`))
        .finally(() => setPedigreeLoading(false));
    } else { setPedigreeLoading(false); }
    return () => window.removeEventListener('online', runSync);
  }, [numericId]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true); const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);

  const closeAllDialogs = () => { setIsEditDialogOpen(false); setIsArchiveDialogOpen(false); setIsEventDialogOpen(false); setIsTaskDialogOpen(false); setPhotoFile(null); };

  // Handlery (bez zmian)
  const handleEditCow = async (formData) => {
    if (!cow) return;
    try { setFormLoading(true); const { photo, ...dataToSend } = formData; await repository.updateCow(cow.id, dataToSend);
      if (photoFile && cow.id && navigator.onLine) { await repository.uploadPhoto(cow.id, photoFile); }
      closeAllDialogs();
    } catch (err) { toast.error(err.message); } 
    finally { setFormLoading(false); }
  };
  const handleArchiveCow = async () => {
    if (!cow) return;
    try { setFormLoading(true); await repository.archiveCow(cow.id); closeAllDialogs(); navigate('/herd'); 
    } catch (err) { toast.error(err.message); } 
    finally { setFormLoading(false); }
  };
  const handleAddEvent = async (eventData) => {
    try { setFormLoading(true); await repository.createEvent(eventData); closeAllDialogs();
    } catch (err) { toast.error(err.message); } 
    finally { setFormLoading(false); }
  };
  const handleAddTask = async (taskData) => {
    try { setFormLoading(true); await repository.createTask(taskData); closeAllDialogs();
    } catch (err) { toast.error(err.message); } 
    finally { setFormLoading(false); }
  };
  const handleTaskUpdated = () => {
    if (navigator.onLine) { repository.syncTasks({ cow: numericId }); }
  }

  // Renderowanie
  if (cow === undefined || events === undefined || tasks === undefined || documents === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!cow) {
     return (
       <div className="min-h-screen bg-background p-8 max-w-2xl mx-auto text-center">
         <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{isOnline ? "Nie znaleziono krowy." : "Brak połączenia i krowa nie była zapisana lokalnie."}</AlertDescription></Alert>
         <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mt-4"><ArrowLeft className="w-4 h-4 mr-2" /> Wróć</Button>
       </div>
     );
  }

  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pl-PL') : 'Brak danych';
  const ageLabel = (age) => (age === 1 ? 'rok' : (age >= 2 && age <= 4 ? 'lata' : 'lat'));
  const activeTasksCount = tasks.filter(t => !t.is_completed).length;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Wróć do listy
        </Button>

        {!isOnline && ( <Alert variant="destructive" className="mb-4 bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300"> <WifiOff className="h-4 w-4" /> <AlertDescription> Jesteś offline. Zmiany zostaną zapisane lokalnie. </AlertDescription> </Alert> )}
        {isOnline && syncQueueCount > 0 && ( <Alert className="mb-4 bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"> <RefreshCw className="h-4 w-4 animate-spin" /> <AlertDescription> Synchronizowanie {syncQueueCount} {syncQueueCount === 1 ? 'zmiany' : 'zmian'}... </AlertDescription> </Alert> )}

        {/* Karta krowy (zaktualizowana) */}
        <div className="bg-card rounded-lg shadow-lg overflow-hidden mb-8 border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-4">{/* ... Zdjęcie ... */}
              {cow.photo ? ( <img src={cow.photo} alt={cow.name} className="w-full h-80 object-cover rounded-lg" />
              ) : ( <div className="w-full h-80 rounded-lg bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center"><span className="text-8xl">🐄</span></div> )}
              {cow.id < 0 && ( <Badge variant="outline" className="mt-2 border-yellow-500 text-yellow-600"><CloudOff className="w-4 h-4 mr-1" /> Krowa niezsynchronizowana</Badge> )}
            </div>
            <div className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-3xl font-bold text-foreground">{cow.name}</h1>
                  <Badge variant={cow.gender === 'F' ? 'default' : 'secondary'} className="text-lg">{cow.gender === 'F' ? '♀ Samica' : '♂ Samiec'}</Badge>
                </div>
                <div className="space-y-3 mt-4 text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-foreground">Tag:</span>
                    <span className="font-mono text-lg bg-emerald-100 dark:bg-emerald-900 px-2 py-1 rounded text-emerald-700 dark:text-emerald-300">{cow.tag_id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-foreground">Ur.:</span>
                    <span>{formatDate(cow.birth_date)} ({(cow.age || '?')} {ageLabel(cow.age || 0)})</span>
                  </div>
                  {/* === ZMIANA: Dodano więcej pól === */}
                  <div className="flex items-center gap-3">
                    <FileBox className="w-5 h-5 text-gray-500" />
                    <span className="font-semibold text-foreground">Paszport:</span>
                    <span>{cow.passport_number || '-'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground ml-8">Rasa:</span>
                    <span>{cow.breed}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground ml-8">Stado:</span>
                    <span>{cow.herd_name || 'Brak'}</span>
                  </div>
                  
                  {/* === NOWE POLA WYJŚCIA === */}
                  {(cow.status === 'SOLD' || cow.status === 'ARCHIVED') && (
                    <div className="border-t pt-3 mt-3 space-y-2">
                       <div className="flex items-center gap-3">
                         <ArchiveX className="w-5 h-5 text-red-600" />
                         <span className="font-semibold text-foreground">Status:</span>
                         <span className="font-bold text-red-600">{cow.status === 'SOLD' ? 'Sprzedana' : 'Zarchiwizowana'}</span>
                       </div>
                       <div className="flex items-center gap-3">
                         <span className="font-semibold text-foreground ml-8">Data:</span>
                         <span>{formatDate(cow.exit_date)}</span>
                       </div>
                       <div className="flex items-center gap-3">
                         <span className="font-semibold text-foreground ml-8">Powód:</span>
                         <span>{cow.exit_reason || '-'}</span>
                       </div>
                       {cow.sale_price && (
                         <div className="flex items-center gap-3">
                           <BadgeDollarSign className="w-5 h-5 text-green-600" />
                           <span className="font-semibold text-foreground">Kwota:</span>
                           <span>{cow.sale_price} zł</span>
                         </div>
                       )}
                    </div>
                  )}
                  
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <Button onClick={() => setIsTaskDialogOpen(true)} className="flex-1 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600">
                  <CalendarCheck className="w-4 h-4 mr-2" />
                  Nowe zadanie
                </Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edytuj
                </Button>
                {cow.status === 'ACTIVE' && (
                  <Button variant="destructive" onClick={() => setIsArchiveDialogOpen(true)}>
                    <Archive className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* === ZAKŁADKI (DODANO DOKUMENTY) === */}
        <Tabs defaultValue="tasks">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">
              Zadania 
              {activeTasksCount > 0 && <Badge className="ml-2 bg-red-600">{activeTasksCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history">Historia ({events?.length || 0})</TabsTrigger>
            <TabsTrigger value="pedigree">Rodowód</TabsTrigger>
            <TabsTrigger value="documents">Dokumenty ({documents?.length || 0})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tasks">
            <TaskList tasks={tasks} onTaskUpdated={handleTaskUpdated} />
          </TabsContent>
          <TabsContent value="history">
            <Button size="sm" onClick={() => setIsEventDialogOpen(true)} className="mb-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
              <PlusCircle className="w-4 h-4 mr-2" />
              Dodaj zdarzenie historyczne
            </Button>
            <EventTimeline events={events} />
          </TabsContent>
          <TabsContent value="pedigree">
            {pedigreeLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : pedigreeData ? (
              <div className="space-y-6">
                <PedigreeChart ancestors={pedigreeData.ancestors} />
                <OffspringList offspring={pedigreeData.offspring} />
              </div>
            ) : (
              <p className="text-muted-foreground">Nie można załadować rodowodu (sprawdź połączenie). Krowy dodane offline nie mają rodowodu.</p>
            )}
          </TabsContent>
          <TabsContent value="documents">
            <DocumentList cowId={numericId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* --- Dialogi (bez zmian) --- */}
      <AddEventDialog cow={cow} open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen} onSubmit={handleAddEvent} loading={formLoading} error={null} />
      <AddTaskDialog cow={cow} open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen} onSubmit={handleAddTask} loading={formLoading} />
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent onClose={closeAllDialogs}>
          <DialogHeader><DialogTitle>Edytuj krowę</DialogTitle></DialogHeader>
          <CowForm cow={cow} onSubmit={handleEditCow} onCancel={closeAllDialogs} loading={formLoading} onPhotoChange={setPhotoFile} />
        </DialogContent>
      </Dialog>
      <DeleteCowDialog cow={cow} open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen} onConfirm={handleArchiveCow} loading={formLoading} error={null} />
    </div>
  );
}
