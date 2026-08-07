import React, { useEffect, useState } from 'react';
import { getPendingCount, getConflictCount, flushQueue } from '../lib/offlineDischargeQueue';

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function refresh() {
      setPending(await getPendingCount());
      setConflicts(await getConflictCount());
    }
    refresh();
    const onOnline = async () => { setOnline(true); setSyncing(true); await flushQueue(); setSyncing(false); refresh(); };
    const onOffline = () => { setOnline(false); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    // attempt flush on mount
    if (navigator.onLine) { setSyncing(true); flushQueue().then(()=>setSyncing(false)).then(refresh); }
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
