// src/components/CowForm.jsx

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Loader2, X, Upload } from 'lucide-react';

// Dodajemy onPhotoChange jako prop
export function CowForm({ cow, onSubmit, onCancel, loading, onPhotoChange }) {
  const [formData, setFormData] = useState({
    tag_id: '',
    name: '',
    breed: 'Highland Cattle',
    birth_date: '',
    gender: 'F',
  });
  const [errors, setErrors] = useState({});
  
  // Stan dla pliku i podglądu
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (cow) {
      setFormData({
        tag_id: cow.tag_id || '',
        name: cow.name || '',
        breed: cow.breed || 'Highland Cattle',
        // Upewnij się, że data jest w formacie YYYY-MM-DD dla <input type="date">
        birth_date: cow.birth_date ? new Date(cow.birth_date).toISOString().split('T')[0] : '',
        gender: cow.gender || 'F',
      });
      // Ustaw podgląd z istniejącego URL-a
      setPhotoPreview(cow.photo || null);
    } else {
      // Resetuj formularz przy dodawaniu
      setFormData({
        tag_id: '',
        name: '',
        breed: 'Highland Cattle',
        birth_date: '',
        gender: 'F',
      });
      setPhotoPreview(null);
    }
    // Zawsze resetuj plik przy otwarciu formularza
    setPhotoFile(null); 
    if(onPhotoChange) {
        onPhotoChange(null);
    }
  }, [cow]); // Zależność tylko od 'cow'

  // Efekt do generowania podglądu z pliku
  useEffect(() => {
    let objectUrl = null;
    if (photoFile) {
      objectUrl = URL.createObjectURL(photoFile);
      setPhotoPreview(objectUrl);
    } else if (cow?.photo) {
      // Jeśli plik jest usunięty, wróć do zdjęcia z propsów (tryb edycji)
      setPhotoPreview(cow.photo);
    } else {
      // Jeśli nie ma ani pliku, ani zdjęcia w propsach, nie ma podglądu
      setPhotoPreview(null);
    }

    // Czyszczenie pamięci
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photoFile, cow]); // Zależność od photoFile i cow


  const validate = () => {
    const newErrors = {};
        
    if (!formData.tag_id.trim()) {
      newErrors.tag_id = 'Numer kolczyka jest wymagany';
    }
        
    if (!formData.name.trim()) {
      newErrors.name = 'Imię jest wymagane';
    }
        
    if (!formData.birth_date) {
      newErrors.birth_date = 'Data urodzenia jest wymagana';
    } else {
      const birthDate = new Date(formData.birth_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Ignoruj czas
      if (birthDate > today) {
        newErrors.birth_date = 'Data urodzenia nie może być w przyszłości';
      }
    }
        
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Przekazujemy tylko dane tekstowe, plik pójdzie osobno
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

  // Handler dla pola pliku
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setPhotoFile(file);
      onPhotoChange(file); // Przekaż plik do rodzica
    } else {
      // Opcjonalnie: pokaż błąd jeśli plik nie jest obrazkiem
      e.target.value = null; // Wyczyść input
    }
  };

  // Handler do usuwania zdjęcia
  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null); // Usunie podgląd
    onPhotoChange(null);
    // TODO: W przyszłości można dodać logikę do usuwania zdjęcia z serwera
    // (np. przez wysłanie `photo: null` w updateCow)
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      
      {/* Podgląd zdjęcia */}
      <div className="w-full h-48 rounded-lg bg-gray-100 flex items-center justify-center relative border border-dashed">
        {photoPreview ? (
          <>
            <img 
              src={photoPreview} 
              alt="Podgląd" 
              className="w-full h-full object-cover rounded-lg" 
            />
            <Button 
              type="button" 
              variant="destructive" 
              size="icon"
              className="absolute top-2 right-2 rounded-full w-8 h-8 opacity-80 hover:opacity-100"
              onClick={handleRemovePhoto}
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <div className="text-gray-500 text-center">
            <Upload className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">Brak zdjęcia</p>
          </div>
        )}
      </div>
      
      {/* Input pliku */}
      <div>
        <Label htmlFor="photo">Zmień/dodaj zdjęcie</Label>
        <Input
          id="photo"
          name="photo"
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handlePhotoChange}
          disabled={loading}
          className="file:text-emerald-700 file:font-semibold hover:file:bg-emerald-50 cursor-pointer"
        />
      </div>

      {/* Tag ID */}
      <div>
        <Label htmlFor="tag_id">Numer kolczyka *</Label>
        <Input
          id="tag_id"
          name="tag_id"
          value={formData.tag_id}
          onChange={handleChange}
          placeholder="np. PL001"
          disabled={loading}
        />
        {errors.tag_id && (
          <p className="text-sm text-red-600 mt-1">{errors.tag_id}</p>
        )}
      </div>

      {/* Name */}
      <div>
        <Label htmlFor="name">Imię *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="np. Bella"
          disabled={loading}
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name}</p>
        )}
      </div>

      {/* Breed */}
      <div>
        <Label htmlFor="breed">Rasa</Label>
        <Input
          id="breed"
          name="breed"
          value={formData.breed}
          onChange={handleChange}
          placeholder="Highland Cattle"
          disabled={loading}
        />
      </div>

      {/* Birth Date */}
      <div>
        <Label htmlFor="birth_date">Data urodzenia *</Label>
        <Input
          id="birth_date"
          name="birth_date"
          type="date"
          value={formData.birth_date}
          onChange={handleChange}
          disabled={loading}
        />
        {errors.birth_date && (
          <p className="text-sm text-red-600 mt-1">{errors.birth_date}</p>
        )}
      </div>

      {/* Gender */}
      <div>
        <Label htmlFor="gender">Płeć *</Label>
        <Select
          id="gender"
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          disabled={loading}
        >
          <option value="F">Samica (♀)</option>
          <option value="M">Samiec (♂)</option>
        </Select>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white py-2 -mx-2 px-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Zapisywanie...
            </>
          ) : (
            cow ? 'Zaktualizuj' : 'Dodaj krowę'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}
