// src/services/api.js
import { db } from '../db'; 
import { liveQuery } from 'dexie'; 
import { authService } from './auth';
import { toast } from 'sonner'; 

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const authedFetch = async (url, options = {}) => {
  const token = authService.getAccessToken();
  if (!(options.body instanceof FormData)) {
    options.headers = { 'Content-Type': 'application/json', ...options.headers };
  } else { delete options.headers?.['Content-Type']; }
  if (token) { options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` }; }
  const response = await fetch(url, options);
  if (response.status === 401) {
    toast.error("Sesja wygasła. Zaloguj się ponownie.");
    authService.logout(); throw new Error("Sesja wygasła.");
  }
  return response;
};
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData;
    try { errorData = await response.json(); } catch (e) {
      if (response.status === 0 || !response.status) throw new Error('Jesteś offline. Nie można połączyć z serwerem.');
      errorData = { detail: 'Nieznany błąd serwera' };
    }
    if (typeof errorData === 'object' && errorData !== null && !errorData.detail) {
      const messages = Object.entries(errorData).map(([key, value]) => {
        const fieldName = key.replace('_', ' ');
        if (key === 'non_field_errors') return Array.isArray(value) ? value.join(', ') : value;
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}: ${Array.isArray(value) ? value.join(', ') : value}`;
      });
      throw new Error(messages.join(' '));
    }
    throw new Error(errorData.detail || 'Błąd serwera');
  }
  if (response.status === 204) return true;
  const data = await response.json();
  return data.results || data; 
};

export const networkApi = {
  getStats: async () => handleResponse(await authedFetch(`${API_BASE_URL}/cows/stats/`)),
  getCows: async () => handleResponse(await authedFetch(`${API_BASE_URL}/cows/`)),
  getCow: async (id) => handleResponse(await authedFetch(`${API_BASE_URL}/cows/${id}/`)),
  searchCow: async (tagId) => handleResponse(await authedFetch(`${API_BASE_URL}/cows/search/?tag_id=${tagId}`)),
  getEventsForCow: async (cowId) => handleResponse(await authedFetch(`${API_BASE_URL}/events/?cow=${cowId}`)),
  getTasks: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.start) params.append('due_date__gte', filters.start);
    if (filters.end) params.append('due_date__lte', filters.end);
    if (filters.cow) params.append('cow', filters.cow);
    if (filters.is_completed) params.append('is_completed', filters.is_completed);
    return handleResponse(await authedFetch(`${API_BASE_URL}/tasks/?${params.toString()}`));
  },
  getPedigree: async (id) => handleResponse(await authedFetch(`${API_BASE_URL}/cows/${id}/pedigree/`)),
  
  getDocuments: async (cowId) => handleResponse(await authedFetch(`${API_BASE_URL}/documents/?cow=${cowId}`)),
  uploadDocument: async (cowId, title, file) => {
    const formData = new FormData();
    formData.append('cow', cowId);
    formData.append('title', title);
    formData.append('file', file);
    return handleResponse(await authedFetch(`${API_BASE_URL}/documents/`, { method: 'POST', body: formData }));
  },
  deleteDocument: async (id) => handleResponse(await authedFetch(`${API_BASE_URL}/documents/${id}/`, { method: 'DELETE' })),
  
  createCow: async (data) => handleResponse(await authedFetch(`${API_BASE_URL}/cows/`, { method: 'POST', body: JSON.stringify(data) })),
  updateCow: async (id, data) => handleResponse(await authedFetch(`${API_BASE_URL}/cows/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })),
  deleteCow: async (id) => {
    const response = await authedFetch(`${API_BASE_URL}/cows/${id}/`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Błąd archiwizacji krowy');
    return true; 
  },
  uploadPhoto: async (id, file) => {
    const formData = new FormData(); formData.append('photo', file);
    return handleResponse(await authedFetch(`${API_BASE_URL}/cows/${id}/upload_photo/`, { method: 'POST', body: formData }));
  },
  createEvent: async (data) => handleResponse(await authedFetch(`${API_BASE_URL}/events/`, { method: 'POST', body: JSON.stringify(data) })),
  createTask: async (data) => handleResponse(await authedFetch(`${API_BASE_URL}/tasks/`, { method: 'POST', body: JSON.stringify(data) })),
  updateTask: async (id, data) => handleResponse(await authedFetch(`${API_BASE_URL}/tasks/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })),
  deleteTask: async (id) => handleResponse(await authedFetch(`${API_BASE_URL}/tasks/${id}/`, { method: 'DELETE' })),
  syncBatch: async (jobs) => {
    const response = await authedFetch(`${API_BASE_URL}/sync/`, { method: 'POST', body: JSON.stringify({ jobs }) });
    const data = await response.json();
    if (!response.ok) { throw new Error(data.message || 'Błąd serwera synchronizacji'); }
    return data; 
  },
  getUsers: async () => handleResponse(await authedFetch(`${API_BASE_URL}/users/`)),
  createUser: async (data) => handleResponse(await authedFetch(`${API_BASE_URL}/users/`, { method: 'POST', body: JSON.stringify(data) })),
  updateUser: async (id, data) => handleResponse(await authedFetch(`${API_BASE_URL}/users/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })),
  deleteUser: async (id) => handleResponse(await authedFetch(`${API_BASE_URL}/users/${id}/`, { method: 'DELETE' })),
  setUserPassword: async (id, password) => handleResponse(await authedFetch(`${API_BASE_URL}/users/${id}/set-password/`, { method: 'POST', body: JSON.stringify({ password }) })),
};

// === SERWIS SYNCHRONIZACJI (AKTUALIZACJA) ===
let isSyncing = false; 
export const syncService = {
  processSyncQueue: async () => {
    if (isSyncing) { return; }
    if (!navigator.onLine) { return; }
    isSyncing = true; 
    const jobs = await db.syncQueue.orderBy('id').toArray();
    if (jobs.length === 0) { isSyncing = false; return; }
    console.log(`Rozpoczynam synchronizację (${jobs.length} zadań)...`);
    toast.loading(`Synchronizowanie ${jobs.length} zmian...`);
    try {
      const { status, results } = await networkApi.syncBatch(jobs); 
      if (status !== 'ok') { throw new Error("Odpowiedź serwera synchronizacji nie jest 'ok'"); }
      console.log("Otrzymano wyniki synchronizacji:", results);
      await db.transaction('rw', db.cows, db.events, db.tasks, db.documents, db.syncQueue, async () => {
        for (const result of results) {
          const originalJob = jobs.find(j => j.id === result.queueId);
          if (!originalJob) continue;
          if (result.status === 'ok' || result.status === 'merged') {
            if (result.action === 'createCow' && result.realId) {
              await db.cows.update(result.tempId, { id: result.realId });
              await db.syncQueue.where('payload.cow').equals(result.tempId).modify({ 'payload.cow': result.realId });
              await db.events.where('cow').equals(result.tempId).modify({ cow: result.realId });
              await db.tasks.where('cow').equals(result.tempId).modify({ cow: result.realId });
              await db.documents.where('cow').equals(result.tempId).modify({ cow: result.realId });
            }
            if (result.action === 'createEvent' && result.realId) {
              await db.events.update(result.tempId, { id: result.realId });
            }
            if (result.action === 'createTask' && result.realId) {
              await db.tasks.update(result.tempId, { id: result.realId });
            }
            if (result.action === 'deleteDocument') {
              // Pomyślnie usunięto na serwerze
            }
            await db.syncQueue.delete(originalJob.id);
          } else {
            console.error(`Błąd synchronizacji zadania: ${result.error}`);
            await db.syncQueue.delete(originalJob.id);
            if (result.action === 'createCow' && (result.error.includes('unique') || result.error.includes('IntegrityError'))) {
              await db.cows.delete(result.tempId); 
              toast.error(`BŁĄD: Krowa ${originalJob.payload.tag_id} już istnieje. Zmiany anulowane.`);
            } 
            else if (result.action === 'updateCow' && result.error.includes('matching query does not exist')) {
              toast.error(`BŁĄD: Krowa (ID: ${originalJob.entityId}) nie istnieje. Zmiany anulowane.`);
              repository.syncCows(); 
            }
            else { toast.error(`Błąd synchronizacji ${result.action} (ID: ${originalJob.id}). Anulowane.`); }
          }
        }
      });
      console.log("Synchronizacja (batch) zakończona pomyślnie.");
      toast.dismiss();
      if (jobs.length > 0) toast.success(`Synchronizacja zakończona pomyślnie.`);
    } catch (err) {
      toast.dismiss();
      toast.error(`Krytyczny błąd synchronizacji: ${err.message}`);
      console.error("Krytyczny błąd synchronizacji (batch):", err.message);
    } finally {
      isSyncing = false; 
      const remainingJobs = await db.syncQueue.count();
      if (remainingJobs > 0 && navigator.onLine) {
        console.log("Nowe zadania w kolejce, uruchamiam ponownie...");
        setTimeout(() => syncService.processSyncQueue(), 1000); 
      }
    }
  }
};

// === WARSTWA REPOZYTORIUM (AKTUALIZACJA) ===
export const repository = {
  // Zapytania
  getCowsQuery: (status = 'ACTIVE') => {
    let query = db.cows;
    if (status !== 'ALL') { query = query.where('status').equals(status); }
    return query.toArray(cows => {
      const damIds = [...new Set(cows.map(c => c.dam).filter(Boolean))];
      const sireIds = [...new Set(cows.map(c => c.sire).filter(Boolean))];
      return db.cows.where('id').anyOf([...damIds, ...sireIds]).toArray(parents => {
        const parentsMap = new Map(parents.map(p => [p.id, p.name]));
        return cows.map(cow => ({
          ...cow,
          dam_name: parentsMap.get(cow.dam) || null,
          sire_name: parentsMap.get(cow.sire) || null,
        }));
      });
    });
  },
  getPotentialParentsQuery: () => db.cows.where('status').equals('ACTIVE').toArray(),
  getCowQuery: (id) => db.cows.get(parseInt(id, 10)),
  getEventsQuery: (cowId) => db.events.where('cow').equals(parseInt(cowId, 10)).reverse().sortBy('date'),
  getTasksQuery: (filters = {}) => {
    let query = db.tasks;
    if (filters.cow) query = query.where('cow').equals(parseInt(filters.cow, 10));
    if (filters.is_completed !== undefined) query = query.where('is_completed').equals(filters.is_completed);
    return query.reverse().sortBy('due_date');
  },
  getTasksForCalendarQuery: () => db.tasks.toArray(),
  getPedigree: networkApi.getPedigree,
  getDocumentsQuery: (cowId) => db.documents.where('cow').equals(parseInt(cowId, 10)).sortBy('uploaded_at'),
  
  // Synchronizacje
  syncCows: () => networkApi.getCows().then(d => db.cows.bulkPut(d)).catch(e => console.warn("Sync: Jesteś offline (Cows)", e.message)),
  syncCow: (id) => networkApi.getCow(id).then(d => db.cows.put(d)).catch(e => console.warn("Sync: Jesteś offline (Cow)", e.message)),
  syncEvents: (cowId) => networkApi.getEventsForCow(cowId).then(d => db.transaction('rw', db.events, async () => { await db.events.where('cow').equals(cowId).delete(); await db.events.bulkPut(d); })).catch(e => console.warn("Sync: Jesteś offline (Events)", e.message)),
  syncTasks: (filters = {}) => networkApi.getTasks({ is_completed: 'false' }).then(d => db.tasks.bulkPut(d)).catch(e => console.warn("Sync: Jesteś offline (Tasks)", e.message)),
  syncDocuments: (cowId) => networkApi.getDocuments(cowId).then(d => db.transaction('rw', db.documents, async () => { await db.documents.where('cow').equals(cowId).delete(); await db.documents.bulkPut(d); })).catch(e => console.warn("Sync: Jesteś offline (Documents)", e.message)), 

  searchCow: networkApi.searchCow,
  
  // Operacje zapisu (Krowy, Zdarzenia, Zadania - bez zmian)
  createCow: async (data) => {
    const payload = { ...data, dam: data.dam || null, sire: data.sire || null, };
    if (navigator.onLine) {
      try { const realCow = await networkApi.createCow(payload); await db.cows.put(realCow); toast.success(`Krowa ${realCow.name} dodana.`); return realCow;
      } catch(e) { toast.error(`Błąd: ${e.message}`); throw e; }
    } else {
      const existing = await db.cows.where('tag_id').equals(payload.tag_id).first();
      if (existing) { toast.error(`Krowa z tagiem ${payload.tag_id} już istnieje lokalnie.`); throw new Error(`Krowa z tagiem ${payload.tag_id} już istnieje lokalnie.`); }
      const tempId = -(Date.now()); const optimisticCow = { ...payload, id: tempId, photo: null, status: 'ACTIVE' }; 
      await db.cows.put(optimisticCow);
      await db.syncQueue.add({ action: 'createCow', tempId: tempId, payload: optimisticCow });
      toast.warning(`Krowa ${optimisticCow.name} dodana offline.`);
      return optimisticCow; 
    }
  },
  updateCow: async (id, data) => {
    const payload = { ...data, dam: data.dam || null, sire: data.sire || null, };
    if (navigator.onLine) {
      const updatedCow = await networkApi.updateCow(id, payload);
      await db.cows.put(updatedCow);
      toast.success(`Krowa ${updatedCow.name} zaktualizowana.`);
      return updatedCow;
    } else {
      if (payload.tag_id) {
          const existing = await db.cows.where('tag_id').equals(payload.tag_id).first();
          if (existing && existing.id !== id) { toast.error(`Tag ${payload.tag_id} już istnieje lokalnie.`); throw new Error(`Tag ${payload.tag_id} już istnieje lokalnie.`);}
      }
      await db.cows.update(id, payload);
      await db.syncQueue.add({ action: 'updateCow', entityId: id, payload: payload });
      toast.warning(`Krowa zaktualizowana offline.`);
    }
  },
  archiveCow: async (id) => {
    await db.cows.update(id, { status: 'ARCHIVED' });
    if (navigator.onLine) {
      try { await networkApi.deleteCow(id); toast.success("Krowa zarchiwizowana.");
      } catch (e) { toast.warning(`Błąd serwera przy archiwizacji: ${e.message}`); }
    } else {
      toast.warning(`Krowa zarchiwizowana offline.`);
      if (id > 0) { await db.syncQueue.add({ action: 'deleteCow', entityId: id }); }
    }
  },
  createEvent: async (data) => {
    const cowId = data.cow;
    if (navigator.onLine) {
      if (cowId < 0) { toast.error("Zsynchronizuj krowę przed dodaniem zdarzenia."); throw new Error("Nie można dodać zdarzenia online do krowy, która jest offline."); }
      const newEvent = await networkApi.createEvent(data);
      await db.events.put(newEvent);
      toast.success(`Zdarzenie ${newEvent.event_type} dodane.`);
      return newEvent;
    } else {
      const tempId = -(Date.now()); const optimisticEvent = { ...data, id: tempId };
      await db.events.put(optimisticEvent);
      await db.syncQueue.add({ action: 'createEvent', tempId: tempId, payload: optimisticEvent });
      toast.warning(`Zdarzenie dodane offline.`);
      return optimisticEvent;
    }
  },
  createTask: async (data) => {
    const payload = { ...data, cow: data.cow || null };
    if (navigator.onLine) {
      if (payload.cow < 0) { toast.error("Zsynchronizuj krowę przed dodaniem zadania."); throw new Error("Nie można dodać zadania online do krowy, która jest offline."); }
      const newTask = await networkApi.createTask(payload);
      await db.tasks.put(newTask);
      toast.success(`Zadanie "${newTask.title}" dodane.`);
      return newTask;
    } else {
      const tempId = -(Date.now()); const optimisticTask = { ...payload, id: tempId, is_completed: false };
      await db.tasks.put(optimisticTask);
      await db.syncQueue.add({ action: 'createTask', tempId: tempId, payload: optimisticTask });
      toast.warning(`Zadanie "${optimisticTask.title}" dodane offline.`);
      return optimisticTask;
    }
  },
  updateTask: async (id, data) => {
    const payload = { ...data };
    if (navigator.onLine) {
      const updatedTask = await networkApi.updateTask(id, payload);
      await db.tasks.put(updatedTask);
      toast.success(`Zadanie "${updatedTask.title}" zaktualizowane.`);
      return updatedTask;
    } else {
      await db.tasks.update(id, payload);
      await db.syncQueue.add({ action: 'updateTask', entityId: id, payload: payload });
      toast.warning(`Zadanie zaktualizowane offline.`);
    }
  },
  deleteTask: async (id) => {
    await db.tasks.delete(id);
    if (navigator.onLine) {
      try { await networkApi.deleteTask(id); toast.success("Zadanie usunięte.");
      } catch (e) { toast.warning(`Błąd serwera przy usuwaniu zadania: ${e.message}`); }
    } else {
      toast.warning(`Zadanie usunięte offline.`);
      if (id > 0) { await db.syncQueue.add({ action: 'deleteTask', entityId: id }); }
    }
  },
  
  // === NOWA LOGIKA ZAPISU DLA DOKUMENTÓW ===
  uploadDocument: async (cowId, title, file) => {
    if (!navigator.onLine) {
      throw new Error("Musisz być online, aby przesłać dokumenty.");
    }
    const newDoc = await networkApi.uploadDocument(cowId, title, file);
    await db.documents.put(newDoc);
    toast.success(`Dokument "${newDoc.title}" przesłany.`);
    return newDoc;
  },
  deleteDocument: async (id) => {
    await db.documents.delete(id);
    if (navigator.onLine) {
      try { await networkApi.deleteDocument(id); toast.success("Dokument usunięty.");
      } catch (e) { toast.warning(`Błąd serwera przy usuwaniu dokumentu: ${e.message}`); }
    } else {
      toast.warning(`Dokument usunięty offline.`);
      if (id > 0) { await db.syncQueue.add({ action: 'deleteDocument', entityId: id }); }
    }
  },
  
  uploadPhoto: networkApi.uploadPhoto,
  admin: networkApi, 
};
export default repository;
