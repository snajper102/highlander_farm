// src/components/CowForm.jsx

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Loader2, X, Upload } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks'; // <-- NOWY IMPORT
import { repository } from '../services/api'; // <-- NOWY IMPORT

export function CowForm({ cow, onSubmit, onCancel, loading, onPhotoChange }) {
  const [formData, setFormData] = useState({
    tag_id: '',
    name: '',
    breed: 'Highland Cattle',
    birth_date: '',
    gender: 'F',
    status: 'ACTIVE',
    dam: '', // <-- NOWE POLE (ID)
    sire: '', // <-- NOWE POLE (ID)
  });
  const [errors, setErrors] = useState({});
  
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // === NOWOŚĆ: Pobierz listę potencjalnych rodziców z Dexie ===
  const potentialParents = useLiveQuery(
    () => repository.getPotentialParentsQuery(),
    [], // Zależności
    []  // Wartość początkowa
  );
  
  // Filtruj rodziców na samce i samice
  const potentialDams = potentialParents.filter(p => p.gender === 'F' && p.id !== cow?.id);
  const potentialSires = potentialParents.filter(p => p.gender === 'M' && p.id !== cow?.id);
  // =========================================================

  useEffect(() => {
    if (cow) {
      setFormData({
        tag_id: cow.tag_id || '',
        name: cow.name || '',
        breed: cow.breed || 'Highland Cattle',
        birth_date: cow.birth_date ? new Date(cow.birth_date).toISOString().split('T')[0] : '',
        gender: cow.gender || 'F',
        status: cow.status || 'ACTIVE',
        dam: cow.dam || '',
        sire: cow.sire || '',
      });
      setPhotoPreview(cow.photo || null);
    } else {
      setFormData({
        tag_id: '', name: '', breed: 'Highland Cattle', birth_date: '',
        gender: 'F', status: 'ACTIVE', dam: '', sire: '',
      });
      setPhotoPreview(null);
    }
    setPhotoFile(null); 
    if(onPhotoChange) { onPhotoChange(null); }
  }, [cow]); 

  useEffect(() => {
    let objectUrl = null;
    if (photoFile) {
      objectUrl = URL.createObjectURL(photoFile);
      setPhotoPreview(objectUrl);
    } else if (cow?.photo) {
      setPhotoPreview(cow.photo);
    } else {
      setPhotoPreview(null);
    }
    return () => { if (objectUrl) { URL.revokeObjectURL(objectUrl); }};
  }, [photoFile, cow]); 


  const validate = () => {
    const newErrors = {};
    if (!formData.tag_id.trim()) newErrors.tag_id = 'Numer kolczyka jest wymagany';
    if (!formData.name.trim()) newErrors.name = 'Imię jest wymagane';
    if (!formData.birth_date) newErrors.birth_date = 'Data urodzenia jest wymagana';
    else {
      const birthDate = new Date(formData.birth_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      if (birthDate > today) newErrors.birth_date = 'Data urodzenia nie może być w przyszłości';
    }
    // Walidacja rodowodu
    if (formData.dam && formData.dam === formData.sire) {
      newErrors.dam = 'Matka i ojciec nie mogą być tą samą krową.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData); 
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setPhotoFile(file);
      onPhotoChange(file); 
    } else { e.target.value = null; }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null); setPhotoPreview(null); onPhotoChange(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      
      {/* Podgląd zdjęcia (bez zmian) */}
      <div className="w-full h-48 rounded-lg bg-gray-100 flex items-center justify-center relative border border-dashed">
        {photoPreview ? (
          <>
            <img src={photoPreview} alt="Podgląd" className="w-full h-full object-cover rounded-lg" />
            <Button type="button" variant="destructive" size="icon"
              className="absolute top-2 right-2 rounded-full w-8 h-8 opacity-80 hover:opacity-100"
              onClick={handleRemovePhoto}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <div className="text-muted-foreground text-center">
            <Upload className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">Brak zdjęcia</p>
          </div>
        )}
      </div>
      
      {/* Input pliku (bez zmian) */}
      <div>
        <Label htmlFor="photo">Zmień/dodaj zdjęcie</Label>
        <Input id="photo" name="photo" type="file" accept="image/png, image/jpeg, image/webp"
          onChange={handlePhotoChange} disabled={loading}
          className="file:text-emerald-700 file:font-semibold hover:file:bg-emerald-50 cursor-pointer"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tag_id">Numer kolczyka *</Label>
          <Input id="tag_id" name="tag_id" value={formData.tag_id} onChange={handleChange} placeholder="np. PL001" disabled={loading} />
          {errors.tag_id && (<p className="text-sm text-red-600 mt-1">{errors.tag_id}</p>)}
        </div>
        <div>
          <Label htmlFor="name">Imię *</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="np. Bella" disabled={loading} />
          {errors.name && (<p className="text-sm text-red-600 mt-1">{errors.name}</p>)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="birth_date">Data urodzenia *</Label>
          <Input id="birth_date" name="birth_date" type="date" value={formData.birth_date} onChange={handleChange} disabled={loading} />
          {errors.birth_date && (<p className="text-sm text-red-600 mt-1">{errors.birth_date}</p>)}
        </div>
        <div>
          <Label htmlFor="breed">Rasa</Label>
          <Input id="breed" name="breed" value={formData.breed} onChange={handleChange} placeholder="Highland Cattle" disabled={loading} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="gender">Płeć *</Label>
          <Select id="gender" name="gender" value={formData.gender} onChange={handleChange} disabled={loading}>
            <option value="F">Samica (♀)</option>
            <option value="M">Samiec (♂)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" value={formData.status} onChange={handleChange} disabled={loading}>
            <option value="ACTIVE">Aktywna</option>
            <option value="SOLD">Sprzedana</option>
            <option value="ARCHIVED">Zarchiwizowana</option>
          </Select>
        </div>
      </div>
      
      {/* === NOWE POLA RODOWODU === */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dam">Matka (Dam)</Label>
          <Select id="dam" name="dam" value={formData.dam} onChange={handleChange} disabled={loading}>
            <option value="">-- Brak / Nieznana --</option>
            {potentialDams.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.tag_id})
              </option>
            ))}
          </Select>
          {errors.dam && (<p className="text-sm text-red-600 mt-1">{errors.dam}</p>)}
        </div>
        <div>
          <Label htmlFor="sire">Ojciec (Sire)</Label>
          <Select id="sire" name="sire" value={formData.sire} onChange={handleChange} disabled={loading}>
            <option value="">-- Brak / Nieznany --</option>
            {potentialSires.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.tag_id})
              </option>
            ))}
          </Select>
        </div>
      </div>
      {/* ========================== */}

      {/* Buttons (bez zmian) */}
      <div className="flex gap-3 pt-4 sticky bottom-0 bg-card py-2 -mx-2 px-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Zapisywanie...</>) 
                   : (cow ? 'Zaktualizuj' : 'Dodaj krowę')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}
