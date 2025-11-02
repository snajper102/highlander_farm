// src/components/CowForm.jsx

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';
import { Loader2, X, Upload } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks'; 
import { repository } from '../services/api'; 
import { db } from '../db'; 

const toLocalDateString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Domyślna pusta formatka
const defaultFormData = {
  tag_id: '', name: '', breed: 'Highland Cattle', birth_date: '',
  gender: 'F', status: 'ACTIVE', dam: '', sire: '', herd: '',
  passport_number: '', business_number: '', color: '',
  exit_date: '', exit_reason: '', sale_price: '', meat_delivery_date: '', 
  weight: '', daily_weight_gain: '', pregnancy_duration: '',
  is_pregnancy_possible: '', relocation_status: '', duplicates_to_make: '',
  duplicates_to_order: '', relocation_after_drive: '', notes: '',
};

export function CowForm({ cow, onSubmit, onCancel, loading, onPhotoChange }) {
  const [formData, setFormData] = useState(defaultFormData);
  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const herds = useLiveQuery(() => db.herds.toArray(), [], []);
  const potentialParents = useLiveQuery(
    () => repository.getPotentialParentsQuery(), [], []
  );
  
  const potentialDams = potentialParents.filter(p => p.gender === 'F' && p.id !== cow?.id);
  const potentialSires = potentialParents.filter(p => p.gender === 'M' && p.id !== cow?.id);

  useEffect(() => {
    if (cow) {
      // Tryb Edycji: Wypełnij formularz danymi krowy, dbając o wartości null
      const cowData = {};
      for (const key in defaultFormData) {
        cowData[key] = cow[key] || ''; // Użyj pustego stringa dla null/undefined
      }
      // Popraw format dat
      cowData.birth_date = toLocalDateString(cow.birth_date);
      cowData.exit_date = toLocalDateString(cow.exit_date);
      cowData.meat_delivery_date = toLocalDateString(cow.meat_delivery_date);
      
      delete cowData.photo; 
      setFormData(cowData);
      setPhotoPreview(cow.photo || null);
    } else {
      // Tryb Tworzenia
      setFormData(defaultFormData);
      setPhotoPreview(null);
    }
    setPhotoFile(null); 
    if(onPhotoChange) { onPhotoChange(null); }
  }, [cow]); 

  useEffect(() => {
    let objectUrl = null;
    if (photoFile) {
      objectUrl = URL.createObjectURL(photoFile); setPhotoPreview(objectUrl);
    } else if (cow?.photo) {
      setPhotoPreview(cow.photo);
    } else { setPhotoPreview(null); }
    return () => { if (objectUrl) { URL.revokeObjectURL(objectUrl); }};
  }, [photoFile, cow]); 


  const validate = () => {
    const newErrors = {};
    if (!formData.tag_id.trim()) newErrors.tag_id = 'NR ARIMR jest wymagany';
    if (!formData.name.trim()) newErrors.name = 'Imię jest wymagane';
    if (formData.dam && formData.dam === formData.sire) {
      newErrors.dam = 'Matka i ojciec nie mogą być tą samą krową.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const payload = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [key, value === '' ? null : value])
      );
      // Konwertuj liczby
      payload.weight = payload.weight ? parseFloat(payload.weight) : null;
      payload.daily_weight_gain = payload.daily_weight_gain ? parseFloat(payload.daily_weight_gain) : null;
      payload.sale_price = payload.sale_price ? parseFloat(payload.sale_price) : null;
      
      onSubmit(payload); 
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) { setErrors(prev => ({ ...prev, [name]: '' })); }
  };
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setPhotoFile(file); onPhotoChange(file); 
    } else { e.target.value = null; }
  };
  const handleRemovePhoto = () => {
    setPhotoFile(null); setPhotoPreview(null); onPhotoChange(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      
      {/* Zdjęcie */}
      <div className="w-full h-48 rounded-lg bg-gray-100 flex items-center justify-center relative border border-dashed">
        {photoPreview ? (
          <><img src={photoPreview} alt="Podgląd" className="w-full h-full object-cover rounded-lg" />
          <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full w-8 h-8 opacity-80 hover:opacity-100" onClick={handleRemovePhoto}>
            <X className="w-4 h-4" />
          </Button></>
        ) : (
          <div className="text-muted-foreground text-center"><Upload className="w-10 h-10 mx-auto mb-2" /><p className="text-sm">Brak zdjęcia</p></div>
        )}
      </div>
      <div>
        <Label htmlFor="photo">Zmień/dodaj zdjęcie</Label>
        <Input id="photo" name="photo" type="file" accept="image/png, image/jpeg, image/webp" onChange={handlePhotoChange} disabled={loading} className="file:text-emerald-700 file:font-semibold hover:file:bg-emerald-50 cursor-pointer" />
      </div>

      {/* === NOWY UKŁAD PÓL (WSZYSTKIE) === */}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tag_id">NR ARIMR (Kolczyk) *</Label>
          <Input id="tag_id" name="tag_id" value={formData.tag_id} onChange={handleChange} disabled={loading} />
          {errors.tag_id && (<p className="text-sm text-red-600 mt-1">{errors.tag_id}</p>)}
        </div>
        <div>
          <Label htmlFor="name">Imię *</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} disabled={loading} />
          {errors.name && (<p className="text-sm text-red-600 mt-1">{errors.name}</p>)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
         <div>
          <Label htmlFor="herd">Stado</Label>
          <Select id="herd" name="herd" value={formData.herd} onChange={handleChange} disabled={loading}>
            <option value="">-- Wybierz stado --</option>
            {herds.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="passport_number">Numer paszportu</Label>
          <Input id="passport_number" name="passport_number" value={formData.passport_number} onChange={handleChange} disabled={loading} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="birth_date">Data urodzenia</Label>
          <Input id="birth_date" name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="gender">Płeć</Label>
          <Select id="gender" name="gender" value={formData.gender} onChange={handleChange} disabled={loading}>
            <option value="F">Samica (♀)</option>
            <option value="M">Samiec (♂)</option>
          </Select>
        </div>
         <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" value={formData.status} onChange={handleChange} disabled={loading}>
            <option value="ACTIVE">Aktywna</option>
            <option value="SOLD">Sprzedana</option>
            <option value="ARCHIVED">Zarchiwizowana</option>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="breed">Rasa</Label>
          <Input id="breed" name="breed" value={formData.breed} onChange={handleChange} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="color">Maść</Label>
          <Input id="color" name="color" value={formData.color} onChange={handleChange} disabled={loading} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dam">Matka (Dam)</Label>
          <Select id="dam" name="dam" value={formData.dam} onChange={handleChange} disabled={loading}>
            <option value="">-- Brak / Nieznana --</option>
            {potentialDams.map(d => ( <option key={d.id} value={d.id}>{d.name} ({d.tag_id})</option> ))}
          </Select>
          {errors.dam && (<p className="text-sm text-red-600 mt-1">{errors.dam}</p>)}
        </div>
        <div>
          <Label htmlFor="sire">Ojciec (Sire)</Label>
          <Select id="sire" name="sire" value={formData.sire} onChange={handleChange} disabled={loading}>
            <option value="">-- Brak / Nieznany --</option>
            {potentialSires.map(s => ( <option key={s.id} value={s.id}>{s.name} ({s.tag_id})</option> ))}
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="weight">Waga (kg)</Label>
          <Input id="weight" name="weight" type="number" step="0.1" value={formData.weight} onChange={handleChange} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="daily_weight_gain">Przyrost/Dzień (kg)</Label>
          <Input id="daily_weight_gain" name="daily_weight_gain" type="number" step="0.01" value={formData.daily_weight_gain} onChange={handleChange} disabled={loading} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pregnancy_duration">Długość ciąży</Label>
          <Input id="pregnancy_duration" name="pregnancy_duration" value={formData.pregnancy_duration} onChange={handleChange} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="is_pregnancy_possible">Możliwość bycia cielną</Label>
          <Input id="is_pregnancy_possible" name="is_pregnancy_possible" value={formData.is_pregnancy_possible} onChange={handleChange} disabled={loading} />
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <Label className="text-lg font-medium">Dane Zarządcze</Label>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="relocation_status">Relokacja</Label>
          <Input id="relocation_status" name="relocation_status" value={formData.relocation_status} onChange={handleChange} disabled={loading} />
        </div>
         <div>
          <Label htmlFor="business_number">Numer działalności</Label>
          <Input id="business_number" name="business_number" value={formData.business_number} onChange={handleChange} disabled={loading} />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="duplicates_to_make">Duplikaty do założenia</Label>
          <Input id="duplicates_to_make" name="duplicates_to_make" value={formData.duplicates_to_make} onChange={handleChange} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="duplicates_to_order">Zamówić duplikaty</Label>
          <Input id="duplicates_to_order" name="duplicates_to_order" value={formData.duplicates_to_order} onChange={handleChange} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="relocation_after_drive">Relokacja po przepędzie</Label>
          <Input id="relocation_after_drive" name="relocation_after_drive" value={formData.relocation_after_drive} onChange={handleChange} disabled={loading} />
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <Label className="text-lg font-medium">Dane Wyjścia ze Stada</Label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="exit_date">Data sprzedaży/Padnięcia</Label>
          <Input id="exit_date" name="exit_date" type="date" value={formData.exit_date} onChange={handleChange} disabled={loading} />
        </div>
         <div>
          <Label htmlFor="sale_price">Kwota sprzedaży</Label>
          <Input id="sale_price" name="sale_price" type="number" step="0.01" value={formData.sale_price} onChange={handleChange} disabled={loading} />
        </div>
         <div>
          <Label htmlFor="meat_delivery_date">Dostawa mięsa</Label>
          <Input id="meat_delivery_date" name="meat_delivery_date" type="date" value={formData.meat_delivery_date} onChange={handleChange} disabled={loading} />
        </div>
      </div>
      
      <div>
        <Label htmlFor="exit_reason">Nabywca / Przyczyna</Label>
        <Input id="exit_reason" name="exit_reason" value={formData.exit_reason} onChange={handleChange} disabled={loading} />
      </div>
      
      <div>
        <Label htmlFor="notes">Uwagi</Label>
        <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} disabled={loading} />
      </div>

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-card py-2 -mx-2 px-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Zapisywanie...</>) : (cow ? 'Zaktualizuj' : 'Dodaj krowę')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}> Anuluj </Button>
      </div>
    </form>
  );
}
