// src/components/TaskList.jsx
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, Clock, Syringe, ClipboardCheck, Stethoscope, FileText, UserCheck } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { repository } from '../services/api';

// Mapowanie ikon do typów zadań
const taskIcons = {
  'WETERYNARZ': <Stethoscope className="w-5 h-5 text-red-500" />,
  'SZCZEPIENIE': <Syringe className="w-5 h-5 text-blue-500" />,
  'BADANIE': <ClipboardCheck className="w-5 h-5 text-green-500" />,
  'PIELĘGNACJA': <UserCheck className="w-5 h-5 text-purple-500" />,
  'INNE': <FileText className="w-5 h-5 text-gray-500" />,
};

// Formatuje datę, np. "15 maja 2024"
const formatDate = (dateString) => {
  return format(parseISO(dateString), 'd MMMM yyyy', { locale: pl });
};

export function TaskList({ tasks, onTaskUpdated, showCowName = false }) {

  const handleToggleComplete = async (task) => {
    try {
      await repository.updateTask(task.id, { is_completed: !task.is_completed });
      toast.success(task.is_completed ? "Oznaczono zadanie jako niewykonane" : "Oznaczono zadanie jako wykonane");
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-10 bg-card rounded-lg shadow-sm">
        <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-muted-foreground">Brak zadań do wykonania.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-start gap-4 p-4 bg-card border rounded-lg shadow-sm">
          {/* Ikona typu */}
          <div className="flex-shrink-0">
            {taskIcons[task.task_type] || taskIcons['INNE']}
          </div>
          
          {/* Treść zadania */}
          <div className="flex-1 space-y-1">
            <h4 className="font-semibold text-foreground">{task.title}</h4>
            {showCowName && task.cow_name && (
              <p className="text-sm font-medium text-primary">{task.cow_name} ({task.cow_tag_id})</p>
            )}
            <p className="text-sm text-muted-foreground">{task.notes || 'Brak dodatkowych notatek.'}</p>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-4 h-4 mr-2" />
              Termin: {formatDate(task.due_date)}
            </div>
          </div>
          
          {/* Przycisk ukończenia */}
          <div className="flex-shrink-0">
            <Button
              variant={task.is_completed ? "default" : "outline"}
              size="sm"
              onClick={() => handleToggleComplete(task)}
              title={task.is_completed ? "Oznacz jako niewykonane" : "Oznacz jako wykonane"}
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
