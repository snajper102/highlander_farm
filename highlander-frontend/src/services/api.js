const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = {
  getCows: async () => {
    const response = await fetch(`${API_BASE_URL}/cows/`);
    if (!response.ok) throw new Error('Błąd pobierania danych');
    return response.json();
  },

  getCow: async (id) => {
    const response = await fetch(`${API_BASE_URL}/cows/${id}/`);
    if (!response.ok) throw new Error('Krowa nie znaleziona');
    return response.json();
  },

  searchCow: async (tagId) => {
    const response = await fetch(`${API_BASE_URL}/cows/search/?tag_id=${tagId}`);
    if (!response.ok) throw new Error('Krowa nie znaleziona');
    return response.json();
  },

  createCow: async (data) => {
    const response = await fetch(`${API_BASE_URL}/cows/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Błąd dodawania krowy');
    }
    return response.json();
  },

  updateCow: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/cows/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Błąd aktualizacji krowy');
    }
    return response.json();
  },

  deleteCow: async (id) => {
    const response = await fetch(`${API_BASE_URL}/cows/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Błąd usuwania krowy');
    return true;
  },

  uploadPhoto: async (id, file) => {
    const formData = new FormData();
    formData.append('photo', file);
    
    const response = await fetch(`${API_BASE_URL}/cows/${id}/upload_photo/`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Błąd uploadu zdjęcia');
    return response.json();
  },
};
