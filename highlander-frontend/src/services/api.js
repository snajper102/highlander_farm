// src/services/api.js

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Funkcja pomocnicza do obsługi błędów API
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: 'Nieznany błąd serwera' };
    }
    
    // Formatowanie błędów walidacji Django (np. tag_id już istnieje)
    if (typeof errorData === 'object' && errorData !== null && !errorData.detail) {
      const messages = Object.entries(errorData).map(([key, value]) => {
        const fieldName = key.replace('_', ' ');
        // Poprawka dla błędu "non field errors"
        if (key === 'non_field_errors') {
            return Array.isArray(value) ? value.join(', ') : value;
        }
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}: ${Array.isArray(value) ? value.join(', ') : value}`;
      });
      throw new Error(messages.join(' '));
    }
    
    throw new Error(errorData.detail || 'Błąd serwera');
  }
  
  // Handle 204 No Content (dla DELETE)
  if (response.status === 204) {
      return true;
  }
  
  return response.json();
};

export const api = {
  getCows: async () => {
    const response = await fetch(`${API_BASE_URL}/cows/`);
    return handleResponse(response);
  },
  
  getCow: async (id) => {
    const response = await fetch(`${API_BASE_URL}/cows/${id}/`);
    return handleResponse(response);
  },

  searchCow: async (tagId) => {
    const response = await fetch(`${API_BASE_URL}/cows/search/?tag_id=${tagId}`);
    return handleResponse(response);
  },

  createCow: async (data) => {
    const response = await fetch(`${API_BASE_URL}/cows/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateCow: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/cows/${id}/`, {
      method: 'PATCH', // Używamy PATCH dla częściowej aktualizacji
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteCow: async (id) => {
    const response = await fetch(`${API_BASE_URL}/cows/${id}/`, {
      method: 'DELETE',
    });
    
    // Zmieniona obsługa DELETE - Django może zwrócić 200 OK z komunikatem
    // lub 204 No Content. Oba są sukcesem.
    if (!response.ok) {
        throw new Error('Błąd usuwania krowy');
    }
    return true;
  },

  // NOWA FUNKCJA
  uploadPhoto: async (id, file) => {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(`${API_BASE_URL}/cows/${id}/upload_photo/`, {
      method: 'POST',
      // Nie ustawiamy 'Content-Type', przeglądarka zrobi to sama
      // (dzięki temu ustawi poprawny 'boundary' dla multipart/form-data)
      body: formData, 
    });
    return handleResponse(response);
  },
};
