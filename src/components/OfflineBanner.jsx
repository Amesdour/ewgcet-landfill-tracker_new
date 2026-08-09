import React, { useEffect, useRef, useState } from 'react';
import { getPendingCount, getConflictCount, flushQueue } from '../lib/offlineDischargeQueue';

export default function OfflineBanner({ onSynced }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState(0);
  const [syncing, setSyncing] = useState(false);
  // Keep the latest callback in a ref so the effect below only runs on
  // mount / online / offline events, not on every parent re-render.
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  useEffect(() => {
    async function refresh() {
      setPending(await getPendingCount());
      setConflicts(await getConflictCount());
    }
    async function syncThenRefresh() {
      setSyncing(true);
      const result = await flushQueue();
      setSyncing(false);
      await refresh();
      if (result.processed > 0 && onSyncedRef.current) onSyncedRef.current();
    }
    refresh();
    const onOnline = () => { setOnline(true); syncThenRefresh(); };
    const onOffline = () => { setOnline(false); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    // attempt flush on mount
    if (navigator.onLine) syncThenRefresh();
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  if (online && pending === 0 && conflicts === 0) return null;

  const styleBase = {
    position: 'fixed', top:0, left:0, right:0, zIndex:9999, color:'#fff', padding:'6px 12px', textAlign:'center'
  };
  if (!online) {
    return <div style={{...styleBase, background:'var(--err)'}}>Hors ligne — vos saisies seront synchronisées dès la reconnexion ({pending} en attente)</div>;
  }
  if (syncing) return <div style={{...styleBase, background:'var(--warn)'}}>Connexion rétablie — synchronisation en cours…</div>;
  if (conflicts > 0) return <div style={{...styleBase, background:'orange'}}>{conflicts} conflit(s) à vérifier — <a href="#conflicts" style={{color:'#000'}}>Vérifier →</a></div>;
  return null;
}
