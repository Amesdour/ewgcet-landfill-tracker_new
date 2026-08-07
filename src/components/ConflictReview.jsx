import React, { useEffect, useState } from 'react';
import { listConflicts, forceSubmitConflict, removeConflict } from '../lib/offlineDischargeQueue';

export default function ConflictReview() {
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => { refresh(); }, []);
  async function refresh() { setConflicts(await listConflicts()); }

  if (!conflicts.length) return null;

  return (
    <div id="conflicts" style={{padding:20}}>
      <h2>Conflits hors-ligne ({conflicts.length})</h2>
      {conflicts.map(c => (
        <div key={c.id} style={{border:'1px solid #ddd',padding:10,marginBottom:10}}>
          <div style={{display:'flex',gap:10}}>
            <div style={{flex:1}}>
              <h4>Mon entrée (hors-ligne)</h4>
              <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(c.local, null, 2)}</pre>
            </div>
            <div style={{flex:1}}>
              <h4>Serveur (aujourd'hui)</h4>
              <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(c.server, null, 2)}</pre>
            </div>
          </div>
          <div style={{marginTop:8}}>
            <button onClick={async ()=>{ await forceSubmitConflict(c.id); refresh(); }}>Garder mon entrée</button>
            <button onClick={async ()=>{ await removeConflict(c.id); refresh(); }} style={{marginLeft:8}}>Ignorer mon entrée</button>
          </div>
        </div>
      ))}
    </div>
  );
}
