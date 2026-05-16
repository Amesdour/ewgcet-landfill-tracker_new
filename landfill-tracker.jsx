import { useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const COMPANY = {
  name: "Etablissement Publique de Wilaya de Gestion des Centres d'Enfouissement Technique JIJEL",
  short: "EPWGCET",
  wilaya: "Wilaya de Jijel",
  direction: "Direction de l'Environnement",
  phone: "034 48 00 00",
  email: "contact@epwgcet-jijel.dz",
  address: "Cité Administrative, Jijel 18000",
  code: "18",
};

const COMPANY_FIELDS_DEFAULT = [
  {id:"name",    label:"Raison sociale complète", value:COMPANY.name},
  {id:"short",   label:"Abréviation",             value:COMPANY.short},
  {id:"wilaya",  label:"Wilaya",                   value:COMPANY.wilaya},
  {id:"address", label:"Adresse",                  value:COMPANY.address},
  {id:"phone",   label:"Téléphone",                value:COMPANY.phone},
  {id:"email",   label:"Email",                    value:COMPANY.email},
  {id:"code",    label:"Code Wilaya",              value:COMPANY.code},
];
const cof = (co, id) => (Array.isArray(co) ? co : COMPANY_FIELDS_DEFAULT).find(f=>f.id===id)?.value || '';

const SITES_DB_INIT = [
  { id:"CET-JIJ", name:"Centre d'Enfouissement Technique Jijel",     region:"Jijel (Chef-lieu)", type:"CET", capacity:600000, used:287400, commune:"Jijel",      localisation:"36.8167° N, 5.7667° E", acceptedWaste:["MEN","IND","MED","INE"] },
  { id:"CET-TAH", name:"Centre d'Enfouissement Technique Taher",     region:"Taher",              type:"CET", capacity:400000, used:156700, commune:"Taher",      localisation:"36.7333° N, 5.9000° E", acceptedWaste:["MEN","IND","INE"] },
  { id:"CET-ELM", name:"Centre d'Enfouissement Technique El Milia",  region:"El Milia",           type:"CET", capacity:300000, used:198300, commune:"El Milia",   localisation:"36.7500° N, 6.5667° E", acceptedWaste:["MEN","IND"] },
  { id:"CDI-TAS", name:"CDI Tasselemt", region:"Tasselemt",          type:"CDI", capacity:500000, used:89000,  commune:"Tasselemt",  localisation:"36.6833° N, 6.1333° E", acceptedWaste:["INE"] },
];

const WASTE_TYPES_INIT = [
  { id:"MEN", label:"Ménager (DMA)",    price:850,  siteTypes:["CET"] },
  { id:"IND", label:"Industriel (DIB)", price:1200, siteTypes:["CET"] },
  { id:"MED", label:"Médical (DASRI)",  price:2500, siteTypes:["CET"] },
  { id:"INE", label:"Inerte / BTP",     price:600,  siteTypes:["CDI","CET"] },
];

const TRUCKS_DB = [
  { plate:"18-TRK-001", clientId:"C001", tare:8.0,  allowed:["MEN","INE"] },
  { plate:"18-TRK-002", clientId:"C001", tare:9.5,  allowed:["MEN","INE"] },
  { plate:"18-COM-015", clientId:"C002", tare:7.5,  allowed:["MEN"]       },
  { plate:"18-MED-005", clientId:"C003", tare:4.5,  allowed:["MED"]       },
  { plate:"18-BTP-020", clientId:"C004", tare:12.0, allowed:["INE"]       },
];

const CLIENTS_INIT = [
  { id:"C001", name:"Commune de Jijel",       clientType:"state",   type:"convention", status:"approved",     creditEnabled:false, weightLimitYear:5000, creditLimit:0,      consumed:0, payFrequency:"monthly",  payInstrument:"cheque", phone:"034 70 12 34", address:"Jijel Centre",          nif:"099012345678901", rc:"",                 docs:["Arrêté communal","Convention signée"], note:"", vatSubject:false },
  { id:"C002", name:"Commune de Taher",        clientType:"state",   type:"convention", status:"approved",     creditEnabled:false, weightLimitYear:3000, creditLimit:0,      consumed:0, payFrequency:"annual",   payInstrument:"bank",   phone:"034 70 23 45", address:"Taher",                  nif:"099023456789012", rc:"",                 docs:["Arrêté communal","Convention signée"], note:"", vatSubject:false },
  { id:"C003", name:"Clinique Médicale AFAK",  clientType:"private", type:"convention", status:"approved",     creditEnabled:true,  weightLimitYear:0,    creditLimit:400000, consumed:0, payFrequency:"monthly",  payInstrument:"bank",   phone:"034 70 34 56", address:"Cité Cnep, Jijel",       nif:"099034567890123", rc:"18/00-1234567B18", docs:["RC","NIF","Assurance RC","Bail commercial"], note:"", vatSubject:true },
  { id:"C004", name:"EURL COSIDER BTP Jijel",  clientType:"private", type:"convention", status:"under_review", creditEnabled:false, weightLimitYear:0,    creditLimit:0,      consumed:0, payFrequency:"monthly",  payInstrument:"cheque", phone:"034 70 45 67", address:"Zone Activité, Jijel",   nif:"099045678901234", rc:"18/00-7654321B18", docs:["RC","NIF"], note:"Documents reçus, vérification en cours.", vatSubject:true },
  { id:"C005", name:"SPA Entraval Algérie",    clientType:"private", type:"convention", status:"pending_docs", creditEnabled:false, weightLimitYear:0,    creditLimit:0,      consumed:0, payFrequency:"monthly",  payInstrument:"cheque", phone:"034 70 56 78", address:"El Milia",                nif:"",               rc:"",                 docs:[], note:"En attente de dépôt des documents requis.", vatSubject:true },
  { id:"C008", name:"Rachid Benbrahim",        clientType:"private", type:"prepaid",    status:"approved",     creditEnabled:false, weightLimitYear:0,    creditLimit:200000, consumed:0, payFrequency:"",         payInstrument:"",       phone:"0550 33 44 55", address:"Jijel",                 nif:"",               rc:"",                 docs:[], note:"Bonus prépayé 200 000 DA", vatSubject:false },
  { id:"C006", name:"Hadj Mourad Rabah",       clientType:"cash",    type:"daily",      status:"approved",     creditEnabled:false, weightLimitYear:0,    creditLimit:0,      consumed:0, payFrequency:"",         payInstrument:"",       phone:"0770 11 22 33", address:"Jijel",                 nif:"",               rc:"",                 docs:[], note:"", vatSubject:false },
  { id:"C007", name:"Entreprise Benali SARL",  clientType:"cash",    type:"daily",      status:"approved",     creditEnabled:false, weightLimitYear:0,    creditLimit:0,      consumed:0, payFrequency:"",         payInstrument:"",       phone:"0770 44 55 66", address:"Taher",                 nif:"",               rc:"",                 docs:[], note:"", vatSubject:true },
];

const USERS_INIT = [
  { id:"U001", name:"Directeur Administrateur", email:"admin@epwgcet-jijel.dz",     password:"admin123", role:"admin",    status:"active",  phone:"034 48 00 01", matricule:"ADM-001",     siteId:"all",     createdAt:"2024-01-15" },
  { id:"U002", name:"Karim Boudali",             email:"k.boudali@epwgcet-jijel.dz", password:"op1234",   role:"operator", status:"active",  phone:"0771 23 45 67", matricule:"OP-2024-001", siteId:"CET-JIJ", createdAt:"2024-03-10" },
  { id:"U003", name:"Sara Menacer",              email:"s.menacer@epwgcet-jijel.dz", password:"op1234",   role:"operator", status:"active",  phone:"0773 45 67 89", matricule:"OP-2024-002", siteId:"CET-TAH", createdAt:"2024-03-10" },
  { id:"U004", name:"Yacine Ferhat",             email:"y.ferhat@epwgcet-jijel.dz",  password:"op1234",   role:"operator", status:"pending", phone:"0774 56 78 90", matricule:"OP-2024-003", siteId:"CET-ELM", createdAt:"2024-04-20" },
];

const DISCHARGES_INIT = [];

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&family=Share+Tech+Mono&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f1f7f2;--s1:#ffffff;--s2:#edf4ee;--s3:#e2ede4;
  --bdr:#c8d9cb;--bdr2:#b4c8b8;
  --g:#178a34;--g2:#0e6e27;--g3:#08521c;
  --warn:#9a6200;--err:#b02000;--info:#006090;--purple:#5030b0;--orange:#b05000;
  --txt:#14201a;--muted:#4a6e52;--dim:#bcd2bf;
  --font:'Barlow',sans-serif;--head:'Barlow Condensed',sans-serif;--mono:'Share Tech Mono',monospace;
  --r:10px;--sh:0 4px 24px rgba(0,0,0,.10);--sh-sm:0 2px 8px rgba(0,0,0,.07);
  --glow:0 0 20px rgba(23,138,52,.07);
  --topbar-bg:rgba(255,255,255,.94);--modal-bg-end:#edf4ee;
  --ovl-sm:rgba(0,0,0,.035);--ovl-md:rgba(0,0,0,.055);
  --sidebar-end:#e4ede6;--login-box-end:#edf4ee;
}
[data-theme="dark"]{
  --bg:#050e07;--s1:#09130b;--s2:#0d1a0f;--s3:#111f13;
  --bdr:#162319;--bdr2:#1e2f21;
  --g:#29c454;--g2:#6de896;--g3:#b8f5cf;
  --warn:#f0b83d;--err:#f0553d;--info:#3dbaf0;--purple:#a78bfa;--orange:#fb923c;
  --txt:#d4ead9;--muted:#4d6e56;--dim:#1f3524;
  --sh:0 4px 24px rgba(0,0,0,.45);--sh-sm:0 2px 8px rgba(0,0,0,.3);
  --glow:0 0 20px rgba(41,196,84,.08);
  --topbar-bg:rgba(5,14,7,.9);--modal-bg-end:#07100a;
  --ovl-sm:rgba(0,0,0,.15);--ovl-md:rgba(0,0,0,.22);
  --sidebar-end:#070f09;--login-box-end:#07100a;
}
body{background:var(--bg);color:var(--txt);font-family:var(--font);font-size:14px;line-height:1.5}
button{cursor:pointer;font-family:var(--font)}
input,select,textarea{font-family:var(--font)}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:var(--s1)}
::-webkit-scrollbar-thumb{background:rgba(41,196,84,.2);border-radius:2px}
::-webkit-scrollbar-thumb:hover{background:rgba(41,196,84,.35)}

/* Shell */
.shell{display:flex;height:100vh;overflow:hidden}
.sidebar{width:238px;min-width:238px;background:linear-gradient(180deg,var(--s1) 0%,var(--sidebar-end) 100%);border-right:1px solid var(--bdr);display:flex;flex-direction:column}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.content{flex:1;overflow-y:auto;padding:24px 28px}

/* Sidebar brand */
.sbl{padding:18px 16px 14px;border-bottom:1px solid var(--bdr);background:linear-gradient(135deg,rgba(41,196,84,.06),transparent)}
.sbl-title{font-family:var(--head);font-size:12px;font-weight:800;color:var(--g);letter-spacing:.06em;text-transform:uppercase;line-height:1.3}
.sbl-sub{font-family:var(--mono);font-size:8px;color:var(--muted);margin-top:4px;line-height:1.6}
nav{flex:1;padding:10px 8px;overflow-y:auto}
.nav-grp{margin-bottom:16px}
.nav-lbl{font-family:var(--mono);font-size:8px;color:var(--dim);text-transform:uppercase;letter-spacing:.18em;padding:0 10px 6px}
.nb{display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border-radius:8px;border:none;background:none;color:var(--muted);font-size:12px;font-weight:600;text-align:left;transition:all .18s}
.nb:hover{background:rgba(41,196,84,.06);color:var(--txt)}
.nb.act{background:linear-gradient(135deg,rgba(41,196,84,.18),rgba(41,196,84,.08));color:var(--g);box-shadow:inset 0 0 0 1px rgba(41,196,84,.2)}
.nb .ic{font-size:14px;width:20px;text-align:center;flex-shrink:0}
.nb .bdg{margin-left:auto;background:var(--err);color:#fff;font-family:var(--mono);font-size:8px;padding:2px 6px;border-radius:10px;min-width:18px;text-align:center}
.nb.act .bdg{background:rgba(0,0,0,.3);color:#031008}
.sbf{padding:10px 12px;border-top:1px solid var(--bdr)}
.role-card{background:linear-gradient(135deg,var(--s2),var(--s3));border:1px solid var(--bdr);border-radius:9px;padding:10px 12px}
.role-lbl{font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.12em}
.role-name{font-size:12px;font-weight:700;color:var(--g2);margin-top:3px}
.role-detail{font-family:var(--mono);font-size:9px;color:var(--muted);margin-top:1px}
.logout-btn{margin-top:8px;width:100%;padding:6px 8px;border-radius:7px;border:1px solid var(--bdr);background:none;color:var(--muted);font-size:11px;font-weight:600;text-align:center;cursor:pointer;transition:all .15s;letter-spacing:.02em}
.logout-btn:hover{color:var(--err);border-color:rgba(240,85,61,.4);background:rgba(240,85,61,.05)}

/* Topbar */
.topbar{background:var(--topbar-bg);backdrop-filter:blur(20px);border-bottom:1px solid var(--bdr);padding:12px 26px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;z-index:20}
.tb-title{font-family:var(--head);font-size:21px;font-weight:800;letter-spacing:.04em;color:var(--txt)}
.tb-right{display:flex;align-items:center;gap:8px}
.chip{font-family:var(--mono);font-size:10px;padding:4px 10px;border-radius:6px;border:1px solid;transition:all .15s}
.chip-ok{color:var(--g);border-color:rgba(41,196,84,.3);background:rgba(41,196,84,.07)}
.chip-warn{color:var(--warn);border-color:rgba(240,184,61,.3);background:rgba(240,184,61,.07)}
.chip-err{color:var(--err);border-color:rgba(240,85,61,.3);background:rgba(240,85,61,.07)}
.chip-dim{color:var(--muted);border-color:var(--bdr);background:var(--s2)}
.chip-info{color:var(--info);border-color:rgba(61,186,240,.3);background:rgba(61,186,240,.07)}

/* Cards */
.card{background:var(--s2);border:1px solid var(--bdr);border-radius:var(--r);padding:16px 18px;transition:border-color .2s}
.card:hover{border-color:var(--bdr2)}
.card-sm{background:var(--s2);border:1px solid var(--bdr);border-radius:var(--r);padding:12px 14px}
.panel{background:var(--s1);border:1px solid var(--bdr);border-radius:13px;overflow:hidden;box-shadow:var(--sh-sm)}
.ph{padding:13px 18px;border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--ovl-sm)}
.pt{font-family:var(--head);font-size:16px;font-weight:800;letter-spacing:.04em}

/* KPI */
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
.kpi{background:linear-gradient(135deg,var(--s2),var(--s3));border:1px solid var(--bdr);border-radius:12px;padding:16px 17px;position:relative;overflow:hidden;transition:all .2s;box-shadow:var(--sh-sm)}
.kpi:hover{border-color:var(--bdr2);transform:translateY(-1px);box-shadow:var(--sh)}
.kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--kc,var(--g)),transparent)}
.kpi::after{content:'';position:absolute;top:3px;left:0;right:0;bottom:0;background:linear-gradient(180deg,rgba(255,255,255,.02),transparent);pointer-events:none}
.kpi-l{font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.14em}
.kpi-v{font-family:var(--head);font-size:26px;font-weight:800;line-height:1;margin:6px 0 3px;color:var(--txt)}
.kpi-s{font-size:11px;color:var(--muted)}
.kpi-i{position:absolute;right:14px;top:14px;font-size:24px;opacity:.12}

/* Table */
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{font-family:var(--mono);font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);padding:10px 14px;text-align:left;border-bottom:1px solid var(--bdr);white-space:nowrap;background:rgba(0,0,0,.2)}
td{padding:10px 14px;border-bottom:1px solid rgba(22,35,25,.8);font-size:13px;white-space:nowrap;transition:background .1s}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(41,196,84,.03)}
tr.flagged-row td{background:rgba(240,85,61,.04)}
tr.flagged-row:hover td{background:rgba(240,85,61,.07)}
.mn{font-family:var(--mono);font-size:11px}

/* Badges */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:600;font-family:var(--mono);white-space:nowrap;letter-spacing:.02em}
.b-ok{background:rgba(41,196,84,.12);color:var(--g);border:1px solid rgba(41,196,84,.25)}
.b-warn{background:rgba(240,184,61,.12);color:var(--warn);border:1px solid rgba(240,184,61,.25)}
.b-err{background:rgba(240,85,61,.12);color:var(--err);border:1px solid rgba(240,85,61,.25)}
.b-info{background:rgba(61,186,240,.12);color:var(--info);border:1px solid rgba(61,186,240,.25)}
.b-purple{background:rgba(167,139,250,.12);color:var(--purple);border:1px solid rgba(167,139,250,.25)}
.b-cash{background:rgba(109,232,150,.12);color:var(--g2);border:1px solid rgba(109,232,150,.25)}
.b-muted{background:rgba(77,110,86,.1);color:var(--muted);border:1px solid var(--bdr)}

/* Forms */
.fg{display:grid;gap:12px}
.fg2{grid-template-columns:1fr 1fr}
.fg3{grid-template-columns:1fr 1fr 1fr}
.field{display:flex;flex-direction:column;gap:5px}
.field label{font-family:var(--mono);font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.12em}
.fi{background:var(--s3);border:1px solid var(--bdr2);border-radius:8px;color:var(--txt);padding:9px 12px;font-size:13px;outline:none;transition:border-color .15s,box-shadow .15s;width:100%}
.fi:focus{border-color:rgba(41,196,84,.5);box-shadow:0 0 0 3px rgba(41,196,84,.08)}
.fi[readonly]{color:var(--muted)}
.fi option{background:var(--s3)}
textarea.fi{resize:vertical;min-height:80px}

/* Weight box */
.wb{background:linear-gradient(135deg,var(--s3),var(--s2));border:1px solid var(--bdr2);border-radius:8px;padding:10px 16px;display:flex;align-items:center;justify-content:space-between}
.wv{font-family:var(--head);font-size:34px;font-weight:800;color:var(--g);text-shadow:0 0 20px rgba(41,196,84,.3)}
.wu{font-family:var(--mono);font-size:11px;color:var(--muted)}

/* Cost preview */
.cost-box{background:linear-gradient(135deg,rgba(41,196,84,.08),rgba(41,196,84,.03));border:1px solid rgba(41,196,84,.2);border-radius:var(--r);padding:14px 16px}
.cl{display:flex;justify-content:space-between;align-items:center;padding:4px 0}
.cl.ct{border-top:1px solid rgba(41,196,84,.15);margin-top:8px;padding-top:10px}
.clb{font-size:12px;color:var(--muted)}
.clv{font-family:var(--mono);font-size:12px}
.ctv{font-family:var(--head);font-size:26px;font-weight:800;color:var(--g);text-shadow:0 0 16px rgba(41,196,84,.25)}

/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 18px;border-radius:8px;border:none;font-size:13px;font-weight:700;font-family:var(--font);transition:all .15s;white-space:nowrap;letter-spacing:.01em}
.bp{background:linear-gradient(135deg,var(--g),#1fa845);color:#031008;box-shadow:0 2px 12px rgba(41,196,84,.25)}
.bp:hover{background:linear-gradient(135deg,var(--g2),var(--g));box-shadow:0 4px 20px rgba(41,196,84,.35);transform:translateY(-1px)}
.bg{background:none;color:var(--muted);border:1px solid var(--bdr2)}
.bg:hover{color:var(--txt);border-color:rgba(41,196,84,.25);background:rgba(41,196,84,.04)}
.be{background:rgba(240,85,61,.1);color:var(--err);border:1px solid rgba(240,85,61,.25)}
.be:hover{background:rgba(240,85,61,.18);border-color:rgba(240,85,61,.45)}
.bw{background:rgba(240,184,61,.1);color:var(--warn);border:1px solid rgba(240,184,61,.25)}
.bw:hover{background:rgba(240,184,61,.18)}
.bi{background:rgba(61,186,240,.1);color:var(--info);border:1px solid rgba(61,186,240,.25)}
.bsm{padding:5px 11px;font-size:11px}
.bfw{width:100%}
.btn:disabled{opacity:.3;cursor:default;transform:none!important;box-shadow:none!important}
.btn:active:not(:disabled){transform:translateY(0)!important}

/* Modal */
.ov{position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:linear-gradient(180deg,var(--s1),var(--modal-bg-end));border:1px solid var(--bdr);border-radius:16px;width:500px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.25)}
.modal-lg{width:680px}
.mh{padding:18px 22px;border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;background:var(--ovl-sm)}
.mh-title{font-family:var(--head);font-size:19px;font-weight:800;letter-spacing:.03em}
.mb2{padding:22px}
.mf{padding:14px 22px;border-top:1px solid var(--bdr);display:flex;gap:10px;justify-content:flex-end;background:var(--ovl-sm)}

/* Receipt */
.rcpt{background:var(--s2);border:1px solid var(--bdr);border-radius:var(--r);padding:18px;font-family:var(--mono);font-size:11px;box-shadow:var(--sh-sm)}
.rh{text-align:center;border-bottom:1px dashed var(--bdr2);padding-bottom:12px;margin-bottom:12px}
.rr{display:flex;justify-content:space-between;padding:3px 0}
.rrttl{border-top:1px dashed var(--bdr2);margin-top:10px;padding-top:10px;font-size:15px;font-weight:700;color:var(--g);display:flex;justify-content:space-between}

/* Credit bar */
.cbt{background:var(--s3);border-radius:4px;height:5px;overflow:hidden}
.cbf{height:100%;border-radius:4px;transition:width .6s cubic-bezier(.4,0,.2,1)}

/* Alert */
.alrt{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:9px;font-size:12px;margin-bottom:14px;line-height:1.5}
.aw{background:rgba(240,184,61,.08);border:1px solid rgba(240,184,61,.2);color:var(--warn)}
.ae{background:rgba(240,85,61,.08);border:1px solid rgba(240,85,61,.2);color:var(--err)}
.ao{background:rgba(41,196,84,.08);border:1px solid rgba(41,196,84,.2);color:var(--g)}
.ai{background:rgba(61,186,240,.08);border:1px solid rgba(61,186,240,.2);color:var(--info)}

/* Schema */
.sg{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.st{background:var(--s2);border:1px solid var(--bdr);border-radius:var(--r);overflow:hidden}
.sth{padding:9px 14px;font-family:var(--head);font-size:14px;font-weight:800;letter-spacing:.04em;display:flex;align-items:center;gap:7px;color:#031008}
.sr{display:flex;align-items:center;justify-content:space-between;padding:6px 14px;border-bottom:1px solid var(--bdr)}
.sr:last-child{border-bottom:none}
.sf{font-family:var(--mono);font-size:11px}
.styp{font-size:10px;color:var(--muted)}

/* Login */
.login-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 0%,rgba(41,196,84,.08) 0%,var(--bg) 60%);padding:20px}
.login-box{background:linear-gradient(180deg,var(--s1),var(--login-box-end));border:1px solid var(--bdr);border-radius:20px;padding:38px 42px;width:430px;max-width:100%;box-shadow:var(--sh),0 0 0 1px rgba(23,138,52,.06)}
.login-logo{text-align:center;margin-bottom:30px}
.login-logo-icon{width:90px;height:90px;object-fit:contain;margin:0 auto 10px;display:block;filter:drop-shadow(0 0 14px rgba(41,196,84,.25))}
.login-company{font-family:var(--head);font-size:11px;font-weight:800;color:var(--g);letter-spacing:.08em;text-transform:uppercase;line-height:1.5;margin-bottom:4px}
.login-wilaya{font-family:var(--mono);font-size:9px;color:var(--muted)}
.login-title{font-family:var(--head);font-size:24px;font-weight:800;margin-bottom:22px;text-align:center;letter-spacing:.02em}
.login-switch{text-align:center;margin-top:18px;font-size:12px;color:var(--muted)}
.login-switch a{color:var(--g);cursor:pointer;font-weight:600}
.login-switch a:hover{text-decoration:underline}

/* Tabs */
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--bdr);margin-bottom:22px}
.tab{padding:9px 18px;border:none;background:none;color:var(--muted);font-size:13px;font-weight:600;font-family:var(--font);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s}
.tab.active{color:var(--g);border-bottom-color:var(--g)}
.tab:hover:not(.active){color:var(--txt)}

/* Segment */
.seg{display:flex;background:var(--s3);border:1px solid var(--bdr2);border-radius:9px;padding:3px;gap:2px}
.seg-btn{flex:1;padding:8px 14px;border-radius:7px;border:none;background:none;color:var(--muted);font-size:12px;font-weight:700;cursor:pointer;transition:all .18s;text-align:center}
.seg-btn.active{background:linear-gradient(135deg,var(--g),#1fa845);color:#031008;box-shadow:0 2px 8px rgba(41,196,84,.25)}

/* Operator card */
.op-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.op-card{background:linear-gradient(135deg,var(--s2),var(--s3));border:1px solid var(--bdr);border-radius:12px;padding:16px;transition:all .2s}
.op-card:hover{border-color:var(--bdr2);box-shadow:var(--sh-sm)}
.op-avatar{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.op-av-admin{background:rgba(41,196,84,.12);border:2px solid rgba(41,196,84,.25)}
.op-av-op{background:rgba(61,186,240,.12);border:2px solid rgba(61,186,240,.2)}

/* Settings */
.settings-grid{display:grid;grid-template-columns:215px 1fr;gap:20px}
.settings-nav{background:var(--s1);border:1px solid var(--bdr);border-radius:12px;padding:8px;height:fit-content;box-shadow:var(--sh-sm)}
.sn-item{padding:9px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;color:var(--muted);transition:all .15s;display:flex;align-items:center;gap:9px;border:none;background:none;width:100%;text-align:left}
.sn-item:hover{background:rgba(41,196,84,.05);color:var(--txt)}
.sn-item.active{background:rgba(41,196,84,.1);color:var(--g);box-shadow:inset 0 0 0 1px rgba(41,196,84,.15)}
.sn-ic{font-size:15px;width:18px;text-align:center}
.settings-body{background:var(--s1);border:1px solid var(--bdr);border-radius:12px;padding:26px;box-shadow:var(--sh-sm)}
.settings-title{font-family:var(--head);font-size:19px;font-weight:800;margin-bottom:4px;letter-spacing:.04em}
.settings-sub{font-size:12px;color:var(--muted);margin-bottom:22px}
.divider{border:none;border-top:1px solid var(--bdr);margin:20px 0}

/* Doc list */
.doc-item{display:flex;align-items:center;gap:8px;padding:8px 11px;background:var(--s3);border:1px solid var(--bdr);border-radius:7px;font-size:12px;margin-bottom:6px}

/* Gate */
.gate-mode{margin-bottom:20px}

/* Flagged row pulse */
@keyframes flagPulse{0%,100%{border-left-color:rgba(240,85,61,.4)}50%{border-left-color:rgba(240,85,61,.9)}}
.flagged-row td:first-child{border-left:3px solid rgba(240,85,61,.6)}

/* Payment progress bar */
.pay-bar-track{background:var(--s3);border-radius:4px;height:6px;overflow:hidden;min-width:100px}
.pay-bar-fill{height:100%;border-radius:4px;transition:width .5s cubic-bezier(.4,0,.2,1)}

/* Mobile hamburger */
.hamburger{display:none;align-items:center;justify-content:center;background:none;border:1px solid var(--bdr);border-radius:7px;font-size:18px;cursor:pointer;padding:5px 8px;color:var(--txt);transition:background .15s}
.hamburger:hover{background:var(--s3)}
.sidebar-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.52);z-index:199;backdrop-filter:blur(2px)}

/* Mobile bottom nav */
.mobile-bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--s1);border-top:1px solid var(--bdr);z-index:150;padding:4px 0 env(safe-area-inset-bottom,4px)}
.mbn-inner{display:flex;align-items:stretch;overflow-x:auto;scrollbar-width:none}
.mbn-inner::-webkit-scrollbar{display:none}
.mbn-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 10px;border:none;background:none;color:var(--muted);font-size:9px;font-weight:600;font-family:var(--font);cursor:pointer;white-space:nowrap;flex-shrink:0;border-radius:8px;transition:all .15s;min-width:52px}
.mbn-btn.act{color:var(--g)}
.mbn-btn .mbn-ic{font-size:18px;line-height:1}
.mbn-bdg{background:var(--err);color:#fff;font-family:var(--mono);font-size:7px;padding:1px 4px;border-radius:8px;min-width:14px;text-align:center;margin-top:-2px}

@media(max-width:767px){
  .hamburger{display:flex}
  .sidebar-backdrop.open{display:block}
  .sidebar{
    position:fixed;top:0;left:0;height:100vh;z-index:200;
    transform:translateX(-100%);transition:transform .25s cubic-bezier(.4,0,.2,1);
    box-shadow:4px 0 24px rgba(0,0,0,.18)
  }
  .sidebar.open{transform:translateX(0)}
  .main{width:100%;padding-bottom:72px}
  .content{padding:14px 12px}
  .topbar{padding:10px 12px;gap:8px}
  .tb-title{font-size:17px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .tb-right{gap:6px;flex-shrink:0}
  .chip-hide-mobile{display:none!important}
  .btn-lbl{display:none!important}
  .kpi-grid{grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px}
  .kpi-v{font-size:20px!important}
  .fg2{grid-template-columns:1fr!important}
  .fg3{grid-template-columns:1fr!important}
  .sg{grid-template-columns:1fr}
  .settings-grid{grid-template-columns:1fr!important}
  .dash-2col{grid-template-columns:1fr!important}
  .op-grid{grid-template-columns:1fr}
  .modal{max-width:100vw!important;width:100%!important;max-height:92vh;border-radius:14px 14px 0 0;margin-top:auto}
  .modal-lg{width:100%!important}
  .ov{align-items:flex-end;padding:0}
  .wb{flex-direction:column;align-items:flex-start;gap:4px}
  .wv{font-size:26px}
  .ph{flex-wrap:wrap;gap:8px}
  .tabs{overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none}
  .tabs::-webkit-scrollbar{display:none}
  .tab{white-space:nowrap;font-size:12px;padding:8px 14px}
  .seg{flex-wrap:wrap}
  .mobile-bottom-nav{display:block}
  .mbn-inner{justify-content:space-around}
}
@media(max-width:400px){
  .kpi-grid{grid-template-columns:1fr 1fr}
  .kpi-v{font-size:17px!important}
  .content{padding:10px 8px}
}

/* Print-only / print-hide */
.print-only{display:none!important}
@media print{
  /* Hide everything on the page */
  body *{visibility:hidden!important}
  /* Show invoice print area */
  .inv-print-area,.inv-print-area *{visibility:visible!important}
  .inv-print-area{
    position:fixed!important;top:0!important;left:0!important;
    width:100%!important;height:auto!important;
    background:#fff!important;z-index:9999!important;
    color:#14201a!important;
    --s1:#fff;--s2:#edf4ee;--s3:#e2ede4;
    --bdr:#c8d9cb;--bdr2:#b4c8b8;
    --g:#178a34;--g2:#0e6e27;
    --txt:#14201a;--muted:#4a6e52;
    --warn:#9a6200;--err:#b02000;--info:#006090;--purple:#5030b0;
    --ovl-sm:rgba(0,0,0,.035);
  }
  .inv-print-area *{color:inherit}
  .inv-print-area .panel{
    box-shadow:none!important;border:1px solid #c8d9cb!important;
    border-radius:4px!important;background:#fff!important;
  }
  .inv-print-area .card-sm{
    border:1px solid #c8d9cb!important;background:#f4f8f5!important;color:#14201a!important;
  }
  .inv-print-area table{color:#14201a!important}
  .inv-print-area th{background:#e2ede4!important;color:#14201a!important}
  .inv-print-area td{border-bottom:1px solid #d4e4d7!important;color:#14201a!important}
  .inv-print-area .mn{color:#14201a!important}
  .inv-print-area .tmu{color:#4a6e52!important}
  .inv-print-area .tg{color:#178a34!important}
  .inv-print-area .badge{border:1px solid #999!important}
  .inv-print-area .print-hide{display:none!important;visibility:hidden!important}
  .inv-print-area .print-only{display:block!important;visibility:visible!important}
  .inv-print-footer{margin-top:40px;padding-top:20px;border-top:2px solid #333}
  /* Show receipt print area */
  .rcpt-print-area,.rcpt-print-area *{visibility:visible!important}
  .rcpt-print-area{
    position:fixed!important;top:0!important;left:50%!important;
    transform:translateX(-50%)!important;
    width:320px!important;height:auto!important;
    background:#fff!important;z-index:9999!important;
    color:#111!important;
  }
  .rcpt-print-area .rcpt{
    border:1px solid #ccc!important;box-shadow:none!important;
    background:#fff!important;color:#111!important;
  }
  .rcpt-print-area .rh{background:#f5f5f5!important;color:#111!important;border-bottom:1px dashed #bbb!important}
  .rcpt-print-area .rr,.rcpt-print-area .rrttl{border-bottom:1px dashed #ddd!important;color:#111!important}
  .rcpt-print-area .rcpt-actions{display:none!important;visibility:hidden!important}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
}

/* Utils */
.fx{display:flex}.aic{align-items:center}.jsb{justify-content:space-between}.jsc{justify-content:center}
.g2{gap:8px}.g3{gap:12px}.g4{gap:16px}
.mt1{margin-top:4px}.mt2{margin-top:8px}.mt3{margin-top:12px}.mt4{margin-top:16px}
.mb1{margin-bottom:4px}.mb2{margin-bottom:8px}.mb3{margin-bottom:12px}.mb4{margin-bottom:16px}
.tsm{font-size:12px}.tmu{color:var(--muted)}.tg{color:var(--g)}.tw2{color:var(--warn)}.te{color:var(--err)}
.fw7{font-weight:700}.fw8{font-weight:800}
.fmn{font-family:var(--mono)}.fhd{font-family:var(--head)}
.wf{width:100%}
.dvdr{border:none;border-top:1px solid var(--bdr);margin:14px 0}
.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */
const fmt    = n => new Intl.NumberFormat("fr-DZ").format(Math.round(n)) + " DA";
const fmtN   = n => new Intl.NumberFormat("fr-DZ",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const fmtTs  = ts => new Date(ts).toLocaleString("fr-DZ",{dateStyle:"short",timeStyle:"short"});
const uid    = () => "D" + Date.now().toString(36).toUpperCase();
const uidC   = () => "C" + Date.now().toString(36).toUpperCase();
const uidU   = () => "U" + Date.now().toString(36).toUpperCase();
const nowIso = () => new Date().toISOString().slice(0,16);

const creditPct   = c => c.creditLimit ? Math.round((c.consumed/c.creditLimit)*100) : 0;
const creditColor = p => p>=90 ? "var(--err)" : p>=70 ? "var(--warn)" : "var(--g)";

function statusBadgeProps(s) {
  return {
    settled:["b-ok",   "✓ Réglé"],
    paid:   ["b-cash", "💵 Payé"],
    flagged:["b-err",  "⚠ Limite"],
    pending:["b-warn", "⏳ Attente"],
  }[s] || ["b-info", s];
}

function StatusBadge({s}) {
  const [cls,lbl] = statusBadgeProps(s);
  return <span className={`badge ${cls}`}>{lbl}</span>;
}

function ClientStatusBadge({s}) {
  const map = {
    approved:    ["b-ok",     "✓ Approuvé"],
    under_review:["b-warn",   "🔍 En révision"],
    pending_docs:["b-err",    "📄 Docs manquants"],
    rejected:    ["b-err",    "✗ Rejeté"],
  };
  const [cls,lbl] = map[s] || ["b-muted", s];
  return <span className={`badge ${cls}`}>{lbl}</span>;
}

function UserStatusBadge({s}) {
  const map = {
    active: ["b-ok",   "Actif"],
    pending:["b-warn", "En attente"],
    inactive:["b-muted","Inactif"],
  };
  const [cls,lbl] = map[s] || ["b-muted", s];
  return <span className={`badge ${cls}`}>{lbl}</span>;
}

const uidInv = () => "INV-" + Date.now().toString(36).toUpperCase();

const REQUIRED_DOCS_PRIVATE = ["Registre de Commerce (RC)","Numéro d'Identification Fiscale (NIF)","Assurance Responsabilité Civile","Extrait de rôle apuré","Convention signée"];
const REQUIRED_DOCS_STATE   = ["Arrêté ou délibération d'assemblée","Convention signée","Bon de commande ou réquisition"];
const REQUIRED_DOCS_CREDIT  = ["Registre de Commerce (RC)","Numéro d'Identification Fiscale (NIF)","Demande d'ouverture de compte crédit","Garantie ou caution"];

function InvoiceStatusBadge({s}) {
  const map = {
    pending: ["b-warn",   "⏳ En attente"],
    partial: ["b-purple", "💳 Partiel"],
    paid:    ["b-ok",     "✓ Payée"],
    overdue: ["b-err",    "🔴 Impayée"],
  };
  const [cls,lbl] = map[s] || ["b-muted", s];
  return <span className={`badge ${cls}`}>{lbl}</span>;
}

function PayProgress({inv, compact=false}) {
  if (!inv || inv.totalAmount<=0) return null;
  const paid = inv.paidAmount||0;
  if (paid<=0) return null;
  const pct  = Math.min(100, Math.round((paid/inv.totalAmount)*100));
  const rem  = inv.totalAmount - paid;
  const col  = pct>=100?"var(--g)":pct>=50?"var(--warn)":"var(--err)";
  return (
    <div style={{minWidth: compact?90:130}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,fontFamily:"var(--mono)",color:"var(--muted)",marginBottom:3}}>
        <span style={{color:col}}>{pct}%</span>
        {rem>0&&<span style={{color:"var(--warn)"}}>{fmt(rem)} restant</span>}
      </div>
      <div className="pay-bar-track">
        <div className="pay-bar-fill" style={{width:`${pct}%`,background:col}}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN SCREEN
═══════════════════════════════════════════════════════════════════════════ */
function LoginScreen({onLogin, onRegister, company}) {
  const [email, setEmail]   = useState("");
  const [password, setPwd]  = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password}),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error||"Identifiants incorrects."); setLoading(false); return; }
      setLoading(false);
      onLogin(data);
    } catch {
      setError("Erreur de connexion au serveur.");
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-box">
        <div className="login-logo">
          <img src="/logo.png" alt="EPWGCET" className="login-logo-icon"/>
          <div className="login-company">{cof(company,'name')}</div>
          <div className="login-wilaya">{cof(company,'wilaya')}</div>
        </div>
        <div className="login-title">Connexion</div>
        {error && <div className="alrt ae mb3"><span>⚠</span><span>{error}</span></div>}
        <div className="fg" style={{gap:14}}>
          <div className="field">
            <label>Adresse e-mail</label>
            <input className="fi" type="email" placeholder="exemple@epwgcet-jijel.dz" value={email}
              onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input className="fi" type="password" placeholder="••••••••" value={password}
              onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
          </div>
          <button className="btn bp bfw" style={{marginTop:4}} onClick={handleLogin} disabled={loading||!email||!password}>
            {loading?"Connexion...":"🔐 Se connecter"}
          </button>
        </div>
        <div className="login-switch">
          Pas encore de compte ? <a onClick={onRegister}>Demander un accès opérateur</a>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   REGISTER SCREEN
═══════════════════════════════════════════════════════════════════════════ */
function RegisterScreen({onBack, onRegistered, sites, company}) {
  const [form, setForm] = useState({name:"",email:"",password:"",phone:"",siteId:"CET-JIJ"});
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleRegister = async () => {
    if (!form.name||!form.email||!form.password||!form.phone) { setError("Veuillez remplir tous les champs."); return; }
    if (form.password.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    const newUser = {
      id:uidU(), name:form.name, email:form.email, password:form.password,
      role:"operator", status:"pending", phone:form.phone, siteId:form.siteId,
      matricule:"", createdAt:new Date().toISOString().slice(0,10),
    };
    await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newUser)});
    onRegistered(newUser);
    setSent(true);
  };

  if (sent) return (
    <div className="login-shell">
      <div className="login-box" style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>✅</div>
        <div style={{fontFamily:"var(--head)",fontSize:20,fontWeight:800,marginBottom:10}}>Demande envoyée</div>
        <p style={{color:"var(--muted)",fontSize:13,lineHeight:1.7,marginBottom:24}}>
          Votre demande d'accès a été transmise à l'administrateur. Vous recevrez une confirmation dès validation de votre compte.
        </p>
        <button className="btn bp bfw" onClick={onBack}>← Retour à la connexion</button>
      </div>
    </div>
  );

  return (
    <div className="login-shell">
      <div className="login-box">
        <div className="login-logo">
          <img src="/logo.png" alt="EPWGCET" className="login-logo-icon"/>
          <div className="login-company">{cof(company,'short')}</div>
          <div className="login-wilaya">{cof(company,'wilaya')}</div>
        </div>
        <div className="login-title">Demande d'accès opérateur</div>
        {error && <div className="alrt ae mb3"><span>⚠</span><span>{error}</span></div>}
        <div className="alrt ai mb3" style={{marginBottom:16}}>
          <span>ℹ️</span>
          <span style={{fontSize:11}}>Votre compte sera créé après validation par l'administrateur. Remplissez vos informations complètes.</span>
        </div>
        <div className="fg" style={{gap:12}}>
          <div className="field"><label>Nom complet</label>
            <input className="fi" placeholder="Prénom Nom" value={form.name} onChange={e=>set("name",e.target.value)}/>
          </div>
          <div className="field"><label>Adresse e-mail professionnelle</label>
            <input className="fi" type="email" placeholder="prenom.nom@epwgcet-jijel.dz" value={form.email} onChange={e=>set("email",e.target.value)}/>
          </div>
          <div className="field"><label>Téléphone</label>
            <input className="fi" placeholder="0770 00 00 00" value={form.phone} onChange={e=>set("phone",e.target.value)}/>
          </div>
          <div className="field"><label>Site d'affectation souhaité</label>
            <select className="fi" value={form.siteId} onChange={e=>set("siteId",e.target.value)}>
              {sites.map(s=><option key={s.id} value={s.id}>{s.name} — {s.region}</option>)}
            </select>
          </div>
          <div className="field"><label>Mot de passe (min. 6 caractères)</label>
            <input className="fi" type="password" placeholder="••••••••" value={form.password} onChange={e=>set("password",e.target.value)}/>
          </div>
          <button className="btn bp bfw" style={{marginTop:4}} onClick={handleRegister}>📨 Envoyer la demande</button>
          <button className="btn bg bfw" onClick={onBack}>← Retour</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [authUser, setAuthUser] = useState(() => {
  try { return JSON.parse(localStorage.getItem('authUser')); } catch { return null; }
});
  const [authScreen,  setAuthScreen]  = useState("login"); // "login" | "register"
  const [page, setPage] = useState(() => { try { return localStorage.getItem('currentPage') || "dashboard"; } catch { return "dashboard"; } });
  const [discharges,  setDischarges]  = useState([]);
  const [clients,     setClients]     = useState([]);
  const [users,       setUsers]       = useState([]);
  const [sites,       setSites]       = useState([]);
  const [wasteTypes,  setWasteTypes]  = useState([]);
  const [online,      setOnline]      = useState(true);
  const [clock,       setClock]       = useState(new Date());
  const [theme,       setTheme]       = useState("light");
  const [loading,     setLoading]     = useState(true);
  const [invoices,    setInvoices]    = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companyTrucks, setCompanyTrucks] = useState([]);
  const [docTypes,    setDocTypes]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('ewgcet_docTypes')) || {private:[...REQUIRED_DOCS_PRIVATE],state:[...REQUIRED_DOCS_STATE]}; }
    catch { return {private:[...REQUIRED_DOCS_PRIVATE],state:[...REQUIRED_DOCS_STATE]}; }
  });
  const updateDocTypes = types => {
    setDocTypes(types);
    localStorage.setItem('ewgcet_docTypes', JSON.stringify(types));
  };
  const [company, setCompany] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ewgcet_company')) || COMPANY_FIELDS_DEFAULT; }
    catch { return COMPANY_FIELDS_DEFAULT; }
  });
  const updateCompany = c => { setCompany(c); localStorage.setItem('ewgcet_company', JSON.stringify(c)); };

  useEffect(()=>{ const t=setInterval(()=>setClock(new Date()),60000); return()=>clearInterval(t); },[]);
  useEffect(()=>{ document.documentElement.setAttribute("data-theme", theme); },[theme]);
  useEffect(()=>{
    Promise.all([
      fetch('/api/sites').then(r=>r.json()),
      fetch('/api/waste-types').then(r=>r.json()),
      fetch('/api/clients').then(r=>r.json()),
      fetch('/api/users').then(r=>r.json()),
      fetch('/api/discharges').then(r=>r.json()),
      fetch('/api/invoices').then(r=>r.json()),
      fetch('/api/company-trucks').then(r=>r.json()),
    ]).then(([s,wt,c,u,d,inv,ct])=>{
      setSites(Array.isArray(s)?s:[]);
      setWasteTypes(Array.isArray(wt)?wt:[]);
      setClients(Array.isArray(c)?c:[]);
      setUsers(Array.isArray(u)?u:[]);
      setDischarges(Array.isArray(d)?d:[]);
      setInvoices(Array.isArray(inv)?inv:[]);
      setCompanyTrucks(Array.isArray(ct)?ct:[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  if (loading) return (
    <><style>{STYLES}</style>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)",flexDirection:"column",gap:16}}>
        <img src="/logo.png" alt="EPWGCET" style={{width:80,height:80,objectFit:"contain",marginBottom:4}}/>
        <div style={{fontFamily:"var(--head)",fontSize:22,fontWeight:800,color:"var(--g)",letterSpacing:".04em"}}>Chargement…</div>
        <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>Connexion à la base de données…</div>
      </div>
    </>
  );

  if (!authUser) {
    if (authScreen === "register") return (
      <><style>{STYLES}</style>
        <RegisterScreen onBack={()=>setAuthScreen("login")} sites={sites}
          onRegistered={u=>{ setUsers(p=>[...p,u]); setAuthScreen("login"); }} company={company}/>
      </>
    );
    return (
      <><style>{STYLES}</style>
        <LoginScreen onLogin={u=>{setAuthUser(u);localStorage.setItem('authUser',JSON.stringify(u));const p=u.role==="admin"?"dashboard":"gate";localStorage.setItem('currentPage',p);setPage(p);}}
          onRegister={()=>setAuthScreen("register")} company={company}/>
      </>
    );
  }

  const isAdmin = authUser.role === "admin";
  const opSite  = !isAdmin ? sites.find(s=>s.id===authUser.siteId) : null;

  const addDischarge = async d => {
    await fetch('/api/discharges',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
    setDischarges(p=>[d,...p]);
    if (d.payMethod==="convention"||d.payMethod==="credit") {
      setClients(p=>p.map(c=>c.id===d.clientId?{...c,consumed:c.consumed+d.total}:c));
    }
  };
  const updateDischarge = async d => {
    await fetch(`/api/discharges/${d.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
    setDischarges(p=>p.map(x=>x.id===d.id?d:x));
    // Refresh clients to get correct consumed from server
    fetch('/api/clients').then(r=>r.json()).then(c=>{ if(Array.isArray(c)) setClients(c); });
  };

  const addClient    = async c  => {
    await fetch('/api/clients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)});
    setClients(p=>[...p,c]);
  };
  const updateClient = async c  => {
    await fetch(`/api/clients/${c.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)});
    setClients(p=>p.map(x=>x.id===c.id?c:x));
  };
  const deleteClient = async id => {
    await fetch(`/api/clients/${id}`,{method:'DELETE'});
    setClients(p=>p.filter(c=>c.id!==id));
  };
  const addUser      = async u  => {
    await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(u)});
    setUsers(p=>[...p,u]);
  };
  const updateUser   = async u  => {
    await fetch(`/api/users/${u.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(u)});
    setUsers(p=>p.map(x=>x.id===u.id?u:x));
  };
  const deleteUser   = async id => {
    await fetch(`/api/users/${id}`,{method:'DELETE'});
    setUsers(p=>p.filter(u=>u.id!==id));
  };
  const updateSite   = async s  => {
    await fetch(`/api/sites/${s.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)});
    setSites(p=>p.map(x=>x.id===s.id?s:x));
  };
  const updateWT     = async wt => {
    await fetch(`/api/waste-types/${wt.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(wt)});
    setWasteTypes(p=>p.map(x=>x.id===wt.id?wt:x));
  };
  const addCompanyTruck    = async t => {
    await fetch('/api/company-trucks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(t)});
    setCompanyTrucks(p=>[...p,t]);
  };
  const updateCompanyTruck = async t => {
    await fetch(`/api/company-trucks/${t.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(t)});
    setCompanyTrucks(p=>p.map(x=>x.id===t.id?t:x));
  };
  const deleteCompanyTruck = async id => {
    await fetch(`/api/company-trucks/${id}`,{method:'DELETE'});
    setCompanyTrucks(p=>p.filter(t=>t.id!==id));
  };
  const addInvoice = async inv => {
    await fetch('/api/invoices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(inv)});
    setInvoices(p=>{const ex=p.find(x=>x.id===inv.id); return ex?p.map(x=>x.id===inv.id?inv:x):[...p,inv];});
  };
  const updateInvoice = async inv => {
    await fetch(`/api/invoices/${inv.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(inv)});
    setInvoices(p=>p.map(x=>x.id===inv.id?inv:x));
  };

  const flagged = discharges.filter(d=>d.status==="flagged").length;
  const pendingOps = users.filter(u=>u.role==="operator"&&u.status==="pending").length;
  const pendingClients = clients.filter(c=>(c.type==="convention"||c.type==="rotation"||c.type==="credit")&&c.status!=="approved"&&c.status!=="rejected").length;
  const alerts = flagged + pendingOps + pendingClients;

  const navAdmin = [
    {id:"dashboard",  lbl:"Tableau de Bord",   ic:"📊"},
    {id:"gate",       lbl:"Saisie Dépôt",       ic:"🚛"},
    {id:"discharges", lbl:"Déchargements",      ic:"🗂", bdg:flagged||null},
    {id:"clients",    lbl:"Clients",            ic:"🏢", bdg:pendingClients||null},
    {id:"operators",  lbl:"Opérateurs",         ic:"👷", bdg:pendingOps||null},
    {id:"invoice",    lbl:"Factures / Relevés", ic:"🧾"},
    {id:"settings",   lbl:"Paramètres",         ic:"⚙️"},
  ];
  const navOp = [
    {id:"gate",       lbl:"Saisie Dépôt",       ic:"🚛"},
    {id:"discharges", lbl:"Historique",          ic:"🗂"},
  ];
  const nav = isAdmin ? navAdmin : navOp;
  const pageTitle = [...navAdmin,...navOp].find(n=>n.id===page)?.lbl ?? "—";
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <style>{STYLES}</style>
      <div className="shell">
        <div className={`sidebar-backdrop${sidebarOpen?" open":""}`} onClick={closeSidebar}/>
        <aside className={`sidebar${sidebarOpen?" open":""}`}>
          <div className="sbl">
            <img src="/logo.png" alt="EPWGCET" style={{width:48,height:48,objectFit:"contain",marginBottom:6,display:"block",margin:"0 auto 6px"}}/>
            <div className="sbl-title">{cof(company,'short')}</div>
            <div className="sbl-sub">{cof(company,'wilaya')}</div>
          </div>
          <nav>
            <div className="nav-grp">
              <div className="nav-lbl">Navigation</div>
              {nav.map(n=>(
                <button key={n.id} className={`nb${page===n.id?" act":""}`} onClick={()=>{setPage(n.id);closeSidebar();}}>
                  <span className="ic">{n.ic}</span>{n.lbl}
                  {n.bdg?<span className="bdg">{n.bdg}</span>:null}
                </button>
              ))}
            </div>
          </nav>
          <div className="sbf">
            <div className="role-card">
              <div className="role-lbl">Connecté en tant que</div>
              <div className="role-name">{authUser.name}</div>
              <div className="role-detail">{isAdmin?"👔 Administrateur":"🦺 Opérateur"}{opSite?` · ${opSite.name}`:""}</div>
            </div>
            <button className="logout-btn" onClick={()=>{setAuthUser(null);localStorage.removeItem('authUser');localStorage.removeItem('currentPage');setAuthScreen("login");}}>
                🚪 Déconnexion
            </button>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <button className="hamburger" onClick={()=>setSidebarOpen(o=>!o)} aria-label="Menu">☰</button>
            <div className="tb-title">{pageTitle}</div>
            <div className="tb-right">
              <span className="chip chip-dim fmn chip-hide-mobile" style={{fontSize:10}}>
                {clock.toLocaleTimeString("fr-DZ",{hour:"2-digit",minute:"2-digit"})}
              </span>
              <button className={`chip ${online?"chip-ok":"chip-warn"} chip-hide-mobile`} onClick={()=>setOnline(o=>!o)}>
                {online?"🟢 En ligne":"🟡 Hors ligne"}
              </button>
              {alerts>0&&<span className="chip chip-err">⚠ {alerts}</span>}
              <button className="chip chip-dim" style={{cursor:"pointer"}}
                onClick={()=>setTheme(t=>t==="dark"?"light":"dark")}
                title={theme==="dark"?"Passer en mode clair":"Passer en mode sombre"}>
                {theme==="dark"?"☀️":"🌙"}
              </button>
            </div>
          </div>
          <div className="content">
            {page==="dashboard"  && <PageDashboard discharges={discharges} clients={clients} sites={sites} wasteTypes={wasteTypes} setPage={setPage}/>}
            {page==="gate"       && <PageGate addDischarge={addDischarge} addClient={addClient} clients={clients} sites={sites} wasteTypes={wasteTypes} discharges={discharges} authUser={authUser} isAdmin={isAdmin} company={company} companyTrucks={companyTrucks}/>}
            {page==="discharges" && <PageDischarges discharges={discharges} setDischarges={setDischarges} sites={sites} wasteTypes={wasteTypes} users={users} clients={clients} updateClient={updateClient} updateDischarge={updateDischarge} isAdmin={isAdmin} authUser={authUser} company={company}/>}
            {page==="clients"    && <PageClients clients={clients} discharges={discharges} updateClient={updateClient} addClient={addClient} deleteClient={deleteClient} isAdmin={isAdmin} docTypes={docTypes} sites={sites}/>}
            {page==="operators"  && <PageOperators users={users} sites={sites} addUser={addUser} updateUser={updateUser} deleteUser={deleteUser} authUser={authUser}/>}
            {page==="invoice"    && <PageInvoice clients={clients} discharges={discharges} sites={sites} wasteTypes={wasteTypes} invoices={invoices} addInvoice={addInvoice} updateInvoice={updateInvoice} company={company}/>}
            {page==="settings"   && <PageSettings sites={sites} wasteTypes={wasteTypes} updateSite={updateSite} updateWT={updateWT} authUser={authUser} updateUser={updateUser} setAuthUser={setAuthUser} docTypes={docTypes} updateDocTypes={updateDocTypes} company={company} updateCompany={updateCompany} companyTrucks={companyTrucks} addCompanyTruck={addCompanyTruck} updateCompanyTruck={updateCompanyTruck} deleteCompanyTruck={deleteCompanyTruck}/>}
            {page==="schema"     && <PageSchema/>}
          </div>
          <nav className="mobile-bottom-nav">
            <div className="mbn-inner">
              {nav.map(n=>(
                <button key={n.id} className={`mbn-btn${page===n.id?" act":""}`} onClick={()=>setPage(n.id)}>
                  <span className="mbn-ic">{n.ic}</span>
                  <span>{n.lbl.split(" ")[0]}</span>
                  {n.bdg?<span className="mbn-bdg">{n.bdg}</span>:null}
                </button>
              ))}
            </div>
          </nav>
        </main>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
function PageDashboard({discharges,clients,sites,wasteTypes,setPage}) {
  const rotIds    = new Set(clients.filter(c=>c.type==="rotation").map(c=>c.id));
  const totalRev  = discharges.reduce((s,d)=>s+d.total,0);
  const totalTons = discharges.filter(d=>!rotIds.has(d.clientId)).reduce((s,d)=>s+d.net,0);
  const cashRev   = discharges.filter(d=>d.payMethod==="cash").reduce((s,d)=>s+d.total,0);
  const flagged   = discharges.filter(d=>d.status==="flagged");
  const pendingC  = clients.filter(c=>(c.type==="convention"||c.type==="rotation")&&(c.status==="pending_docs"||c.status==="under_review"));
  const byWaste   = wasteTypes.map(w=>({...w,
    count:discharges.filter(d=>d.wasteType===w.id).length,
    tons:discharges.filter(d=>d.wasteType===w.id).reduce((s,d)=>s+d.net,0),
  }));
  const month = new Date().toLocaleString("fr-DZ",{month:"long",year:"numeric"});

  return (
    <>
      {flagged.length>0&&(
        <div className="alrt ae mb4">
          <span style={{fontSize:18}}>🚨</span>
          <div>
            <strong>{flagged.length} déchargement(s) avec dépassement de crédit</strong>
            <div className="mt1">{flagged.map(d=>d.clientName).filter((v,i,a)=>a.indexOf(v)===i).join(", ")}</div>
          </div>
        </div>
      )}
      {pendingC.length>0&&(
        <div className="alrt aw mb4">
          <span style={{fontSize:18}}>📋</span>
          <div>
            <strong>{pendingC.length} client(s) convention en attente de validation</strong>
            <div className="mt1">{pendingC.map(c=>c.name).join(", ")}</div>
          </div>
        </div>
      )}

      <div className="kpi-grid">
        {[
          {kc:"var(--g)",    ic:"💰", l:"Recettes Totales",    v:fmt(totalRev),           s:month},
          {kc:"var(--info)", ic:"⚖️", l:"Tonnage Total",       v:fmtN(totalTons)+" t",    s:discharges.length+" déchargements"},
          {kc:"var(--g2)",   ic:"💵", l:"Recettes Cash",       v:fmt(cashRev),             s:discharges.filter(d=>d.payMethod==="cash").length+" transactions cash"},
          {kc:"var(--warn)", ic:"🏭", l:"Sites Actifs",        v:String(sites.length),    s:"3 CET · 1 CDI · Wilaya Jijel"},
        ].map(k=>(
          <div key={k.l} className="kpi" style={{"--kc":k.kc}}>
            <div className="kpi-i">{k.ic}</div>
            <div className="kpi-l">{k.l}</div>
            <div className="kpi-v" style={{fontSize:k.v.length>12?16:22}}>{k.v}</div>
            <div className="kpi-s">{k.s}</div>
          </div>
        ))}
      </div>

      <div className="dash-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
        <div className="panel">
          <div className="ph">
            <span className="pt">Derniers Déchargements</span>
            <button className="btn bg bsm" onClick={()=>setPage("discharges")}>Voir tout →</button>
          </div>
          <div className="tw">
            <table>
              <thead><tr><th>Camion</th><th>Client</th><th>Net(t)</th><th>Total</th><th>Statut</th></tr></thead>
              <tbody>
                {discharges.slice(0,6).map(d=>(
                  <tr key={d.id}>
                    <td><span className="mn">{d.truck}</span></td>
                    <td style={{maxWidth:130}} className="truncate">{d.clientName}</td>
                    <td><span className="mn">{fmtN(d.net)}</span></td>
                    <td><span className="mn tg">{fmt(d.total)}</span></td>
                    <td><StatusBadge s={d.status}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="panel">
            <div className="ph"><span className="pt">Capacité des Sites</span></div>
            <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:14}}>
              {sites.map(s=>{
                const pct=Math.round((s.used/s.capacity)*100);
                const col=pct>80?"var(--err)":pct>60?"var(--warn)":"var(--g)";
                return (
                  <div key={s.id}>
                    <div className="fx aic jsb mb1">
                      <div className="fx aic g2">
                        <span style={{fontWeight:600,fontSize:13}}>{s.name}</span>
                        <span className={`badge ${s.type==="CDI"?"b-warn":"b-info"}`} style={{fontSize:8}}>{s.type}</span>
                        {s.commune&&<span className="tsm tmu" style={{fontSize:10}}>📍 {s.commune}</span>}
                      </div>
                      <span className="mn tsm tmu">{pct}%</span>
                    </div>
                    <div className="cbt"><div className="cbf" style={{width:`${pct}%`,background:col}}/></div>
                    <div className="fx jsb mt1">
                      <span className="tsm tmu">{s.region}</span>
                      <span className="tsm fmn tmu">{(s.used/1000).toFixed(0)}k/{(s.capacity/1000).toFixed(0)}k t</span>
                    </div>
                    {s.acceptedWaste&&s.acceptedWaste.length>0&&(
                      <div className="fx mt1" style={{gap:3,flexWrap:"wrap"}}>
                        {s.acceptedWaste.map(wId=>(
                          <span key={wId} className="badge" style={{fontSize:8,padding:"1px 5px",background:"var(--s3)",color:"var(--muted)",border:"1px solid var(--bdr)"}}>{wId}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="ph"><span className="pt">Répartition par Type</span></div>
            <div style={{padding:"10px 18px",display:"flex",flexDirection:"column",gap:8}}>
              {byWaste.filter(w=>w.count>0).map(w=>(
                <div key={w.id} className="fx aic jsb">
                  <div>
                    <span style={{fontSize:12,fontWeight:600}}>{w.label}</span>
                    <span className="tsm tmu" style={{marginLeft:8}}>{w.count} dépôts</span>
                  </div>
                  <span className="mn tsm tg">{fmtN(w.tons)} t</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="ph"><span className="pt">Clients Convention Tonnes — Quotas & Crédit</span></div>
        <div className="tw">
          <table>
            <thead><tr><th>Client</th><th>Type</th><th>Mode</th><th>Limite</th><th>Utilisé</th><th>Progression</th><th>Statut</th></tr></thead>
            <tbody>
              {clients.filter(c=>c.type==="convention"||c.type==="rotation"||c.type==="credit").map(c=>{
                const yr = new Date().getFullYear().toString();
                const monthPfx = `${yr}-${String(new Date().getMonth()+1).padStart(2,"0")}`;
                const isMonthly = c.payFrequency==="monthly";
                const pfx = isMonthly ? monthPfx : yr;
                const periodDs = discharges.filter(d=>d.clientId===c.id&&d.ts.startsWith(pfx)&&d.status!=="cancelled");
                const usedW   = periodDs.reduce((s,d)=>s+d.net,0);
                const usedRot = periodDs.length;
                const isRotation = c.type==="rotation";
                const pct = c.creditEnabled
                  ? creditPct(c)
                  : c.weightLimitYear>0 ? Math.round(((isRotation?usedRot:usedW)/c.weightLimitYear)*100) : 0;
                const col = creditColor(pct);
                return (
                  <tr key={c.id}>
                    <td style={{fontWeight:600}}>{c.name}</td>
                    <td>
                      {isRotation
                        ?<span className="badge" style={{background:"rgba(251,146,60,.12)",color:"var(--orange)",border:"1px solid rgba(251,146,60,.3)"}}>🔄 Rotation</span>
                        :<span className={`badge ${c.clientType==="state"?"b-purple":"b-info"}`}>{c.clientType==="state"?"🏛 État":"🏢 Privé"}</span>}
                    </td>
                    <td>
                      {c.creditEnabled
                        ?<span className="badge" style={{background:"rgba(139,92,246,.15)",color:"#7c3aed",border:"1px solid rgba(139,92,246,.3)"}}>💳 Crédit DA</span>
                        :isRotation
                          ?<span className="badge" style={{background:"rgba(251,146,60,.12)",color:"var(--orange)",border:"1px solid rgba(251,146,60,.3)"}}>{c.payFrequency==="monthly"?"🔄 Rotations/mois":"🔄 Rotations/an"}</span>
                          :<span className="badge b-info">{c.payFrequency==="monthly"?"⚖️ Tonnage/mois":"⚖️ Tonnage/an"}</span>}
                    </td>
                    <td><span className="mn">{c.status==="approved"?(c.creditEnabled?fmt(c.creditLimit):c.weightLimitYear?(isRotation?c.weightLimitYear+" rot.":(fmtN(c.weightLimitYear)+" t")):"—"):"—"}</span></td>
                    <td><span className="mn">{c.status==="approved"?(c.creditEnabled?fmt(c.consumed):isRotation?(usedRot+" rot."):(fmtN(usedW)+" t")):"—"}</span></td>
                    <td style={{minWidth:120}}>
                      {c.status==="approved"&&(c.creditEnabled?c.creditLimit:c.weightLimitYear)>0?(
                        <div className="fx aic g2">
                          <div className="cbt" style={{flex:1}}><div className="cbf" style={{width:`${Math.min(pct,100)}%`,background:col}}/></div>
                          <span className="mn tsm" style={{color:col}}>{pct}%</span>
                        </div>
                      ):<span className="tsm tmu">—</span>}
                    </td>
                    <td><ClientStatusBadge s={c.status}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GATE — SAISIE OPÉRATEUR
═══════════════════════════════════════════════════════════════════════════ */
function PageGate({addDischarge, addClient, clients, sites, wasteTypes, discharges, authUser, company, companyTrucks}) {
  const isAdmin = authUser.role === "admin";
  const defaultSite = isAdmin ? sites[0]?.id : authUser.siteId;

  const [mode,         setMode]         = useState("convention"); // "convention" | "rotation" | "prepaid" | "cash"
  const [opType,       setOpType]       = useState("treatment");  // "treatment" | "collect"
  const [step,         setStep]         = useState(1);
  const [form,         setForm]         = useState({siteId:defaultSite, truck:"", clientId:"", wasteType:"", gross:"", tare:""});
  const [payModal,     setPayModal]     = useState(false);
  const [cashConf,     setCashConf]     = useState(false);
  const [lastEntry,    setLastEntry]    = useState(null);
  const [hint,         setHint]         = useState(null);
  const [convSubMode,  setConvSubMode]  = useState("tonnage"); // "tonnage" | "rotation" for convention clients with rotationLimit

  // New cash client registration
  const [newCashModal, setNewCashModal] = useState(false);
  const [cashForm,     setCashForm]     = useState({name:"",nif:"",phone:"",truck:"",tare:""});

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const site = sites.find(s=>s.id===form.siteId);
  // Filter by site's accepted waste list (if configured), otherwise fall back to site type
  const validWasteTypes = site
    ? (site.acceptedWaste&&site.acceptedWaste.length>0
        ? wasteTypes.filter(w=>site.acceptedWaste.includes(w.id))
        : wasteTypes.filter(w=>w.siteTypes.includes(site.type)))
    : wasteTypes;

  // Fix wasteType if current one not valid for selected site
  const wasteTypeValid = validWasteTypes.find(w=>w.id===form.wasteType);
  if (validWasteTypes.length && !wasteTypeValid && form.wasteType !== "") {
    setForm(f=>({...f, wasteType:validWasteTypes[0].id}));
  }
  if (validWasteTypes.length && !form.wasteType) {
    setForm(f=>({...f, wasteType:validWasteTypes[0].id}));
  }

  const siteClientFilter = c => {
    if (isAdmin || !authUser.siteId || authUser.siteId === "all") return true;
    return Array.isArray(c.assignedSites) && c.assignedSites.includes(authUser.siteId);
  };
  const approvedConvention = clients.filter(c=>c.type==="convention"&&c.status==="approved"&&!c.creditEnabled&&siteClientFilter(c));
  const approvedRotation   = clients.filter(c=>c.type==="rotation"&&c.status==="approved"&&siteClientFilter(c));
  const approvedCredit     = clients.filter(c=>c.status==="approved"&&c.creditEnabled&&siteClientFilter(c));
  const approvedPrepaid    = clients.filter(c=>c.type==="prepaid"&&c.status==="approved"&&siteClientFilter(c));
  const approvedCash       = clients.filter(c=>c.type==="daily"&&c.status==="approved"&&siteClientFilter(c));

  // Collect+Treatment: convention or prepaid clients, approved, serviceType=treat_and_collect, assigned to current site
  const treatAndCollectClients = clients.filter(c=>
    (c.type==="convention"||c.type==="prepaid") &&
    c.status==="approved" &&
    c.serviceType==="treat_and_collect" &&
    (!(c.assignedSites?.length>0) || c.assignedSites.includes(form.siteId))
  );
  const activeCompanyTrucks = (companyTrucks||[]).filter(t=>t.status==="active");

  const onTruck = plate => {
    set("truck", plate);
    const t = TRUCKS_DB.find(t=>t.plate===plate.toUpperCase());
    if (t) {
      const c = clients.find(c=>c.id===t.clientId);
      setHint({t,c});
      set("clientId", t.clientId);
      set("tare", String(t.tare));
      const firstAllowed = t.allowed.find(a => validWasteTypes.find(w=>w.id===a));
      if (firstAllowed) set("wasteType", firstAllowed);
    } else {
      setHint(null);
    }
  };

  const gross = parseFloat(form.gross)||0;
  const tare  = parseFloat(form.tare)||0;
  const net   = Math.max(0, gross-tare);
  const wt    = wasteTypes.find(w=>w.id===form.wasteType) || validWasteTypes[0];
  const total = net * (wt?.price || 0);
  const client = clients.find(c=>c.id===form.clientId);
  const isPrepaid   = client && client.type==="prepaid";
  const isRotationClient = client && client.type==="rotation";
  const isOnAccount = client && (client.type==="convention"||client.type==="rotation"||client.creditEnabled||isPrepaid);
  // Credit clients: check money limit; convention (non-credit): check weight/year limit
  const currentYear = new Date().getFullYear().toString();
  const currentMonthPrefix = `${currentYear}-${String(new Date().getMonth()+1).padStart(2,"0")}`;
  const isMonthlyQuota = client && !client.creditEnabled && !isRotationClient && client.payFrequency==="monthly";
  const isMonthlyRotation = client && isRotationClient && client.payFrequency==="monthly";
  const periodPrefix = (isMonthlyQuota||isMonthlyRotation) ? currentMonthPrefix : currentYear;
  const usedThisYear = client && !client.creditEnabled && !isRotationClient
    ? discharges.filter(d=>d.clientId===client.id&&d.ts.startsWith(periodPrefix)&&d.status!=="cancelled").reduce((s,d)=>s+d.net,0)
    : 0;
  const usedRotations = isRotationClient
    ? discharges.filter(d=>d.clientId===client.id&&d.ts.startsWith(periodPrefix)&&d.status!=="cancelled").length
    : 0;
  const wouldExceedCredit    = client?.creditEnabled && client.creditLimit>0 && (client.consumed+total)>client.creditLimit;
  const wouldExceedWeight    = client && !client.creditEnabled && !isRotationClient && client.weightLimitYear>0 && (usedThisYear+net)>client.weightLimitYear;
  const wouldExceedRotations = isRotationClient && client.weightLimitYear>0 && (usedRotations+1)>client.weightLimitYear;
  // Convention clients with an admin-set rotation quota
  const isConvWithRotation      = mode==="convention" && client && client.type==="convention" && (client.rotationLimit||0)>0;
  const usedConvRotations       = isConvWithRotation
    ? discharges.filter(d=>d.clientId===client.id&&d.payMethod==="rotation"&&d.ts.startsWith(periodPrefix)&&d.status!=="cancelled").length
    : 0;
  const rotationConvPct         = isConvWithRotation ? Math.round((usedConvRotations/(client.rotationLimit||1))*100) : 0;
  const wouldExceedConvRot      = isConvWithRotation && convSubMode==="rotation" && client.rotationLimit>0 && (usedConvRotations+1)>client.rotationLimit;
  const effectiveWouldExceedW   = wouldExceedWeight && !(isConvWithRotation && convSubMode==="rotation");
  const wouldExceed = wouldExceedCredit || effectiveWouldExceedW || wouldExceedRotations || wouldExceedConvRot;
  const weightPct   = client && !client.creditEnabled && !isRotationClient && client.weightLimitYear>0 ? Math.round((usedThisYear/client.weightLimitYear)*100) : 0;
  const rotationPct = isRotationClient && client.weightLimitYear>0 ? Math.round((usedRotations/client.weightLimitYear)*100) : 0;
  const limitBlocked = !isAdmin && wouldExceed;
  const isCollectRotation = opType==="collect" && client?.collectBillingMode==="rotation";
  const canSubmit = opType==="collect"
    ? (form.truck && form.clientId && (isCollectRotation || gross>tare) && form.wasteType)
    : (form.truck && form.clientId && gross>tare && form.wasteType);

  // Collect-mode pricing
  const collectUnitPrice     = isCollectRotation ? (wt?.collectRotationPrice??0) : (wt?.collectPrice??0);
  const collectTotal         = isCollectRotation ? (wt?.collectRotationPrice??0) : net*(wt?.collectPrice??0);

  const finalise = method => {
    const effectiveMethod = opType==="collect"
      ? (isCollectRotation ? "rotation" : "convention")
      : method;
    let unitPrice, finalTotal;
    if (opType==="collect") {
      unitPrice  = collectUnitPrice;
      finalTotal = collectTotal;
    } else if (effectiveMethod==="rotation") {
      unitPrice  = wt?.rotationPrice ?? 0;
      finalTotal = wt?.rotationPrice ?? 0;
    } else {
      unitPrice  = wt?.price ?? 0;
      finalTotal = total;
    }
    const e = {
      id:uid(), ts:nowIso(), siteId:form.siteId,
      clientId:form.clientId, clientName:client?.name ?? form.clientId,
      truck:form.truck.toUpperCase(), wasteType:form.wasteType, gross, tare, net,
      unitPrice,
      total: finalTotal,
      status:wouldExceed?"flagged":effectiveMethod==="cash"?"paid":"settled",
      payMethod:effectiveMethod, opId:authUser.id,
      opType:opType,
    };
    addDischarge(e);
    setLastEntry(e);
    setStep(3);
    setPayModal(false);
    setCashConf(false);
  };

  const reset = () => {
    setForm({siteId:defaultSite, truck:"", clientId:"", wasteType:validWasteTypes[0]?.id||"", gross:"", tare:""});
    setStep(1); setLastEntry(null); setHint(null); setMode("convention"); setConvSubMode("tonnage"); setOpType("treatment");
  };

  const handleAddCashClient = () => {
    if (!cashForm.name) return;
    const nc = {
      id:uidC(), name:cashForm.name, clientType:"cash", type:"daily", status:"approved",
      creditLimit:0, consumed:0, phone:cashForm.phone, address:"", nif:cashForm.nif, rc:"", docs:[], note:"",
    };
    addClient(nc);
    if (cashForm.truck) set("truck", cashForm.truck);
    if (cashForm.tare)  set("tare",  cashForm.tare);
    set("clientId", nc.id);
    setNewCashModal(false);
    setCashForm({name:"",nif:"",phone:"",truck:"",tare:""});
  };

  // Receipt screen
  if (step===3&&lastEntry) {
    const recSite = sites.find(s=>s.id===lastEntry.siteId);
    return (
      <div style={{maxWidth:460,margin:"0 auto"}}>
        <div className="alrt ao mb4">
          <span style={{fontSize:20}}>🟢</span>
          <div><strong>Barrière Ouverte — Déchargement autorisé</strong><div className="mt1 tsm">Reçu #{lastEntry.id}</div></div>
        </div>
        <div className="rcpt-print-area">
          <div className="rcpt">
            <div className="rh">
              <div style={{fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}}><img src="/logo.png" alt="EPWGCET" style={{width:22,height:22,objectFit:"contain"}}/>{cof(company,'name')}</div>
              <div className="tmu" style={{marginTop:3,fontSize:11}}>{recSite?.name} — {recSite?.region}</div>
              <div className="tmu" style={{fontSize:10}}>{fmtTs(lastEntry.ts)} · #{lastEntry.id}</div>
            </div>
            {[["Client",lastEntry.clientName],
              ...(clients.find(c=>c.id===lastEntry.clientId)?.nif ? [["N° CIN/NIF",clients.find(c=>c.id===lastEntry.clientId).nif]] : []),
              ["Camion",lastEntry.truck],
              ["Type déchets",wasteTypes.find(w=>w.id===lastEntry.wasteType)?.label],
              ["Poids brut",fmtN(lastEntry.gross)+" t"],["Tare",fmtN(lastEntry.tare)+" t"],
              ["Poids net",fmtN(lastEntry.net)+" t"],
              ...(lastEntry.payMethod!=="rotation"?[["Tarif",fmt(lastEntry.unitPrice)+"/t"]]:[]),
            ].map(([l,v])=><div key={l} className="rr"><span>{l}</span><span>{v}</span></div>)}
            {lastEntry.payMethod==="rotation"
              ?<div className="rrttl" style={{color:"var(--orange)"}}><span>ROTATIONS</span><span>+1 rotation</span></div>
              :<div className="rrttl"><span>TOTAL</span><span>{fmt(lastEntry.total)}</span></div>}
            <div style={{textAlign:"center",marginTop:12,color:"var(--muted)",fontSize:10}}>
              {lastEntry.payMethod==="cash"?"💵 Payé en espèces":lastEntry.payMethod==="rotation"?"🔄 Convention Rotation":"📋 Crédit compte mensuel"}<br/>
              {cof(company,'wilaya')}
            </div>
          </div>
          <div className="rcpt-actions fx g3 mt4">
            <button className="btn bg" style={{flex:1}} onClick={()=>alert("📱 SMS/WhatsApp envoyé (simulation)")}>📤 Envoyer SMS</button>
            <button className="btn bi" style={{flex:1}} onClick={()=>window.print()}>🖨 Imprimer</button>
            <button className="btn bp" style={{flex:1}} onClick={reset}>➕ Nouveau Dépôt</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{maxWidth:700,margin:"0 auto"}}>
      {/* Steps */}
      <div className="fx aic g3 mb4" style={{fontSize:12,fontFamily:"var(--mono)"}}>
        {["1 · Identification","2 · Pesée","3 · Validation"].map((s,i)=>(
          <div key={i} className="fx aic g3">
            {i>0&&<span style={{color:"var(--dim)"}}>——</span>}
            <span style={{color:step===i+1?"var(--g)":step>i+1?"var(--g2)":"var(--muted)",fontWeight:step===i+1?700:400}}>
              {step>i+1?"✓ ":""}{s}
            </span>
          </div>
        ))}
      </div>

      {/* Operation type toggle */}
      {(treatAndCollectClients.length>0||opType==="collect")&&(
        <div className="gate-mode">
          <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted)",marginBottom:8,textTransform:"uppercase",letterSpacing:".12em"}}>Type d'opération</div>
          <div className="seg">
            <button className={`seg-btn${opType==="treatment"?" active":""}`}
              onClick={()=>{setOpType("treatment");set("clientId","");setHint(null);}}>
              🏭 Traitement
            </button>
            <button className={`seg-btn${opType==="collect"?" active":""}`}
              onClick={()=>{setOpType("collect");set("clientId","");setHint(null);set("truck","");}}
              style={opType==="collect"?{background:"var(--purple)",borderColor:"var(--purple)",color:"#fff"}:{}}>
              🚛 Collecte et Traitement
            </button>
          </div>
        </div>
      )}

      {/* Mode toggle (treatment only) */}
      {opType==="treatment"&&(
      <div className="gate-mode">
        <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted)",marginBottom:8,textTransform:"uppercase",letterSpacing:".12em"}}>Type de client</div>
        <div className="seg">
          <button className={`seg-btn${mode==="convention"?" active":""}`} onClick={()=>{setMode("convention");set("clientId","");setHint(null);}}>
            📋 Convention Tonnes
          </button>
          {approvedRotation.length>0&&(
            <button className={`seg-btn${mode==="rotation"?" active":""}`} onClick={()=>{setMode("rotation");set("clientId","");setHint(null);}}>
              🔄 Convention Rotation
            </button>
          )}
          {approvedPrepaid.length>0&&(
            <button className={`seg-btn${mode==="prepaid"?" active":""}`} onClick={()=>{setMode("prepaid");set("clientId","");setHint(null);}}>
              🎫 Bonus Prépayé
            </button>
          )}
          <button className={`seg-btn${mode==="cash"?" active":""}`} onClick={()=>{setMode("cash");set("clientId","");setHint(null);}}>
            💵 Cash
          </button>
        </div>
      </div>
      )}

      <div className="panel">
        <div className="ph">
          <span className="pt">{opType==="collect"?"🚛 Collecte et Traitement":"🏭 Formulaire de Traitement"}</span>
          <span className="chip chip-dim">{site?.name}</span>
        </div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:16}}>
          {/* Auto-correct siteId if client has assigned sites and current site is not in the list */}
          {client?.assignedSites?.length>0&&!client.assignedSites.includes(form.siteId)&&(()=>{setTimeout(()=>set("siteId",client.assignedSites[0]),0);return null;})()}
          <div className="fg fg2">
            <div className="field"><label>Site CET</label>
              {(()=>{
                const assigned = client?.assignedSites?.length>0
                  ? sites.filter(s=>client.assignedSites.includes(s.id)&&s.status==="active")
                  : null;
                // Single assigned site — locked display
                if (!isAdmin && assigned && assigned.length===1) {
                  return (
                    <div className="fi" style={{display:"flex",alignItems:"center",gap:8,background:"var(--s2)",cursor:"not-allowed",userSelect:"none"}}>
                      <span>📍</span>
                      <span style={{fontWeight:600,flex:1}}>{assigned[0].name}</span>
                      <span className="badge b-info" style={{fontSize:9}}>{assigned[0].type}</span>
                      <span className="mn tmu" style={{fontSize:9,marginLeft:4}}>Fixé par admin</span>
                    </div>
                  );
                }
                // Multiple assigned sites — dropdown restricted to those sites
                const options = assigned || sites;
                return (
                  <select className="fi" value={form.siteId} onChange={e=>set("siteId",e.target.value)}
                    disabled={!isAdmin&&!assigned&&authUser.siteId!=="all"}>
                    {options.map(s=>(
                      <option key={s.id} value={s.id}>{s.name} ({s.type}) — {s.region}</option>
                    ))}
                  </select>
                );
              })()}
            </div>
            <div className="field"><label>Horodatage (auto)</label>
              <input className="fi" readOnly value={new Date().toLocaleString("fr-DZ")}/>
            </div>
          </div>

          <hr className="dvdr" style={{margin:"2px 0"}}/>

          <div className="fg fg2">
            <div className="field">
              {opType==="collect"?(
                <>
                  <label>Camion EPWGCET</label>
                  <select className="fi" value={form.truck} onChange={e=>set("truck",e.target.value)}>
                    <option value="">-- Sélectionner un camion --</option>
                    {activeCompanyTrucks.map(t=>(
                      <option key={t.id} value={t.plate}>{t.plate}{t.label?` — ${t.label}`:""}{t.tare?` (tare: ${t.tare}t)`:""}</option>
                    ))}
                  </select>
                  {activeCompanyTrucks.length===0&&(
                    <div className="alrt ae" style={{marginTop:4,padding:"4px 8px",fontSize:10}}>
                      <span>⚠</span><span>Aucun camion actif — ajoutez des camions dans Paramètres → Flotte</span>
                    </div>
                  )}
                </>
              ):(
                <>
                  <label>N° Plaque / Scan QR 📷</label>
                  <input className="fi" placeholder="ex: 18-TRK-001" value={form.truck} onChange={e=>onTruck(e.target.value)}/>
                </>
              )}
            </div>
            <div className="field">
              {opType==="collect"?(
                <>
                  <label>Client (Collecte et Traitement)</label>
                  {(() => {
                    const selTruck = activeCompanyTrucks.find(t=>t.plate===form.truck);
                    if (selTruck && selTruck.tare && !form.tare) { setTimeout(()=>set("tare",String(selTruck.tare)),0); }
                    return null;
                  })()}
                  <select className="fi" value={form.clientId} onChange={e=>set("clientId",e.target.value)}>
                    <option value="">-- Sélectionner --</option>
                    {treatAndCollectClients.map(c=>(
                      <option key={c.id} value={c.id}>
                        {c.name} [{c.collectBillingMode==="rotation"?"Rotation":"Tonnage"}]
                      </option>
                    ))}
                  </select>
                  {treatAndCollectClients.length===0&&(
                    <div className="alrt ai" style={{marginTop:4,padding:"4px 8px",fontSize:10}}>
                      <span>ℹ️</span><span>Aucun client Collecte et Traitement pour ce site</span>
                    </div>
                  )}
                </>
              ):(
                <>
                  <label>
                    {mode==="convention"?"Client Convention Tonnes":mode==="rotation"?"Client Convention Rotation":mode==="credit"?"Client Crédit":"Client Cash"}
                    {mode==="cash"&&(
                      <span style={{marginLeft:8,cursor:"pointer",color:"var(--g)",fontSize:9}} onClick={()=>setNewCashModal(true)}>
                        + Nouveau client cash
                      </span>
                    )}
                  </label>
                  <select className="fi" value={form.clientId} onChange={e=>set("clientId",e.target.value)}>
                    <option value="">-- Sélectionner --</option>
                    {(mode==="convention"?approvedConvention:mode==="rotation"?approvedRotation:mode==="credit"?approvedCredit:mode==="prepaid"?approvedPrepaid:approvedCash).map(c=>(
                      <option key={c.id} value={c.id}>{c.name}{(mode==="convention"||mode==="rotation"||mode==="credit")?` [${c.clientType==="state"?"État":"Privé"}]`:""}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
          {/* Collect mode: billing info badge */}
          {opType==="collect"&&client&&(
            <div className="alrt ai" style={{padding:"6px 12px"}}>
              <span>🚛</span>
              <span style={{fontSize:11}}>
                Mode de facturation : <strong>{client.collectBillingMode==="rotation"?"Par rotation (prix fixe par passage)":"Au tonnage (prix/tonne)"}</strong>
              </span>
            </div>
          )}

          {hint&&(
            <div className="alrt ao" style={{marginBottom:0}}>
              <span>✅</span>
              <div><strong>Camion identifié :</strong> {hint.c?.name} · Tare: <strong>{hint.t.tare} t</strong> · Types autorisés: <strong>{hint.t.allowed.join(", ")}</strong></div>
            </div>
          )}
          {client&&(
            <div className={`alrt ${mode==="cash"?"aw":wouldExceed?"ae":"ao"}`} style={{marginBottom:0}}>
              <span>{mode==="cash"?"💵":mode==="prepaid"?"🎫":mode==="rotation"?"🔄":client.creditEnabled?"💳":isConvWithRotation&&convSubMode==="rotation"?"🔄":"📋"}</span>
              <div style={{flex:1}}>
                {mode==="cash"
                  ?<><strong>Client Cash :</strong> Paiement en espèces requis. La barrière restera fermée jusqu'à confirmation.</>
                  :mode==="prepaid"
                  ?<><strong>Client Bonus Prépayé :</strong> Solde consommé à chaque décharge.
                    <span style={{marginLeft:8,fontFamily:"var(--mono)",fontSize:11}}>
                      {fmt(client.consumed)} / {fmt(client.creditLimit)} DA
                    </span>
                    {wouldExceedCredit&&<div style={{color:"var(--err)",fontSize:11,marginTop:3}}>⚠ Solde prépayé insuffisant !</div>}
                  </>
                  :mode==="rotation"
                  ?<><strong>Client Convention Rotation ({client.payFrequency==="monthly"?"mensuelle":"annuelle"}) :</strong> Chaque décharge = 1 rotation.
                    {client.weightLimitYear>0&&(
                      <div style={{marginTop:4}}>
                        <div className="cbt" style={{height:4,marginBottom:3}}>
                          <div className="cbf" style={{width:`${Math.min(rotationPct,100)}%`,background:wouldExceedRotations?"var(--err)":rotationPct>80?"var(--warn)":"var(--g)"}}/>
                        </div>
                        <span style={{fontFamily:"var(--mono)",fontSize:11}}>
                          {usedRotations} / {client.weightLimitYear} rotations — {rotationPct}% utilisé
                        </span>
                        {wouldExceedRotations&&<span style={{color:"var(--err)",marginLeft:8,fontSize:11}}>⚠ Quota de rotations dépassé !</span>}
                      </div>
                    )}
                  </>
                  :client.creditEnabled
                  ?<><strong>Client Crédit (DA) :</strong> Décharge imputée au compte crédit.
                    <span style={{marginLeft:8,fontFamily:"var(--mono)",fontSize:11}}>
                      {fmt(client.consumed)} / {fmt(client.creditLimit)} DA
                    </span>
                    {wouldExceedCredit&&<div style={{color:"var(--err)",fontSize:11,marginTop:3}}>⚠ Limite de crédit dépassée ({creditPct(client)}% utilisé) !</div>}
                  </>
                  :<><strong>Client Convention Tonnes{isConvWithRotation&&convSubMode==="rotation"?" — Mode Rotation":""} ({client.payFrequency==="monthly"?"/mois":"/an"}) :</strong>{" "}
                    {isConvWithRotation&&convSubMode==="rotation"?"Chaque décharge = 1 rotation sur le quota autorisé.":"Décharge créditée au quota de tonnage."}
                    {isConvWithRotation&&convSubMode==="rotation"?(
                      <div style={{marginTop:4}}>
                        <div className="cbt" style={{height:4,marginBottom:3}}>
                          <div className="cbf" style={{width:`${Math.min(rotationConvPct,100)}%`,background:wouldExceedConvRot?"var(--err)":rotationConvPct>80?"var(--warn)":"var(--orange)"}}/>
                        </div>
                        <span style={{fontFamily:"var(--mono)",fontSize:11}}>
                          {usedConvRotations} / {client.rotationLimit} rotations — {rotationConvPct}% utilisé
                        </span>
                        {wouldExceedConvRot&&<span style={{color:"var(--err)",marginLeft:8,fontSize:11}}>⚠ Quota de rotations dépassé !</span>}
                      </div>
                    ):client.weightLimitYear>0&&(
                      <div style={{marginTop:4}}>
                        <div className="cbt" style={{height:4,marginBottom:3}}>
                          <div className="cbf" style={{width:`${Math.min(weightPct,100)}%`,background:wouldExceedWeight?"var(--err)":weightPct>80?"var(--warn)":"var(--g)"}}/>
                        </div>
                        <span style={{fontFamily:"var(--mono)",fontSize:11}}>
                          {fmtN(usedThisYear)} / {fmtN(client.weightLimitYear)} t — {weightPct}% utilisé
                        </span>
                        {wouldExceedWeight&&<span style={{color:"var(--err)",marginLeft:8,fontSize:11}}>⚠ Quota dépassé !</span>}
                      </div>
                    )}
                  </>}
              </div>
            </div>
          )}

          {/* Billing sub-mode toggle for convention clients with a rotation quota */}
          {isConvWithRotation&&(
            <div className="field" style={{marginTop:2}}>
              <label style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--muted)",textTransform:"uppercase",letterSpacing:".08em"}}>Mode de facturation pour cette décharge</label>
              <div className="seg" style={{marginTop:6}}>
                <button className={`seg-btn${convSubMode==="tonnage"?" active":""}`}
                  onClick={()=>setConvSubMode("tonnage")}>
                  ⚖️ Tonnage
                </button>
                <button className={`seg-btn${convSubMode==="rotation"?" active":""}`}
                  onClick={()=>setConvSubMode("rotation")}
                  style={convSubMode==="rotation"?{background:"var(--orange)",borderColor:"var(--orange)",color:"#fff"}:{}}>
                  🔄 Rotation ({usedConvRotations}/{client?.rotationLimit||0})
                </button>
              </div>
            </div>
          )}

          <hr className="dvdr" style={{margin:"2px 0"}}/>

          <div className="fg fg3">
            <div className="field"><label>Poids Brut (tonnes)</label>
              <input className="fi" type="number" step="0.1" min="0" placeholder="0.0" value={form.gross} onChange={e=>set("gross",e.target.value)}/>
            </div>
            <div className="field"><label>Tare (tonnes)</label>
              <input className="fi" type="number" step="0.1" min="0" placeholder="0.0" value={form.tare} onChange={e=>set("tare",e.target.value)}/>
            </div>
            <div className="field"><label>Poids Net = Brut − Tare</label>
              <div className="wb"><span className="wv">{fmtN(net)}</span><span className="wu">tonnes</span></div>
            </div>
          </div>

          <div className="field"><label>Type de Déchets</label>
            <select className="fi" value={form.wasteType} onChange={e=>set("wasteType",e.target.value)}>
              {validWasteTypes.map(w=><option key={w.id} value={w.id}>{w.label} — {fmt(w.price)}/t</option>)}
            </select>
          </div>

          {opType==="collect"?(
            (form.clientId&&form.truck)&&(
              <div className="cost-box" style={{borderColor:"var(--purple)"}}>
                <div className="cl">
                  <span className="clb">Mode</span>
                  <span className="clv" style={{color:"var(--purple)",fontWeight:700}}>
                    {isCollectRotation?"🔄 Collecte — Rotation":"⚖️ Collecte — Tonnage"}
                  </span>
                </div>
                {isCollectRotation?(
                  <>
                    <div className="cl"><span className="clb">Poids enregistré</span><span className="clv">{fmtN(net)} t</span></div>
                    <div className="cl ct" style={{borderColor:"var(--purple)"}}>
                      <span style={{fontSize:13,fontWeight:700,color:"var(--purple)"}}>Prix par passage</span>
                      <span className="ctv" style={{color:"var(--purple)",fontFamily:"var(--mono)"}}>{fmt(wt?.collectRotationPrice??0)}</span>
                    </div>
                  </>
                ):(
                  net>0&&(
                    <>
                      <div className="cl"><span className="clb">Poids net</span><span className="clv">{fmtN(net)} t</span></div>
                      <div className="cl"><span className="clb">Tarif collecte ({wt?.label})</span><span className="clv">{fmt(wt?.collectPrice??0)} / t</span></div>
                      <div className="cl ct" style={{borderColor:"var(--purple)"}}>
                        <span style={{fontSize:13,fontWeight:700,color:"var(--purple)"}}>Coût Total</span>
                        <span className="ctv" style={{color:"var(--purple)"}}>{fmt(collectTotal)}</span>
                      </div>
                    </>
                  )
                )}
              </div>
            )
          ):(mode==="rotation"||(isConvWithRotation&&convSubMode==="rotation"))?(
            net>0&&(
              <div className="cost-box" style={{borderColor:"var(--orange)"}}>
                <div className="cl"><span className="clb">Poids enregistré</span><span className="clv">{fmtN(net)} t</span></div>
                <div className="cl ct" style={{borderColor:"var(--orange)"}}>
                  <span style={{fontSize:13,fontWeight:700,color:"var(--orange)"}}>Rotations comptabilisées</span>
                  <span className="ctv" style={{color:"var(--orange)",fontFamily:"var(--mono)"}}>+1 rotation</span>
                </div>
                {mode==="rotation"&&client&&client.weightLimitYear>0&&(
                  <div className="cl" style={{marginTop:6}}>
                    <span className="clb">Après cette rotation</span>
                    <span className="clv" style={{color:wouldExceedRotations?"var(--err)":"var(--g)",fontFamily:"var(--mono)"}}>
                      {usedRotations+1} / {client.weightLimitYear} rotations
                    </span>
                  </div>
                )}
                {isConvWithRotation&&convSubMode==="rotation"&&client&&client.rotationLimit>0&&(
                  <div className="cl" style={{marginTop:6}}>
                    <span className="clb">Après cette rotation</span>
                    <span className="clv" style={{color:wouldExceedConvRot?"var(--err)":"var(--g)",fontFamily:"var(--mono)"}}>
                      {usedConvRotations+1} / {client.rotationLimit} rotations
                    </span>
                  </div>
                )}
              </div>
            )
          ):(
            net>0&&wt&&(
              <div className="cost-box">
                <div className="cl"><span className="clb">Poids net facturé</span><span className="clv">{fmtN(net)} t</span></div>
                <div className="cl"><span className="clb">Tarif ({wt.label})</span><span className="clv">{fmt(wt.price)} / t</span></div>
                <div className="cl ct">
                  <span style={{fontSize:13,fontWeight:700}}>Coût Total</span>
                  <span className="ctv">{fmt(total)}</span>
                </div>
                {isOnAccount&&client&&(
                  <div className="cl" style={{marginTop:6}}>
                    <span className="clb">Solde après décharge</span>
                    <span className="clv" style={{color:wouldExceed?"var(--err)":"var(--g)"}}>
                      {fmt(client.consumed+total)} / {fmt(client.creditLimit)}
                    </span>
                  </div>
                )}
              </div>
            )
          )}

          {limitBlocked&&(
            <div className="alrt ae" style={{marginBottom:0}}>
              <span>🚫</span>
              <div>
                <strong>ENTRÉE BLOQUÉE —</strong>{" "}
                {wouldExceedCredit
                  ?"Le plafond de crédit DA de ce client est atteint. Contactez l'administrateur."
                  :wouldExceedRotations
                  ?"Le quota de rotations de ce client est atteint. Contactez l'administrateur."
                  :"Le quota de tonnage de ce client est atteint. Contactez l'administrateur."}
              </div>
            </div>
          )}
          <button className="btn bp bfw"
            style={{fontSize:15,padding:12,opacity:limitBlocked?.45:1,cursor:limitBlocked?"not-allowed":"pointer",
              ...(opType==="collect"?{background:"var(--purple)",borderColor:"var(--purple)"}:
                  isConvWithRotation&&convSubMode==="rotation"?{background:"var(--orange)",borderColor:"var(--orange)"}:{})}}
            disabled={!canSubmit||limitBlocked}
            onClick={()=>{
              if (opType==="collect") { finalise(""); return; }
              if (mode==="cash") { setPayModal(true); return; }
              finalise(isConvWithRotation&&convSubMode==="rotation"?"rotation":mode);
            }}>
            {limitBlocked?"🚫 Entrée bloquée — Limite atteinte"
              :opType==="collect"?(isCollectRotation?"🚛 Enregistrer Collecte (Rotation) & Ouvrir Barrière →":"🚛 Enregistrer Collecte (Tonnage) & Ouvrir Barrière →")
              :mode==="cash"?"💵 Procéder au Paiement Cash →"
              :mode==="prepaid"?"🎫 Consommer Bonus & Ouvrir Barrière →"
              :mode==="rotation"?"🔄 Enregistrer Rotation & Ouvrir Barrière →"
              :isConvWithRotation&&convSubMode==="rotation"?"🔄 Enregistrer Rotation (Convention) & Ouvrir Barrière →"
              :"📋 Enregistrer Convention & Ouvrir Barrière →"}
          </button>
        </div>
      </div>

      {/* Cash Payment Modal */}
      {payModal&&(
        <div className="ov">
          <div className="modal">
            <div className="mh">
              <span className="mh-title">💵 Paiement Cash Requis</span>
              <button className="btn bg bsm" onClick={()=>setPayModal(false)}>✕</button>
            </div>
            <div className="mb2">
              <div className="alrt ae mb4"><span>🚧</span><strong>BARRIÈRE FERMÉE — En attente de paiement</strong></div>
              <div className="cost-box mb4">
                <div className="cl"><span className="clb">Client</span><span className="clv mn">{client?.name}</span></div>
                <div className="cl"><span className="clb">Camion</span><span className="clv mn">{form.truck}</span></div>
                <div className="cl"><span className="clb">Calcul</span><span className="clv">{fmtN(net)} t × {fmt(wt?.price||0)}</span></div>
                <div className="cl ct"><span style={{fontWeight:700}}>MONTANT DÛ</span><span className="ctv">{fmt(total)}</span></div>
              </div>
              <div className="card mb3" style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontWeight:700,marginBottom:4}}>Mode de règlement :</div>
                <label className="fx aic g2" style={{cursor:"pointer"}}><input type="radio" name="pm" defaultChecked/> 💵 Espèces</label>
                <label className="fx aic g2" style={{cursor:"pointer",opacity:.45}}><input type="radio" name="pm" disabled/> 💳 TPE Terminal (bientôt)</label>
                <label className="fx aic g2" style={{cursor:"pointer",opacity:.45}}><input type="radio" name="pm" disabled/> 📱 E-Paiement QR (bientôt)</label>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",
                background:"rgba(46,201,92,.08)",border:"1px solid rgba(46,201,92,.2)",borderRadius:8,padding:"12px 14px"}}>
                <input type="checkbox" checked={cashConf} onChange={e=>setCashConf(e.target.checked)}/>
                <span style={{fontWeight:600}}>✅ Confirmer la réception du montant en espèces</span>
              </label>
            </div>
            <div className="mf">
              <button className="btn bg" onClick={()=>setPayModal(false)}>Annuler</button>
              <button className="btn bp" disabled={!cashConf} onClick={()=>finalise("cash")}>🟢 Valider & Ouvrir Barrière</button>
            </div>
          </div>
        </div>
      )}

      {/* New Cash Client Modal */}
      {newCashModal&&(
        <div className="ov">
          <div className="modal">
            <div className="mh">
              <span className="mh-title">➕ Nouveau Client Cash</span>
              <button className="btn bg bsm" onClick={()=>setNewCashModal(false)}>✕</button>
            </div>
            <div className="mb2">
              <div className="alrt ai mb3" style={{marginBottom:16}}>
                <span>ℹ️</span>
                <span style={{fontSize:11}}>Enregistrement rapide d'un client payant en espèces. Ce client sera disponible pour les futures saisies.</span>
              </div>
              <div className="fg" style={{gap:12}}>
                <div className="field"><label>Nom complet / Raison sociale *</label>
                  <input className="fi" placeholder="Nom du client ou entreprise" value={cashForm.name} onChange={e=>setCashForm(f=>({...f,name:e.target.value}))}/>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>N° CIN / NIF *</label>
                    <input className="fi" placeholder="ex: 18-123456789" value={cashForm.nif} onChange={e=>setCashForm(f=>({...f,nif:e.target.value}))}/>
                  </div>
                  <div className="field"><label>Téléphone</label>
                    <input className="fi" placeholder="0770 00 00 00" value={cashForm.phone} onChange={e=>setCashForm(f=>({...f,phone:e.target.value}))}/>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>N° Plaque (optionnel)</label>
                    <input className="fi" placeholder="18-XXX-000" value={cashForm.truck} onChange={e=>setCashForm(f=>({...f,truck:e.target.value}))}/>
                  </div>
                  <div className="field"><label>Tare (t, optionnel)</label>
                    <input className="fi" type="number" step="0.1" placeholder="0.0" value={cashForm.tare} onChange={e=>setCashForm(f=>({...f,tare:e.target.value}))}/>
                  </div>
                </div>
              </div>
            </div>
            <div className="mf">
              <button className="btn bg" onClick={()=>setNewCashModal(false)}>Annuler</button>
              <button className="btn bp" disabled={!cashForm.name||!cashForm.nif} onClick={handleAddCashClient}>
                ✓ Enregistrer le client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DISCHARGES HISTORY
═══════════════════════════════════════════════════════════════════════════ */
function PageDischarges({discharges,setDischarges,sites,wasteTypes,users,clients,updateClient,updateDischarge,isAdmin,authUser,company}) {
  const opSiteId = (!isAdmin && authUser?.siteId && authUser.siteId!=="all") ? authUser.siteId : null;
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [siteF,   setSiteF]   = useState(opSiteId||"all");
  const [dateFrom,setDateFrom] = useState("");
  const [dateTo,  setDateTo]   = useState("");
  const [selD,    setSelD]     = useState(null); // selected flagged discharge
  const [action,  setAction]  = useState("extend"); // "extend" | "settle"
  const [newLimit,setNewLimit] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  // Edit discharge state (admin only)
  const [editD,   setEditD]   = useState(null);
  const [printD,  setPrintD]  = useState(null);
  const openEdit = d => setEditD({...d});
  const setE = (k,v) => setEditD(f=>({...f,[k]:v}));

  const exportCSV = () => {
    const headers = ["ID","Date/Heure","Site","Camion","Client","Type déchets","Poids brut (t)","Tare (t)","Poids net (t)","Tarif (DA/t)","Total (DA)","Mode paiement","Statut","Opérateur"];
    const esc = v => `"${String(v??'').replace(/"/g,'""')}"`;
    const rows = filtered.map(d=>[
      d.id,
      fmtTs(d.ts),
      sites.find(s=>s.id===d.siteId)?.name||d.siteId,
      d.truck,
      d.clientName,
      wasteTypes.find(w=>w.id===d.wasteType)?.label||d.wasteType,
      d.gross.toFixed(3),
      d.tare.toFixed(3),
      d.net.toFixed(3),
      d.unitPrice.toFixed(2),
      d.total.toFixed(2),
      d.payMethod==="cash"?"Espèces":d.payMethod==="convention"?"Convention":d.payMethod==="prepaid"?"Prépayé":d.payMethod,
      d.status==="ok"?"OK":d.status==="paid"?"Payé":d.status==="settled"?"Réglé":d.status==="flagged"?"Alerte":d.status==="cancelled"?"Annulé":d.status,
      users.find(u=>u.id===d.opId)?.name||d.opId||"",
    ].map(esc).join(","));
    const csv = "\uFEFF" + [headers.map(esc).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0,10);
    a.href = url; a.download = `EPWGCET-dechargements-${dateStr}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };
  const doEdit = async () => {
    const gross = parseFloat(editD.gross)||0;
    const tare  = parseFloat(editD.tare)||0;
    const net   = Math.max(0, gross-tare);
    const wt    = wasteTypes.find(w=>w.id===editD.wasteType);
    const total = net * (wt?.price||0);
    const updated = {...editD, gross, tare, net, total, unitPrice:wt?.price||0};
    await updateDischarge(updated);
    setEditD(null);
  };

  const filtered = discharges.filter(d=>{
    const mf  = filter==="all"||d.status===filter||d.payMethod===filter;
    const ms  = !search||d.truck.includes(search.toUpperCase())||d.clientName.toLowerCase().includes(search.toLowerCase());
    const msf = opSiteId ? d.siteId===opSiteId : (siteF==="all"||d.siteId===siteF);
    const dts = d.ts.slice(0,10);
    const mdf = (!dateFrom || dts >= dateFrom) && (!dateTo || dts <= dateTo);
    return mf&&ms&&msf&&mdf;
  });
  const totalFiltered = filtered.reduce((s,d)=>s+d.total,0);
  const tonsFiltered  = filtered.filter(d=>d.payMethod!=="rotation").reduce((s,d)=>s+d.net,0);
  const flaggedCount  = discharges.filter(d=>d.status==="flagged").length;

  const openResolve = d => {
    const c = clients.find(c=>c.id===d.clientId);
    setSelD({...d, client:c});
    setNewLimit(String(c?.creditLimit||0));
    setResolveNote("");
    setAction("extend");
  };

  const handleResolve = async () => {
    if (!selD) return;
    await fetch(`/api/discharges/${selD.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:"settled"})});
    setDischarges(p=>p.map(d=>d.id===selD.id?{...d,status:"settled"}:d));
    if (action==="extend" && selD.client) {
      const limit = parseInt(newLimit)||selD.client.creditLimit;
      updateClient({...selD.client, creditLimit:limit});
    }
    setSelD(null);
  };

  return (
    <>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
        <input className="fi" style={{width:200}} placeholder="🔍 Camion ou client..." value={search} onChange={e=>setSearch(e.target.value)}/>
        {opSiteId ? (
          <span className="badge b-info" style={{padding:"6px 12px",fontSize:11}}>
            🏭 {sites.find(s=>s.id===opSiteId)?.name||opSiteId}
          </span>
        ) : (
          <select className="fi" style={{width:160}} value={siteF} onChange={e=>setSiteF(e.target.value)}>
            <option value="all">Tous les sites</option>
            {sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {/* Date range */}
        <div className="field" style={{margin:0}}>
          <label style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".12em"}}>Du</label>
          <input className="fi" type="date" style={{width:140}} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
        </div>
        <div className="field" style={{margin:0}}>
          <label style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".12em"}}>Au</label>
          <input className="fi" type="date" style={{width:140}} value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
        </div>
        {(dateFrom||dateTo)&&(
          <button className="btn bg bsm" style={{alignSelf:"flex-end"}} onClick={()=>{setDateFrom("");setDateTo("");}}>✕ Reset</button>
        )}
        <div className="fx aic g2" style={{alignSelf:"flex-end"}}>
          {[["all","Tous"],["paid","Cash"],["settled","Convention"],["flagged",`⚠ Alertes${flaggedCount>0?` (${flaggedCount})`:""}`]].map(([f,l])=>(
            <button key={f} className={`btn bsm ${filter===f?f==="flagged"?"bw":"bp":"bg"}`} onClick={()=>setFilter(f)}>{l}</button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"flex-end",gap:10}}>
          <div style={{textAlign:"right"}}>
            <div className="mn tsm tg">{fmt(totalFiltered)}</div>
            <div className="tsm tmu">{filtered.length} entrées · {fmtN(tonsFiltered)} t</div>
          </div>
          <button className="btn bg bsm" onClick={exportCSV} disabled={filtered.length===0}
            title="Exporter en CSV (Excel)" style={{whiteSpace:"nowrap"}}>
            📥 Exporter CSV
          </button>
        </div>
      </div>

      {flaggedCount>0&&filter!=="flagged"&&(
        <div className="alrt ae mb4" style={{cursor:"pointer"}} onClick={()=>setFilter("flagged")}>
          <span style={{fontSize:18}}>🚨</span>
          <div>
            <strong>{flaggedCount} déchargement(s) nécessitent une régularisation de crédit</strong>
            <div className="mt1" style={{fontSize:11}}>Cliquez pour afficher · Bouton "Régulariser" disponible sur chaque ligne</div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Date/Heure</th><th>Site</th><th>Camion</th><th>Client</th>
                <th>Type</th><th>Net(t)</th><th>Tarif</th><th>Total</th><th>Mode</th><th>Statut</th><th>Op.</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length===0?(
                <tr>
                  <td colSpan={13} style={{textAlign:"center",padding:40}}>
                    <div style={{fontSize:32,marginBottom:8}}>📭</div>
                    <div style={{color:"var(--muted)"}}>Aucune entrée</div>
                    <div style={{color:"var(--dim)",fontSize:11,marginTop:4}}>Les déchargements enregistrés apparaîtront ici</div>
                  </td>
                </tr>
              ):filtered.map(d=>{
                const wt = wasteTypes.find(w=>w.id===d.wasteType);
                const op = users.find(u=>u.id===d.opId);
                const isFlagged = d.status==="flagged";
                return (
                  <tr key={d.id} className={isFlagged?"flagged-row":""}>
                    <td><span className="mn tmu">{d.id}</span></td>
                    <td><span className="mn">{fmtTs(d.ts)}</span></td>
                    <td><span className="badge b-info">{d.siteId}</span></td>
                    <td><span className="mn">{d.truck}</span></td>
                    <td style={{maxWidth:140}} className="truncate">
                      {isFlagged&&<span style={{color:"var(--err)",marginRight:5}}>⚠</span>}
                      {d.clientName}
                    </td>
                    <td><span className="badge b-purple">{wt?.label.split(" ")[0]}</span></td>
                    <td><span className="mn">{fmtN(d.net)}</span></td>
                    <td><span className="mn tmu">{d.payMethod==="rotation"?"—":fmt(d.unitPrice)}</span></td>
                    <td>{d.payMethod==="rotation"
                      ?<span className="mn fw7" style={{color:"var(--orange)"}}>1 rot.</span>
                      :<span className="mn tg fw7">{fmt(d.total)}</span>}</td>
                    <td>{d.payMethod==="cash"?<span className="badge b-cash">💵 Cash</span>:d.payMethod==="rotation"?<span className="badge" style={{background:"rgba(251,146,60,.12)",color:"var(--orange)",border:"1px solid rgba(251,146,60,.3)"}}>🔄 Rotation</span>:<span className="badge b-info">📋 Conv.</span>}</td>
                    <td><StatusBadge s={d.status}/></td>
                    <td><span className="mn tmu" style={{fontSize:10}}>{op?.name.split(" ")[0]||"—"}</span></td>
                    <td>
                      <div className="fx aic g2">
                        {isFlagged&&(
                          <button className="btn bw bsm" onClick={()=>openResolve(d)}
                            style={{fontSize:10,padding:"4px 10px"}}>
                            ⚡ Régul.
                          </button>
                        )}
                        {isAdmin&&(
                          <button className="btn bg bsm" onClick={()=>openEdit(d)}
                            style={{fontSize:10,padding:"4px 10px"}}>
                            ✏️ Corriger
                          </button>
                        )}
                        <button className="btn bg bsm" onClick={()=>setPrintD(d)}
                          title="Imprimer le ticket" style={{fontSize:11,padding:"4px 8px"}}>
                          🖨️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve flagged modal */}
      {selD&&(
        <div className="ov">
          <div className="modal">
            <div className="mh">
              <span className="mh-title">⚡ Régularisation — Dépassement crédit</span>
              <button className="btn bg bsm" onClick={()=>setSelD(null)}>✕</button>
            </div>
            <div className="mb2">
              <div className="alrt ae mb3" style={{marginBottom:16}}>
                <span>⚠</span>
                <div>
                  <strong>Dépassement détecté pour {selD.clientName}</strong>
                  <div style={{marginTop:4,fontSize:11}}>
                    Décharge #{selD.id} · {fmt(selD.total)} · {fmtTs(selD.ts)}
                  </div>
                </div>
              </div>

              {selD.client&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
                  {[
                    ["Limite actuelle", fmt(selD.client.creditLimit), "var(--muted)"],
                    ["Montant consommé", fmt(selD.client.consumed), "var(--err)"],
                    ["Dépassement",     fmt(Math.max(0,selD.client.consumed-selD.client.creditLimit)), "var(--err)"],
                  ].map(([l,v,col])=>(
                    <div key={l} className="card-sm" style={{textAlign:"center",borderTop:`2px solid ${col}`}}>
                      <div style={{fontSize:9,fontFamily:"var(--mono)",color:"var(--muted)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:4}}>{l}</div>
                      <div style={{fontFamily:"var(--head)",fontSize:15,fontWeight:800,color:col}}>{v}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{fontWeight:700,marginBottom:12,fontSize:13}}>Choisir une action de régularisation :</div>
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
                {[
                  {val:"extend", ic:"📈", title:"Étendre la limite de crédit", desc:"Augmenter la limite autorisée du client pour couvrir ce dépassement."},
                  {val:"settle", ic:"✅", title:"Marquer comme réglé (exception)", desc:"Valider le dépassement ponctuellement sans modifier la limite. À utiliser si l'accord est déjà donné."},
                ].map(opt=>(
                  <label key={opt.val} style={{
                    display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer",
                    padding:"12px 14px",borderRadius:9,
                    border:`1px solid ${action===opt.val?"rgba(41,196,84,.4)":"var(--bdr)"}`,
                    background:action===opt.val?"rgba(41,196,84,.06)":"var(--s2)",
                    transition:"all .15s",
                  }}>
                    <input type="radio" name="resolve-action" value={opt.val}
                      checked={action===opt.val} onChange={()=>setAction(opt.val)}
                      style={{marginTop:3,accentColor:"var(--g)"}}/>
                    <div>
                      <div style={{fontWeight:700,fontSize:13}}>{opt.ic} {opt.title}</div>
                      <div style={{fontSize:11,color:"var(--muted)",marginTop:3,lineHeight:1.5}}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {action==="extend"&&(
                <div className="field">
                  <label>Nouvelle limite de crédit (DA)</label>
                  <input className="fi" type="number" value={newLimit}
                    onChange={e=>setNewLimit(e.target.value)}
                    placeholder={`Actuelle: ${selD.client?.creditLimit||0}`}/>
                  {parseInt(newLimit)>0&&selD.client&&(
                    <div style={{fontSize:11,color:"var(--g)",marginTop:4,fontFamily:"var(--mono)"}}>
                      Augmentation: +{fmt(parseInt(newLimit)-(selD.client?.creditLimit||0))}
                    </div>
                  )}
                </div>
              )}

              <div className="field mt3" style={{marginTop:14}}>
                <label>Note de régularisation (optionnel)</label>
                <textarea className="fi" value={resolveNote} onChange={e=>setResolveNote(e.target.value)}
                  placeholder="Ex: Accord du directeur du 14/07/2025, extension exceptionnelle..."/>
              </div>
            </div>
            <div className="mf">
              <button className="btn bg" onClick={()=>setSelD(null)}>Annuler</button>
              <button className="btn bp" onClick={handleResolve}>
                ✓ Confirmer la régularisation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print discharge ticket modal */}
      {printD&&(
        <div className="ov" onClick={()=>setPrintD(null)}>
          <div onClick={e=>e.stopPropagation()} style={{maxWidth:400,width:"100%"}}>
            <div className="rcpt-print-area">
              <div className="rcpt">
                <div className="rh">
                  <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:6}}><img src="/logo.png" alt="EPWGCET" style={{width:24,height:24,objectFit:"contain"}}/>{cof(company,'short')}</div>
                  <div className="tmu" style={{marginTop:3,fontSize:11,lineHeight:1.5}}>
                    {sites.find(s=>s.id===printD.siteId)?.name} — {sites.find(s=>s.id===printD.siteId)?.region}
                  </div>
                  <div className="tmu" style={{fontSize:10,marginTop:2}}>{fmtTs(printD.ts)} · #{printD.id}</div>
                </div>
                {[
                  ["Client",         printD.clientName],
                  ...(clients.find(c=>c.id===printD.clientId)?.nif
                    ? [["N° NIF", clients.find(c=>c.id===printD.clientId).nif]] : []),
                  ["Camion",         printD.truck],
                  ["Type déchets",   wasteTypes.find(w=>w.id===printD.wasteType)?.label||printD.wasteType],
                  ["Poids brut",     fmtN(printD.gross)+" t"],
                  ["Tare",           fmtN(printD.tare)+" t"],
                  ["Poids net",      fmtN(printD.net)+" t"],
                  ["Tarif unitaire", fmt(printD.unitPrice)+"/t"],
                  ["Mode paiement",  printD.payMethod==="cash"?"Espèces":printD.payMethod==="convention"?"Convention mensuelle":printD.payMethod==="prepaid"?"Prépayé":"Convention"],
                  ["Opérateur",      users.find(u=>u.id===printD.opId)?.name||printD.opId||"—"],
                ].map(([l,v])=>(
                  <div key={l} className="rr"><span>{l}</span><span style={{fontWeight:600}}>{v}</span></div>
                ))}
                <div className="rrttl"><span>TOTAL</span><span>{fmt(printD.total)}</span></div>
                <div style={{textAlign:"center",marginTop:14,fontSize:10,color:"var(--muted)",lineHeight:1.7}}>
                  <StatusBadge s={printD.status}/><br/>
                  {cof(company,'name')}<br/>
                  {cof(company,'address')}<br/>
                  Tél : {cof(company,'phone')}
                </div>
              </div>
              <div className="rcpt-actions fx g3 mt4">
                <button className="btn bg" style={{flex:1}} onClick={()=>setPrintD(null)}>✕ Fermer</button>
                <button className="btn bi" style={{flex:1}} onClick={()=>window.print()}>🖨️ Imprimer / PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit discharge modal (admin only) */}
      {editD&&(
        <div className="ov">
          <div className="modal modal-lg">
            <div className="mh">
              <span className="mh-title">✏️ Correction — Déchargement #{editD.id}</span>
              <button className="btn bg bsm" onClick={()=>setEditD(null)}>✕</button>
            </div>
            <div className="mb2">
              <div className="alrt ai mb3" style={{marginBottom:16}}>
                <span>ℹ️</span><span style={{fontSize:11}}>Correction administrative uniquement. Toute modification recalcule automatiquement le net et le montant.</span>
              </div>
              <div className="fg" style={{gap:14}}>
                <div className="fg fg2">
                  <div className="field"><label>Date / Heure</label>
                    <input className="fi" type="datetime-local" value={editD.ts} onChange={e=>setE("ts",e.target.value)}/>
                  </div>
                  <div className="field"><label>Site</label>
                    <select className="fi" value={editD.siteId} onChange={e=>setE("siteId",e.target.value)}>
                      {sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>N° Camion</label>
                    <input className="fi" value={editD.truck} onChange={e=>setE("truck",e.target.value.toUpperCase())}/>
                  </div>
                  <div className="field"><label>Type de Déchets</label>
                    <select className="fi" value={editD.wasteType} onChange={e=>setE("wasteType",e.target.value)}>
                      {wasteTypes.map(w=><option key={w.id} value={w.id}>{w.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="fg fg3">
                  <div className="field"><label>Poids Brut (t)</label>
                    <input className="fi" type="number" step="0.1" value={editD.gross} onChange={e=>setE("gross",e.target.value)}/>
                  </div>
                  <div className="field"><label>Tare (t)</label>
                    <input className="fi" type="number" step="0.1" value={editD.tare} onChange={e=>setE("tare",e.target.value)}/>
                  </div>
                  <div className="field"><label>Net calculé (t)</label>
                    <div className="fi" style={{background:"var(--s3)",cursor:"default",color:"var(--g)",fontWeight:700}}>
                      {fmtN(Math.max(0,(parseFloat(editD.gross)||0)-(parseFloat(editD.tare)||0)))} t
                    </div>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>Mode de Paiement</label>
                    <select className="fi" value={editD.payMethod} onChange={e=>setE("payMethod",e.target.value)}>
                      <option value="convention">📋 Convention</option>
                      <option value="credit">💳 Crédit</option>
                      <option value="prepaid">🎫 Bonus Prépayé</option>
                      <option value="cash">💵 Cash</option>
                    </select>
                  </div>
                  <div className="field"><label>Statut</label>
                    <select className="fi" value={editD.status} onChange={e=>setE("status",e.target.value)}>
                      <option value="settled">Réglé</option>
                      <option value="paid">Payé</option>
                      <option value="flagged">Flaggé</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </div>
                </div>
                <div className="field"><label>Motif de la correction *</label>
                  <textarea className="fi" value={editD.correctionReason||""} onChange={e=>setE("correctionReason",e.target.value)}
                    placeholder="Ex: Erreur de saisie du poids brut, correction suite à re-pesée..." rows={2}/>
                </div>
              </div>
            </div>
            <div className="mf">
              <button className="btn bg" onClick={()=>setEditD(null)}>Annuler</button>
              <button className="btn bp" disabled={!editD.correctionReason} onClick={doEdit}>✓ Enregistrer la correction</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CLIENTS
═══════════════════════════════════════════════════════════════════════════ */
function PageClients({clients,discharges,updateClient,addClient,deleteClient,isAdmin,docTypes,sites}) {
  const [tab,   setTab]   = useState("convention");
  const [sel,   setSel]   = useState(null);
  const [modal, setModal] = useState(false);
  const [note,  setNote]  = useState("");
  const [creditInput, setCreditInput] = useState("");
  const [addForm, setAddForm] = useState({name:"",clientType:"private",phone:"",address:"",nif:"",rc:"",note:"",vatSubject:false,assignedSites:[]});
  const [editClientForm, setEditClientForm] = useState(null);
  const [prepaidForm, setPrepaidForm] = useState({name:"",phone:"",address:"",balance:"",note:"",vatSubject:false,assignedSites:[]});

  const convClients     = clients.filter(c=>c.type==="convention");
  const rotationClients = clients.filter(c=>c.type==="rotation");
  const prepaidClients  = clients.filter(c=>c.type==="prepaid");
  const cashClients     = clients.filter(c=>c.type==="daily");
  const c = clients.find(c=>c.id===sel);
  const cd = sel ? discharges.filter(d=>d.clientId===sel) : [];

  const [approveMode, setApproveMode] = useState("weight"); // "weight" | "credit" | "rotation"
  const [weightInput, setWeightInput] = useState("");
  const [rotationInput, setRotationInput] = useState("");
  const [quotaPeriod, setQuotaPeriod] = useState("year"); // "year" | "month"
  const [addRotForm, setAddRotForm] = useState({name:"",clientType:"private",phone:"",address:"",nif:"",rc:"",payFrequency:"monthly",note:"",vatSubject:false,assignedSites:[]});

  const doApprove = () => {
    const isCreditMode   = approveMode==="credit";
    const isRotationMode = approveMode==="rotation";
    updateClient({
      ...c, status:"approved", note,
      creditEnabled: isCreditMode,
      creditLimit: isCreditMode ? (parseFloat(creditInput)||0) : 0,
      weightLimitYear: isCreditMode ? 0 : isRotationMode ? (parseInt(rotationInput)||0) : (parseFloat(weightInput)||0),
      payFrequency: isCreditMode ? (c.payFrequency||"monthly") : (quotaPeriod==="month" ? "monthly" : "annual"),
    });
    setModal(false); setNote(""); setCreditInput(""); setWeightInput(""); setRotationInput("");
  };
  const doReject = () => {
    updateClient({...c, status:"rejected", note});
    setModal(false); setNote("");
  };
  const doAddClient = () => {
    if (!addForm.name) return;
    const nc = {
      id:uidC(), name:addForm.name, clientType:addForm.clientType, type:"convention",
      status:"pending_docs", creditLimit:0, consumed:0,
      payFrequency:addForm.payFrequency||"monthly", payInstrument:addForm.payInstrument||"cheque",
      phone:addForm.phone, address:addForm.address, nif:addForm.nif, rc:addForm.rc,
      docs:[], note:addForm.note, vatSubject:addForm.vatSubject||false,
      assignedSites:addForm.assignedSites||[],
    };
    addClient(nc);
    setModal(false);
    setAddForm({name:"",clientType:"private",payFrequency:"monthly",payInstrument:"cheque",phone:"",address:"",nif:"",rc:"",note:"",vatSubject:false,assignedSites:[]});
  };

  const doAddRotationClient = () => {
    if (!addRotForm.name) return;
    const nc = {
      id:uidC(), name:addRotForm.name, clientType:addRotForm.clientType, type:"rotation",
      status:"pending_docs", creditLimit:0, consumed:0, weightLimitYear:0,
      payFrequency:addRotForm.payFrequency||"monthly", payInstrument:"cheque",
      phone:addRotForm.phone, address:addRotForm.address, nif:addRotForm.nif, rc:addRotForm.rc,
      docs:[], note:addRotForm.note, vatSubject:addRotForm.vatSubject||false,
      assignedSites:addRotForm.assignedSites||[],
    };
    addClient(nc);
    setModal(false);
    setAddRotForm({name:"",clientType:"private",phone:"",address:"",nif:"",rc:"",payFrequency:"monthly",note:"",vatSubject:false,assignedSites:[]});
  };

  const doPrepaidAdd = () => {
    if (!prepaidForm.name) return;
    const nc = {
      id:uidC(), name:prepaidForm.name, clientType:"private", type:"prepaid", status:"approved",
      creditLimit:parseFloat(prepaidForm.balance)||0, consumed:0,
      phone:prepaidForm.phone, address:prepaidForm.address, nif:"", rc:"", docs:[], note:prepaidForm.note,
      vatSubject:prepaidForm.vatSubject||false,
      assignedSites:prepaidForm.assignedSites||[],
    };
    addClient(nc);
    setModal(false);
    setPrepaidForm({name:"",phone:"",address:"",balance:"",note:"",vatSubject:false,assignedSites:[]});
  };

  const doEditClient = () => {
    if (!editClientForm) return;
    updateClient({...editClientForm});
    setModal(false);
    setEditClientForm(null);
  };

  const requiredDocs = c
    ? (c.clientType==="state" ? (docTypes?.state||REQUIRED_DOCS_STATE)
      : (docTypes?.private||REQUIRED_DOCS_PRIVATE))
    : [];

  const toggleDoc = (doc) => {
    if (!c) return;
    const already = c.docs.includes(doc);
    const newDocs = already ? c.docs.filter(d=>d!==doc) : [...c.docs, doc];
    updateClient({...c, docs: newDocs});
  };

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const doDeleteClient = async (id) => {
    await deleteClient(id);
    setSel(null);
    setDeleteConfirm(null);
  };

  return (
    <>
      <div className="fx aic jsb mb4">
        <div className="tabs" style={{margin:0}}>
          {[["convention","Convention Tonnes"],["rotation","🔄 Conv. Rotation"],["prepaid","Bonus Prépayé"],["cash","Cash"]].map(([t,l])=>(
            <button key={t} className={`tab${tab===t?" active":""}`} onClick={()=>{setTab(t);setSel(null);}}>{l}</button>
          ))}
        </div>
        <div className="fx aic g2">
          {tab==="convention"&&(
            <button className="btn bp bsm" onClick={()=>setModal("add_client")}>➕<span className="btn-lbl"> Nouveau client convention</span></button>
          )}
          {tab==="rotation"&&(
            <button className="btn bp bsm" style={{background:"var(--orange)",borderColor:"var(--orange)"}} onClick={()=>setModal("add_rotation")}>➕<span className="btn-lbl"> Nouveau client rotations</span></button>
          )}
          {tab==="prepaid"&&(
            <button className="btn bp bsm" onClick={()=>setModal("add_prepaid")}>➕<span className="btn-lbl"> Nouveau client prépayé</span></button>
          )}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16}}>
        <div className="panel" style={{height:"fit-content"}}>
          <div className="ph">
            <span className="pt">{tab==="convention"?"Institutions Convention Tonnes":tab==="rotation"?"Conventions par Rotation":tab==="prepaid"?"Bonus Prépayé":"Clients Cash"}</span>
            <span className="mn tsm tmu">{(tab==="convention"?convClients:tab==="rotation"?rotationClients:tab==="prepaid"?prepaidClients:cashClients).length}</span>
          </div>
          <div style={{padding:"10px 10px",display:"flex",flexDirection:"column",gap:5}}>
            {(tab==="convention"?convClients:tab==="rotation"?rotationClients:tab==="prepaid"?prepaidClients:cashClients).map(cl=>{
              const isRotTab = tab==="rotation";
              const isAccountType = tab==="convention"||tab==="rotation"||tab==="prepaid";
              const now2 = new Date();
              const rotPfx = cl.payFrequency==="monthly"
                ? `${now2.getFullYear()}-${String(now2.getMonth()+1).padStart(2,"0")}`
                : now2.getFullYear().toString();
              const rotUsed = isRotTab&&cl.status==="approved"
                ? discharges.filter(d=>d.clientId===cl.id&&d.ts.startsWith(rotPfx)&&d.status!=="cancelled").length
                : 0;
              const rotPct = isRotTab&&cl.weightLimitYear>0 ? Math.round((rotUsed/cl.weightLimitYear)*100) : 0;
              const pct=isRotTab?rotPct:creditPct(cl); const col=creditColor(pct);
              return (
                <button key={cl.id} onClick={()=>setSel(cl.id)} style={{
                  width:"100%",textAlign:"left",padding:"10px 12px",borderRadius:8,cursor:"pointer",
                  border:`1px solid ${sel===cl.id?isRotTab?"var(--orange)":"var(--g)":"var(--bdr)"}`,
                  background:sel===cl.id?isRotTab?"rgba(251,146,60,.07)":"rgba(46,201,92,.07)":"var(--s2)",
                }}>
                  <div className="fx aic jsb">
                    <span style={{fontWeight:700,fontSize:12,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cl.name}</span>
                    {isAccountType
                      ?<ClientStatusBadge s={cl.status}/>
                      :<span className="badge b-cash">Cash</span>}
                  </div>
                  {isRotTab&&cl.status==="approved"&&(
                    <>
                      <div className="cbt mt2"><div className="cbf" style={{width:`${Math.min(pct,100)}%`,background:col}}/></div>
                      <div className="tsm tmu mt1" style={{fontSize:10}}>
                        {rotUsed}/{cl.weightLimitYear||"?"} rotations · {pct}%
                      </div>
                    </>
                  )}
                  {!isRotTab&&isAccountType&&cl.status==="approved"&&(
                    <>
                      <div className="cbt mt2"><div className="cbf" style={{width:`${Math.min(pct,100)}%`,background:col}}/></div>
                      <div className="tsm tmu mt1" style={{fontSize:10}}>
                        {cl.type==="prepaid"?`Solde: ${fmt(Math.max(0,cl.creditLimit-cl.consumed))}`:`${pct}%`}
                        {" · "}{fmt(cl.consumed)}
                      </div>
                    </>
                  )}
                  {isAccountType&&cl.status!=="approved"&&(
                    <div style={{fontSize:10,color:"var(--muted)",marginTop:3}}>{cl.clientType==="state"?"🏛 Etat":"🏢 Privé"} · Dossier en cours</div>
                  )}
                  {tab==="cash"&&(
                    <div style={{fontSize:10,color:"var(--muted)",marginTop:3}}>{cl.phone}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {sel&&c?(
            <>
              <div className="card mb4">
                <div className="fx jsb aic mb3">
                  <div>
                    <div style={{fontFamily:"var(--head)",fontSize:20,fontWeight:800}}>{c.name}</div>
                    <div className="mn tsm tmu mt1">{c.id}</div>
                  </div>
                  <div className="fx aic g2">
                    {c.type==="convention"&&(
                      <span className={`badge ${c.clientType==="state"?"b-purple":"b-info"}`}>
                        {c.clientType==="state"?"🏛 Institution État":"🏢 Entreprise Privée"}
                      </span>
                    )}
                    {c.type==="prepaid"&&<span className="badge" style={{background:"rgba(59,130,246,.12)",color:"#1d4ed8",border:"1px solid rgba(59,130,246,.3)"}}>🎫 Bonus Prépayé</span>}
                    {c.type==="daily"&&<span className="badge b-cash">💵 Client Cash</span>}
                    {c.type==="rotation"&&<span className="badge" style={{background:"rgba(251,146,60,.12)",color:"var(--orange)",border:"1px solid rgba(251,146,60,.3)"}}>🔄 Convention Rotation</span>}
                    {c.type==="rotation"&&<ClientStatusBadge s={c.status}/>}
                    {c.type==="convention"&&<ClientStatusBadge s={c.status}/>}
                    {isAdmin&&(
                      <div className="fx aic g2">
                        <button className="btn bg bsm" style={{fontSize:10,padding:"3px 8px"}}
                          onClick={()=>{setEditClientForm({...c});setModal("edit_client");}}>
                          ✏️ Modifier
                        </button>
                        <button className="btn be bsm" style={{fontSize:10,padding:"3px 8px"}}
                          onClick={()=>setDeleteConfirm(c.id)}>
                          🗑 Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="fg fg3 mb3">
                  {[["Téléphone",c.phone||"—"],["Adresse",c.address||"—"],["NIF",c.nif||"—"]].map(([l,v])=>(
                    <div key={l} className="card-sm"><div style={{fontSize:9,fontFamily:"var(--mono)",color:"var(--muted)",textTransform:"uppercase",letterSpacing:".1em"}}>{l}</div><div style={{marginTop:4,fontSize:12,fontWeight:600}}>{v}</div></div>
                  ))}
                  <div className="card-sm">
                    <div style={{fontSize:9,fontFamily:"var(--mono)",color:"var(--muted)",textTransform:"uppercase",letterSpacing:".1em"}}>Régime TVA</div>
                    <div style={{marginTop:4}}>
                      {c.vatSubject
                        ? <span className="badge" style={{background:"rgba(234,179,8,.12)",color:"#92400e",border:"1px solid rgba(234,179,8,.3)",fontSize:10}}>✅ Assujetti TVA</span>
                        : <span className="badge" style={{background:"rgba(100,116,139,.1)",color:"var(--muted)",border:"1px solid var(--bdr)",fontSize:10}}>🚫 Non assujetti</span>
                      }
                    </div>
                  </div>
                </div>

                {c.type==="prepaid"&&(
                  <div className="fg fg3 mb3">
                    {[
                      ["Solde Total (DA)",  fmt(c.creditLimit),                                   "var(--muted)"],
                      ["Consommé",          fmt(c.consumed),                                       creditColor(creditPct(c))],
                      ["Solde Disponible",  fmt(Math.max(0,c.creditLimit-c.consumed)),             c.consumed>c.creditLimit?"var(--err)":"var(--g)"],
                    ].map(([l,v,col])=>(
                      <div key={l} className="card-sm" style={{borderTop:`2px solid ${col}`}}>
                        <div style={{fontSize:9,fontFamily:"var(--mono)",color:"var(--muted)",textTransform:"uppercase",letterSpacing:".1em"}}>{l}</div>
                        <div style={{fontFamily:"var(--head)",fontSize:16,fontWeight:800,color:col,marginTop:4}}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {(c.type==="convention"||c.type==="rotation")&&c.status==="approved"&&(
                  <div className="fg fg3 mb3">
                    {(()=>{
                      const now = new Date();
                      const isRotation = c.type==="rotation";
                      const isMonthly = c.payFrequency==="monthly";
                      const periodPrefix = isMonthly
                        ? `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`
                        : now.getFullYear().toString();
                      const periodDischarges = discharges.filter(d=>d.clientId===c.id&&d.ts.startsWith(periodPrefix)&&d.status!=="cancelled");
                      const usedPeriod = isRotation ? periodDischarges.length : periodDischarges.reduce((s,d)=>s+d.net,0);
                      const pct = c.weightLimitYear>0 ? Math.round((usedPeriod/c.weightLimitYear)*100) : 0;
                      const col = pct>80?"var(--err)":pct>60?"var(--warn)":"var(--g)";
                      const periodLbl = isMonthly ? now.toLocaleString("fr-DZ",{month:"long",year:"numeric"}) : String(now.getFullYear());
                      const rows = c.creditEnabled ? [
                        ["Limite Crédit (DA)", fmt(c.creditLimit),            "var(--muted)"],
                        ["Consommé",           fmt(c.consumed),               creditColor(creditPct(c))],
                        ["Disponible",         fmt(c.creditLimit-c.consumed), c.consumed>c.creditLimit?"var(--err)":"var(--g)"],
                      ] : isRotation ? [
                        [isMonthly?"Quota Mensuel (rot.)":"Quota Annuel (rot.)", c.weightLimitYear+" rot.", "var(--muted)"],
                        [isMonthly?"Rotations ce mois":"Rotations cette année",  usedPeriod+" rot.",        creditColor(pct)],
                        ["Restant",                                               Math.max(0,c.weightLimitYear-usedPeriod)+" rot.", "var(--g)"],
                      ] : [
                        [isMonthly?"Quota Mensuel (t)":"Quota Annuel (t)", fmtN(c.weightLimitYear)+" t", "var(--muted)"],
                        [isMonthly?"Mois en cours":"Année en cours",       fmtN(usedPeriod)+" t",        creditColor(pct)],
                        ["Restant",                                         fmtN(Math.max(0,c.weightLimitYear-usedPeriod))+" t", "var(--g)"],
                      ];
                      return (<>
                        {rows.map(([l,v,c2])=>(
                          <div key={l} className="card-sm" style={{borderTop:`2px solid ${c2}`}}>
                            <div style={{fontSize:9,fontFamily:"var(--mono)",color:"var(--muted)",textTransform:"uppercase",letterSpacing:".1em"}}>{l}</div>
                            <div style={{fontFamily:"var(--head)",fontSize:16,fontWeight:800,color:c2,marginTop:4}}>{v}</div>
                          </div>
                        ))}
                        {!c.creditEnabled&&c.weightLimitYear>0&&(
                          <div style={{gridColumn:"1/-1",marginTop:-4}}>
                            <div className="cbt" style={{height:6}}><div className="cbf" style={{width:`${Math.min(pct,100)}%`,background:col}}/></div>
                            <div className="fx jsb mt1">
                              <span className="tsm tmu">Progression {periodLbl}</span>
                              <span className="mn tsm" style={{color:col}}>{pct}%</span>
                            </div>
                          </div>
                        )}
                      </>);
                    })()}
                  </div>
                )}

                {(c.assignedSites&&c.assignedSites.length>0)&&(
                  <div className="fx aic g2 mb2" style={{fontSize:11,flexWrap:"wrap"}}>
                    <span style={{color:"var(--muted)"}}>📍 Centres autorisés :</span>
                    {c.assignedSites.map(sid=>{
                      const s=(sites||[]).find(x=>x.id===sid);
                      return(
                        <span key={sid} className="badge b-info" style={{fontSize:10,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}>
                          {s?.name||sid}
                          <span style={{opacity:.7,fontWeight:400}}>{s?.type}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
                {(c.type==="convention"||c.type==="rotation")&&c.payFrequency&&(
                  <div className="fx aic g3 mb3" style={{fontSize:11,color:"var(--muted)"}}>
                    <span>📅 Facturation: <strong style={{color:"var(--txt)"}}>{c.payFrequency==="monthly"?"Mensuelle":"Annuelle"}</strong></span>
                    {c.type==="convention"&&<span>💳 Instrument: <strong style={{color:"var(--txt)"}}>{c.payInstrument==="bank"?"Virement bancaire":"Chèque"}</strong></span>}
                  </div>
                )}

                {/* Documents section for convention / rotation clients */}
                {(c.type==="convention"||c.type==="rotation")&&(
                  <div>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>📄 Documents requis
                      {isAdmin&&<span style={{fontWeight:400,fontSize:10,color:"var(--muted)",marginLeft:8}}>Cliquez pour marquer reçu/manquant</span>}
                    </div>
                    <div style={{marginBottom:12}}>
                      {requiredDocs.map(doc=>{
                        const submitted = c.docs.includes(doc);
                        return (
                          <div key={doc} className="doc-item"
                            style={{cursor:isAdmin?"pointer":"default",borderRadius:6,padding:"6px 8px",
                              background:submitted?"rgba(46,201,92,.05)":"transparent",
                              border:`1px solid ${submitted?"rgba(46,201,92,.2)":"var(--bdr)"}`,marginBottom:4}}
                            onClick={()=>isAdmin&&toggleDoc(doc)}>
                            <span style={{fontSize:16}}>{submitted?"✅":"⬜"}</span>
                            <span style={{flex:1,fontSize:12}}>{doc}</span>
                            {submitted?<span className="badge b-ok" style={{fontSize:8}}>Reçu</span>:<span className="badge b-warn" style={{fontSize:8}}>Manquant</span>}
                          </div>
                        );
                      })}
                    </div>

                    {c.note&&(
                      <div className="alrt ai mb3" style={{marginBottom:14}}>
                        <span>📝</span><span>{c.note}</span>
                      </div>
                    )}

                    {(c.status==="under_review"||c.status==="pending_docs")&&(
                      <div className="fx g3">
                        <button className="btn bp bsm" onClick={()=>{
                          if(c.type==="rotation"){setApproveMode("rotation");setRotationInput(String(c.weightLimitYear||0));setQuotaPeriod(c.payFrequency==="monthly"?"month":"year");}
                          else{setCreditInput("500000");}
                          setModal("approve");
                        }}>
                          ✓ Approuver le dossier
                        </button>
                        <button className="btn be bsm" onClick={()=>setModal("reject")}>
                          ✗ Rejeter
                        </button>
                      </div>
                    )}
                    {c.status==="approved"&&(
                      <div className="fx aic g2" style={{flexWrap:"wrap"}}>
                        <span className="badge b-ok">✓ Dossier validé</span>
                        <button className="btn bsm bg" style={{fontSize:10}} onClick={()=>{
                          if(c.type==="rotation"){setApproveMode("rotation");setRotationInput(String(c.weightLimitYear||0));setQuotaPeriod(c.payFrequency==="monthly"?"month":"year");}
                          else if(c.creditEnabled){setApproveMode("credit");setCreditInput(String(c.creditLimit));}
                          else{setApproveMode("weight");setWeightInput(String(c.weightLimitYear));setQuotaPeriod(c.payFrequency==="monthly"?"month":"year");}
                          setModal("approve");
                        }}>
                          ✏️ Modifier conditions
                        </button>
                        {isAdmin&&(
                          <button className="btn be bsm" style={{fontSize:10}} onClick={()=>{setNote("");setModal("reject");}}>
                            ✗ Révoquer
                          </button>
                        )}
                      </div>
                    )}
                    {c.status==="rejected"&&(
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <div className="alrt ae" style={{marginBottom:0,padding:"8px 12px"}}>
                          <span>✗</span>
                          <div style={{fontSize:11}}>
                            <strong>Dossier rejeté</strong>
                            {c.note&&<div style={{marginTop:2,color:"var(--muted)"}}>{c.note}</div>}
                          </div>
                        </div>
                        {isAdmin&&(
                          <div className="fx aic g2">
                            <button className="btn bp bsm" style={{fontSize:10}} onClick={()=>{
                              setNote("");
                              if(c.type==="rotation"){setApproveMode("rotation");setRotationInput(String(c.weightLimitYear||0));setQuotaPeriod(c.payFrequency==="monthly"?"month":"year");}
                              else if(c.creditEnabled){setApproveMode("credit");setCreditInput(String(c.creditLimit||500000));}
                              else{setApproveMode("weight");setWeightInput(String(c.weightLimitYear||0));setQuotaPeriod(c.payFrequency==="monthly"?"month":"year");}
                              setModal("approve");
                            }}>
                              ✓ Réapprouver
                            </button>
                            <button className="btn bw bsm" style={{fontSize:10}} onClick={()=>{setNote(c.note||"");setModal("reject");}}>
                              ✏️ Modifier motif
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Delete confirmation modal */}
              {deleteConfirm===c.id&&(
                <div className="ov">
                  <div className="modal">
                    <div className="mh"><span className="mh-title">🗑 Supprimer le client</span><button className="btn bg bsm" onClick={()=>setDeleteConfirm(null)}>✕</button></div>
                    <div className="mb2">
                      <div className="alrt ae mb3">
                        <span>⚠</span>
                        <div><strong>Supprimer {c.name} ?</strong><div style={{fontSize:11,marginTop:4}}>Cette action est irréversible. L'historique des dépôts sera conservé.</div></div>
                      </div>
                    </div>
                    <div className="mf">
                      <button className="btn bg" onClick={()=>setDeleteConfirm(null)}>Annuler</button>
                      <button className="btn be" onClick={()=>doDeleteClient(c.id)}>🗑 Confirmer la suppression</button>
                    </div>
                  </div>
                </div>
              )}

              {cd.length > 0 && (
                <div className="panel">
                  <div className="ph"><span className="pt">Historique des dépôts</span><span className="tsm tmu">{cd.length} entrées</span></div>
                  <div className="tw">
                    <table>
                      <thead><tr><th>Date</th><th>Site</th><th>Camion</th><th>Net(t)</th><th>Total</th><th>Statut</th></tr></thead>
                      <tbody>
                        {cd.map(d=>(
                          <tr key={d.id}>
                            <td className="mn">{fmtTs(d.ts)}</td>
                            <td><span className="badge b-info">{d.siteId}</span></td>
                            <td className="mn">{d.truck}</td>
                            <td className="mn">{fmtN(d.net)}</td>
                            <td className="mn tg">{fmt(d.total)}</td>
                            <td><StatusBadge s={d.status}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ):(
            <div className="fx aic jsc" style={{height:280,color:"var(--muted)",flexDirection:"column",gap:10}}>
              <span style={{fontSize:40}}>👆</span><span>Sélectionnez un client</span>
            </div>
          )}
        </div>
      </div>

      {/* Approve modal */}
      {modal==="approve"&&c&&(
        <div className="ov">
          <div className="modal">
            <div className="mh"><span className="mh-title">✓ Approuver le dossier</span><button className="btn bg bsm" onClick={()=>setModal(false)}>✕</button></div>
            <div className="mb2">
              <div className="alrt ao mb3" style={{marginBottom:14}}>
                <span>✅</span><span>Approbation du dossier de <strong>{c.name}</strong>.</span>
              </div>
              <div className="field mb2" style={{marginBottom:14}}>
                <label>Mode de facturation</label>
                <div className="seg" style={{marginTop:6}}>
                  {c.type==="rotation"?(
                    <button className={`seg-btn${approveMode==="rotation"?" active":""}`}
                      style={{background:"var(--orange)",color:"#fff",borderColor:"var(--orange)"}}>
                      🔄 Quota Conv. Rotation
                    </button>
                  ):(
                    <>
                      <button className={`seg-btn${approveMode==="weight"?" active":""}`} onClick={()=>setApproveMode("weight")}>
                        ⚖️ Quota Tonnage
                      </button>
                      <button className={`seg-btn${approveMode==="credit"?" active":""}`} onClick={()=>setApproveMode("credit")}>
                        💳 Crédit DA (désigné admin)
                      </button>
                    </>
                  )}
                </div>
                <div className="alrt ai" style={{marginTop:8,padding:"8px 12px",fontSize:11}}>
                  <span>ℹ️</span>
                  <span>{approveMode==="weight"
                    ?(quotaPeriod==="month"
                      ?"Quota mensuel : le client peut décharger jusqu'à ce seuil par mois calendaire."
                      :"Quota annuel : le client peut décharger jusqu'à ce seuil par année civile.")
                    :approveMode==="rotation"
                    ?(quotaPeriod==="month"
                      ?"Quota mensuel par rotations : chaque passage de camion = 1 rotation. Limite mensuelle."
                      :"Quota annuel par rotations : chaque passage de camion = 1 rotation. Limite annuelle.")
                    :"Crédit DA : uniquement pour les clients désignés par l'admin. La limite est exprimée en Dinars Algériens."}</span>
                </div>
              </div>
              <div className="fg" style={{gap:12}}>
                {(approveMode==="weight"||approveMode==="rotation")?(
                  <>
                    <div className="field">
                      <label>Périodicité du quota</label>
                      <div className="seg" style={{marginTop:6}}>
                        <button className={`seg-btn${quotaPeriod==="year"?" active":""}`} onClick={()=>setQuotaPeriod("year")}>
                          📅 Annuel
                        </button>
                        <button className={`seg-btn${quotaPeriod==="month"?" active":""}`} onClick={()=>setQuotaPeriod("month")}>
                          🗓 Mensuel
                        </button>
                      </div>
                    </div>
                    {approveMode==="weight"?(
                      <div className="field">
                        <label>Quota {quotaPeriod==="month"?"mensuel (tonnes/mois)":"annuel (tonnes/an)"}</label>
                        <input className="fi" type="number" value={weightInput} onChange={e=>setWeightInput(e.target.value)} placeholder={quotaPeriod==="month"?"ex: 500":"ex: 5000"}/>
                      </div>
                    ):(
                      <div className="field">
                        <label>Quota {quotaPeriod==="month"?"mensuel (rotations/mois)":"annuel (rotations/an)"}</label>
                        <input className="fi" type="number" step="1" min="0" value={rotationInput} onChange={e=>setRotationInput(e.target.value)} placeholder={quotaPeriod==="month"?"ex: 30":"ex: 360"}/>
                      </div>
                    )}
                  </>
                ):(
                  <div className="field"><label>Limite de crédit (DA)</label>
                    <input className="fi" type="number" value={creditInput} onChange={e=>setCreditInput(e.target.value)} placeholder="ex: 500000"/>
                  </div>
                )}
                <div className="field"><label>Remarques (optionnel)</label>
                  <textarea className="fi" value={note} onChange={e=>setNote(e.target.value)} placeholder="Conditions particulières, observations..."/>
                </div>
              </div>
            </div>
            <div className="mf"><button className="btn bg" onClick={()=>setModal(false)}>Annuler</button><button className="btn bp" onClick={doApprove}>✓ Confirmer l'approbation</button></div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {modal==="reject"&&c&&(
        <div className="ov">
          <div className="modal">
            <div className="mh"><span className="mh-title">✗ Rejeter le dossier</span><button className="btn bg bsm" onClick={()=>setModal(false)}>✕</button></div>
            <div className="mb2">
              <div className="alrt ae mb3" style={{marginBottom:14}}><span>⚠</span><span>Vous allez rejeter la demande de convention de <strong>{c.name}</strong>.</span></div>
              <div className="field"><label>Motif du rejet *</label>
                <textarea className="fi" value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex: Documents manquants, dossier incomplet..."/>
              </div>
            </div>
            <div className="mf"><button className="btn bg" onClick={()=>setModal(false)}>Annuler</button><button className="btn be" disabled={!note} onClick={doReject}>✗ Confirmer le rejet</button></div>
          </div>
        </div>
      )}

      {/* Add client modal */}
      {modal==="add_client"&&(
        <div className="ov">
          <div className="modal modal-lg">
            <div className="mh"><span className="mh-title">➕ Nouveau client Convention Tonnes</span><button className="btn bg bsm" onClick={()=>setModal(false)}>✕</button></div>
            <div className="mb2">
              <div className="alrt ai mb3" style={{marginBottom:16}}>
                <span>ℹ️</span><span style={{fontSize:11}}>Le dossier sera créé avec le statut "Documents manquants". L'institution devra fournir les pièces justificatives requises avant approbation.</span>
              </div>
              <div className="fg" style={{gap:12}}>
                <div className="fg fg2">
                  <div className="field"><label>Nom / Raison sociale *</label>
                    <input className="fi" value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))} placeholder="Commune de ..., SPA ..., etc."/>
                  </div>
                  <div className="field"><label>Type d'institution</label>
                    <select className="fi" value={addForm.clientType} onChange={e=>setAddForm(f=>({...f,clientType:e.target.value}))}>
                      <option value="state">🏛 Institution d'État</option>
                      <option value="private">🏢 Entreprise Privée</option>
                    </select>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>Téléphone</label>
                    <input className="fi" value={addForm.phone} onChange={e=>setAddForm(f=>({...f,phone:e.target.value}))} placeholder="034 00 00 00"/>
                  </div>
                  <div className="field"><label>Adresse</label>
                    <input className="fi" value={addForm.address} onChange={e=>setAddForm(f=>({...f,address:e.target.value}))} placeholder="Commune, wilaya"/>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>NIF</label>
                    <input className="fi" value={addForm.nif} onChange={e=>setAddForm(f=>({...f,nif:e.target.value}))} placeholder="099..."/>
                  </div>
                  <div className="field"><label>Registre de Commerce (Privé)</label>
                    <input className="fi" value={addForm.rc} onChange={e=>setAddForm(f=>({...f,rc:e.target.value}))} placeholder="18/00-0000000B18"/>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>Fréquence de facturation</label>
                    <select className="fi" value={addForm.payFrequency||"monthly"} onChange={e=>setAddForm(f=>({...f,payFrequency:e.target.value}))}>
                      <option value="monthly">📅 Mensuelle</option>
                      <option value="annual">📆 Annuelle</option>
                    </select>
                  </div>
                  <div className="field"><label>Mode de paiement</label>
                    <select className="fi" value={addForm.payInstrument||"cheque"} onChange={e=>setAddForm(f=>({...f,payInstrument:e.target.value}))}>
                      <option value="cheque">💳 Chèque</option>
                      <option value="bank">🏦 Virement bancaire</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>📍 Centres d'enfouissement autorisés <span style={{fontWeight:400,color:"var(--muted)",fontSize:10}}>(plusieurs choix possibles)</span></label>
                  <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6}}>
                    {(sites||[]).filter(s=>s.status==="active").map(s=>{
                      const checked=(addForm.assignedSites||[]).includes(s.id);
                      return(
                        <label key={s.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"7px 10px",borderRadius:6,border:`1px solid ${checked?"var(--g)":"var(--bdr)"}`,background:checked?"rgba(46,201,92,.07)":"transparent",fontSize:12,transition:"all .15s"}}>
                          <input type="checkbox" checked={checked} style={{accentColor:"var(--g)",width:14,height:14}}
                            onChange={e=>setAddForm(f=>({...f,assignedSites:e.target.checked?[...(f.assignedSites||[]),s.id]:(f.assignedSites||[]).filter(x=>x!==s.id)}))}/>
                          <span style={{fontWeight:600,flex:1}}>{s.name}</span>
                          <span className="badge b-info" style={{fontSize:9}}>{s.type}</span>
                          <span className="tsm tmu" style={{fontSize:10}}>{s.region}</span>
                        </label>
                      );
                    })}
                    {(sites||[]).filter(s=>s.status==="active").length===0&&<span className="tsm tmu">Aucun centre actif</span>}
                  </div>
                </div>
                <div className="field"><label>Note initiale</label>
                  <textarea className="fi" value={addForm.note} onChange={e=>setAddForm(f=>({...f,note:e.target.value}))} placeholder="Observations..."/>
                </div>
                <div className="field">
                  <label>Régime TVA</label>
                  <div className="seg" style={{marginTop:6}}>
                    <button className={`seg-btn${addForm.vatSubject===false?" active":""}`} onClick={()=>setAddForm(f=>({...f,vatSubject:false}))}>
                      🚫 Non assujetti à la TVA
                    </button>
                    <button className={`seg-btn${addForm.vatSubject===true?" active":""}`} onClick={()=>setAddForm(f=>({...f,vatSubject:true}))}>
                      ✅ Assujetti à la TVA
                    </button>
                  </div>
                </div>
                <div style={{background:"var(--s2)",border:"1px solid var(--bdr)",borderRadius:8,padding:"12px 14px"}}>
                  <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>📋 Documents requis :</div>
                  {(addForm.clientType==="state"?(docTypes?.state||REQUIRED_DOCS_STATE):(docTypes?.private||REQUIRED_DOCS_PRIVATE)).map(d=>(
                    <div key={d} className="fx aic g2" style={{marginBottom:5,fontSize:11,color:"var(--muted)"}}>
                      <span style={{color:"var(--warn)"}}>⬜</span> {d}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mf"><button className="btn bg" onClick={()=>setModal(false)}>Annuler</button><button className="btn bp" disabled={!addForm.name} onClick={doAddClient}>✓ Créer le dossier</button></div>
          </div>
        </div>
      )}

      {/* Add rotation client modal */}
      {modal==="add_rotation"&&(
        <div className="ov">
          <div className="modal modal-lg">
            <div className="mh"><span className="mh-title">🔄 Nouveau client Convention Rotation</span><button className="btn bg bsm" onClick={()=>setModal(false)}>✕</button></div>
            <div className="mb2">
              <div className="alrt ai mb3" style={{marginBottom:16}}>
                <span>ℹ️</span><span style={{fontSize:11}}>Le dossier sera créé avec le statut "Documents manquants". Le quota en rotations sera défini lors de l'approbation.</span>
              </div>
              <div className="fg" style={{gap:12}}>
                <div className="fg fg2">
                  <div className="field"><label>Nom / Raison sociale *</label>
                    <input className="fi" value={addRotForm.name} onChange={e=>setAddRotForm(f=>({...f,name:e.target.value}))} placeholder="Commune de ..., SPA ..., etc."/>
                  </div>
                  <div className="field"><label>Type d'institution</label>
                    <select className="fi" value={addRotForm.clientType} onChange={e=>setAddRotForm(f=>({...f,clientType:e.target.value}))}>
                      <option value="state">🏛 Institution d'État</option>
                      <option value="private">🏢 Entreprise Privée</option>
                    </select>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>Téléphone</label>
                    <input className="fi" value={addRotForm.phone} onChange={e=>setAddRotForm(f=>({...f,phone:e.target.value}))} placeholder="034 00 00 00"/>
                  </div>
                  <div className="field"><label>Adresse</label>
                    <input className="fi" value={addRotForm.address} onChange={e=>setAddRotForm(f=>({...f,address:e.target.value}))} placeholder="Commune, wilaya"/>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>NIF</label>
                    <input className="fi" value={addRotForm.nif} onChange={e=>setAddRotForm(f=>({...f,nif:e.target.value}))} placeholder="099..."/>
                  </div>
                  <div className="field"><label>Registre de Commerce (Privé)</label>
                    <input className="fi" value={addRotForm.rc} onChange={e=>setAddRotForm(f=>({...f,rc:e.target.value}))} placeholder="18/00-0000000B18"/>
                  </div>
                </div>
                <div className="field"><label>Périodicité du quota</label>
                  <select className="fi" value={addRotForm.payFrequency} onChange={e=>setAddRotForm(f=>({...f,payFrequency:e.target.value}))}>
                    <option value="monthly">🗓 Mensuelle (rotations/mois)</option>
                    <option value="annual">📅 Annuelle (rotations/an)</option>
                  </select>
                </div>
                <div className="field">
                  <label>📍 Centres d'enfouissement autorisés <span style={{fontWeight:400,color:"var(--muted)",fontSize:10}}>(plusieurs choix possibles)</span></label>
                  <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6}}>
                    {(sites||[]).filter(s=>s.status==="active").map(s=>{
                      const checked=(addRotForm.assignedSites||[]).includes(s.id);
                      return(
                        <label key={s.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"7px 10px",borderRadius:6,border:`1px solid ${checked?"var(--g)":"var(--bdr)"}`,background:checked?"rgba(46,201,92,.07)":"transparent",fontSize:12,transition:"all .15s"}}>
                          <input type="checkbox" checked={checked} style={{accentColor:"var(--g)",width:14,height:14}}
                            onChange={e=>setAddRotForm(f=>({...f,assignedSites:e.target.checked?[...(f.assignedSites||[]),s.id]:(f.assignedSites||[]).filter(x=>x!==s.id)}))}/>
                          <span style={{fontWeight:600,flex:1}}>{s.name}</span>
                          <span className="badge b-info" style={{fontSize:9}}>{s.type}</span>
                          <span className="tsm tmu" style={{fontSize:10}}>{s.region}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="field"><label>Note initiale</label>
                  <textarea className="fi" value={addRotForm.note} onChange={e=>setAddRotForm(f=>({...f,note:e.target.value}))} placeholder="Observations..."/>
                </div>
                <div className="field">
                  <label>Régime TVA</label>
                  <div className="seg" style={{marginTop:6}}>
                    <button className={`seg-btn${addRotForm.vatSubject===false?" active":""}`} onClick={()=>setAddRotForm(f=>({...f,vatSubject:false}))}>
                      🚫 Non assujetti à la TVA
                    </button>
                    <button className={`seg-btn${addRotForm.vatSubject===true?" active":""}`} onClick={()=>setAddRotForm(f=>({...f,vatSubject:true}))}>
                      ✅ Assujetti à la TVA
                    </button>
                  </div>
                </div>
                <div style={{background:"var(--s2)",border:"1px solid var(--bdr)",borderRadius:8,padding:"12px 14px"}}>
                  <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>📋 Documents requis :</div>
                  {(addRotForm.clientType==="state"?(docTypes?.state||REQUIRED_DOCS_STATE):(docTypes?.private||REQUIRED_DOCS_PRIVATE)).map(d=>(
                    <div key={d} className="fx aic g2" style={{marginBottom:5,fontSize:11,color:"var(--muted)"}}>
                      <span style={{color:"var(--warn)"}}>⬜</span> {d}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mf"><button className="btn bg" onClick={()=>setModal(false)}>Annuler</button><button className="btn bp" style={{background:"var(--orange)",borderColor:"var(--orange)"}} disabled={!addRotForm.name} onClick={doAddRotationClient}>✓ Créer le dossier rotations</button></div>
          </div>
        </div>
      )}

      {/* Add prepaid client modal */}
      {modal==="add_prepaid"&&(
        <div className="ov">
          <div className="modal modal-lg">
            <div className="mh"><span className="mh-title">🎫 Nouveau client bonus prépayé</span><button className="btn bg bsm" onClick={()=>setModal(false)}>✕</button></div>
            <div className="mb2">
              <div className="alrt ai mb3" style={{marginBottom:16}}>
                <span>ℹ️</span><span style={{fontSize:11}}>Un client prépayé dispose d'un solde en DA préchargé par l'admin. Chaque décharge consomme ce solde. Le compte est actif immédiatement.</span>
              </div>
              <div className="fg" style={{gap:12}}>
                <div className="fg fg2">
                  <div className="field"><label>Nom / Raison sociale *</label>
                    <input className="fi" value={prepaidForm.name} onChange={e=>setPrepaidForm(f=>({...f,name:e.target.value}))} placeholder="Nom du client"/>
                  </div>
                  <div className="field"><label>Solde initial (DA) *</label>
                    <input className="fi" type="number" value={prepaidForm.balance} onChange={e=>setPrepaidForm(f=>({...f,balance:e.target.value}))} placeholder="200000"/>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>Téléphone</label>
                    <input className="fi" value={prepaidForm.phone} onChange={e=>setPrepaidForm(f=>({...f,phone:e.target.value}))} placeholder="0770 00 00 00"/>
                  </div>
                  <div className="field"><label>Adresse</label>
                    <input className="fi" value={prepaidForm.address} onChange={e=>setPrepaidForm(f=>({...f,address:e.target.value}))} placeholder="Commune, wilaya"/>
                  </div>
                </div>
                <div className="field">
                  <label>📍 Centres d'enfouissement autorisés <span style={{fontWeight:400,color:"var(--muted)",fontSize:10}}>(plusieurs choix possibles)</span></label>
                  <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6}}>
                    {(sites||[]).filter(s=>s.status==="active").map(s=>{
                      const checked=(prepaidForm.assignedSites||[]).includes(s.id);
                      return(
                        <label key={s.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"7px 10px",borderRadius:6,border:`1px solid ${checked?"var(--g)":"var(--bdr)"}`,background:checked?"rgba(46,201,92,.07)":"transparent",fontSize:12,transition:"all .15s"}}>
                          <input type="checkbox" checked={checked} style={{accentColor:"var(--g)",width:14,height:14}}
                            onChange={e=>setPrepaidForm(f=>({...f,assignedSites:e.target.checked?[...(f.assignedSites||[]),s.id]:(f.assignedSites||[]).filter(x=>x!==s.id)}))}/>
                          <span style={{fontWeight:600,flex:1}}>{s.name}</span>
                          <span className="badge b-info" style={{fontSize:9}}>{s.type}</span>
                          <span className="tsm tmu" style={{fontSize:10}}>{s.region}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="field"><label>Note</label>
                  <textarea className="fi" value={prepaidForm.note} onChange={e=>setPrepaidForm(f=>({...f,note:e.target.value}))} placeholder="Observations..."/>
                </div>
                <div className="field">
                  <label>Régime TVA</label>
                  <div className="seg" style={{marginTop:6}}>
                    <button className={`seg-btn${prepaidForm.vatSubject===false?" active":""}`} onClick={()=>setPrepaidForm(f=>({...f,vatSubject:false}))}>
                      🚫 Non assujetti à la TVA
                    </button>
                    <button className={`seg-btn${prepaidForm.vatSubject===true?" active":""}`} onClick={()=>setPrepaidForm(f=>({...f,vatSubject:true}))}>
                      ✅ Assujetti à la TVA
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mf"><button className="btn bg" onClick={()=>setModal(false)}>Annuler</button><button className="btn bp" disabled={!prepaidForm.name||!prepaidForm.balance} onClick={doPrepaidAdd}>✓ Créer le compte prépayé</button></div>
          </div>
        </div>
      )}

      {/* Edit client profile modal */}
      {modal==="edit_client"&&editClientForm&&(
        <div className="ov">
          <div className="modal modal-lg">
            <div className="mh"><span className="mh-title">✏️ Modifier le profil client</span><button className="btn bg bsm" onClick={()=>{setModal(false);setEditClientForm(null);}}>✕</button></div>
            <div className="mb2">
              <div className="fg" style={{gap:12}}>
                <div className="field"><label>Nom / Raison sociale *</label>
                  <input className="fi" value={editClientForm.name} onChange={e=>setEditClientForm(f=>({...f,name:e.target.value}))}/>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>Téléphone</label>
                    <input className="fi" value={editClientForm.phone||""} onChange={e=>setEditClientForm(f=>({...f,phone:e.target.value}))}/>
                  </div>
                  <div className="field"><label>Adresse</label>
                    <input className="fi" value={editClientForm.address||""} onChange={e=>setEditClientForm(f=>({...f,address:e.target.value}))}/>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>NIF</label>
                    <input className="fi" value={editClientForm.nif||""} onChange={e=>setEditClientForm(f=>({...f,nif:e.target.value}))} placeholder="099..."/>
                  </div>
                  <div className="field"><label>Registre de Commerce</label>
                    <input className="fi" value={editClientForm.rc||""} onChange={e=>setEditClientForm(f=>({...f,rc:e.target.value}))} placeholder="18/00-0000000B18"/>
                  </div>
                </div>
                <div className="field">
                  <label>Régime TVA</label>
                  <div className="seg" style={{marginTop:6}}>
                    <button className={`seg-btn${editClientForm.vatSubject===false?" active":""}`} onClick={()=>setEditClientForm(f=>({...f,vatSubject:false}))}>
                      🚫 Non assujetti à la TVA
                    </button>
                    <button className={`seg-btn${editClientForm.vatSubject===true?" active":""}`} onClick={()=>setEditClientForm(f=>({...f,vatSubject:true}))}>
                      ✅ Assujetti à la TVA
                    </button>
                  </div>
                </div>
                {editClientForm.type==="convention"&&(
                  <>
                    <div className="fg fg2">
                      <div className="field"><label>Fréquence de facturation</label>
                        <select className="fi" value={editClientForm.payFrequency||"monthly"} onChange={e=>setEditClientForm(f=>({...f,payFrequency:e.target.value}))}>
                          <option value="monthly">📅 Mensuelle</option>
                          <option value="annual">📆 Annuelle</option>
                        </select>
                      </div>
                      <div className="field"><label>Mode de paiement</label>
                        <select className="fi" value={editClientForm.payInstrument||"cheque"} onChange={e=>setEditClientForm(f=>({...f,payInstrument:e.target.value}))}>
                          <option value="cheque">💳 Chèque</option>
                          <option value="bank">🏦 Virement bancaire</option>
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label>🔄 Quota de rotations <span style={{fontWeight:400,color:"var(--muted)",fontSize:10}}>(optionnel — 0 = pas de limite)</span></label>
                      <input className="fi" type="number" step="1" min="0"
                        value={editClientForm.rotationLimit||0}
                        onChange={e=>setEditClientForm(f=>({...f,rotationLimit:parseInt(e.target.value)||0}))}
                        placeholder="ex: 30"/>
                    </div>
                  </>
                )}
                {editClientForm.type==="prepaid"&&(
                  <div className="field"><label>Solde total (DA)</label>
                    <input className="fi" type="number" value={editClientForm.creditLimit||0} onChange={e=>setEditClientForm(f=>({...f,creditLimit:parseFloat(e.target.value)||0}))}/>
                  </div>
                )}
                {editClientForm.type==="rotation"&&(
                  <div className="fg fg2">
                    <div className="field">
                      <label>Périodicité du quota</label>
                      <select className="fi" value={editClientForm.payFrequency||"monthly"} onChange={e=>setEditClientForm(f=>({...f,payFrequency:e.target.value}))}>
                        <option value="monthly">🗓 Mensuelle (rotations/mois)</option>
                        <option value="annual">📅 Annuelle (rotations/an)</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Quota de rotations {editClientForm.payFrequency==="annual"?"(rotations/an)":"(rotations/mois)"}</label>
                      <input className="fi" type="number" step="1" min="0"
                        value={editClientForm.weightLimitYear||0}
                        onChange={e=>setEditClientForm(f=>({...f,weightLimitYear:parseInt(e.target.value)||0}))}
                        placeholder={editClientForm.payFrequency==="annual"?"ex: 360":"ex: 30"}/>
                    </div>
                  </div>
                )}
                <div className="field">
                  <label>📍 Centres d'enfouissement autorisés <span style={{fontWeight:400,color:"var(--muted)",fontSize:10}}>(admin — plusieurs choix)</span></label>
                  <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6}}>
                    {(sites||[]).filter(s=>s.status==="active").map(s=>{
                      const checked=(editClientForm.assignedSites||[]).includes(s.id);
                      return(
                        <label key={s.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"7px 10px",borderRadius:6,border:`1px solid ${checked?"var(--g)":"var(--bdr)"}`,background:checked?"rgba(46,201,92,.07)":"transparent",fontSize:12,transition:"all .15s"}}>
                          <input type="checkbox" checked={checked} style={{accentColor:"var(--g)",width:14,height:14}}
                            onChange={e=>setEditClientForm(f=>({...f,assignedSites:e.target.checked?[...(f.assignedSites||[]),s.id]:(f.assignedSites||[]).filter(x=>x!==s.id)}))}/>
                          <span style={{fontWeight:600,flex:1}}>{s.name}</span>
                          <span className="badge b-info" style={{fontSize:9}}>{s.type}</span>
                          <span className="tsm tmu" style={{fontSize:10}}>{s.region}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="field"><label>Note</label>
                  <textarea className="fi" value={editClientForm.note||""} onChange={e=>setEditClientForm(f=>({...f,note:e.target.value}))} rows={2}/>
                </div>
                {isAdmin&&(
                  <>
                    <hr className="dvdr"/>
                    <div className="field">
                      <label>🚛 Type de service EPWGCET <span style={{fontWeight:400,color:"var(--muted)",fontSize:10}}>(admin)</span></label>
                      <div className="seg" style={{marginTop:6}}>
                        <button className={`seg-btn${editClientForm.serviceType!=="treat_and_collect"?" active":""}`}
                          onClick={()=>setEditClientForm(f=>({...f,serviceType:"treatment_only"}))}>
                          🏭 Traitement uniquement
                        </button>
                        <button className={`seg-btn${editClientForm.serviceType==="treat_and_collect"?" active":""}`}
                          onClick={()=>setEditClientForm(f=>({...f,serviceType:"treat_and_collect"}))}
                          style={editClientForm.serviceType==="treat_and_collect"?{background:"var(--purple)",borderColor:"var(--purple)",color:"#fff"}:{}}>
                          🚛 Collecte et Traitement
                        </button>
                      </div>
                    </div>
                    {editClientForm.serviceType==="treat_and_collect"&&(
                      <div className="field">
                        <label>Mode de facturation pour la collecte</label>
                        <div className="seg" style={{marginTop:6}}>
                          <button className={`seg-btn${editClientForm.collectBillingMode!=="rotation"?" active":""}`}
                            onClick={()=>setEditClientForm(f=>({...f,collectBillingMode:"tonnage"}))}>
                            ⚖️ Tonnage (prix/tonne)
                          </button>
                          <button className={`seg-btn${editClientForm.collectBillingMode==="rotation"?" active":""}`}
                            onClick={()=>setEditClientForm(f=>({...f,collectBillingMode:"rotation"}))}
                            style={editClientForm.collectBillingMode==="rotation"?{background:"var(--orange)",borderColor:"var(--orange)",color:"#fff"}:{}}>
                            🔄 Rotation (prix fixe/passage)
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="mf"><button className="btn bg" onClick={()=>{setModal(false);setEditClientForm(null);}}>Annuler</button><button className="btn bp" disabled={!editClientForm.name} onClick={doEditClient}>✓ Enregistrer</button></div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OPERATORS
═══════════════════════════════════════════════════════════════════════════ */
function PageOperators({users,sites,addUser,updateUser,deleteUser,authUser}) {
  const [modal,     setModal]     = useState(false);
  const [editOp,    setEditOp]    = useState(null);
  const [editForm,  setEditForm]  = useState({name:"",email:"",password:"",phone:"",matricule:"",siteId:"CET-JIJ"});
  const [form,      setForm]      = useState({name:"",email:"",password:"",phone:"",matricule:"",siteId:"CET-JIJ"});
  const [tab,       setTab]       = useState("active");
  const set    = (k,v) => setForm(f=>({...f,[k]:v}));
  const setEd  = (k,v) => setEditForm(f=>({...f,[k]:v}));

  const operators = users.filter(u=>u.role==="operator");
  const pendingOps = operators.filter(u=>u.status==="pending");
  const activeOps  = operators.filter(u=>u.status!=="pending");

  const handleAdd = () => {
    if (!form.name||!form.email||!form.password) return;
    const u = {
      id:uidU(), name:form.name, email:form.email, password:form.password, role:"operator",
      status:"active", phone:form.phone, matricule:form.matricule||`OP-${new Date().getFullYear()}-${String(operators.length+1).padStart(3,"0")}`,
      siteId:form.siteId, createdAt:new Date().toISOString().slice(0,10),
    };
    addUser(u);
    setModal(false);
    setForm({name:"",email:"",password:"",phone:"",matricule:"",siteId:"CET-JIJ"});
  };

  const toggleStatus = u => updateUser({...u, status:u.status==="active"?"inactive":u.status==="inactive"?"active":u.status});
  const approveOp    = u => updateUser({...u, status:"active", matricule:`OP-${new Date().getFullYear()}-${String(operators.length).padStart(3,"0")}`});
  const rejectOp     = u => updateUser({...u, status:"inactive"});

  const siteLabel = sid => sites.find(s=>s.id===sid)?.name || sid;

  return (
    <>
      <div className="fx aic jsb mb4">
        <div className="tabs" style={{margin:0}}>
          <button className={`tab${tab==="active"?" active":""}`} onClick={()=>setTab("active")}>
            Opérateurs ({activeOps.length})
          </button>
          <button className={`tab${tab==="pending"?" active":""}`} onClick={()=>setTab("pending")}>
            Demandes en attente {pendingOps.length>0&&<span className="badge b-warn" style={{marginLeft:6,fontSize:8}}>{pendingOps.length}</span>}
          </button>
        </div>
        <button className="btn bp bsm" onClick={()=>setModal(true)}>➕<span className="btn-lbl"> Nouvel opérateur</span></button>
      </div>

      {tab==="active"&&(
        <>
          {/* Admin card */}
          <div style={{marginBottom:16}}>
            <div className="nav-lbl" style={{padding:"0 0 8px"}}>Administrateur</div>
            {users.filter(u=>u.role==="admin").map(u=>(
              <div key={u.id} className="op-card" style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:8}}>
                <div className="op-avatar op-av-admin">👔</div>
                <div style={{flex:1}}>
                  <div className="fx aic jsb">
                    <div style={{fontWeight:700,fontSize:14}}>{u.name}</div>
                    <UserStatusBadge s={u.status}/>
                  </div>
                  <div className="mn tsm tmu mt1">{u.email}</div>
                  <div className="fx aic g3 mt2">
                    <span className="tsm tmu">📞 {u.phone}</span>
                    <span className="tsm tmu">🏭 Tous les sites</span>
                    <span className="mn tsm tmu">{u.matricule}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="nav-lbl" style={{padding:"0 0 8px"}}>Agents de poste</div>
          <div className="op-grid">
            {activeOps.length===0?(
              <div className="card" style={{color:"var(--muted)",textAlign:"center",padding:32}}>Aucun opérateur actif</div>
            ):activeOps.map(u=>(
              <div key={u.id} className="op-card">
                <div className="fx aic jsb mb3">
                  <div className="fx aic g2">
                    <div className="op-avatar op-av-op">🦺</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:13}}>{u.name}</div>
                      <div className="mn tsm tmu">{u.matricule||"—"}</div>
                    </div>
                  </div>
                  <UserStatusBadge s={u.status}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,fontSize:12,marginBottom:12}}>
                  <div className="fx aic g2"><span>📧</span><span className="tmu truncate">{u.email}</span></div>
                  <div className="fx aic g2"><span>📞</span><span className="tmu">{u.phone||"—"}</span></div>
                  <div className="fx aic g2"><span>🏭</span><span className="tmu">{siteLabel(u.siteId)}</span></div>
                  <div className="fx aic g2"><span>📅</span><span className="tmu">{u.createdAt}</span></div>
                </div>
                {u.id !== authUser.id && (
                  <div className="fx g2">
                    <button className="btn bg bsm" style={{flex:1}} onClick={()=>{setEditOp(u);setEditForm({name:u.name,email:u.email,password:"",phone:u.phone||"",matricule:u.matricule||"",siteId:u.siteId||"CET-JIJ"});}}>
                      ✏️ Modifier
                    </button>
                    <button className={`btn bsm ${u.status==="active"?"be":"bp"}`}
                      onClick={()=>toggleStatus(u)}>
                      {u.status==="active"?"🔒":"🔓"}
                    </button>
                    <button className="btn bg bsm" title="Supprimer"
                      onClick={()=>{ if(window.confirm(`Supprimer l'opérateur ${u.name} ?`)) deleteUser(u.id); }}>
                      🗑
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab==="pending"&&(
        pendingOps.length===0?(
          <div className="card" style={{color:"var(--muted)",textAlign:"center",padding:40}}>
            <div style={{fontSize:32,marginBottom:10}}>✅</div>
            <div>Aucune demande en attente</div>
          </div>
        ):(
          <div className="op-grid">
            {pendingOps.map(u=>(
              <div key={u.id} className="op-card">
                <div className="fx aic jsb mb3">
                  <div className="fx aic g2">
                    <div className="op-avatar op-av-op">👤</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:13}}>{u.name}</div>
                      <span className="badge b-warn">En attente</span>
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,fontSize:12,marginBottom:12}}>
                  <div className="fx aic g2"><span>📧</span><span className="tmu truncate">{u.email}</span></div>
                  <div className="fx aic g2"><span>📞</span><span className="tmu">{u.phone||"—"}</span></div>
                  <div className="fx aic g2"><span>🏭</span><span className="tmu">Demandé: {siteLabel(u.siteId)}</span></div>
                  <div className="fx aic g2"><span>📅</span><span className="tmu">{u.createdAt}</span></div>
                </div>
                <div className="fg fg2">
                  <button className="btn bp bsm" onClick={()=>approveOp(u)}>✓ Approuver</button>
                  <button className="btn be bsm" onClick={()=>rejectOp(u)}>✗ Refuser</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add operator modal */}
      {modal&&(
        <div className="ov">
          <div className="modal modal-lg">
            <div className="mh"><span className="mh-title">➕ Créer un compte opérateur</span><button className="btn bg bsm" onClick={()=>setModal(false)}>✕</button></div>
            <div className="mb2">
              <div className="fg" style={{gap:14}}>
                <div className="fg fg2">
                  <div className="field"><label>Nom complet *</label>
                    <input className="fi" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Prénom Nom"/>
                  </div>
                  <div className="field"><label>Matricule</label>
                    <input className="fi" value={form.matricule} onChange={e=>set("matricule",e.target.value)} placeholder={`OP-${new Date().getFullYear()}-00${operators.length+1}`}/>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>Adresse e-mail *</label>
                    <input className="fi" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="prenom.nom@epwgcet-jijel.dz"/>
                  </div>
                  <div className="field"><label>Téléphone</label>
                    <input className="fi" value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="0770 00 00 00"/>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>Site d'affectation</label>
                    <select className="fi" value={form.siteId} onChange={e=>set("siteId",e.target.value)}>
                      {sites.map(s=><option key={s.id} value={s.id}>{s.name} — {s.region}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Mot de passe temporaire *</label>
                    <input className="fi" type="password" value={form.password} onChange={e=>set("password",e.target.value)} placeholder="Min. 6 caractères"/>
                  </div>
                </div>
              </div>
            </div>
            <div className="mf">
              <button className="btn bg" onClick={()=>setModal(false)}>Annuler</button>
              <button className="btn bp" disabled={!form.name||!form.email||!form.password} onClick={handleAdd}>✓ Créer le compte</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit operator modal */}
      {editOp&&(
        <div className="ov">
          <div className="modal modal-lg">
            <div className="mh"><span className="mh-title">✏️ Modifier l'opérateur</span><button className="btn bg bsm" onClick={()=>setEditOp(null)}>✕</button></div>
            <div className="mb2">
              <div className="fg" style={{gap:14}}>
                <div className="fg fg2">
                  <div className="field"><label>Nom complet *</label>
                    <input className="fi" value={editForm.name} onChange={e=>setEd("name",e.target.value)}/>
                  </div>
                  <div className="field"><label>Matricule</label>
                    <input className="fi" value={editForm.matricule} onChange={e=>setEd("matricule",e.target.value)}/>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>Adresse e-mail *</label>
                    <input className="fi" type="email" value={editForm.email} onChange={e=>setEd("email",e.target.value)}/>
                  </div>
                  <div className="field"><label>Téléphone</label>
                    <input className="fi" value={editForm.phone} onChange={e=>setEd("phone",e.target.value)}/>
                  </div>
                </div>
                <div className="fg fg2">
                  <div className="field"><label>Site d'affectation</label>
                    <select className="fi" value={editForm.siteId} onChange={e=>setEd("siteId",e.target.value)}>
                      {sites.map(s=><option key={s.id} value={s.id}>{s.name} — {s.region}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Nouveau mot de passe (laisser vide = inchangé)</label>
                    <input className="fi" type="password" value={editForm.password} onChange={e=>setEd("password",e.target.value)} placeholder="Laisser vide pour ne pas changer"/>
                  </div>
                </div>
              </div>
            </div>
            <div className="mf">
              <button className="btn bg" onClick={()=>setEditOp(null)}>Annuler</button>
              <button className="btn bp" disabled={!editForm.name||!editForm.email} onClick={()=>{
                updateUser({...editOp,name:editForm.name,email:editForm.email,password:editForm.password||"",phone:editForm.phone,matricule:editForm.matricule,siteId:editForm.siteId});
                setEditOp(null);
              }}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function amountToWords(amount) {
  const rounded = Math.round(amount * 100);
  const din = Math.floor(rounded / 100);
  const cts = rounded % 100;
  const ONES = ['','UN','DEUX','TROIS','QUATRE','CINQ','SIX','SEPT','HUIT','NEUF',
    'DIX','ONZE','DOUZE','TREIZE','QUATORZE','QUINZE','SEIZE','DIX-SEPT','DIX-HUIT','DIX-NEUF'];
  function w(n) {
    if (!n) return '';
    if (n <= 19) return ONES[n];
    if (n <= 69) {
      const t=Math.floor(n/10), o=n%10;
      const ts=['','','VINGT','TRENTE','QUARANTE','CINQUANTE','SOIXANTE'][t];
      if (!o) return ts;
      if (o===1 && t!==8) return ts+'-ET-UN';
      return ts+'-'+ONES[o];
    }
    if (n <= 79) { const o=n-60; return o===11?'SOIXANTE-ET-ONZE':'SOIXANTE-'+ONES[o]; }
    if (n <= 99) { const o=n-80; return o?'QUATRE-VINGT-'+ONES[o]:'QUATRE-VINGTS'; }
    if (n <= 199) { const r=n-100; return 'CENT'+(r?' '+w(r):''); }
    if (n <= 999) { const h=Math.floor(n/100),r=n%100; return ONES[h]+' CENT'+(r?' '+w(r):'S'); }
    if (n <= 1999) { const r=n-1000; return 'MILLE'+(r?' '+w(r):''); }
    if (n <= 999999) { const th=Math.floor(n/1000),r=n%1000; return w(th)+' MILLE'+(r?' '+w(r):''); }
    const m=Math.floor(n/1e6),r=n%1e6; return w(m)+(m>1?' MILLIONS':' MILLION')+(r?' '+w(r):'');
  }
  let s=(din?w(din):'ZÉRO')+' DINAR'+(din>1?'S':'');
  if (cts) s+=' ET '+w(cts)+' CENTIME'+(cts>1?'S':'');
  return s;
}

function generateOfficialBillHTML(c, entries, company, month, invNum, wasteTypes) {
  const fB = n => new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
  const fQ = n => new Intl.NumberFormat('fr-FR',{minimumFractionDigits:3,maximumFractionDigits:3}).format(n);
  const TVA = c.vatSubject ? 19 : 0;
  // Group by wasteType + billing mode (tonnage vs rotation) so each appears as its own line
  const groups = {};
  entries.forEach(d => {
    const isRot = d.payMethod === 'rotation';
    const key = `${d.wasteType}__${isRot ? 'rotation' : 'tonnage'}`;
    if (!groups[key]) groups[key] = {wasteType:d.wasteType, isRotation:isRot, count:0, net:0, total:0, unitPrice:d.unitPrice};
    groups[key].count += 1;
    groups[key].net   += d.net;
    groups[key].total += d.total;
  });
  const rows = Object.values(groups).map((g,i)=>({
    num: i+1,
    label: wasteTypes.find(w=>w.id===g.wasteType)?.label || g.wasteType,
    isRotation: g.isRotation,
    qty: g.isRotation ? g.count : g.net,
    unitPrice: g.unitPrice,
    tva: TVA,
    ht: g.total,
  }));
  const totalHT  = rows.reduce((s,r)=>s+r.ht, 0);
  const totalTVA = totalHT * TVA / 100;
  const totalTTC = totalHT + totalTVA;
  const hasTonnage  = rows.some(r=>!r.isRotation);
  const hasRotation = rows.some(r=>r.isRotation);
  const totalTonnes = rows.filter(r=>!r.isRotation).reduce((s,r)=>s+r.qty, 0);
  const totalRots   = rows.filter(r=>r.isRotation).reduce((s,r)=>s+r.qty, 0);
  const totalQtyDisplay = (hasTonnage && hasRotation)
    ? `${fQ(totalTonnes)} t + ${totalRots} rot.`
    : hasRotation ? `${totalRots} rotation${totalRots>1?'s':''}` : `${fQ(totalTonnes)} t`;
  const date = new Date().toLocaleDateString('fr-DZ');
  const co = f => (Array.isArray(company)?company:COMPANY_FIELDS_DEFAULT).find(x=>x.id===f)?.value||'';
  const rowsHTML = rows.map(r=>`
    <tr>
      <td style="text-align:center;">${r.num}</td>
      <td>${r.label} &mdash; <em>${r.isRotation ? 'Rotation' : 'Tonnage'}</em></td>
      <td style="text-align:right;">${r.isRotation ? r.qty+' rot.' : fQ(r.qty)+' t'}</td>
      <td style="text-align:right;">${fB(r.unitPrice)}&nbsp;/&nbsp;${r.isRotation ? 'rot.' : 't'}</td>
      <td style="text-align:center;">${r.tva}%</td>
      <td style="text-align:right;">${fB(r.ht)}</td>
    </tr>`).join('');
  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40' lang="fr">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>Facture ${invNum}</title>
<!--[if gte mso 9]><xml>
<w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml><![endif]-->
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#000}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #000;padding:6px 10px}
  th{background:#f0f0f0;font-weight:bold;text-align:center;font-size:13px}
  .nb td,.nb th{border:none;padding:3px 5px}
  .sep{border-top:2.5px solid #000;margin:6px 0}
  .sep2{border-top:1px solid #000;margin:5px 0}
  .r{text-align:right}.c{text-align:center}.b{font-weight:bold}
  @page WordSection1{size:21.0cm 29.7cm;margin:1.5cm 1.8cm;mso-page-orientation:portrait}
  @page{size:21.0cm 29.7cm;margin:1.5cm 1.8cm}
  div.WordSection1{page:WordSection1}
  @media print{body{padding:0}}
</style>
</head>
<body>
<div class="WordSection1">

<!-- ── HEADER TOP: Arabic centered ── -->
<div style="text-align:center;font-size:15px;font-weight:bold;direction:rtl;font-family:'Traditional Arabic',Arial,sans-serif;margin-bottom:8px;color:#000">
  الجمهورية الجزائرية الديموقراطية الشعبية
</div>

<!-- ── HEADER: French LEFT | Logo RIGHT ── -->
<table class="nb" style="width:100%;margin-bottom:6px">
  <tr>
    <!-- LEFT: French company details -->
    <td style="border:none;vertical-align:top;width:70%">
      <div style="font-size:12px;line-height:2;color:#000">
        <div style="font-size:13.5px;font-weight:bold;margin-bottom:4px">
          Etablissement Publique de Wilaya de Gestion des Centres d'Enfouissement Technique JIJEL
        </div>
        <div>Cité Administrative, 01ème Étage, Ayouf Ouest — Jijel</div>
        <div>IF&nbsp;: 000918044299126 &nbsp;·&nbsp; RC&nbsp;: 18/000442991H09</div>
        <div>Tél&nbsp;: 034 47 37 62 &nbsp;·&nbsp; Fax&nbsp;: 034 47 37 62</div>
        <div>BNQ&nbsp;: BADR Jijel — 00300676300261300093</div>
      </div>
    </td>
    <!-- RIGHT: Official Logo -->
    <td style="border:none;text-align:right;vertical-align:middle;width:30%">
      <img src="/logo.png" alt="EPWGCET" style="width:90px;height:90px;object-fit:contain"/>
    </td>
  </tr>
</table>

<div class="sep"></div>

<!-- ── INVOICE REFERENCE LINE ── -->
<div style="display:flex;justify-content:space-between;padding:6px 2px;font-weight:bold;font-size:13.5px">
  <span>FACTURE CLIENT : ${invNum}</span>
  <span>JIJEL, LE : ${date}</span>
</div>

<div class="sep"></div>

<!-- ── CLIENT BLOCK (left-aligned) ── -->
<div style="margin:10px 2px 14px;font-size:12.5px;line-height:1.9">
  <div style="font-weight:bold;font-size:13px;margin-bottom:3px">FACTURÉ À :</div>
  <div>${c.id} — ${c.name}</div>
  ${c.nif    ? `<div>M.F.&nbsp;: ${c.nif}</div>` : ''}
  ${c.rc     ? `<div>R.C.&nbsp;: ${c.rc}</div>`  : ''}
  ${c.address? `<div>${c.address}</div>`           : ''}
  <div style="margin-top:4px;font-size:11.5px;color:#555">
    Régime TVA&nbsp;: ${TVA > 0 ? `Assujetti — ${TVA}%` : 'Non assujetti (exonéré)'}
  </div>
</div>

<!-- ── ITEMS TABLE ── -->
<table>
  <thead>
    <tr>
      <th style="width:36px">N°</th>
      <th style="text-align:left;padding-left:10px">DÉSIGNATION</th>
      <th style="width:100px">QUANTITÉ</th>
      <th style="width:110px">PRIX U. (DA)</th>
      <th style="width:64px">% TVA</th>
      <th style="width:110px">MONTANT HT</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHTML}
    <tr style="background:#f5f5f5">
      <td colspan="2" class="b" style="font-size:13px">TOTAL GÉNÉRAL (${rows.length} ligne${rows.length>1?'s':''})</td>
      <td class="r b">${totalQtyDisplay}</td>
      <td></td><td></td>
      <td class="r b">${fB(totalHT)}</td>
    </tr>
  </tbody>
</table>

<!-- ── AMOUNT IN WORDS ── -->
<div style="margin-top:10px;border:1px solid #000;padding:7px 12px;font-size:12px">
  <strong>Arrêtée la présente facture à la somme de :</strong><br>
  <span style="font-weight:bold;text-transform:uppercase;letter-spacing:.02em">${amountToWords(totalTTC)}</span>
</div>

<!-- ── TVA SUMMARY + TOTALS ── -->
<div style="display:flex;gap:16px;margin-top:12px;align-items:flex-start">
  <table style="width:46%">
    <thead>
      <tr><th>TVA %</th><th>BASE HT</th><th>MONTANT TVA</th></tr>
    </thead>
    <tbody>
      <tr>
        <td class="c">${TVA > 0 ? TVA+',00 %' : 'Exonéré'}</td>
        <td class="r">${fB(totalHT)}</td>
        <td class="r">${fB(totalTVA)}</td>
      </tr>
      <tr class="b">
        <td class="c b">TOTAL</td>
        <td class="r b">${fB(totalHT)}</td>
        <td class="r b">${fB(totalTVA)}</td>
      </tr>
    </tbody>
  </table>
  <table style="width:52%;margin-left:auto">
    <tbody>
      <tr><td style="width:58%">Montant H.T.</td><td class="r">${fB(totalHT)}</td></tr>
      <tr><td>T.V.A. (${TVA}%)</td><td class="r">${fB(totalTVA)}</td></tr>
      <tr><td>Montant T.T.C.</td><td class="r">${fB(totalTTC)}</td></tr>
      <tr style="background:#e8e8e8">
        <td class="b" style="font-size:14px">NET À PAYER</td>
        <td class="r b" style="font-size:15px">${fB(totalTTC)}</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- ── SIGNATURE ── -->
<div style="margin-top:48px;display:flex;justify-content:flex-start;padding-left:8%">
  <div style="text-align:center;min-width:200px">
    <div style="font-weight:bold;font-size:13px;margin-bottom:60px;text-transform:uppercase">Le Directeur</div>
    <div style="border-top:1px solid #000;padding-top:5px;font-size:11px;color:#555">Signature &amp; Cachet</div>
  </div>
</div>

<!-- ── FOOTER ── -->
<div style="margin-top:28px;padding-top:7px;border-top:1px solid #bbb;font-size:10px;color:#666;text-align:center">
  ${co('name')} — ${co('address')} — Tél&nbsp;: ${co('phone')} — ${co('email')}
</div>

</div></body></html>`;
}
/* ═══════════════════════════════════════════════════════════════════════════
   INVOICE / RELEVÉ MENSUEL
═══════════════════════════════════════════════════════════════════════════ */
function PageInvoice({clients,discharges,sites,wasteTypes,invoices,addInvoice,updateInvoice,company}) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const [view,  setView]  = useState("global"); // "global" | "client" | "debts"
  const [selC,  setSelC]  = useState("");
  const [month, setMonth] = useState(defaultMonth);

  const billed = clients.filter(c=>(c.type==="convention"||c.type==="rotation"||c.type==="prepaid")&&c.status==="approved");
  const c       = billed.find(c=>c.id===selC) || billed[0];
  const selCId  = c?.id || "";
  const entries = discharges.filter(d=>d.clientId===selCId&&d.ts.startsWith(month)&&d.status!=="cancelled");
  const totalNet  = entries.reduce((s,d)=>s+d.net,0);
  const totalCost = entries.reduce((s,d)=>s+d.total,0);
  const invNum    = `FAC-${month.replace("-","")}-${selCId}`;
  const currentInv = invoices.find(i=>i.id===invNum) || invoices.find(i=>i.clientId===selCId&&i.month===month);

  const monthLabel = new Date(month+"-02").toLocaleString("fr-FR",{month:"long",year:"numeric"});
  const globalRows = billed.map(cl=>{
    const clEntries = discharges.filter(d=>d.clientId===cl.id&&d.ts.startsWith(month)&&d.status!=="cancelled");
    const clNet  = clEntries.reduce((s,d)=>s+d.net,0);
    const clCost = clEntries.reduce((s,d)=>s+d.total,0);
    const existInv = invoices.find(i=>i.clientId===cl.id&&i.month===month);
    return {cl, entries:clEntries, net:clNet, cost:clCost, inv:existInv};
  });
  const grandNet  = globalRows.filter(r=>r.cl.type!=="rotation").reduce((s,r)=>s+r.net,0);
  const grandCost = globalRows.reduce((s,r)=>s+r.cost,0);
  const grandDeps = globalRows.reduce((s,r)=>s+r.entries.length,0);

  const switchToClient = (id) => { setSelC(id); setView("client"); };

  // Generate/update invoice for a client+month (totalAmount stored as TTC)
  const generateInvoice = async (cl, costHT) => {
    const ttc = cl.vatSubject ? Math.round(costHT * 1.19 * 100) / 100 : costHT;
    const id = `FAC-${month.replace("-","")}-${cl.id}`;
    // Use same fallback lookup strategy so we always find the existing invoice
    const existing = invoices.find(i=>i.id===id) || invoices.find(i=>i.clientId===cl.id&&i.month===month);
    if (existing) {
      // Preserve status: keep "paid" and "partial" as-is, only reset overdue→pending
      const preservedStatus = existing.status==="paid"?"paid":existing.status==="partial"?"partial":"pending";
      await updateInvoice({...existing, totalAmount:ttc, status:preservedStatus});
    } else {
      await addInvoice({id, clientId:cl.id, month, totalAmount:ttc, status:"pending", note:""});
    }
  };

  const generateAllInvoices = async () => {
    for (const row of globalRows) {
      if (row.entries.length > 0) await generateInvoice(row.cl, row.cost);
    }
  };

  const [payInvModal, setPayInvModal] = useState(null);
  const [partialAmt,  setPartialAmt]  = useState("");
  const [payConfirm,  setPayConfirm]  = useState(false);

  const openPayModal = (inv) => { setPayInvModal(inv); setPartialAmt(String(inv.totalAmount - (inv.paidAmount||0))); setPayConfirm(false); };

  const doMarkPaid = async (inv, partial=false) => {
    const amt = partial ? (parseFloat(partialAmt)||0) : (inv.totalAmount - (inv.paidAmount||0));
    const newPaid = (inv.paidAmount||0) + amt;
    const isFull  = newPaid >= inv.totalAmount;
    await updateInvoice({...inv,
      paidAmount: newPaid,
      status: isFull ? "paid" : "partial",
      paidAt: isFull ? new Date().toISOString().slice(0,10) : null,
    });
    setPayInvModal(null);
    setPayConfirm(false);
  };

  const markPaid = async (inv) => openPayModal(inv);

  const markOverdue = async (inv) => {
    await updateInvoice({...inv, status:"overdue"});
  };
  const downloadOfficialPDF = () => {
    if (!c || entries.length === 0) return;
    const html = generateOfficialBillHTML(c, entries, company, month, invNum, wasteTypes);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  const downloadOfficialWord = () => {
    if (!c || entries.length === 0) return;
    const html = generateOfficialBillHTML(c, entries, company, month, invNum, wasteTypes);
    const blob = new Blob(['\ufeff', html], {type: 'application/msword'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invNum}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  // All overdue/pending invoices
  const debtInvoices = invoices.filter(i=>i.status==="overdue"||i.status==="pending");
  const debtTotal = debtInvoices.reduce((s,i)=>s+i.totalAmount,0);

  return (
    <>
      {/* View tabs + month picker */}
      <div className="fx aic jsb mb4" style={{flexWrap:"wrap",gap:12}}>
        <div className="seg" style={{width:"fit-content"}}>
          {[["global","🗓 Vue Mensuelle"],["client","📋 Relevé Client"],["debts",`🔴 Dettes${debtInvoices.length>0?` (${debtInvoices.length})`:""}`]].map(([v,l])=>(
            <button key={v} className={`seg-btn${view===v?" active":""}`} onClick={()=>setView(v)}>{l}</button>
          ))}
        </div>
        <div className="fx aic g2">
          {view!=="debts"&&(
            <div className="field" style={{margin:0}}>
              <input className="fi" type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{width:160}}/>
            </div>
          )}
          {view==="global"&&grandDeps>0&&(
            <button className="btn bp bsm" onClick={generateAllInvoices}>🧾 Générer factures du mois</button>
          )}
        </div>
      </div>

      {/* ── GLOBAL MONTHLY VIEW ── */}
      {view==="global"&&(
        <>
          <div className="kpi-grid" style={{gridTemplateColumns:"repeat(4,1fr)",marginBottom:16}}>
            {[
              {lbl:"Clients facturables", val:billed.length,         ic:"🏢", kc:"var(--info)"},
              {lbl:"Tonnage Total (hors rot.)", val:fmtN(grandNet)+" t", ic:"⚖️", kc:"var(--purple)"},
              {lbl:"Montant Total Dû",    val:fmt(grandCost),        ic:"💰", kc:"var(--g)"},
              {lbl:"Factures générées",   val:globalRows.filter(r=>r.inv).length+"/"+billed.length, ic:"🧾", kc:"var(--warn)"},
            ].map(k=>(
              <div key={k.lbl} className="kpi" style={{"--kc":k.kc}}>
                <div className="kpi-i">{k.ic}</div>
                <div className="kpi-l">{k.lbl}</div>
                <div className="kpi-v">{k.val}</div>
                <div className="kpi-s">{grandDeps} dépôts · {monthLabel}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="ph">
              <span className="pt">Relevé Mensuel — {monthLabel}</span>
              <span className="tsm tmu">{billed.length} clients facturables</span>
            </div>
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Client</th><th>Type</th><th>Dépôts</th>
                    <th>Tonnage (t)</th><th>Montant Dû</th>
                    <th>Statut Facture</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {globalRows.map(({cl,entries:clE,net:clN,cost:clC,inv})=>{
                    return (
                      <tr key={cl.id}>
                        <td style={{fontWeight:700}}>{cl.name}</td>
                        <td>
                          {cl.type==="rotation"
                            ?<span className="badge" style={{background:"rgba(251,146,60,.12)",color:"var(--orange)",border:"1px solid rgba(251,146,60,.3)"}}>🔄 Rotation</span>
                            :<span className={`badge ${cl.type==="credit"?"":cl.clientType==="state"?"b-purple":"b-info"}`}
                              style={cl.type==="credit"?{background:"rgba(139,92,246,.15)",color:"#7c3aed",border:"1px solid rgba(139,92,246,.3)"}:{}}>
                              {cl.type==="credit"?"💳 Crédit":cl.clientType==="state"?"🏛 État":"🏢 Privé"}
                            </span>}
                        </td>
                        <td>
                          {clE.length===0
                            ?<span className="mn tmu">—</span>
                            :<span className="mn fw7">{clE.length}</span>}
                        </td>
                        <td><span className="mn">{clE.length>0?fmtN(clN)+" t":"—"}</span></td>
                        <td>
                          {clC>0 ? (
                            <div>
                              <span className="mn fw7">{fmt(cl.vatSubject ? clC*1.19 : clC)}</span>
                              {cl.vatSubject && <span className="mn tmu" style={{fontSize:9,marginLeft:4}}>TTC</span>}
                            </div>
                          ) : <span className="mn tmu">—</span>}
                        </td>
                        <td>
                          {inv
                            ?<div style={{display:"flex",flexDirection:"column",gap:5}}>
                                <div className="fx aic g2"><InvoiceStatusBadge s={inv.status}/>{inv.paidAt&&<span className="mn tmu" style={{fontSize:9}}>{inv.paidAt}</span>}</div>
                                {(inv.status==="partial"||(inv.paidAmount>0&&inv.status!=="paid"))&&<PayProgress inv={inv} compact/>}
                              </div>
                            :<span className="mn tmu" style={{fontSize:10}}>Non générée</span>}
                        </td>
                        <td>
                          <div className="fx aic g2">
                            <button className="btn bi bsm" onClick={()=>switchToClient(cl.id)}>📋</button>
                            {clC>0&&!inv&&(
                              <button className="btn bp bsm" style={{fontSize:10}} onClick={()=>generateInvoice(cl,clC)}>🧾 Facturer</button>
                            )}
                            {inv&&inv.status!=="paid"&&(
                              <button className="btn bsm" style={{fontSize:10,background:"var(--g)",color:"#fff",borderColor:"var(--g)"}} onClick={()=>markPaid(inv)}>✓ Payée</button>
                            )}
                            {inv&&inv.status==="pending"&&(
                              <button className="btn be bsm" style={{fontSize:10}} onClick={()=>markOverdue(inv)}>🔴 Impayée</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {grandDeps>0&&(
                    <tr style={{background:"var(--ovl-sm)",borderTop:`2px solid var(--bdr)`}}>
                      <td colSpan={2} style={{fontWeight:800,fontFamily:"var(--head)",fontSize:14}}>TOTAL DU MOIS</td>
                      <td><span className="mn fw7">{grandDeps}</span></td>
                      <td><span className="mn fw7">{fmtN(grandNet)} t</span></td>
                      <td><span className="mn fw8 tg" style={{fontFamily:"var(--head)",fontSize:15}}>{fmt(grandCost)}</span></td>
                      <td colSpan={2}/>
                    </tr>
                  )}
                  {grandDeps===0&&(
                    <tr>
                      <td colSpan={7} style={{textAlign:"center",padding:40}}>
                        <div style={{fontSize:32,marginBottom:8}}>📭</div>
                        <div style={{color:"var(--muted)"}}>Aucun dépôt pour {monthLabel}</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── DEBT / UNPAID INVOICES ── */}
      {view==="debts"&&(
        <>
          <div className="kpi-grid" style={{gridTemplateColumns:"repeat(3,1fr)",marginBottom:16}}>
            {[
              {lbl:"Factures impayées",  val:invoices.filter(i=>i.status==="overdue").length,  ic:"🔴", kc:"var(--err)"},
              {lbl:"En attente",         val:invoices.filter(i=>i.status==="pending").length,   ic:"⏳", kc:"var(--warn)"},
              {lbl:"Total dettes",       val:fmt(debtTotal),                                   ic:"💸", kc:"var(--err)"},
            ].map(k=>(
              <div key={k.lbl} className="kpi" style={{"--kc":k.kc}}>
                <div className="kpi-i">{k.ic}</div>
                <div className="kpi-l">{k.lbl}</div>
                <div className="kpi-v">{k.val}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="ph">
              <span className="pt">Factures Impayées / En Attente</span>
              <span className="tsm tmu">{debtInvoices.length} facture(s)</span>
            </div>
            <div className="tw">
              <table>
                <thead>
                  <tr><th>Référence</th><th>Client</th><th>Mois</th><th>Total</th><th>Payé</th><th>Reste dû</th><th>Statut</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {debtInvoices.length===0?(
                    <tr><td colSpan={8} style={{textAlign:"center",padding:40,color:"var(--muted)"}}>
                      <div style={{fontSize:32,marginBottom:8}}>✅</div>Aucune dette en cours
                    </td></tr>
                  ):debtInvoices.map(inv=>{
                    const cl = clients.find(c=>c.id===inv.clientId);
                    const mLbl = new Date(inv.month+"-02").toLocaleString("fr-FR",{month:"long",year:"numeric"});
                    const paid = inv.paidAmount||0;
                    const rem  = inv.totalAmount - paid;
                    return (
                      <tr key={inv.id} style={{background:inv.status==="overdue"?"rgba(239,68,68,.04)":""}}>
                        <td><span className="mn tmu">{inv.id}</span></td>
                        <td style={{fontWeight:700}}>{cl?.name||inv.clientId}</td>
                        <td><span className="mn">{mLbl}</span></td>
                        <td><span className="mn fw7">{fmt(inv.totalAmount)}</span></td>
                        <td><span className="mn" style={{color:paid>0?"var(--g)":"var(--muted)"}}>{paid>0?fmt(paid):"—"}</span></td>
                        <td>
                          <div style={{display:"flex",flexDirection:"column",gap:4}}>
                            <span className="mn fw7" style={{color:"var(--err)"}}>{fmt(rem)}</span>
                            {paid>0&&<PayProgress inv={inv} compact/>}
                          </div>
                        </td>
                        <td><InvoiceStatusBadge s={inv.status}/></td>
                        <td>
                          <div className="fx aic g2">
                            <button className="btn bsm" style={{fontSize:10,background:"var(--g)",color:"#fff",borderColor:"var(--g)"}} onClick={()=>markPaid(inv)}>💳 Payer</button>
                            {inv.status==="pending"&&(
                              <button className="btn be bsm" style={{fontSize:10}} onClick={()=>markOverdue(inv)}>🔴 Impayée</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── CLIENT DETAILED VIEW ── */}
      {view==="client"&&(
        <>
          <div className="fx aic g3 mb4">
            <div className="field" style={{flex:1}}><label>Client (convention ou prépayé)</label>
              <select className="fi" value={selCId} onChange={e=>setSelC(e.target.value)}>
                {billed.map(cl=><option key={cl.id} value={cl.id}>{cl.name} [{cl.type==="prepaid"?"Prépayé":cl.clientType==="state"?"État":"Privé"}]</option>)}
              </select>
            </div>
          </div>

      {c&&(
        <div className="inv-print-area">
        <div className="panel">
          {/* ── Invoice print header ── */}
          <div style={{background:"linear-gradient(135deg,var(--s2),var(--s3))",borderBottom:"1px solid var(--bdr)",padding:20,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontFamily:"var(--head)",fontSize:18,fontWeight:800,color:"var(--g)",display:"flex",alignItems:"center",gap:8}}><img src="/logo.png" alt="EPWGCET" style={{width:36,height:36,objectFit:"contain"}}/>{cof(company,'short')}</div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:4,lineHeight:1.6}}>
                {cof(company,'name')}<br/>
                {cof(company,'address')}<br/>
                Tél : {cof(company,'phone')} · {cof(company,'email')}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"var(--head)",fontSize:22,fontWeight:800,letterSpacing:".05em"}}>FACTURE</div>
              <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)",marginTop:2}}>{invNum}</div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>
                Émise le : {new Date().toLocaleDateString("fr-DZ")}<br/>
                Période : <strong>{new Date(month+"-01").toLocaleString("fr-FR",{month:"long",year:"numeric"})}</strong>
              </div>
              {(()=>{const inv=currentInv;return inv?<div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}><InvoiceStatusBadge s={inv.status}/>{(inv.status==="partial"||(inv.paidAmount>0&&inv.status!=="paid"))&&<PayProgress inv={inv}/>}</div>:null;})()}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,padding:"16px 20px 0"}}>
            <div className="card-sm">
              <div className="tsm tmu mb1">FACTURÉ À</div>
              <div style={{fontWeight:700,fontSize:14}}>{c.name}</div>
              <div className="mn tsm tmu mt1">{c.id}</div>
              {c.nif&&<div className="tsm tmu" style={{marginTop:2}}>NIF : {c.nif}</div>}
              {c.rc&&<div className="tsm tmu" style={{marginTop:2}}>RC : {c.rc}</div>}
              {c.phone&&<div className="tsm tmu" style={{marginTop:2}}>Tél : {c.phone}</div>}
              {c.address&&<div className="tsm tmu" style={{marginTop:2}}>{c.address}</div>}
            </div>
            <div className="card-sm">
              <div className="tsm tmu mb2">SYNTHÈSE DE FACTURATION</div>
              {(c.type==="rotation"
                ? [["Nombre de rotations", entries.length], ["Tonnage total (info)", fmtN(totalNet)+" t"]]
                : [["Nombre de dépôts", entries.length],    ["Tonnage total",         fmtN(totalNet)+" t"]]
              ).map(([l,v])=>(
                <div key={l} className="fx jsb mb1"><span className="tsm">{l}</span><span className="mn tsm fw7">{v}</span></div>
              ))}
              <div style={{borderTop:"1px solid var(--bdr)",paddingTop:8,marginTop:6}}>
                {c.vatSubject ? (
                  <>
                    <div className="fx jsb mb1">
                      <span className="tsm">Montant HT</span>
                      <span className="mn tsm fw7">{fmt(totalCost)}</span>
                    </div>
                    <div className="fx jsb mb1">
                      <span className="tsm" style={{color:"var(--warn)"}}>TVA 19%</span>
                      <span className="mn tsm fw7" style={{color:"var(--warn)"}}>{fmt(totalCost*0.19)}</span>
                    </div>
                    <div className="fx jsb" style={{borderTop:"1px solid var(--bdr)",paddingTop:6,marginTop:4}}>
                      <span className="tsm fw7">Total TTC</span>
                      <span className="tg fw8" style={{fontFamily:"var(--head)",fontSize:16}}>{fmt(totalCost*1.19)}</span>
                    </div>
                  </>
                ) : (
                  <div className="fx jsb">
                    <span className="tsm fw7">Montant total HT <span style={{color:"var(--muted)",fontWeight:400}}>(exonéré TVA)</span></span>
                    <span className="tg fw8" style={{fontFamily:"var(--head)",fontSize:16}}>{fmt(totalCost)}</span>
                  </div>
                )}
              </div>
              {(()=>{const inv=currentInv;
                if (!inv||inv.paidAmount<=0) return null;
                const rem=inv.totalAmount-(inv.paidAmount||0);
                return <>
                  <div className="fx jsb mt1"><span className="tsm" style={{color:"var(--g)"}}>Déjà réglé</span><span className="mn tsm fw7" style={{color:"var(--g)"}}>{fmt(inv.paidAmount)}</span></div>
                  {rem>0&&<div className="fx jsb mt1"><span className="tsm fw7" style={{color:"var(--err)"}}>Reste dû</span><span className="mn fw8" style={{fontFamily:"var(--head)",fontSize:15,color:"var(--err)"}}>{fmt(rem)}</span></div>}
                  <div style={{marginTop:8}}><PayProgress inv={inv}/></div>
                </>;
              })()}
            </div>
          </div>

          {/* ── Limit / quota progress ── */}
          {(c.creditEnabled || c.weightLimitYear>0) && (()=>{
            const isRotation = c.type==="rotation";
            const isMonthlyQ = !c.creditEnabled && !isRotation && c.payFrequency==="monthly";
            const isMonthlyR = isRotation && c.payFrequency==="monthly";
            const pfx = (isMonthlyQ||isMonthlyR)
              ? `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`
              : now.getFullYear().toString();
            const periodDs = discharges.filter(d=>d.clientId===c.id&&d.ts.startsWith(pfx)&&d.status!=="cancelled");
            const usedPeriod = c.creditEnabled
              ? c.consumed
              : isRotation
                ? periodDs.length
                : periodDs.reduce((s,d)=>s+d.net,0);
            const limit = c.creditEnabled ? c.creditLimit : c.weightLimitYear;
            const pct   = limit>0 ? Math.min(Math.round((usedPeriod/limit)*100),100) : 0;
            const col   = pct>=100?"var(--err)":pct>80?"var(--warn)":pct>60?"#ca8a04":"var(--g)";
            const periodLabel = c.creditEnabled
              ? null
              : (isMonthlyQ||isMonthlyR)
                ? now.toLocaleString("fr-DZ",{month:"long",year:"numeric"})
                : String(now.getFullYear());
            return (
              <div style={{padding:"0 20px 16px"}}>
                <div className="card-sm" style={{borderTop:`3px solid ${col}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".1em"}}>
                      {c.creditEnabled?"Limite Crédit DA":isRotation?(isMonthlyR?"Quota Mensuel (rot.)":"Quota Annuel (rot.)"):(isMonthlyQ?"Quota Mensuel (t)":"Quota Annuel (t)")}
                      {periodLabel&&<span style={{marginLeft:6,fontWeight:400}}>— {periodLabel}</span>}
                    </span>
                    <span style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:800,color:col}}>{pct}%</span>
                  </div>
                  <div className="cbt" style={{height:8,borderRadius:4,marginBottom:8}}>
                    <div className="cbf" style={{width:`${pct}%`,background:col,borderRadius:4,transition:"width .5s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                    <span style={{color:"var(--muted)"}}>
                      {c.creditEnabled
                        ?<><span style={{color:col,fontFamily:"var(--mono)",fontWeight:700}}>{fmt(usedPeriod)}</span> utilisé</>
                        :isRotation
                          ?<><span style={{color:col,fontFamily:"var(--mono)",fontWeight:700}}>{usedPeriod}</span> rotation(s)</>
                          :<><span style={{color:col,fontFamily:"var(--mono)",fontWeight:700}}>{fmtN(usedPeriod)} t</span> utilisé</>}
                    </span>
                    <span style={{color:"var(--muted)"}}>
                      Limite : <span style={{fontFamily:"var(--mono)",fontWeight:700,color:"var(--txt)"}}>
                        {c.creditEnabled?fmt(limit):isRotation?(limit+" rot."):fmtN(limit)+" t"}
                      </span>
                    </span>
                    <span style={{color:pct>=100?"var(--err)":"var(--g)"}}>
                      Restant : <span style={{fontFamily:"var(--mono)",fontWeight:700}}>
                        {c.creditEnabled?fmt(Math.max(0,limit-usedPeriod)):isRotation?(Math.max(0,limit-usedPeriod)+" rot."):fmtN(Math.max(0,limit-usedPeriod))+" t"}
                      </span>
                    </span>
                  </div>
                  {pct>=100&&(
                    <div className="alrt ae" style={{marginTop:8,marginBottom:0,padding:"6px 10px",fontSize:11}}>
                      <span>🚫</span><span><strong>Limite atteinte</strong> — Aucun nouveau dépôt autorisé pour les opérateurs.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="tw" style={{padding:"16px 0 0"}}>
            <table>
              <thead><tr><th>#</th><th>Date</th><th>Site</th><th>Camion</th><th>Type</th><th>Net(t)</th><th>{c.type==="rotation"?"Tarif/rot.":"Tarif/t"}</th><th>Montant</th></tr></thead>
              <tbody>
                {entries.length===0
                  ?<tr><td colSpan={8} style={{textAlign:"center",color:"var(--muted)",padding:30}}>Aucun dépôt pour cette période</td></tr>
                  :entries.map((d,i)=>{
                    const wt=wasteTypes.find(w=>w.id===d.wasteType);
                    return (
                      <tr key={d.id}>
                        <td className="mn tmu">{i+1}</td>
                        <td className="mn">{fmtTs(d.ts)}</td>
                        <td><span className="badge b-info">{d.siteId}</span></td>
                        <td className="mn">{d.truck}</td>
                        <td>{wt?.label}</td>
                        <td className="mn">{fmtN(d.net)}</td>
                        <td className="mn tmu">{fmt(d.unitPrice)}</td>
                        <td className="mn fw7">{fmt(d.total)}</td>
                      </tr>
                    );
                  })}
                {entries.length>0&&(
                  <>
                    <tr style={{background:"rgba(46,201,92,.04)"}}>
                      <td colSpan={5} style={{textAlign:"right",fontWeight:700}}>TOTAL HT</td>
                      <td className="mn fw7 tg">{fmtN(totalNet)} t</td>
                      <td/>
                      <td className="mn fw7">{fmt(totalCost)}</td>
                    </tr>
                    {c.vatSubject&&(
                      <>
                        <tr style={{background:"rgba(234,179,8,.06)"}}>
                          <td colSpan={7} style={{textAlign:"right",color:"var(--warn)",fontWeight:600,fontSize:11}}>TVA 19%</td>
                          <td className="mn fw7" style={{color:"var(--warn)"}}>{fmt(totalCost*0.19)}</td>
                        </tr>
                        <tr style={{background:"rgba(46,201,92,.08)"}}>
                          <td colSpan={7} style={{textAlign:"right",fontWeight:800}}>TOTAL TTC</td>
                          <td className="fw8 tg" style={{fontFamily:"var(--head)",fontSize:16}}>{fmt(totalCost*1.19)}</td>
                        </tr>
                      </>
                    )}
                    {!c.vatSubject&&(
                      <tr style={{background:"rgba(46,201,92,.04)"}}>
                        <td colSpan={7} style={{textAlign:"right",fontWeight:800}}>NET À PAYER <span style={{fontWeight:400,fontSize:10,color:"var(--muted)"}}>(exonéré TVA)</span></td>
                        <td className="fw8 tg" style={{fontFamily:"var(--head)",fontSize:16}}>{fmt(totalCost)}</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Print-only signature footer */}
          <div className="print-only inv-print-footer" style={{padding:"0 20px 20px"}}>
            <div style={{display:"flex",justifyContent:"flex-start",paddingLeft:"8%",marginTop:24}}>
              <div style={{textAlign:"center",minWidth:200}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:60,color:"#333",textTransform:"uppercase"}}>Le Directeur</div>
                <div style={{borderTop:"1px solid #333",paddingTop:5,fontSize:11,color:"#555"}}>Signature &amp; Cachet</div>
              </div>
            </div>
            <div style={{marginTop:30,fontSize:9,color:"#777",textAlign:"center",borderTop:"1px solid #ddd",paddingTop:10}}>
              {cof(company,'name')} — {cof(company,'address')} — Tél: {cof(company,'phone')} — {cof(company,'email')}<br/>
              NIF Établissement: [NIF] · RC: [RC] · Code Wilaya: {cof(company,'code')}
            </div>
          </div>

          <div className="print-hide" style={{padding:"16px 20px",borderTop:"1px solid var(--bdr)",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            {totalCost>0&&(
              <button className="btn bp bsm" onClick={()=>generateInvoice(c,totalCost)}>
                🧾 {currentInv?"Mettre à jour la facture":"Générer la facture"}
              </button>
            )}
            {currentInv&&currentInv.status!=="paid"
              ?<button className="btn bsm" style={{background:"var(--g)",color:"#fff",borderColor:"var(--g)"}} onClick={()=>markPaid(currentInv)}>💳 Enregistrer Paiement</button>
              :null}
            {currentInv&&currentInv.status==="pending"
              ?<button className="btn be bsm" onClick={()=>markOverdue(currentInv)}>🔴 Marquer Impayée</button>
              :null}
                        <div style={{display:"flex",gap:8,marginLeft:"auto",alignItems:"center"}}>
              <button className="btn bg bsm" onClick={downloadOfficialPDF} disabled={entries.length===0}
                title="Télécharger la facture officielle en PDF">📥 PDF Officiel</button>
              <button className="btn bi bsm" onClick={downloadOfficialWord} disabled={entries.length===0}
                title="Télécharger la facture officielle en format Word (.doc)">📄 Word (.doc)</button>
            </div>
            <div style={{fontSize:11,color:"var(--muted)"}}>Réf: {invNum}</div>
          </div>
        </div>
        </div>
      )}
        </>
      )}

      {/* ── PAYMENT MODAL ── */}
      {payInvModal&&(
        <div className="ov">
          <div className="modal">
            <div className="mh">
              <span className="mh-title">💳 Enregistrer un paiement</span>
              <button className="btn bg bsm" onClick={()=>setPayInvModal(null)}>✕</button>
            </div>
            <div className="mb2">
              <div className="cost-box mb4">
                <div className="cl"><span className="clb">Client</span><span className="clv mn">{clients.find(c=>c.id===payInvModal.clientId)?.name||payInvModal.clientId}</span></div>
                <div className="cl"><span className="clb">Référence</span><span className="clv mn">{payInvModal.id}</span></div>
                <div className="cl"><span className="clb">Montant total</span><span className="clv mn fw7">{fmt(payInvModal.totalAmount)}</span></div>
                <div className="cl"><span className="clb">Déjà payé</span><span className="clv mn" style={{color:"var(--g)"}}>{fmt(payInvModal.paidAmount||0)}</span></div>
                <div className="cl ct"><span style={{fontWeight:700}}>RESTE DÛ</span><span className="ctv">{fmt(payInvModal.totalAmount-(payInvModal.paidAmount||0))}</span></div>
              </div>
              <div className="field mb3" style={{marginBottom:16}}>
                <label>Montant du versement (DA)</label>
                <input className="fi" type="number" value={partialAmt} onChange={e=>setPartialAmt(e.target.value)}
                  max={payInvModal.totalAmount-(payInvModal.paidAmount||0)} placeholder="Montant versé..."/>
                <div className="tsm tmu mt1" style={{fontSize:10}}>
                  {parseFloat(partialAmt)>=(payInvModal.totalAmount-(payInvModal.paidAmount||0))
                    ?"✅ Paiement intégral — facture soldée"
                    :`⏳ Paiement partiel — reste: ${fmt(payInvModal.totalAmount-(payInvModal.paidAmount||0)-parseFloat(partialAmt||0))}`}
                </div>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",
                background:"rgba(46,201,92,.08)",border:"1px solid rgba(46,201,92,.2)",borderRadius:8,padding:"12px 14px"}}>
                <input type="checkbox" checked={payConfirm} onChange={e=>setPayConfirm(e.target.checked)}/>
                <span style={{fontWeight:600}}>✅ Confirmer la réception du paiement</span>
              </label>
            </div>
            <div className="mf">
              <button className="btn bg" onClick={()=>setPayInvModal(null)}>Annuler</button>
              <button className="btn bp" disabled={!payConfirm||!(parseFloat(partialAmt)>0)} onClick={()=>doMarkPaid(payInvModal,true)}>
                🟢 Valider le paiement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════════════════════════ */
function PageSettings({sites,wasteTypes,updateSite,updateWT,authUser,updateUser,setAuthUser,docTypes,updateDocTypes,company,updateCompany,companyTrucks,addCompanyTruck,updateCompanyTruck,deleteCompanyTruck}) {
  const isAdmin = authUser.role==="admin";
  const [tab, setTab] = useState("general");
  const [editWT, setEditWT] = useState(null);
  const [editSite, setEditSite] = useState(null);
  const [pwForm, setPwForm] = useState({current:"",newPw:"",confirm:""});
  const [pwMsg, setPwMsg] = useState(null);
  const [profileForm, setProfileForm] = useState({name:authUser.name,email:authUser.email||"",phone:authUser.phone||"",matricule:authUser.matricule||""});
  const [profileMsg, setProfileMsg] = useState(null);
  const [newDoc, setNewDoc] = useState({private:"",state:""});
  const [companyEdit, setCompanyEdit] = useState(company ? [...company] : [...COMPANY_FIELDS_DEFAULT]);
  const [companyMsg, setCompanyMsg] = useState(null);
  const [newCompanyField, setNewCompanyField] = useState({label:"",value:""});
  const [truckForm, setTruckForm] = useState({plate:"",label:"",tare:"",status:"active"});
  const [editTruck, setEditTruck] = useState(null);
  const [truckMsg, setTruckMsg] = useState(null);

  const settingsNav = [
    {id:"general",   ic:"🏢", lbl:"Informations générales"},
    {id:"profile",   ic:"👤", lbl:"Mon Profil"},
    {id:"sites",     ic:"🏭", lbl:"Sites CET"},
    {id:"tarifs",    ic:"💰", lbl:"Tarifs & Tarification"},
    {id:"fleet",     ic:"🚛", lbl:"Flotte EPWGCET"},
    {id:"documents", ic:"📋", lbl:"Types de documents"},
    {id:"security",  ic:"🔐", lbl:"Sécurité du compte"},
    {id:"about",     ic:"ℹ️", lbl:"À propos"},
  ];

  const handlePwChange = async () => {
    if (pwForm.newPw.length < 6) { setPwMsg({t:"err",m:"Le nouveau mot de passe doit faire au moins 6 caractères."}); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg({t:"err",m:"Les mots de passe ne correspondent pas."}); return; }
    try {
      const r = await fetch('/api/auth/change-password', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({userId:authUser.id, currentPassword:pwForm.current, newPassword:pwForm.newPw})
      });
      const data = await r.json();
      if (!r.ok) { setPwMsg({t:"err",m:data.error||"Erreur serveur."}); return; }
      setPwMsg({t:"ok",m:"Mot de passe mis à jour avec succès."});
      setPwForm({current:"",newPw:"",confirm:""});
    } catch(e) { setPwMsg({t:"err",m:"Erreur de connexion au serveur."}); }
  };

  const handleProfileSave = () => {
    if (!profileForm.name.trim()) { setProfileMsg({t:"err",m:"Le nom est requis."}); return; }
    if (!profileForm.email.trim()) { setProfileMsg({t:"err",m:"L'email est requis."}); return; }
    const updated = {...authUser, ...profileForm};
    updateUser(updated);
    setAuthUser(updated);
    setProfileMsg({t:"ok",m:"Profil mis à jour avec succès."});
  };

  const removeDoc = (cat, idx) => {
    const list = [...(docTypes[cat]||[])];
    list.splice(idx, 1);
    updateDocTypes({...docTypes, [cat]:list});
  };

  const addDoc = (cat) => {
    const val = newDoc[cat].trim();
    if (!val) return;
    updateDocTypes({...docTypes, [cat]:[...(docTypes[cat]||[]), val]});
    setNewDoc(f=>({...f,[cat]:""}));
  };

  return (
    <div className="settings-grid">
      <div className="settings-nav">
        {settingsNav.map(n=>(
          <button key={n.id} className={`sn-item${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}>
            <span className="sn-ic">{n.ic}</span>{n.lbl}
          </button>
        ))}
      </div>

      <div className="settings-body">
        {tab==="general"&&(
          <>
            <div className="settings-title">Informations de l'établissement</div>
            <div className="settings-sub">Identité de l'organisme gestionnaire — apparaît sur les reçus et factures</div>
            {companyMsg&&(
              <div className={`alrt ${companyMsg.t==="ok"?"ao":"ae"}`} style={{marginBottom:14}}>
                <span>{companyMsg.t==="ok"?"✅":"⚠"}</span><span>{companyMsg.m}</span>
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {companyEdit.map((f,i)=>(
                <div key={f.id||i} style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input className="fi" style={{flex:"0 0 200px",fontSize:11,fontFamily:"var(--mono)"}}
                    placeholder="Nom du champ"
                    value={f.label}
                    onChange={e=>setCompanyEdit(ed=>ed.map((x,j)=>j===i?{...x,label:e.target.value}:x))}/>
                  <input className="fi" style={{flex:1}}
                    placeholder="Valeur"
                    value={f.value}
                    onChange={e=>setCompanyEdit(ed=>ed.map((x,j)=>j===i?{...x,value:e.target.value}:x))}/>
                  <button className="btn bg" style={{color:"var(--err)",minWidth:60,fontSize:13}} onClick={()=>setCompanyEdit(ed=>ed.filter((_,j)=>j!==i))}>✕</button>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:16}}>
              <input className="fi" style={{flex:"0 0 200px",fontSize:11,fontFamily:"var(--mono)"}}
                placeholder="Nouveau champ..."
                value={newCompanyField.label}
                onChange={e=>setNewCompanyField(f=>({...f,label:e.target.value}))}/>
              <input className="fi" style={{flex:1}}
                placeholder="Valeur..."
                value={newCompanyField.value}
                onChange={e=>setNewCompanyField(f=>({...f,value:e.target.value}))}/>
              <button className="btn bp" style={{minWidth:90,fontSize:13}} onClick={()=>{
                if(!newCompanyField.label.trim()) return;
                setCompanyEdit(ed=>[...ed,{id:"f_"+Date.now(),label:newCompanyField.label.trim(),value:newCompanyField.value.trim()}]);
                setNewCompanyField({label:"",value:""});
              }}>+ Ajouter</button>
            </div>
            <button className="btn bp" style={{width:"fit-content"}} onClick={()=>{
              updateCompany(companyEdit);
              setCompanyMsg({t:"ok",m:"Informations enregistrées avec succès."});
              setTimeout(()=>setCompanyMsg(null),4000);
            }}>✓ Enregistrer</button>
            <div className="alrt ai" style={{marginTop:14}}>
              <span>ℹ️</span>
              <span style={{fontSize:11}}>Ces informations apparaissent sur les reçus de déchargement et les factures imprimées.</span>
            </div>
          </>
        )}

        {tab==="profile"&&(
          <>
            <div className="settings-title">Mon Profil</div>
            <div className="settings-sub">Modifier vos informations personnelles</div>
            {profileMsg&&(
              <div className={`alrt ${profileMsg.t==="ok"?"ao":"ae"}`} style={{marginBottom:14}}>
                <span>{profileMsg.t==="ok"?"✅":"⚠"}</span><span>{profileMsg.m}</span>
              </div>
            )}
            <div className="fg" style={{gap:12,maxWidth:480}}>
              <div className="field"><label>Nom complet</label>
                <input className="fi" value={profileForm.name} onChange={e=>{setProfileForm(f=>({...f,name:e.target.value}));setProfileMsg(null);}} placeholder="Nom et prénom"/>
              </div>
              <div className="field"><label>Adresse e-mail</label>
                <input className="fi" type="email" value={profileForm.email} onChange={e=>{setProfileForm(f=>({...f,email:e.target.value}));setProfileMsg(null);}} placeholder="email@epwgcet-jijel.dz"/>
              </div>
              <div className="fg fg2">
                <div className="field"><label>Téléphone</label>
                  <input className="fi" value={profileForm.phone} onChange={e=>{setProfileForm(f=>({...f,phone:e.target.value}));setProfileMsg(null);}} placeholder="034 XX XX XX"/>
                </div>
                <div className="field"><label>Matricule</label>
                  <input className="fi" value={profileForm.matricule} onChange={e=>{setProfileForm(f=>({...f,matricule:e.target.value}));setProfileMsg(null);}} placeholder="ADM-001"/>
                </div>
              </div>
              <button className="btn bp" style={{width:"fit-content"}} onClick={handleProfileSave}>✓ Enregistrer le profil</button>
            </div>
          </>
        )}

        {tab==="sites"&&(
          <>
            <div className="settings-title">Sites de Traitement</div>
            <div className="settings-sub">Gestion des 4 centres d'enfouissement technique</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {sites.map(s=>{
                const pct=Math.round((s.used/s.capacity)*100);
                const col=pct>80?"var(--err)":pct>60?"var(--warn)":"var(--g)";
                const isEdit = editSite?.id===s.id;
                return (
                  <div key={s.id} className="card">
                    <div className="fx aic jsb mb2">
                      <div className="fx aic g2">
                        <span className={`badge ${s.type==="CDI"?"b-warn":"b-info"}`}>{s.type}</span>
                        <span style={{fontWeight:700,fontSize:14}}>{s.name}</span>
                        <span className="tsm tmu">— {s.region}</span>
                      </div>
                      <button className="btn bg bsm" onClick={()=>setEditSite(isEdit?null:{...s})}>
                        {isEdit?"Annuler":"✏️ Modifier"}
                      </button>
                    </div>
                    {isEdit?(
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        <div className="fg fg2">
                          <div className="field"><label>Nom / Titre</label>
                            <input className="fi" value={editSite.name} onChange={e=>setEditSite(f=>({...f,name:e.target.value}))}/>
                          </div>
                          <div className="field"><label>Commune</label>
                            <input className="fi" value={editSite.commune||""} onChange={e=>setEditSite(f=>({...f,commune:e.target.value}))} placeholder="ex: Jijel"/>
                          </div>
                        </div>
                        <div className="field"><label>Localisation (GPS ou adresse)</label>
                          <input className="fi" value={editSite.localisation||""} onChange={e=>setEditSite(f=>({...f,localisation:e.target.value}))} placeholder="ex: 36.8167° N, 5.7667° E ou Route nationale N°43"/>
                        </div>
                        <div className="fg fg2">
                          <div className="field"><label>Capacité totale (t)</label>
                            <input className="fi" type="number" value={editSite.capacity} onChange={e=>setEditSite(f=>({...f,capacity:parseInt(e.target.value)||0}))}/>
                          </div>
                          <div className="field"><label>Volume utilisé (t)</label>
                            <input className="fi" type="number" value={editSite.used} onChange={e=>setEditSite(f=>({...f,used:parseInt(e.target.value)||0}))}/>
                          </div>
                        </div>
                        <div className="field"><label>Types de déchets acceptés</label>
                          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>
                            {wasteTypes.map(w=>{
                              const checked = (editSite.acceptedWaste||[]).includes(w.id);
                              return (
                                <label key={w.id} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",
                                  padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,
                                  background:checked?"rgba(23,138,52,.12)":"var(--s2)",
                                  border:`1px solid ${checked?"var(--g)":"var(--bdr)"}`,
                                  color:checked?"var(--g)":"var(--muted)"}}>
                                  <input type="checkbox" checked={checked} style={{accentColor:"var(--g)"}}
                                    onChange={e=>{
                                      const list = editSite.acceptedWaste||[];
                                      setEditSite(f=>({...f, acceptedWaste: e.target.checked ? [...list,w.id] : list.filter(x=>x!==w.id)}));
                                    }}/>
                                  {w.label}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div className="fx g2" style={{justifyContent:"flex-end"}}>
                          <button className="btn bg bsm" onClick={()=>setEditSite(null)}>Annuler</button>
                          <button className="btn bp bsm" onClick={()=>{updateSite(editSite);setEditSite(null);}}>✓ Enregistrer</button>
                        </div>
                      </div>
                    ):(
                      <>
                        <div className="fg fg3 mb2" style={{gap:8}}>
                          {[["📍 Commune",s.commune||"—"],["🗺 Localisation",s.localisation||"—"],["👤 Responsable",s.manager||"—"]].map(([l,v])=>(
                            <div key={l} style={{fontSize:11}}><span className="tmu">{l} : </span><span style={{fontWeight:600}}>{v}</span></div>
                          ))}
                        </div>
                        <div style={{marginBottom:6}}>
                          <div style={{fontSize:10,color:"var(--muted)",marginBottom:4}}>Déchets acceptés :</div>
                          <div className="fx" style={{gap:4,flexWrap:"wrap"}}>
                            {(s.acceptedWaste&&s.acceptedWaste.length>0 ? s.acceptedWaste : []).map(wId=>{
                              const wt = wasteTypes.find(w=>w.id===wId);
                              return wt?<span key={wId} className="badge b-ok" style={{fontSize:9}}>{wt.label}</span>:null;
                            })}
                            {(!s.acceptedWaste||s.acceptedWaste.length===0)&&<span className="tsm tmu" style={{fontSize:10}}>Non définis</span>}
                          </div>
                        </div>
                        <div className="cbt mb1"><div className="cbf" style={{width:`${pct}%`,background:col}}/></div>
                        <div className="fx jsb">
                          <span className="tsm tmu">Remplissage : {pct}%</span>
                          <span className="mn tsm tmu">{(s.used/1000).toFixed(0)}k / {(s.capacity/1000).toFixed(0)}k t</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab==="tarifs"&&(
          <>
            <div className="settings-title">Grille Tarifaire</div>
            <div className="settings-sub">4 tarifs par type de déchet — Traitement (tonnage / rotation) et Collecte et Traitement (tonnage / rotation)</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {wasteTypes.map(w=>{
                const isEdit = editWT?.id===w.id;
                return (
                  <div key={w.id} className="card">
                    <div style={{fontWeight:700,fontSize:13,marginBottom:isEdit?10:6}}>{w.label}
                      <span className="tsm tmu" style={{fontWeight:400,marginLeft:8}}>Sites : {w.siteTypes.join(", ")}</span>
                    </div>
                    {isEdit?(
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        <div style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--muted)",textTransform:"uppercase",letterSpacing:".08em"}}>🏭 Traitement</div>
                        <div className="fx aic g2" style={{flexWrap:"wrap"}}>
                          <div className="fx aic g1">
                            <input className="fi" type="number" style={{width:120}} value={editWT.price}
                              onChange={e=>setEditWT(f=>({...f,price:parseInt(e.target.value)||0}))}
                              placeholder="Tonnage"/>
                            <span className="tsm tmu">DA/t</span>
                          </div>
                          <div className="fx aic g1">
                            <input className="fi" type="number" style={{width:120}} value={editWT.rotationPrice||0}
                              onChange={e=>setEditWT(f=>({...f,rotationPrice:parseInt(e.target.value)||0}))}
                              placeholder="Rotation"/>
                            <span className="tsm tmu">DA/rot.</span>
                          </div>
                        </div>
                        <div style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--purple)",textTransform:"uppercase",letterSpacing:".08em"}}>🚛 Collecte et Traitement</div>
                        <div className="fx aic g2" style={{flexWrap:"wrap"}}>
                          <div className="fx aic g1">
                            <input className="fi" type="number" style={{width:120}} value={editWT.collectPrice||0}
                              onChange={e=>setEditWT(f=>({...f,collectPrice:parseInt(e.target.value)||0}))}
                              placeholder="Tonnage collecte"/>
                            <span className="tsm tmu">DA/t</span>
                          </div>
                          <div className="fx aic g1">
                            <input className="fi" type="number" style={{width:120}} value={editWT.collectRotationPrice||0}
                              onChange={e=>setEditWT(f=>({...f,collectRotationPrice:parseInt(e.target.value)||0}))}
                              placeholder="Rotation collecte"/>
                            <span className="tsm tmu">DA/rot.</span>
                          </div>
                        </div>
                        <div className="fx g2">
                          <button className="btn bp bsm" onClick={()=>{updateWT(editWT);setEditWT(null);}}>✓ Sauvegarder</button>
                          <button className="btn bg bsm" onClick={()=>setEditWT(null)}>Annuler</button>
                        </div>
                      </div>
                    ):(
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
                        <div className="fg fg2" style={{flex:1,gap:8}}>
                          <div className="card-sm" style={{borderTop:"2px solid var(--g)"}}>
                            <div style={{fontSize:9,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>🏭 Traitement / Tonnage</div>
                            <span style={{fontFamily:"var(--head)",fontSize:15,fontWeight:800,color:"var(--g)"}}>{fmt(w.price)}</span>
                            <span style={{fontSize:10,color:"var(--muted)"}}> /t</span>
                          </div>
                          <div className="card-sm" style={{borderTop:"2px solid var(--orange)"}}>
                            <div style={{fontSize:9,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>🏭 Traitement / Rotation</div>
                            <span style={{fontFamily:"var(--head)",fontSize:15,fontWeight:800,color:"var(--orange)"}}>{fmt(w.rotationPrice||0)}</span>
                            <span style={{fontSize:10,color:"var(--muted)"}}> /rot.</span>
                          </div>
                          <div className="card-sm" style={{borderTop:"2px solid var(--purple)"}}>
                            <div style={{fontSize:9,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>🚛 Collecte / Tonnage</div>
                            <span style={{fontFamily:"var(--head)",fontSize:15,fontWeight:800,color:"var(--purple)"}}>{fmt(w.collectPrice||0)}</span>
                            <span style={{fontSize:10,color:"var(--muted)"}}> /t</span>
                          </div>
                          <div className="card-sm" style={{borderTop:"2px solid var(--info)"}}>
                            <div style={{fontSize:9,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>🚛 Collecte / Rotation</div>
                            <span style={{fontFamily:"var(--head)",fontSize:15,fontWeight:800,color:"var(--info)"}}>{fmt(w.collectRotationPrice||0)}</span>
                            <span style={{fontSize:10,color:"var(--muted)"}}> /rot.</span>
                          </div>
                        </div>
                        <button className="btn bg bsm" onClick={()=>setEditWT({...w})}>✏️ Modifier</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="alrt ai mt4" style={{marginTop:16,marginBottom:0}}>
              <span>ℹ️</span>
              <span style={{fontSize:11}}>Les modifications tarifaires s'appliquent aux nouveaux déchargements uniquement. Les relevés existants conservent les prix en vigueur lors de la saisie.</span>
            </div>
          </>
        )}

        {tab==="fleet"&&(
          <>
            <div className="settings-title">Flotte EPWGCET</div>
            <div className="settings-sub">Gérer les camions de collecte de l'entreprise</div>
            {truckMsg&&(
              <div className={`alrt ${truckMsg.t==="ok"?"ao":"ae"}`} style={{marginBottom:14}}>
                <span>{truckMsg.t==="ok"?"✅":"⚠"}</span><span>{truckMsg.m}</span>
              </div>
            )}
            {/* Truck list */}
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
              {(companyTrucks||[]).length===0&&(
                <div style={{fontSize:12,color:"var(--muted)",padding:"8px 0"}}>Aucun camion enregistré.</div>
              )}
              {(companyTrucks||[]).map(t=>{
                const isEdit = editTruck?.id===t.id;
                return (
                  <div key={t.id} className="card" style={{padding:"12px 16px"}}>
                    {isEdit?(
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        <div className="fg fg3">
                          <div className="field"><label>Immatriculation *</label>
                            <input className="fi" value={editTruck.plate} onChange={e=>setEditTruck(f=>({...f,plate:e.target.value.toUpperCase()}))} placeholder="ex: 18-TRK-001"/>
                          </div>
                          <div className="field"><label>Désignation</label>
                            <input className="fi" value={editTruck.label||""} onChange={e=>setEditTruck(f=>({...f,label:e.target.value}))} placeholder="ex: Benne n°3"/>
                          </div>
                          <div className="field"><label>Tare (t)</label>
                            <input className="fi" type="number" step="0.1" min="0" value={editTruck.tare||""} onChange={e=>setEditTruck(f=>({...f,tare:parseFloat(e.target.value)||0}))} placeholder="0.0"/>
                          </div>
                        </div>
                        <div className="field"><label>Statut</label>
                          <div className="seg" style={{marginTop:4}}>
                            <button className={`seg-btn${editTruck.status==="active"?" active":""}`} onClick={()=>setEditTruck(f=>({...f,status:"active"}))}>✅ Actif</button>
                            <button className={`seg-btn${editTruck.status!=="active"?" active":""}`} onClick={()=>setEditTruck(f=>({...f,status:"inactive"}))}>⏸ Inactif</button>
                          </div>
                        </div>
                        <div className="fx g2">
                          <button className="btn bp bsm" onClick={()=>{updateCompanyTruck(editTruck);setEditTruck(null);setTruckMsg({t:"ok",m:"Camion mis à jour."});setTimeout(()=>setTruckMsg(null),3000);}}>✓ Sauvegarder</button>
                          <button className="btn bg bsm" onClick={()=>setEditTruck(null)}>Annuler</button>
                        </div>
                      </div>
                    ):(
                      <div className="fx aic jsb">
                        <div className="fx aic g3">
                          <span className={`badge ${t.status==="active"?"b-ok":"b-dim"}`}>{t.status==="active"?"✅ Actif":"⏸ Inactif"}</span>
                          <span style={{fontWeight:700,fontFamily:"var(--mono)",fontSize:14}}>{t.plate}</span>
                          {t.label&&<span style={{fontSize:12,color:"var(--muted)"}}>{t.label}</span>}
                          {t.tare>0&&<span className="badge" style={{fontSize:10}}>Tare: {t.tare} t</span>}
                        </div>
                        <div className="fx g2">
                          <button className="btn bg bsm" onClick={()=>setEditTruck({...t})}>✏️ Modifier</button>
                          <button className="btn be bsm" onClick={()=>{deleteCompanyTruck(t.id);setTruckMsg({t:"ok",m:"Camion supprimé."});setTimeout(()=>setTruckMsg(null),3000);}}>🗑</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Add new truck */}
            <div className="card" style={{padding:"16px"}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>+ Nouveau camion</div>
              <div className="fg fg3" style={{marginBottom:10}}>
                <div className="field"><label>Immatriculation *</label>
                  <input className="fi" value={truckForm.plate} onChange={e=>setTruckForm(f=>({...f,plate:e.target.value.toUpperCase()}))} placeholder="ex: 18-TRK-001"/>
                </div>
                <div className="field"><label>Désignation</label>
                  <input className="fi" value={truckForm.label||""} onChange={e=>setTruckForm(f=>({...f,label:e.target.value}))} placeholder="ex: Benne n°3"/>
                </div>
                <div className="field"><label>Tare (t)</label>
                  <input className="fi" type="number" step="0.1" min="0" value={truckForm.tare||""} onChange={e=>setTruckForm(f=>({...f,tare:e.target.value}))} placeholder="0.0"/>
                </div>
              </div>
              <button className="btn bp" style={{width:"fit-content"}} disabled={!truckForm.plate.trim()} onClick={()=>{
                const newT = {id:"ct_"+Date.now(),plate:truckForm.plate.trim().toUpperCase(),label:truckForm.label.trim(),tare:parseFloat(truckForm.tare)||0,status:"active"};
                addCompanyTruck(newT);
                setTruckForm({plate:"",label:"",tare:"",status:"active"});
                setTruckMsg({t:"ok",m:"Camion ajouté avec succès."});
                setTimeout(()=>setTruckMsg(null),3000);
              }}>+ Ajouter le camion</button>
            </div>
          </>
        )}

        {tab==="documents"&&(
          <>
            <div className="settings-title">Types de documents</div>
            <div className="settings-sub">Gérer les pièces justificatives requises par catégorie de client</div>
            {[
              {key:"private", label:"🏭 Clients Privés / Entreprises"},
              {key:"state",   label:"🏛 Collectivités / Organismes d'État"},
            ].map(cat=>(
              <div key={cat.key} style={{marginBottom:28}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:"var(--g)"}}>{cat.label}</div>
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
                  {(docTypes[cat.key]||[]).map((doc,i)=>(
                    <div key={i} className="fx aic jsb" style={{padding:"9px 13px",background:"var(--s2)",borderRadius:8,border:"1px solid var(--bdr)"}}>
                      <span style={{fontSize:12}}>📄 {doc}</span>
                      <button className="btn bg bsm" style={{color:"var(--err)",fontSize:10,minWidth:70}} onClick={()=>removeDoc(cat.key,i)}>✕ Retirer</button>
                    </div>
                  ))}
                  {(docTypes[cat.key]||[]).length===0&&(
                    <div style={{fontSize:11,color:"var(--muted)",padding:"6px 0"}}>Aucun document requis défini.</div>
                  )}
                </div>
                <div className="fx g2">
                  <input className="fi" style={{flex:1}} placeholder="Nom du document à ajouter..."
                    value={newDoc[cat.key]}
                    onChange={e=>setNewDoc(f=>({...f,[cat.key]:e.target.value}))}
                    onKeyDown={e=>e.key==="Enter"&&addDoc(cat.key)}/>
                  <button className="btn bp bsm" onClick={()=>addDoc(cat.key)}>+ Ajouter</button>
                </div>
              </div>
            ))}
            <div className="alrt ai" style={{marginTop:4}}>
              <span>ℹ️</span>
              <span style={{fontSize:11}}>Ces listes apparaissent dans les dossiers clients et les formulaires de création. Les modifications sont enregistrées immédiatement dans le navigateur.</span>
            </div>
          </>
        )}

        {tab==="security"&&(
          <>
            <div className="settings-title">Sécurité du compte</div>
            <div className="settings-sub">Modifier votre mot de passe de connexion</div>
            <div style={{background:"var(--s2)",border:"1px solid var(--bdr)",borderRadius:8,padding:"14px 16px",marginBottom:20}}>
              <div className="fx aic g2 mb1">
                <span>👤</span>
                <span style={{fontWeight:700}}>{authUser.name}</span>
              </div>
              <div className="mn tsm tmu">{authUser.email}</div>
              <div className="tsm tmu">{authUser.role==="admin"?"👔 Administrateur":"🦺 Opérateur"} · {authUser.matricule}</div>
            </div>
            {pwMsg&&(
              <div className={`alrt ${pwMsg.t==="ok"?"ao":"ae"} mb3`} style={{marginBottom:14}}>
                <span>{pwMsg.t==="ok"?"✅":"⚠"}</span><span>{pwMsg.m}</span>
              </div>
            )}
            <div className="fg" style={{gap:12,maxWidth:400}}>
              <div className="field"><label>Mot de passe actuel</label>
                <input className="fi" type="password" value={pwForm.current} onChange={e=>setPwForm(f=>({...f,current:e.target.value}))} placeholder="••••••••"/>
              </div>
              <div className="field"><label>Nouveau mot de passe</label>
                <input className="fi" type="password" value={pwForm.newPw} onChange={e=>setPwForm(f=>({...f,newPw:e.target.value}))} placeholder="Min. 6 caractères"/>
              </div>
              <div className="field"><label>Confirmer le nouveau mot de passe</label>
                <input className="fi" type="password" value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))} placeholder="••••••••"/>
              </div>
              <button className="btn bp" style={{width:"fit-content"}} onClick={handlePwChange}>🔐 Changer le mot de passe</button>
            </div>
          </>
        )}

        {tab==="about"&&(
          <>
            <div className="settings-title">À propos du système</div>
            <div className="settings-sub">Plateforme de gestion des centres d'enfouissement technique</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[
                ["Version","1.0.0 — Build 2025.07"],
                ["Technologie","React 18 + Vite 5"],
                ["Hébergement","Replit Cloud"],
                ["Base de données","PostgreSQL (connecté)"],
                ["Mode actuel","Données persistées en base"],
                ["Développé pour",cof(company,'name')],
              ].map(([l,v])=>(
                <div key={l} className="fx jsb" style={{padding:"10px 14px",background:"var(--s2)",borderRadius:8,border:"1px solid var(--bdr)"}}>
                  <span className="tsm tmu" style={{fontFamily:"var(--mono)",fontSize:10,textTransform:"uppercase",letterSpacing:".1em",alignSelf:"center"}}>{l}</span>
                  <span style={{fontWeight:600,fontSize:13}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:20,padding:"14px 16px",background:"rgba(46,201,92,.06)",border:"1px solid rgba(46,201,92,.15)",borderRadius:8}}>
              <div style={{fontWeight:700,marginBottom:8,fontSize:13}}>🗺 Feuille de route</div>
              {[
                ["✅","Connexion base de données PostgreSQL"],
                ["🔜","Export PDF des relevés et reçus"],
                ["🔜","Notifications SMS/WhatsApp en temps réel"],
                ["🔜","API pont-bascule (lecture poids automatique)"],
                ["🔜","Module photo evidence (caméra)"],
                ["🔜","Mode hors-ligne avec synchronisation"],
                ["🔜","Tableau de bord analytique avancé"],
              ].map(([ic,t])=>(
                <div key={t} className="fx aic g2" style={{marginBottom:6,fontSize:12,color:"var(--muted)"}}>
                  <span>{ic}</span>{t}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DB SCHEMA
═══════════════════════════════════════════════════════════════════════════ */
function PageSchema() {
  const tables=[
    {name:"USERS",icon:"👤",color:"var(--purple)",fields:[
      ["user_id","VARCHAR(10)","PK"],["name","VARCHAR(100)",""],
      ["email","VARCHAR(100)","UNIQUE"],["password_hash","VARCHAR(255)",""],
      ["role","ENUM(admin,operator)",""],["status","ENUM(active,inactive,pending)",""],
      ["site_id","VARCHAR(10)","FK→Sites"],["matricule","VARCHAR(20)",""],
      ["phone","VARCHAR(20)",""],["created_at","TIMESTAMP","AUTO"],
    ]},
    {name:"CLIENTS",icon:"🏢",color:"var(--g)",fields:[
      ["client_id","VARCHAR(10)","PK"],["name","VARCHAR(100)",""],
      ["client_type","ENUM(state,private,cash)",""],["type","ENUM(daily,convention)",""],
      ["status","ENUM(pending_docs,under_review,approved,rejected)",""],
      ["phone","VARCHAR(20)",""],["address","VARCHAR(150)",""],
      ["nif","VARCHAR(20)",""],["rc","VARCHAR(30)",""],
      ["credit_limit","DECIMAL(12,2)",""],["consumed_amount","DECIMAL(12,2)",""],
      ["created_at","TIMESTAMP","AUTO"],
    ]},
    {name:"SITES",icon:"🏭",color:"var(--warn)",fields:[
      ["site_id","VARCHAR(10)","PK"],["name","VARCHAR(100)",""],
      ["region","VARCHAR(50)",""],["type","ENUM(CET,CDI)",""],
      ["capacity_tons","DECIMAL(10,0)",""],["used_tons","DECIMAL(10,2)",""],
    ]},
    {name:"TRUCKS",icon:"🚛",color:"var(--info)",fields:[
      ["plate_number","VARCHAR(20)","PK"],["client_id","VARCHAR(10)","FK→Clients"],
      ["tare_weight","DECIMAL(6,2)",""],["allowed_waste","JSON",""],["is_active","BOOLEAN",""],
    ]},
    {name:"DISCHARGES",icon:"⚖️",color:"var(--err)",fields:[
      ["discharge_id","VARCHAR(20)","PK"],["truck_plate","VARCHAR(20)","FK→Trucks"],
      ["site_id","VARCHAR(10)","FK→Sites"],["client_id","VARCHAR(10)","FK→Clients"],
      ["operator_id","VARCHAR(10)","FK→Users"],
      ["gross_weight","DECIMAL(8,2)",""],["tare_weight","DECIMAL(8,2)",""],
      ["net_weight","DECIMAL(8,2)","CALC"],["waste_type","ENUM(MEN,IND,MED,INE)",""],
      ["unit_price","DECIMAL(10,2)",""],["total_cost","DECIMAL(12,2)","CALC"],
      ["payment_status","ENUM(pending,paid,settled,flagged)",""],
      ["pay_method","ENUM(cash,convention,tpe,epay)",""],
      ["timestamp","TIMESTAMP","AUTO"],
    ]},
    {name:"DOCUMENTS",icon:"📄",color:"var(--g2)",fields:[
      ["doc_id","VARCHAR(20)","PK"],["client_id","VARCHAR(10)","FK→Clients"],
      ["doc_type","VARCHAR(100)",""],["file_url","VARCHAR(255)",""],
      ["status","ENUM(pending,verified,rejected)",""],
      ["uploaded_at","TIMESTAMP","AUTO"],["verified_by","VARCHAR(10)","FK→Users"],
    ]},
  ];

  return (
    <>
      <div className="mb4">
        <div style={{fontFamily:"var(--head)",fontSize:22,fontWeight:800,letterSpacing:".04em"}}>Architecture Base de Données</div>
        <div className="tsm tmu mt1">Schéma relationnel — 6 tables · PostgreSQL / MySQL</div>
      </div>

      <div className="alrt ao mb4">
        <span>🔗</span>
        <span><strong>Relations : </strong>
          TRUCKS.client_id → CLIENTS &nbsp;|&nbsp;
          DISCHARGES.truck_plate → TRUCKS &nbsp;|&nbsp;
          DISCHARGES.site_id → SITES &nbsp;|&nbsp;
          DISCHARGES.client_id → CLIENTS &nbsp;|&nbsp;
          DISCHARGES.operator_id → USERS &nbsp;|&nbsp;
          DOCUMENTS.client_id → CLIENTS
        </span>
      </div>

      <div className="sg mb4">
        {tables.map(t=>(
          <div key={t.name} className="st">
            <div className="sth" style={{background:t.color}}><span>{t.icon}</span>{t.name}</div>
            {t.fields.map(([f,type,tag])=>(
              <div key={f} className="sr">
                <div className="sf">
                  {tag==="PK"&&<span style={{color:"var(--warn)",fontSize:9,marginRight:4}}>🔑</span>}
                  {tag.startsWith("FK")&&<span style={{color:"var(--info)",fontSize:9,marginRight:4}}>🔗</span>}
                  {tag==="UNIQUE"&&<span style={{color:"var(--purple)",fontSize:9,marginRight:4}}>◇</span>}
                  {f}
                </div>
                <div className="fx aic g2">
                  <span className="styp">{type}</span>
                  {tag==="CALC"&&<span className="badge b-warn" style={{fontSize:9}}>CALC</span>}
                  {tag==="AUTO"&&<span className="badge b-ok"   style={{fontSize:9}}>AUTO</span>}
                  {tag==="UNIQUE"&&<span className="badge b-purple" style={{fontSize:9}}>UNIQ</span>}
                  {tag.startsWith("FK")&&<span className="badge b-info" style={{fontSize:9}}>{tag.slice(3)}</span>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="panel mb4">
        <div className="ph"><span className="pt">⚡ Flux Logique</span></div>
        <div style={{padding:20,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20}}>
          {[
            {title:"💵 Client Cash",color:"var(--warn)",steps:["Opérateur saisit la plaque","Sélection client cash (existant ou nouveau)","Net = Brut − Tare","Total = Net × Tarif","🚧 Barrière FERMÉE","Confirmation réception espèces","payment_status ← PAID","🟢 Barrière OUVERTE","Reçu SMS généré"]},
            {title:"📋 Convention",color:"var(--info)",steps:["Opérateur saisit la plaque","Auto-chargement tare + contrat","Net = Brut − Tare","Total = Net × Tarif contractuel","Vérif. limite de crédit","Dépassement → FLAGGED + alerte","OK → status SETTLED","🟢 Barrière OUVERTE immédiatement","Débit relevé mensuel"]},
            {title:"📄 Approbation Client",color:"var(--purple)",steps:["Institution dépose dossier","Admin crée fiche (pending_docs)","Institution fournit documents","Dossier passe → under_review","Admin vérifie pièces requises","Rejeté → rejected + motif","Approuvé + limite de crédit fixée","Accès convention activé","Relevés mensuels générables"]},
          ].map(flow=>(
            <div key={flow.title}>
              <div style={{fontFamily:"var(--head)",fontSize:14,fontWeight:800,color:flow.color,marginBottom:12}}>{flow.title}</div>
              {flow.steps.map((s,i)=>(
                <div key={i} className="fx aic g2" style={{marginBottom:7}}>
                  <span className="mn" style={{color:"var(--dim)",fontSize:10,minWidth:18}}>{String(i+1).padStart(2,"0")}</span>
                  <span style={{fontSize:11,color:s.includes("🚧")?"var(--err)":s.includes("🟢")?"var(--g)":"var(--txt)"}}>{s}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {[
          {ic:"📷",title:"Photo Evidence",       desc:"Photo du chargement avant validation. Prévient les litiges sur le poids déclaré.",    st:"À implémenter",  sc:"b-warn"},
          {ic:"📡",title:"Mode Hors-ligne",       desc:"IndexedDB local + synchronisation automatique au retour de connexion.",                st:"En développement",sc:"b-info"},
          {ic:"⚡",title:"API Pont-Bascule",      desc:"Connexion directe à la pèse-personne. Lecture automatique du poids — zéro erreur.",   st:"Optionnel",      sc:"b-purple"},
        ].map(f=>(
          <div key={f.title} className="card" style={{borderTop:"2px solid var(--g)"}}>
            <div style={{fontSize:28,marginBottom:8}}>{f.ic}</div>
            <div style={{fontFamily:"var(--head)",fontSize:15,fontWeight:800,marginBottom:6}}>{f.title}</div>
            <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.6,marginBottom:10}}>{f.desc}</div>
            <span className={`badge ${f.sc}`}>{f.st}</span>
          </div>
        ))}
      </div>
    </>
  );
}
