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
db.version(4).stores({
  cows: '&id, tag_id, name, breed, status',
});
db.version(5).stores({
  cows: '&id, tag_id, name, breed, status, dam, sire',
});
db.version(6).stores({
  tasks: '&id, due_date, is_completed, cow',
});

// === NOWA WERSJA BAZY DANYCH ===
db.version(7).stores({
  documents: '&id, cow', // Indeksujemy po 'cow' (ID krowy)
});
