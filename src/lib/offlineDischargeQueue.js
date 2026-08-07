import { openDB } from 'idb';

const DB_NAME = 'ewgcet-offline';
const DB_VERSION = 1;
const PENDING_STORE = 'pending-discharges';
const CONFLICT_STORE = 'conflicts';

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(PENDING_STORE)) db.createObjectStore(PENDING_STORE, { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains(CONFLICT_STORE)) db.createObjectStore(CONFLICT_STORE, { keyPath: 'id', autoIncrement: true });
    }
  });
}

export async function queueDischarge(item) {
  const db = await getDb();
  const store = db.transaction(PENDING_STORE, 'readwrite').objectStore(PENDING_STORE);
  await store.add({ payload: item, createdAt: new Date().toISOString() });
}

export async function getPendingCount() {
  const db = await getDb();
  return db.count(PENDING_STORE);
}

export async function getConflictCount() {
  const db = await getDb();
  return db.count(CONFLICT_STORE);
}

export async function listPending() {
  const db = await getDb();
  return db.getAll(PENDING_STORE);
}

export async function listConflicts() {
  const db = await getDb();
  return db.getAll(CONFLICT_STORE);
}

export async function removePending(id) {
  const db = await getDb();
  return db.delete(PENDING_STORE, id);
}

export async function removeConflict(id) {
  const db = await getDb();
  return db.delete(CONFLICT_STORE, id);
}

async function moveToConflict(pendingId, queuedItem, serverRecord) {
  const db = await getDb();
  const tx = db.transaction([PENDING_STORE, CONFLICT_STORE], 'readwrite');
  await tx.objectStore(CONFLICT_STORE).add({ pendingId, local: queuedItem, server: serverRecord, createdAt: new Date().toISOString() });
  await tx.objectStore(PENDING_STORE).delete(pendingId);
  await tx.done;
}

export async function flushQueue(onProgress) {
  const pending = await listPending();
  if (!pending.length) return { processed:0 };
  let processed = 0;
  for (const p of pending) {
    const item = p.payload;
    try {
      const res = await fetch(item.endpoint || '/api/discharges', {
        method: item.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      });
      if (res.status === 409) {
        // conflict — move to conflicts store
        const server = await res.json();
        await moveToConflict(p.id, item, server);
        if (onProgress) onProgress({ type: 'conflict', item: p });
      } else if (!res.ok) {
        // server error — leave in queue for retry
        if (onProgress) onProgress({ type: 'error', item: p, status: res.status });
      } else {
        // success — remove from queue
        await removePending(p.id);
        processed++;
        if (onProgress) onProgress({ type: 'sent', item: p });
      }
    } catch (e) {
      // network failure — stop processing
      if (onProgress) onProgress({ type: 'network-failure', item: p, error: String(e) });
      break;
    }
  }
  return { processed };
}

export async function forceSubmitConflict(conflictId) {
  const db = await getDb();
  const c = await db.get(CONFLICT_STORE, conflictId);
  if (!c) return { error: 'Not found' };
  const item = c.local;
  try {
    const body = { ...item.body, forceOverwrite: true };
    const res = await fetch(item.endpoint || '/api/discharges', {
      method: item.method || 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await removeConflict(conflictId);
      return { ok: true };
    } else {
      return { ok: false, status: res.status, body: await res.text() };
    }
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
