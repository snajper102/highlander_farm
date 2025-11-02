// src/components/TaskForm.jsx
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';
import { Loader2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { repository } from '../services/api';

/**
 * === NOWA FUNKCJA POMOCNICZA ===
 * Konwertuje obiekt Date (w lokalnej strefie) na string YYYY-MM-DD
 * bez przesuwania o strefę czasową.
 */
const toLocalDateString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  // Pobieramy rok, miesiąc i dzień w LOKALNEJ strefie
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function TaskForm({ task, defaultValues, onSubmit, onCancel, loading }) {
  
  const [formData, setFormData] = useState({
    title: '',
    task_type: 'WETERYNARZ',
    due_date: new Date().toISOString().split('T')[0],
    notes: '',
    cow: '',
    is_completed: false,
  });
  const [errors, setErrors] = useState({});

  const activeCows = useLiveQuery(
    () => repository.getPotentialParentsQuery(),
    [], []
  );

  useEffect(() => {
    if (task) {
      // Tryb edycji: dane z API są już stringiem YYYY-MM-DD
      setFormData({
        title: task.title || '',
        task_type: task.task_type || 'WETERYNARZ',
        due_date: task.due_date || '', // Już jest OK
        notes: task.notes || '',
        cow: task.cow || '',
        is_completed: task.is_completed || false,
      });
    } else if (defaultValues) {
      // === POPRAWKA BŁĘDU ===
      // Tryb tworzenia: użyj nowej funkcji do konwersji
      setFormData({
        title: '',
        task_type: 'WETERYNARZ',
        due_date: toLocalDateString(defaultValues.due_date) || toLocalDateString(new Date()),
        notes: '',
        cow: defaultValues.cow || '',
        is_completed: false,
      });
    }
  }, [task, defaultValues]);
  
  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) { newErrors.title = 'Tytuł jest wymagany'; }
    if (!formData.due_date) { newErrors.date = 'Termin jest wymagany'; }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const payload = { ...formData, cow: formData.cow || null };
      onSubmit(payload, task?.id);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Tytuł zadania *</Label>
        <Input id="title" name="title" value={formData.title} onChange={handleChange} disabled={loading} />
        {errors.title && (<p className="text-sm text-red-600 mt-1">{errors.title}</p>)}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="task_type">Typ zadania *</Label>
          <Select id="task_type" name="task_type" value={formData.task_type} onChange={handleChange} disabled={loading}>
            <option value="WETERYNARZ">Wizyta weterynarza</option>
            <option value="SZCZEPIENIE">Zaplanuj szczepienie</option>
            <option value="BADANIE">Zaplanuj badanie</option>
            <option value="PIELĘGNACJA">Pielęgnacja</option>
            <option value="INNE">Inne zadanie</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="due_date">Termin wykonania *</Label>
          <Input id="due_date" name="due_date" type="date" value={formData.due_date} onChange={handleChange} disabled={loading} />
          {errors.date && (<p className="text-sm text-red-600 mt-1">{errors.date}</p>)}
        </div>
      </div>
      
      <div>
        <Label htmlFor="cow">Powiązana krowa (opcjonalnie)</Label>
        <Select id="cow" name="cow" value={formData.cow} onChange={handleChange} disabled={loading}>
          <option value="">-- Brak / Zadanie ogólne --</option>
          {activeCows.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.tag_id})
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Notatki</Label>
        <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="Dodatkowe informacje..." disabled={loading} />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Anuluj</Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (task ? 'Zapisz zmiany' : 'Stwórz zadanie')}
        </Button>
      </div>
    </form>
  );
}
