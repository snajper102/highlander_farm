// src/pages/CalendarPage.jsx
import { useState, useMemo, useEffect } from 'react';
// === POPRAWKA: Importujemy 'Views' ===
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, parseISO } from 'date-fns'; 
import pl from 'date-fns/locale/pl';
import { useLiveQuery } from 'dexie-react-hooks';
import { repository, syncService } from '../services/api';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { TaskForm } from '../components/TaskForm';
import { useAuth } from '../contexts/AuthContext'; 

// Konfiguracja date-fns (bez zmian)
const locales = { 'pl': pl };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: pl }),
  getDay,
  locales,
});

// === POPRAWKA: Definiujemy, które widoki chcemy (bez 'Work Week') ===
const allViews = [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA];

function CalendarEvent({ event }) {
  return (
    <div className="flex items-center">
      <span className="truncate">{event.title}</span>
      {event.resource.cow_name && <span className="ml-1 opacity-70 text-xs">({event.resource.cow_name})</span>}
    </div>
  )
}

export function CalendarPage() {
  const { user } = useAuth(); 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); 
  const [defaultValues, setDefaultValues] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  
  // === POPRAWKA: Dodajemy stan dla aktywnego widoku ===
  const [view, setView] = useState(Views.MONTH);

  const tasks = useLiveQuery(
    () => repository.getTasksForCalendarQuery(),
    [],
    undefined
  );

  useEffect(() => {
    repository.syncTasks();
  }, []);

  const calendarEvents = useMemo(() => {
    if (!tasks) return [];
    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      start: parseISO(task.due_date + 'T00:00:00'), 
      end: parseISO(task.due_date + 'T00:00:00'),
      allDay: true,
      resource: task, 
    }));
  }, [tasks]);

  const handleSelectSlot = (slotInfo) => {
    setDefaultValues({ due_date: slotInfo.start });
    setSelectedTask(null);
    setIsFormOpen(true);
  };

  const handleSelectEvent = (event) => {
    setSelectedTask(event.resource);
    setDefaultValues({}); 
    setIsFormOpen(true);
  };

  const handleSubmit = async (formData, id) => {
    setFormLoading(true);
    const payload = { ...formData };
    if (!id) {
        payload.user = user.userId; 
    }
    
    try {
      if (id) {
        await repository.updateTask(id, payload);
      } else {
        await repository.createTask(payload);
      }
      setIsFormOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  if (tasks === undefined) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Kalendarz zadań</h1>
        <Button onClick={() => { setSelectedTask(null); setDefaultValues({ due_date: new Date() }); setIsFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj zadanie
        </Button>
      </div>
      
      {/* === POPRAWKA: Zamiast 'style', używamy klas Tailwind 'h-[70vh]' === */}
      <div className="bg-card p-4 rounded-lg shadow-sm border h-[70vh]">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          culture="pl"
          
          // === POPRAWKA: Dodajemy te 3 właściwości ===
          views={allViews}
          view={view}
          onView={setView}
          // ==========================================
          
          messages={{
            next: "Następny",
            previous: "Poprzedni",
            today: "Dziś",
            month: "Miesiąc",
            week: "Tydzień",
            day: "Dzień",
            agenda: "Agenda",
            noEventsInRange: "Brak zaplanowanych zadań w tym zakresie."
          }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable={true}
          components={{
            event: CalendarEvent
          }}
        />
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent onClose={() => setIsFormOpen(false)}>
          <DialogHeader>
            <DialogTitle>{selectedTask ? 'Edytuj zadanie' : 'Stwórz nowe zadanie'}</DialogTitle>
          </DialogHeader>
          <TaskForm
            task={selectedTask}
            defaultValues={defaultValues} 
            onSubmit={handleSubmit}
            onCancel={() => setIsFormOpen(false)}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
