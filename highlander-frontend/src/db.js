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
db.version(7).stores({
  documents: '&id, cow',
});

// === NOWA WERSJA BAZY DANYCH ===
// Wersja 8 dodaje tabelę 'herds' i aktualizuje 'cows' o wszystkie nowe pola
db.version(8).stores({
  herds: '&id, name', // Nowa tabela Stada
  
  cows: '&id, tag_id, name, status, herd, dam, sire, passport_number', // Zaktualizowane indeksy krów
  
  // Przepisujemy stare definicje
  events: '&id, date, cow, event_type',
  tasks: '&id, due_date, is_completed, cow',
  documents: '&id, cow',
  syncQueue: '++id, action, entityId, tempId, payload.cow', 
});
