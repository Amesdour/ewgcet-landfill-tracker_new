import { getDb } from './offlineDb';

const PENDING_STORE = 'pending-discharges';
const CONFLICT_STORE = 'conflicts';

export async function queueDischarge(item) {
  const db = await getDb();
  const store = db.transaction(PENDING_STORE, 'readwrite').objectStore(PENDING_STORE);
  await store.add({ payload: item, createdAt: new Date().toISOString() });
}

// Local-only id for a discharge created while offline, so the UI can
// reconcile it once flushQueue() sends the real record to the server.
export function makeOfflineId() {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
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
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
