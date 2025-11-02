// src/db.js
import Dexie from 'dexie';

export const db = new Dexie('HighlanderFarmDB');

db.version(1).stores({
  cows: '&id, tag_id, name, breed', 
  events: '&id, date, cow, event_type',
});

db.version(2).stores({
  syncQueue: '++id, action, entityId, tempId',
});

db.version(3).stores({
  syncQueue: '++id, action, entityId, tempId, payload.cow', 
});

// === NOWA WERSJA BAZY DANYCH ===
// Wersja 4 dodaje indeks 'status' do tabeli krów
db.version(4).stores({
  cows: '&id, tag_id, name, breed, status', // <-- DODANO INDEKS 'status'
});
