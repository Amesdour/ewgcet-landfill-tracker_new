import express from 'express';
import pg from 'pg';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;
const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;
const POLICY_VERSION = '1.0';
const MIN_PASSWORD_LENGTH = 8;

/* ─── SECURITY HEADERS (Law 25-11, Art. 10) ──────────────────────────────── */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Powered-By', 'EPWGCET');
  if (IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
});
const q  = (sql, p) => pool.query(sql, p);
const ok = (res, data) => res.json(data);
const er = (res, err, code=500) => { console.error(err); res.status(code).json({error:String(err)}); };

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function getIP(req) {
  const fwd = req.headers['x-forwarded-for'] || '';
  return fwd.split(',')[0].trim() || req.ip || 'unknown';
}

async function logAudit({ eventType, userId=null, userName=null, userRole=null, ip=null, resource=null, resourceId=null, detail=null, outcome='success' }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs(event_type,user_id,user_name,user_role,ip_address,resource,resource_id,detail,outcome)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [eventType, userId, userName, userRole, ip, resource, resourceId, detail, outcome]
    );
  } catch(e) {
    console.error('[AUDIT LOG ERROR]', e.message);
  }
}

function validatePasswordStrength(pw) {
  if (!pw || pw.length < MIN_PASSWORD_LENGTH) return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  if (!/[A-Za-z]/.test(pw)) return 'Le mot de passe doit contenir au moins une lettre.';
  if (!/[0-9]/.test(pw)) return 'Le mot de passe doit contenir au moins un chiffre.';
  return null;
}

/* ─── MIGRATIONS ─────────────────────────────────────────────────────────── */
async function runMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(200) PRIMARY KEY,
        applied_at TIMESTAMP    DEFAULT NOW()
      )
    `);

    const migrationsDir = join(__dirname, 'migrations');
    if (!existsSync(migrationsDir)) { console.log('No migrations directory found.'); return; }

    const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const { rows } = await pool.query('SELECT filename FROM schema_migrations WHERE filename=$1', [file]);
      if (rows.length > 0) continue;
      console.log(`Running migration: ${file}`);
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      console.log(`Migration applied: ${file}`);
    }

    // Hash any plaintext passwords (idempotent)
    const { rows: users } = await pool.query('SELECT id, password FROM users');
    for (const u of users) {
      if (u.password && !u.password.startsWith('$2')) {
        const hash = await bcrypt.hash(u.password, 10);
        await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hash, u.id]);
      }
    }
    console.log('Migrations complete.');
  } catch (e) {
    console.error('Migration error:', e.message);
  }
}

/* ─── RATE LIMITER (login) ───────────────────────────────────────────────── */
const loginAttempts = new Map();
const rateLimitLogin = (req, res, next) => {
  const ip = getIP(req);
  const now = Date.now();
  const e = loginAttempts.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > e.resetAt) { e.count = 0; e.resetAt = now + 60000; }
  e.count++;
  loginAttempts.set(ip, e);
  if (e.count > 10) return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 1 minute.' });
  next();
};

/* ─── ROW MAPPERS ────────────────────────────────────────────────────────── */
const mapDischarge = r => ({
  id:r.id, ts:r.ts, siteId:r.site_id, clientId:r.client_id,
  clientName:r.client_name, truck:r.truck, wasteType:r.waste_type,
  gross:parseFloat(r.gross), tare:parseFloat(r.tare), net:parseFloat(r.net),
  unitPrice:parseFloat(r.unit_price), total:parseFloat(r.total), status:r.status,
  payMethod:r.pay_method, opId:r.op_id,
  correctionReason:r.correction_reason||'',
  opType:r.op_type||'treatment',
});

const mapCompanyTruck = r => ({
  id:r.id, plate:r.plate, label:r.label||'', tare:parseFloat(r.tare)||0, status:r.status||'active',
});

const mapClient = r => ({
  id:r.id, name:r.name, clientType:r.client_type, type:r.type,
  status:r.status, creditLimit:parseFloat(r.credit_limit)||0,
  consumed:parseFloat(r.consumed)||0,
  creditEnabled:r.credit_enabled||false,
  weightLimitYear:parseFloat(r.weight_limit_year)||0,
  rotationLimit:parseInt(r.rotation_limit)||0,
  payFrequency:r.pay_frequency||'monthly',
  payInstrument:r.pay_instrument||'cheque',
  phone:r.phone||'', address:r.address||'', nif:r.nif||'', rc:r.rc||'',
  docs:r.docs||[], note:r.note||'',
  vatSubject:r.vat_subject||false,
  assignedSites:r.assigned_sites||[],
  serviceType:r.service_type||'treatment_only',
  collectBillingMode:r.collect_billing_mode||'tonnage',
  allowedWasteTypes:r.allowed_waste_types||[],
});

const mapUser = r => ({
  id:r.id, name:r.name, email:r.email,
  role:r.role, status:r.status, phone:r.phone||'',
  matricule:r.matricule||'', siteId:r.site_id, createdAt:r.created_at,
  emailVerified:r.email_verified||false,
  verificationCode:r.verification_code||null,
});

function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

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
  collectPrice:parseFloat(r.collect_price)||0,
  collectRotationPrice:parseFloat(r.collect_rotation_price)||0,
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
    if (d.clientId && d.wasteType) {
      const { rows: clientRows } = await q('SELECT allowed_waste_types FROM clients WHERE id=$1', [d.clientId]);
      if (clientRows.length > 0) {
        const allowed = clientRows[0].allowed_waste_types || [];
        if (allowed.length > 0 && !allowed.includes(d.wasteType)) {
          return res.status(403).json({ error: `Type de déchet non autorisé pour ce client.` });
        }
      }
    }
    await q(
      `INSERT INTO discharges(id,ts,site_id,client_id,client_name,truck,waste_type,gross,tare,net,unit_price,total,status,pay_method,op_id,op_type)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [d.id,d.ts,d.siteId,d.clientId,d.clientName,d.truck,d.wasteType,
       d.gross,d.tare,d.net,d.unitPrice,d.total,d.status,d.payMethod,d.opId,d.opType||'treatment']
    );
    if ((d.payMethod==='convention'||d.payMethod==='credit'||d.payMethod==='prepaid') && d.clientId) {
      await q('UPDATE clients SET consumed=consumed+$1 WHERE id=$2',[d.total,d.clientId]);
    }
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

app.put('/api/discharges/:id', async (req, res) => {
  const d = req.body;
  try {
    if (d.statusOnly) {
      await q('UPDATE discharges SET status=$1 WHERE id=$2',[d.status, req.params.id]);
    } else {
      const { rows:old } = await q('SELECT * FROM discharges WHERE id=$1',[req.params.id]);
      const oldD = old[0];
      await q(
        `UPDATE discharges SET truck=$1,waste_type=$2,gross=$3,tare=$4,net=$5,
         unit_price=$6,total=$7,status=$8,pay_method=$9,site_id=$10,ts=$11,
         correction_reason=$12,op_type=$13 WHERE id=$14`,
        [d.truck,d.wasteType,d.gross,d.tare,d.net,d.unitPrice,
         d.total,d.status,d.payMethod,d.siteId,d.ts,
         d.correctionReason||'',d.opType||'treatment',req.params.id]
      );
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
      `INSERT INTO clients(id,name,client_type,type,status,credit_limit,consumed,credit_enabled,weight_limit_year,pay_frequency,pay_instrument,phone,address,nif,rc,docs,note,vat_subject,assigned_sites,service_type,collect_billing_mode,allowed_waste_types)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) ON CONFLICT(id) DO NOTHING`,
      [c.id,c.name,c.clientType,c.type,c.status,c.creditLimit||0,0,
       c.creditEnabled||false,c.weightLimitYear||0,
       c.payFrequency||'monthly',c.payInstrument||'cheque',
       c.phone||'',c.address||'',c.nif||'',c.rc||'',JSON.stringify(c.docs||[]),c.note||'',
       c.vatSubject||false,JSON.stringify(c.assignedSites||[]),
       c.serviceType||'treatment_only',c.collectBillingMode||'tonnage',
       JSON.stringify(c.allowedWasteTypes||[])]
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
       assigned_sites=$17,rotation_limit=$18,service_type=$19,collect_billing_mode=$20,
       allowed_waste_types=$21 WHERE id=$22`,
      [c.name,c.clientType,c.type,c.status,c.creditLimit||0,
       c.creditEnabled||false,c.weightLimitYear||0,
       c.payFrequency||'monthly',c.payInstrument||'cheque',
       c.phone||'',c.address||'',c.nif||'',c.rc||'',JSON.stringify(c.docs||[]),c.note||'',
       c.vatSubject||false,JSON.stringify(c.assignedSites||[]),c.rotationLimit||0,
       c.serviceType||'treatment_only',c.collectBillingMode||'tonnage',
       JSON.stringify(c.allowedWasteTypes||[]),req.params.id]
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
    const code = (u.role === 'operator') ? genCode() : null;
    const expires = code ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null;
    await q(
      `INSERT INTO users(id,name,email,password,role,status,phone,matricule,site_id,created_at,
        email_verified,verification_code,verification_expires_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(id) DO NOTHING`,
      [u.id,u.name,u.email,hashed,u.role,u.status,u.phone||'',
       u.matricule||'',u.siteId||'all',u.createdAt||new Date().toISOString().slice(0,10),
       false, code, expires]
    );
    ok(res, { ok:true, verificationCode: code });
  } catch(e) { er(res,e); }
});

app.post('/api/users/:id/verify-email', async (req, res) => {
  const { code } = req.body;
  try {
    const { rows } = await q(
      'SELECT verification_code, verification_expires_at FROM users WHERE id=$1',
      [req.params.id]
    );
    if (!rows.length) return er(res, 'Utilisateur non trouvé', 404);
    const { verification_code, verification_expires_at } = rows[0];
    if (!verification_code) return er(res, 'Aucun code de vérification actif', 400);
    if (new Date() > new Date(verification_expires_at)) return er(res, 'Code expiré', 400);
    if (code !== verification_code) return er(res, 'Code incorrect', 400);
    await q(
      'UPDATE users SET email_verified=TRUE, verification_code=NULL, verification_expires_at=NULL WHERE id=$1',
      [req.params.id]
    );
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

app.post('/api/users/:id/regenerate-code', async (req, res) => {
  try {
    const code = genCode();
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await q(
      'UPDATE users SET verification_code=$1, verification_expires_at=$2, email_verified=FALSE WHERE id=$3',
      [code, expires, req.params.id]
    );
    ok(res, { ok:true, verificationCode: code });
  } catch(e) { er(res,e); }
});

app.put('/api/users/:id', async (req, res) => {
  const u = req.body;
  try {
    if (u.password && u.password.trim() && !u.password.startsWith('$2')) {
      const hashed = await bcrypt.hash(u.password, 10);
      await q(
        `UPDATE users SET name=$1,email=$2,password=$3,role=$4,status=$5,
         phone=$6,matricule=$7,site_id=$8 WHERE id=$9`,
        [u.name,u.email,hashed,u.role,u.status,u.phone||'',
         u.matricule||'',u.siteId||'all',req.params.id]
      );
    } else {
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
      'UPDATE waste_types SET label=$1,price=$2,rotation_price=$3,unit=$4,site_types=$5,collect_price=$6,collect_rotation_price=$7 WHERE id=$8',
      [w.label,w.price||0,w.rotationPrice||0,w.unit||'t',JSON.stringify(w.siteTypes||[]),w.collectPrice||0,w.collectRotationPrice||0,w.id]
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
      'UPDATE invoices SET status=$1,paid_at=$2,paid_amount=$3,note=$4,total_amount=$5 WHERE id=$6',
      [inv.status,inv.paidAt||null,inv.paidAmount||0,inv.note||'',inv.totalAmount||0,req.params.id]
    );
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

/* ─── AUTH ────────────────────────────────────────────────────────────────── */
app.post('/api/auth/login', rateLimitLogin, async (req, res) => {
  const { email, password } = req.body;
  const ip = getIP(req);
  if (!email || !password) return res.status(400).json({ error: 'Champs requis manquants.' });
  try {
    const { rows } = await q(
      'SELECT * FROM users WHERE email=$1 AND status=$2',
      [email, 'active']
    );
    if (rows.length === 0) {
      await logAudit({ eventType:'LOGIN_FAIL', ip, resource:'auth', detail:`Email inconnu ou compte inactif: ${email}`, outcome:'failure' });
      return res.status(401).json({ error: 'Identifiants invalides ou compte inactif.' });
    }
    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) {
      await logAudit({ eventType:'LOGIN_FAIL', userId:rows[0].id, userName:rows[0].name, userRole:rows[0].role, ip, resource:'auth', detail:'Mot de passe incorrect', outcome:'failure' });
      return res.status(401).json({ error: 'Identifiants invalides ou compte inactif.' });
    }
    await logAudit({ eventType:'LOGIN_SUCCESS', userId:rows[0].id, userName:rows[0].name, userRole:rows[0].role, ip, resource:'auth', detail:'Connexion réussie', outcome:'success' });
    ok(res, mapUser(rows[0]));
  } catch(e) { er(res,e); }
});

app.post('/api/auth/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  if (!userId || !currentPassword || !newPassword) return res.status(400).json({ error: 'Champs requis manquants.' });
  const pwError = validatePasswordStrength(newPassword);
  if (pwError) return res.status(400).json({ error: pwError });
  try {
    const { rows } = await q('SELECT * FROM users WHERE id=$1', [userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    const match = await bcrypt.compare(currentPassword, rows[0].password);
    if (!match) {
      await logAudit({ eventType:'PASSWORD_CHANGE_FAIL', userId, userRole:rows[0].role, resource:'auth', detail:'Mot de passe actuel incorrect', outcome:'failure' });
      return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await q('UPDATE users SET password=$1 WHERE id=$2', [hashed, userId]);
    await logAudit({ eventType:'PASSWORD_CHANGE', userId, userName:rows[0].name, userRole:rows[0].role, resource:'users', resourceId:userId, detail:'Mot de passe modifié', outcome:'success' });
    ok(res, { ok: true });
  } catch(e) { er(res,e); }
});

/* ─── COMPANY TRUCKS ──────────────────────────────────────────────────────── */
app.get('/api/company-trucks', async (req, res) => {
  try {
    const { rows } = await q('SELECT * FROM company_trucks ORDER BY plate');
    ok(res, rows.map(mapCompanyTruck));
  } catch(e) { er(res,e); }
});

app.post('/api/company-trucks', async (req, res) => {
  const t = req.body;
  try {
    await q(
      `INSERT INTO company_trucks(id,plate,label,tare,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING`,
      [t.id, t.plate.toUpperCase(), t.label||'', t.tare||0, t.status||'active']
    );
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

app.put('/api/company-trucks/:id', async (req, res) => {
  const t = req.body;
  try {
    await q(
      `UPDATE company_trucks SET plate=$1,label=$2,tare=$3,status=$4 WHERE id=$5`,
      [t.plate.toUpperCase(), t.label||'', t.tare||0, t.status||'active', req.params.id]
    );
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

app.delete('/api/company-trucks/:id', async (req, res) => {
  try {
    await q('DELETE FROM company_trucks WHERE id=$1',[req.params.id]);
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

/* ══════════════════════════════════════════════════════════════════════════════
   CONFORMITÉ — Loi 18-07 + Loi 25-11
   All endpoints under /api/compliance/
══════════════════════════════════════════════════════════════════════════════ */

/* POST /api/compliance/consent — Record user consent (Law 18-07, Art. 7) */
app.post('/api/compliance/consent', async (req, res) => {
  const { userId, scope } = req.body;
  const ip = getIP(req);
  if (!userId) return res.status(400).json({ error: 'userId requis.' });
  try {
    await q(
      `INSERT INTO consent_records(user_id, policy_ver, scope, ip_address)
       VALUES($1,$2,$3,$4)
       ON CONFLICT DO NOTHING`,
      [userId, POLICY_VERSION, scope||'system_access', ip]
    );
    await logAudit({ eventType:'CONSENT_GIVEN', userId, ip, resource:'consent_records', detail:`Politique v${POLICY_VERSION} acceptée`, outcome:'success' });
    ok(res, { ok:true, policyVersion: POLICY_VERSION });
  } catch(e) { er(res,e); }
});

/* GET /api/compliance/consent/:userId — Check consent status */
app.get('/api/compliance/consent/:userId', async (req, res) => {
  try {
    const { rows } = await q(
      `SELECT id, consented_at, policy_ver, scope FROM consent_records
       WHERE user_id=$1 AND policy_ver=$2 AND revoked_at IS NULL
       ORDER BY consented_at DESC LIMIT 1`,
      [req.params.userId, POLICY_VERSION]
    );
    ok(res, {
      consented: rows.length > 0,
      record: rows[0] || null,
      currentPolicyVersion: POLICY_VERSION,
    });
  } catch(e) { er(res,e); }
});

/* GET /api/compliance/my-data/:userId — Right of Access (Law 18-07, Art. 20) */
app.get('/api/compliance/my-data/:userId', async (req, res) => {
  const uid = req.params.userId;
  const ip = getIP(req);
  try {
    const [userRes, dischargesRes, consentRes, requestsRes] = await Promise.all([
      q('SELECT id,name,email,role,status,phone,matricule,site_id,created_at FROM users WHERE id=$1', [uid]),
      q('SELECT id,ts,site_id,waste_type,truck,net,total,status,pay_method FROM discharges WHERE op_id=$1 ORDER BY ts DESC', [uid]),
      q('SELECT policy_ver,consented_at,scope FROM consent_records WHERE user_id=$1 ORDER BY consented_at DESC', [uid]),
      q('SELECT request_type,requested_at,status FROM data_requests WHERE user_id=$1 ORDER BY requested_at DESC', [uid]),
    ]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    await logAudit({ eventType:'DATA_ACCESS_REQUEST', userId:uid, ip, resource:'my-data', detail:'Export données personnelles (Art.20 Loi 18-07)', outcome:'success' });
    ok(res, {
      exportedAt: new Date().toISOString(),
      legalBasis: 'Loi 18-07, Article 20 — Droit d\'accès',
      profile: userRes.rows[0],
      operatorDischarges: dischargesRes.rows,
      consentHistory: consentRes.rows,
      dataRequests: requestsRes.rows,
    });
  } catch(e) { er(res,e); }
});

/* POST /api/compliance/data-request — Submit a data rights request (Law 18-07, Art. 20-25) */
app.post('/api/compliance/data-request', async (req, res) => {
  const { userId, requestType, subjectName, subjectEmail, note } = req.body;
  const validTypes = ['access','rectification','erasure','portability','objection'];
  if (!validTypes.includes(requestType)) return res.status(400).json({ error: 'Type de demande invalide.' });
  const ip = getIP(req);
  try {
    const { rows } = await q(
      `INSERT INTO data_requests(request_type,user_id,subject_name,subject_email,note)
       VALUES($1,$2,$3,$4,$5) RETURNING id,requested_at`,
      [requestType, userId||null, subjectName||'', subjectEmail||'', note||'']
    );
    await logAudit({ eventType:`DATA_REQUEST_${requestType.toUpperCase()}`, userId, ip, resource:'data_requests', resourceId:String(rows[0].id), detail:`Demande de ${requestType} soumise`, outcome:'success' });
    ok(res, { ok:true, requestId: rows[0].id, requestedAt: rows[0].requested_at });
  } catch(e) { er(res,e); }
});

/* GET /api/compliance/data-requests — Admin: list all requests */
app.get('/api/compliance/data-requests', async (req, res) => {
  try {
    const { rows } = await q(
      `SELECT dr.*, u.name AS handler_name FROM data_requests dr
       LEFT JOIN users u ON u.id=dr.handled_by
       ORDER BY dr.requested_at DESC`
    );
    ok(res, rows);
  } catch(e) { er(res,e); }
});

/* PUT /api/compliance/data-requests/:id — Admin: handle a request */
app.put('/api/compliance/data-requests/:id', async (req, res) => {
  const { status, handledBy, note } = req.body;
  const ip = getIP(req);
  try {
    await q(
      `UPDATE data_requests SET status=$1,handled_by=$2,handled_at=NOW(),note=$3 WHERE id=$4`,
      [status, handledBy||null, note||'', req.params.id]
    );
    await logAudit({ eventType:'DATA_REQUEST_HANDLED', userId:handledBy, ip, resource:'data_requests', resourceId:req.params.id, detail:`Demande traitée → ${status}`, outcome:'success' });
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

/* GET /api/compliance/audit-log — Admin: view security audit log (Law 25-11, Art. 16) */
app.get('/api/compliance/audit-log', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit)||100, 500);
  const offset = parseInt(req.query.offset)||0;
  const eventType = req.query.event_type||null;
  try {
    const base = `SELECT * FROM audit_logs ${eventType?'WHERE event_type=$3':''} ORDER BY ts DESC LIMIT $1 OFFSET $2`;
    const params = eventType ? [limit, offset, eventType] : [limit, offset];
    const { rows } = await q(base, params);
    const { rows:cnt } = await q(`SELECT COUNT(*) FROM audit_logs${eventType?' WHERE event_type=$1':''}`, eventType?[eventType]:[]);
    ok(res, { total: parseInt(cnt[0].count), limit, offset, rows });
  } catch(e) { er(res,e); }
});

/* GET /api/compliance/breach-report — Admin: generate incident/breach report (Law 25-11, Art. 18 — 72h window) */
app.get('/api/compliance/breach-report', async (req, res) => {
  const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 72*3600*1000);
  try {
    const { rows: failures } = await q(
      `SELECT * FROM audit_logs
       WHERE ts >= $1 AND outcome='failure'
       ORDER BY ts DESC`,
      [since]
    );
    const { rows: logins } = await q(
      `SELECT DATE_TRUNC('hour',ts) AS hour, COUNT(*) AS count, outcome
       FROM audit_logs WHERE ts >= $1 AND event_type LIKE 'LOGIN%'
       GROUP BY 1,3 ORDER BY 1 DESC`,
      [since]
    );
    ok(res, {
      reportGeneratedAt: new Date().toISOString(),
      reportingWindowStart: since.toISOString(),
      legalReference: 'Loi 25-11 Art.18 — Notification d\'incident dans les 72 heures',
      reportingAuthority: 'ANSSI Algérie (Agence Nationale de la Sécurité des Systèmes d\'Information)',
      failureEvents: failures,
      loginActivity: logins,
      summary: {
        totalFailures: failures.length,
        loginFailures: failures.filter(r=>r.event_type==='LOGIN_FAIL').length,
        passwordFailures: failures.filter(r=>r.event_type==='PASSWORD_CHANGE_FAIL').length,
      },
    });
  } catch(e) { er(res,e); }
});

/* POST /api/compliance/purge-expired — Admin: enforce retention policy (Law 18-07, Art. 17) */
app.post('/api/compliance/purge-expired', async (req, res) => {
  const ip = getIP(req);
  const { adminUserId, retentionYears } = req.body;
  const years = parseInt(retentionYears) || 10;
  try {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - years);
    const { rowCount } = await q(
      `DELETE FROM discharges WHERE ts < $1`,
      [cutoff]
    );
    await logAudit({
      eventType:'RETENTION_PURGE',
      userId: adminUserId,
      ip,
      resource:'discharges',
      detail:`Purge données > ${years} ans (avant ${cutoff.toISOString().slice(0,10)}): ${rowCount} entrées supprimées`,
      outcome:'success',
    });
    ok(res, { ok:true, deletedCount: rowCount, cutoffDate: cutoff.toISOString().slice(0,10) });
  } catch(e) { er(res,e); }
});

/* ─── STATIC (production) ─────────────────────────────────────────────────── */
if (IS_PROD) {
  const distPath = join(__dirname, 'dist');
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('/{*path}', (req, res) => res.sendFile(join(distPath, 'index.html')));
  }
}

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  runMigrations().catch(e => console.error('Migration failed:', e.message));
});
