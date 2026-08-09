import { getDb } from './offlineDb';

// Caches the reference data needed to enter a discharge while offline:
// clients, sites, waste types, and company trucks. Discharges themselves
// are cached too (read-only) so recent history is still visible offline.
const STORE = 'reference-data';

const KEYS = ['clients', 'sites', 'wasteTypes', 'companyTrucks', 'discharges'];

export async function saveReferenceData(data) {
  const db = await getDb();
  const tx = db.transaction(STORE, 'readwrite');
  const now = new Date().toISOString();
  await Promise.all(
    KEYS.filter(k => data[k] !== undefined).map(k =>
      tx.objectStore(STORE).put({ key: k, value: data[k], updatedAt: now })
    )
  );
  await tx.done;
}

// Returns { clients, sites, wasteTypes, companyTrucks, discharges, cachedAt }
// with any missing keys defaulting to []. cachedAt is the oldest of the
// cached timestamps, so the UI can show "data from X" when offline.
export async function loadReferenceData() {
  const db = await getDb();
  const tx = db.transaction(STORE, 'readonly');
  const rows = await Promise.all(KEYS.map(k => tx.objectStore(STORE).get(k)));
  await tx.done;
  const result = {};
  let oldest = null;
  KEYS.forEach((k, i) => {
    result[k] = rows[i]?.value ?? [];
    if (rows[i]?.updatedAt && (!oldest || rows[i].updatedAt < oldest)) oldest = rows[i].updatedAt;
  });
  result.cachedAt = oldest;
  return result;
}

export async function hasCachedData() {
  const db = await getDb();
  const c = await db.get(STORE, 'clients');
  return !!c;
}
