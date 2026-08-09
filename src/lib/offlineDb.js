import { openDB } from 'idb';

// Single shared IndexedDB database for all offline features. Both the
// discharge mutation queue and the reference-data cache use this — do not
// call openDB() directly elsewhere, or the upgrade() below won't run for
// whichever store gets added later.
const DB_NAME = 'ewgcet-offline';
const DB_VERSION = 1;

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending-discharges')) db.createObjectStore('pending-discharges', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('conflicts')) db.createObjectStore('conflicts', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('reference-data')) db.createObjectStore('reference-data', { keyPath: 'key' });
      }
    });
  }
  return dbPromise;
}
