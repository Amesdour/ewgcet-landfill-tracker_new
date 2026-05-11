import express from 'express';
import pg from 'pg';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;
const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require') 
    ? { rejectUnauthorized: false } 
    : false
});
const q  = (sql, p) => pool.query(sql, p);
const ok = (res, data) => res.json(data);
const er = (res, err, code=500) => { console.error(err); res.status(code).json({error:String(err)}); };

async function initDb() {
  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Database schema initialised.');
    // Migrate plaintext passwords to bcrypt hashes (idempotent)
    const { rows: users } = await pool.query('SELECT id, password FROM users');
    for (const u of users) {
      if (u.password && !u.password.startsWith('$2')) {
        const hash = await bcrypt.hash(u.password, 10);
        await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hash, u.id]);
      }
    }
    if (users.length) console.log('Password migration complete.');
  } catch (e) {
    console.error('DB init error:', e.message);
  }
}

// Simple in-memory rate limiter for login (max 10 attempts/min per IP)
const loginAttempts = new Map();
const rateLimitLogin = (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const e = loginAttempts.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > e.resetAt) { e.count = 0; e.resetAt = now + 60000; }
  e.count++;
  loginAttempts.set(ip, e);
  if (e.count > 10) return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 1 minute.' });
  next();
};

// Row mappers
const mapDischarge = r => ({
  id:r.id, ts:r.ts, siteId:r.site_id, clientId:r.client_id,
  clientName:r.client_name, truck:r.truck, wasteType:r.waste_type,
  gross:parseFloat(r.gross), tare:parseFloat(r.tare), net:parseFloat(r.net),
  unitPrice:parseFloat(r.unit_price), total:parseFloat(r.total), status:r.status,
  payMethod:r.pay_method, opId:r.op_id,
  correctionReason:r.correction_reason||'',
});

const mapClient = r => ({
  id:r.id, name:r.name, clientType:r.client_type, type:r.type,
  status:r.status, creditLimit:parseFloat(r.credit_limit)||0,
  consumed:parseFloat(r.consumed)||0,
  creditEnabled:r.credit_enabled||false,
  weightLimitYear:parseFloat(r.weight_limit_year)||0,
  payFrequency:r.pay_frequency||'monthly',
  payInstrument:r.pay_instrument||'cheque',
  phone:r.phone||'', address:r.address||'', nif:r.nif||'', rc:r.rc||'',
  docs:r.docs||[], note:r.note||'',
  vatSubject:r.vat_subject||false,
  assignedSite:r.assigned_site||'',
});

const mapUser = r => ({
  id:r.id, name:r.name, email:r.email,
  role:r.role, status:r.status, phone:r.phone||'',
  matricule:r.matricule||'', siteId:r.site_id, createdAt:r.created_at,
});

const mapSite = r => ({
  id:r.id, name:r.name, type:r.type, region:r.region,
  capacity:parseFloat(r.capacity), used:parseFloat(r.used), status:r.status,
  activeSince:r.active_since, manager:r.manager||'',
  commune:r.commune||'', localisation:r.localisation||'',
  acceptedWaste:r.accepted_waste||[],
});

const mapWT = r => ({
  id:r.id, label:r.label, price:parseFloat(r.price)||0,
  rotationPrice:parseFloat(r.rotation_price)||0,
  unit:r.unit||'t', siteTypes:r.site_types||[],
});

const mapInvoice = r => ({
  id:r.id, clientId:r.client_id, month:r.month,
  totalAmount:parseFloat(r.total_amount)||0,
  paidAmount:parseFloat(r.paid_amount)||0,
  status:r.status,
  generatedAt:r.generated_at, paidAt:r.paid_at||null, note:r.note||'',
});

/* ─── DISCHARGES ──────────────────────────────────────────────────────────── */
app.get('/api/discharges', async (req, res) => {
  try {
    const { rows } = await q('SELECT * FROM discharges ORDER BY ts DESC');
    ok(res, rows.map(mapDischarge));
  } catch(e) { er(res,e); }
});

app.post('/api/discharges', async (req, res) => {
  const d = req.body;
  try {
    await q(
      `INSERT INTO discharges(id,ts,site_id,client_id,client_name,truck,waste_type,gross,tare,net,unit_price,total,status,pay_method,op_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [d.id,d.ts,d.siteId,d.clientId,d.clientName,d.truck,d.wasteType,
       d.gross,d.tare,d.net,d.unitPrice,d.total,d.status,d.payMethod,d.opId]
    );
    if ((d.payMethod==='convention'||d.payMethod==='credit'||d.payMethod==='prepaid') && d.clientId) {
      await q('UPDATE clients SET consumed=consumed+$1 WHERE id=$2',[d.total,d.clientId]);
    }
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

// Full discharge update (admin correction)
app.put('/api/discharges/:id', async (req, res) => {
  const d = req.body;
  try {
    if (d.statusOnly) {
      await q('UPDATE discharges SET status=$1 WHERE id=$2',[d.status, req.params.id]);
    } else {
      // Fetch old record to adjust consumed diff
      const { rows:old } = await q('SELECT * FROM discharges WHERE id=$1',[req.params.id]);
      const oldD = old[0];
      await q(
        `UPDATE discharges SET truck=$1,waste_type=$2,gross=$3,tare=$4,net=$5,
         unit_price=$6,total=$7,status=$8,pay_method=$9,site_id=$10,ts=$11,
         correction_reason=$12 WHERE id=$13`,
        [d.truck,d.wasteType,d.gross,d.tare,d.net,d.unitPrice,
         d.total,d.status,d.payMethod,d.siteId,d.ts,
         d.correctionReason||'',req.params.id]
      );
      // Adjust client consumed if billing type is account-based
      if (oldD) {
        const oldTotal = parseFloat(oldD.total)||0;
        const newTotal = parseFloat(d.total)||0;
        const oldIsBilled = ['convention','credit','prepaid'].includes(oldD.pay_method);
        const newIsBilled = ['convention','credit','prepaid'].includes(d.payMethod);
        const clientId = oldD.client_id;
        if (clientId) {
          if (oldIsBilled && newIsBilled) {
            const diff = newTotal - oldTotal;
            if (diff !== 0) await q('UPDATE clients SET consumed=consumed+$1 WHERE id=$2',[diff,clientId]);
          } else if (oldIsBilled && !newIsBilled) {
            await q('UPDATE clients SET consumed=consumed-$1 WHERE id=$2',[oldTotal,clientId]);
          } else if (!oldIsBilled && newIsBilled) {
            await q('UPDATE clients SET consumed=consumed+$1 WHERE id=$2',[newTotal,clientId]);
          }
        }
      }
    }
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

/* ─── CLIENTS ─────────────────────────────────────────────────────────────── */
// Compute consumed dynamically from discharges
app.get('/api/clients', async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT c.*,
        COALESCE((
          SELECT SUM(d.total) FROM discharges d
          WHERE d.client_id = c.id
            AND (d.pay_method='convention' OR d.pay_method='credit' OR d.pay_method='prepaid')
            AND d.status != 'cancelled'
        ), 0) AS consumed
      FROM clients c ORDER BY c.name
    `);
    ok(res, rows.map(mapClient));
  } catch(e) { er(res,e); }
});

app.post('/api/clients', async (req, res) => {
  const c = req.body;
  try {
    await q(
      `INSERT INTO clients(id,name,client_type,type,status,credit_limit,consumed,credit_enabled,weight_limit_year,pay_frequency,pay_instrument,phone,address,nif,rc,docs,note,vat_subject,assigned_site)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) ON CONFLICT(id) DO NOTHING`,
      [c.id,c.name,c.clientType,c.type,c.status,c.creditLimit||0,0,
       c.creditEnabled||false,c.weightLimitYear||0,
       c.payFrequency||'monthly',c.payInstrument||'cheque',
       c.phone||'',c.address||'',c.nif||'',c.rc||'',JSON.stringify(c.docs||[]),c.note||'',
       c.vatSubject||false,c.assignedSite||'']
    );
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

app.put('/api/clients/:id', async (req, res) => {
  const c = req.body;
  try {
    await q(
      `UPDATE clients SET name=$1,client_type=$2,type=$3,status=$4,credit_limit=$5,
       credit_enabled=$6,weight_limit_year=$7,pay_frequency=$8,pay_instrument=$9,
       phone=$10,address=$11,nif=$12,rc=$13,docs=$14,note=$15,vat_subject=$16,
       assigned_site=$17 WHERE id=$18`,
      [c.name,c.clientType,c.type,c.status,c.creditLimit||0,
       c.creditEnabled||false,c.weightLimitYear||0,
       c.payFrequency||'monthly',c.payInstrument||'cheque',
       c.phone||'',c.address||'',c.nif||'',c.rc||'',JSON.stringify(c.docs||[]),c.note||'',
       c.vatSubject||false,c.assignedSite||'',req.params.id]
    );
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    await q('DELETE FROM clients WHERE id=$1',[req.params.id]);
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

/* ─── USERS ───────────────────────────────────────────────────────────────── */
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await q('SELECT * FROM users ORDER BY created_at');
    ok(res, rows.map(mapUser));
  } catch(e) { er(res,e); }
});

app.post('/api/users', async (req, res) => {
  const u = req.body;
  try {
    const hashed = await bcrypt.hash(u.password || 'changeme', 10);
    await q(
      `INSERT INTO users(id,name,email,password,role,status,phone,matricule,site_id,created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO NOTHING`,
      [u.id,u.name,u.email,hashed,u.role,u.status,u.phone||'',
       u.matricule||'',u.siteId||'all',u.createdAt||new Date().toISOString().slice(0,10)]
    );
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

app.put('/api/users/:id', async (req, res) => {
  const u = req.body;
  try {
    if (u.password && u.password.trim() && !u.password.startsWith('$2')) {
      // New plaintext password provided — hash it
      const hashed = await bcrypt.hash(u.password, 10);
      await q(
        `UPDATE users SET name=$1,email=$2,password=$3,role=$4,status=$5,
         phone=$6,matricule=$7,site_id=$8 WHERE id=$9`,
        [u.name,u.email,hashed,u.role,u.status,u.phone||'',
         u.matricule||'',u.siteId||'all',req.params.id]
      );
    } else {
      // No password change — keep existing hash
      await q(
        `UPDATE users SET name=$1,email=$2,role=$3,status=$4,
         phone=$5,matricule=$6,site_id=$7 WHERE id=$8`,
        [u.name,u.email,u.role,u.status,u.phone||'',
         u.matricule||'',u.siteId||'all',req.params.id]
      );
    }
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await q('DELETE FROM users WHERE id=$1',[req.params.id]);
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

/* ─── SITES ───────────────────────────────────────────────────────────────── */
app.get('/api/sites', async (req, res) => {
  try {
    const { rows } = await q('SELECT * FROM sites ORDER BY id');
    ok(res, rows.map(mapSite));
  } catch(e) { er(res,e); }
});

app.put('/api/sites/:id', async (req, res) => {
  const s = req.body;
  try {
    await q(
      `UPDATE sites SET name=$1,capacity=$2,used=$3,status=$4,manager=$5,
       commune=$6,localisation=$7,accepted_waste=$8 WHERE id=$9`,
      [s.name,s.capacity,s.used,s.status||'active',s.manager||'',
       s.commune||'',s.localisation||'',JSON.stringify(s.acceptedWaste||[]),req.params.id]
    );
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

/* ─── WASTE TYPES ─────────────────────────────────────────────────────────── */
app.get('/api/waste-types', async (req, res) => {
  try {
    const { rows } = await q('SELECT * FROM waste_types ORDER BY id');
    ok(res, rows.map(mapWT));
  } catch(e) { er(res,e); }
});

app.put('/api/waste-types/:id', async (req, res) => {
  const w = req.body;
  try {
    await q(
      'UPDATE waste_types SET label=$1,price=$2,rotation_price=$3,unit=$4,site_types=$5 WHERE id=$6',
      [w.label,w.price||0,w.rotationPrice||0,w.unit||'t',JSON.stringify(w.siteTypes||[]),w.id]
    );
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

/* ─── INVOICES ────────────────────────────────────────────────────────────── */
app.get('/api/invoices', async (req, res) => {
  try {
    const { rows } = await q('SELECT * FROM invoices ORDER BY generated_at DESC');
    ok(res, rows.map(mapInvoice));
  } catch(e) { er(res,e); }
});

app.post('/api/invoices', async (req, res) => {
  const inv = req.body;
  try {
    await q(
      `INSERT INTO invoices(id,client_id,month,total_amount,paid_amount,status,note)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(id) DO UPDATE SET total_amount=$4,paid_amount=$5,status=$6,note=$7`,
      [inv.id,inv.clientId,inv.month,inv.totalAmount,inv.paidAmount||0,inv.status||'pending',inv.note||'']
    );
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

app.put('/api/invoices/:id', async (req, res) => {
  const inv = req.body;
  try {
    await q(
      'UPDATE invoices SET status=$1,paid_at=$2,paid_amount=$3,note=$4 WHERE id=$5',
      [inv.status,inv.paidAt||null,inv.paidAmount||0,inv.note||'',req.params.id]
    );
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

/* ─── AUTH ────────────────────────────────────────────────────────────────── */
app.post('/api/auth/login', rateLimitLogin, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Champs requis manquants.' });
  try {
    const { rows } = await q(
      'SELECT * FROM users WHERE email=$1 AND status=$2',
      [email, 'active']
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Identifiants invalides ou compte inactif.' });
    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) return res.status(401).json({ error: 'Identifiants invalides ou compte inactif.' });
    ok(res, mapUser(rows[0]));
  } catch(e) { er(res,e); }
});

app.post('/api/auth/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  if (!userId || !currentPassword || !newPassword) return res.status(400).json({ error: 'Champs requis manquants.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères.' });
  try {
    const { rows } = await q('SELECT * FROM users WHERE id=$1', [userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    const match = await bcrypt.compare(currentPassword, rows[0].password);
    if (!match) return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await q('UPDATE users SET password=$1 WHERE id=$2', [hashed, userId]);
    ok(res, { ok: true });
  } catch(e) { er(res,e); }
});
// Serve built frontend in production
if (IS_PROD) {
  const distPath = join(__dirname, 'dist');
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('/{*path}', (req, res) => res.sendFile(join(distPath, 'index.html')));
  }
}
// Health check endpoint (responds immediately, before DB is ready)
// Start listening immediately so health checks pass, then init DB in background
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  initDb().catch(e => console.error('DB init failed:', e.message));
});
