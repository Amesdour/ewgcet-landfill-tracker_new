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

/* ─── VAT HELPERS (Phase 5.5) ────────────────────────────────────────────── */
// Single source of truth for HT↔TTC conversion (19% Algerian VAT).
const toTTC = (amtHT,  vatSubject) => vatSubject ? Math.round(amtHT  * 1.19 * 100) / 100 : amtHT;
const toHT  = (amtTTC, vatSubject) => vatSubject ? Math.round((amtTTC / 1.19) * 100) / 100 : amtTTC;

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
  consentGiven:r.consent_given||false,
  consentDate:r.consent_date||null,
  consentBy:r.consent_by||'',
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
  // Phase 5.2 — single pooled client for the whole operation
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    let forcedStatus = d.status;

    if (d.clientId) {
      // Phase 4 — SELECT … FOR UPDATE so two concurrent requests can't both read stale consumption
      const { rows: cls } = await dbClient.query(
        'SELECT * FROM clients WHERE id=$1 FOR UPDATE', [d.clientId]
      );
      if (cls.length > 0) {
        const cl = cls[0];

        // Waste-type allow-list check
        const allowed = cl.allowed_waste_types || [];
        if (allowed.length > 0 && d.wasteType && !allowed.includes(d.wasteType)) {
          await dbClient.query('ROLLBACK');
          dbClient.release();
          return res.status(403).json({ error: 'Type de déchet non autorisé pour ce client.' });
        }

        // Phase 4 — credit-limit backstop
        if (cl.credit_enabled && parseFloat(cl.credit_limit) > 0) {
          const { rows: cRows } = await dbClient.query(
            `SELECT COALESCE(SUM(total),0) AS consumed FROM discharges
             WHERE client_id=$1 AND pay_method IN ('convention','credit','prepaid') AND status!='cancelled'`,
            [d.clientId]
          );
          const consumed = parseFloat(cRows[0].consumed) || 0;
          if (consumed + (parseFloat(d.total) || 0) > parseFloat(cl.credit_limit)) forcedStatus = 'flagged';
        }

        // Phase 4 — rotation-limit backstop
        if (parseInt(cl.rotation_limit) > 0 && d.payMethod === 'rotation') {
          const now = new Date();
          const pfx = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
          const { rows: rRows } = await dbClient.query(
            `SELECT COUNT(*) AS cnt FROM discharges
             WHERE client_id=$1 AND pay_method='rotation' AND status!='cancelled' AND ts LIKE $2`,
            [d.clientId, pfx + '%']
          );
          if ((parseInt(rRows[0].cnt) || 0) >= parseInt(cl.rotation_limit)) forcedStatus = 'flagged';
        }

        // Phase 4 — weight / rotation-count annual/monthly limit backstop
        if (parseFloat(cl.weight_limit_year) > 0) {
          const now = new Date();
          const isMonthly = cl.pay_frequency === 'monthly';
          const pfx = isMonthly
            ? `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
            : String(now.getFullYear());
          const isRot = d.payMethod === 'rotation';
          const { rows: wRows } = await dbClient.query(
            isRot
              ? `SELECT COUNT(*) AS val FROM discharges WHERE client_id=$1 AND status!='cancelled' AND ts LIKE $2`
              : `SELECT COALESCE(SUM(net),0) AS val FROM discharges WHERE client_id=$1 AND status!='cancelled' AND ts LIKE $2`,
            [d.clientId, pfx + '%']
          );
          const used     = parseFloat(wRows[0].val) || 0;
          const incoming = isRot ? 1 : (parseFloat(d.net) || 0);
          if (used + incoming > parseFloat(cl.weight_limit_year)) forcedStatus = 'flagged';
        }
      }
    }

    // Phase 5.3 — ts sanity check (POST only — PUT supports admin backdating)
    const tsVal = d.ts ? new Date(d.ts) : null;
    const serverNow = new Date();
    const tsToInsert = (!tsVal || isNaN(tsVal) || Math.abs(serverNow - tsVal) > 24 * 3600 * 1000)
      ? serverNow.toISOString()
      : d.ts;

    // Phase 5.4 — round net (3 dp) and total (2 dp) before persisting
    const net   = d.net   != null ? Math.round(parseFloat(d.net)   * 1000) / 1000 : d.net;
    const total = d.total != null ? Math.round(parseFloat(d.total) *  100) /  100 : d.total;

    await dbClient.query(
      `INSERT INTO discharges(id,ts,site_id,client_id,client_name,truck,waste_type,gross,tare,net,unit_price,total,status,pay_method,op_id,op_type)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [d.id, tsToInsert, d.siteId, d.clientId, d.clientName, d.truck, d.wasteType,
       d.gross, d.tare, net, d.unitPrice, total, forcedStatus, d.payMethod, d.opId, d.opType||'treatment']
    );
    // Phase 5.1 — do NOT write to clients.consumed incrementally;
    //             GET /api/clients always recomputes it live via SUM.

    await dbClient.query('COMMIT');
    dbClient.release();
    ok(res, { ok: true });
  } catch(e) {
    await dbClient.query('ROLLBACK');
    dbClient.release();
    er(res, e);
  }
});

app.put('/api/discharges/:id', async (req, res) => {
  const d = req.body;
  // Phase 5.2 — single pooled client; Phase 0 — fetch old row first for null-safe fallbacks
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    const { rows: old } = await dbClient.query(
      'SELECT * FROM discharges WHERE id=$1 FOR UPDATE', [req.params.id]
    );
    const oldD = old[0];
    if (!oldD) {
      await dbClient.query('ROLLBACK');
      dbClient.release();
      return res.status(404).json({ error: 'Discharge not found' });
    }

    if (d.statusOnly) {
      // Phase 0 fix: status-only path — never touch other columns
      await dbClient.query('UPDATE discharges SET status=$1 WHERE id=$2', [d.status, req.params.id]);
    } else {
      // Phase 0 fix: fall back to existing DB values for any field missing from the request body,
      // so a partial payload (e.g. {status:"settled"} without statusOnly) can never null a column.
      const truck            = d.truck            ?? oldD.truck;
      const wasteType        = d.wasteType        ?? oldD.waste_type;
      const gross            = d.gross            ?? oldD.gross;
      const tare             = d.tare             ?? oldD.tare;
      const net              = d.net              ?? oldD.net;
      const unitPrice        = d.unitPrice        ?? oldD.unit_price;
      const total            = d.total            ?? oldD.total;
      const status           = d.status           ?? oldD.status;
      const payMethod        = d.payMethod        ?? oldD.pay_method;
      const siteId           = d.siteId           ?? oldD.site_id;
      const ts               = d.ts               ?? oldD.ts;
      const correctionReason = d.correctionReason ?? oldD.correction_reason ?? '';
      const opType           = d.opType           ?? oldD.op_type ?? 'treatment';

      await dbClient.query(
        `UPDATE discharges SET truck=$1,waste_type=$2,gross=$3,tare=$4,net=$5,
         unit_price=$6,total=$7,status=$8,pay_method=$9,site_id=$10,ts=$11,
         correction_reason=$12,op_type=$13 WHERE id=$14`,
        [truck, wasteType, gross, tare, net, unitPrice, total, status,
         payMethod, siteId, ts, correctionReason, opType, req.params.id]
      );
      // Phase 5.1 — do NOT write to clients.consumed; GET /api/clients recomputes it live.
    }

    await dbClient.query('COMMIT');
    dbClient.release();
    ok(res, { ok: true });
  } catch(e) {
    await dbClient.query('ROLLBACK');
    dbClient.release();
    er(res, e);
  }
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
       allowed_waste_types=$21,consent_given=$22,consent_date=$23,consent_by=$24
       WHERE id=$25`,
      [c.name,c.clientType,c.type,c.status,c.creditLimit||0,
       c.creditEnabled||false,c.weightLimitYear||0,
       c.payFrequency||'monthly',c.payInstrument||'cheque',
       c.phone||'',c.address||'',c.nif||'',c.rc||'',JSON.stringify(c.docs||[]),c.note||'',
       c.vatSubject||false,JSON.stringify(c.assignedSites||[]),c.rotationLimit||0,
       c.serviceType||'treatment_only',c.collectBillingMode||'tonnage',
       JSON.stringify(c.allowedWasteTypes||[]),
       c.consentGiven||false,c.consentDate||null,c.consentBy||null,
       req.params.id]
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
      `INSERT INTO invoices(id,client_id,month,total_amount,paid_amount,status,note,period_type)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(id) DO UPDATE SET total_amount=$4,paid_amount=$5,status=$6,note=$7,period_type=COALESCE($8,invoices.period_type)`,
      [inv.id, inv.clientId, inv.month, inv.totalAmount, inv.paidAmount||0,
       inv.status||'pending', inv.note||'', inv.periodType||'monthly']
    );
    ok(res, { ok:true });
  } catch(e) { er(res,e); }
});

app.put('/api/invoices/:id', async (req, res) => {
  const inv = req.body;
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await dbClient.query(
      'UPDATE invoices SET status=$1,paid_at=$2,paid_amount=$3,note=$4,total_amount=$5,period_type=COALESCE($6,period_type) WHERE id=$7',
      [inv.status, inv.paidAt||null, inv.paidAmount||0, inv.note||'', inv.totalAmount||0,
       inv.periodType||null, req.params.id]
    );
    // Phase 5.7 — when an invoice transitions to fully paid, mark all its period's discharges paid
    if (inv.status === 'paid' && inv.clientId && inv.month) {
      const pfxLen = inv.month.length; // "2026" (annual) or "2026-06" (monthly)
      await dbClient.query(
        `UPDATE discharges SET status='paid'
         WHERE client_id=$1
           AND status NOT IN ('paid','cancelled')
           AND LEFT(ts::text, $2) = $3`,
        [inv.clientId, pfxLen, inv.month]
      );
    }
    await dbClient.query('COMMIT');
    dbClient.release();
    ok(res, { ok: true });
  } catch(e) {
    await dbClient.query('ROLLBACK');
    dbClient.release();
    er(res, e);
  }
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
    // Revoke any existing active consent for this policy version first
    await q(
      `UPDATE consent_records
       SET revoked_at = NOW()
       WHERE user_id=$1 AND policy_ver=$2 AND revoked_at IS NULL`,
      [userId, POLICY_VERSION]
    );
    // Fresh insert — no conflict possible since old record is now revoked
    const { rows } = await q(
      `INSERT INTO consent_records(user_id, policy_ver, scope, ip_address)
       VALUES($1,$2,$3,$4)
       RETURNING id, consented_at`,
      [userId, POLICY_VERSION, scope||'system_access', ip]
    );
    await logAudit({ eventType:'CONSENT_GIVEN', userId, ip, resource:'consent_records', detail:`Politique v${POLICY_VERSION} acceptée`, outcome:'success' });
    ok(res, { ok:true, policyVersion: POLICY_VERSION, consentId: rows[0].id, consentedAt: rows[0].consented_at });
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

/* ─── BILLS & PAYMENTS (Phase 3) ─────────────────────────────────────────── */

app.get('/api/bills', async (req, res) => {
  try {
    const { clientId } = req.query;
    const { rows } = clientId
      ? await q('SELECT * FROM bills WHERE client_id=$1 ORDER BY generated_at DESC', [clientId])
      : await q('SELECT * FROM bills ORDER BY generated_at DESC');
    ok(res, rows);
  } catch(e) { er(res, e); }
});

app.get('/api/bills/:id', async (req, res) => {
  try {
    const { rows: bills } = await q('SELECT * FROM bills WHERE id=$1', [req.params.id]);
    if (!bills.length) return res.status(404).json({ error: 'Facture introuvable.' });
    const bill = bills[0];
    const { rows: cls } = await q('SELECT vat_subject FROM clients WHERE id=$1', [bill.client_id]);
    const vatSubject = cls.length ? (cls[0].vat_subject || false) : false;
    const { rows: discs } = await q(
      `SELECT d.*,
        CASE WHEN $2 THEN d.total * 1.19 ELSE d.total END AS total_ttc,
        (CASE WHEN $2 THEN d.total * 1.19 ELSE d.total END)
          - COALESCE((SELECT SUM(dp.applied_amount_ttc) FROM discharge_payments dp
                      WHERE dp.discharge_id = d.id), 0) AS remaining_ttc
       FROM discharges d
       JOIN bill_discharges bd ON bd.discharge_id = d.id
       WHERE bd.bill_id = $1 ORDER BY d.ts ASC`,
      [req.params.id, vatSubject]
    );
    const remainingTotal = Math.round(discs.reduce((s, d) => s + Math.max(0, parseFloat(d.remaining_ttc)), 0) * 100) / 100;
    ok(res, { ...bill, discharges: discs, remainingTotal });
  } catch(e) { er(res, e); }
});

/* POST /api/bills — generate a new bill for a client (Phase 3.1)
   Picks up every discharge not already in an open/partial bill with remaining_ttc > 0,
   ordered by ts ASC.  A discharge can be in at most one open/partial bill at a time. */
app.post('/api/bills', async (req, res) => {
  const { clientId } = req.body;
  if (!clientId) return res.status(400).json({ error: 'clientId requis.' });
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    const { rows: cls } = await dbClient.query('SELECT * FROM clients WHERE id=$1', [clientId]);
    if (!cls.length) {
      await dbClient.query('ROLLBACK'); dbClient.release();
      return res.status(404).json({ error: 'Client introuvable.' });
    }
    const vatSubject = cls[0].vat_subject || false;

    const { rows: discs } = await dbClient.query(`
      SELECT sub.* FROM (
        SELECT d.id, d.ts, d.waste_type, d.net, d.unit_price, d.total, d.status, d.pay_method,
          CASE WHEN $2 THEN d.total * 1.19 ELSE d.total END AS total_ttc,
          (CASE WHEN $2 THEN d.total * 1.19 ELSE d.total END)
            - COALESCE((
                SELECT SUM(dp.applied_amount_ttc) FROM discharge_payments dp
                WHERE dp.discharge_id = d.id
              ), 0) AS remaining_ttc
        FROM discharges d
        WHERE d.client_id = $1
          AND d.status != 'cancelled'
          AND NOT EXISTS (
            -- Block only OPEN bills; partial bills' remaining balances carry forward (Phase 3.4)
            SELECT 1 FROM bill_discharges bd
            JOIN bills b ON b.id = bd.bill_id
            WHERE bd.discharge_id = d.id AND b.status = 'open'
          )
        ORDER BY d.ts ASC
      ) sub
      WHERE sub.remaining_ttc > 0.005
    `, [clientId, vatSubject]);

    if (!discs.length) {
      await dbClient.query('ROLLBACK'); dbClient.release();
      return res.status(400).json({ error: 'Aucun dépôt à facturer pour ce client.' });
    }

    const totalTTC = Math.round(discs.reduce((s, d) => s + parseFloat(d.remaining_ttc), 0) * 100) / 100;
    const totalHT  = toHT(totalTTC, vatSubject);
    const billId   = `BL-${Date.now().toString(36).toUpperCase()}`;

    await dbClient.query(
      `INSERT INTO bills(id,client_id,total_ht,total_ttc,status) VALUES($1,$2,$3,$4,'open')`,
      [billId, clientId, totalHT, totalTTC]
    );
    for (const d of discs) {
      await dbClient.query(
        'INSERT INTO bill_discharges(bill_id,discharge_id) VALUES($1,$2)',
        [billId, d.id]
      );
    }

    await dbClient.query('COMMIT');
    dbClient.release();
    ok(res, { id: billId, clientId, totalHT, totalTTC, status: 'open', discharges: discs });
  } catch(e) {
    await dbClient.query('ROLLBACK'); dbClient.release();
    er(res, e);
  }
});

/* ─── SHARED FIFO ALLOCATION (Phase 3B) ─────────────────────────────────────
   Used by both the preview and the commit endpoints — never duplicated.
   discs : [{id, ts, waste_type, unit_price, pay_method, remaining_ttc}]
   input : {amountTTC}  → FIFO waterfall (Montant libre / Paiement intégral)
         | {dischargeIds:[...]} → fully settle each named discharge in FIFO order
   Returns: { allocations, unappliedAmount, appliedAmount, lines, receiptByType } */
function computeFifoAllocation(discs, input, vatSubject) {
  const allocations = [];
  let unapplied_c = 0;

  if (input.dischargeIds && input.dischargeIds.length > 0) {
    // Par décharge spécifique: fully settle each named discharge
    const idSet = new Set(input.dischargeIds);
    for (const d of discs) {
      if (!idSet.has(d.id)) continue;
      const due_c     = Math.round(parseFloat(d.remaining_ttc) * 100);
      if (due_c <= 0) continue;
      const appliedTTC = due_c / 100;
      const appliedHT  = toHT(appliedTTC, vatSubject);
      const unitP      = parseFloat(d.unit_price) || 0;
      const isRot      = d.pay_method === 'rotation';
      const appliedQty = isRot ? 1 : (unitP > 0 ? Math.round((appliedHT / unitP) * 1000) / 1000 : 0);
      allocations.push({ discharge_id: d.id, waste_type: d.waste_type, unit_price: unitP,
        pay_method: d.pay_method, applied_c: due_c, appliedTTC, appliedHT, appliedQty,
        fullyPaid: true, remainingAfter: 0, due_c });
    }
  } else {
    // Montant libre / Paiement intégral: FIFO waterfall by amount
    let P_c = Math.round((parseFloat(input.amountTTC) || 0) * 100);
    for (const d of discs) {
      const due_c = Math.round(parseFloat(d.remaining_ttc) * 100);
      if (due_c <= 0) continue;
      if (P_c <= 0) break;
      const applied_c  = Math.min(P_c, due_c);
      const appliedTTC = applied_c / 100;
      const appliedHT  = toHT(appliedTTC, vatSubject);
      const unitP      = parseFloat(d.unit_price) || 0;
      const isRot      = d.pay_method === 'rotation';
      const appliedQty = isRot ? 1 : (unitP > 0 ? Math.round((appliedHT / unitP) * 1000) / 1000 : 0);
      allocations.push({ discharge_id: d.id, waste_type: d.waste_type, unit_price: unitP,
        pay_method: d.pay_method, applied_c, appliedTTC, appliedHT, appliedQty,
        fullyPaid: applied_c >= due_c, remainingAfter: Math.max(0, due_c - applied_c) / 100, due_c });
      P_c -= applied_c;
    }
    unapplied_c = Math.max(0, P_c);
  }

  const appliedAmount   = Math.round(allocations.reduce((s, a) => s + a.appliedTTC, 0) * 100) / 100;
  const unappliedAmount = unapplied_c / 100;

  // Per-discharge lines (for frontend detail display)
  const lines = allocations.map(a => ({
    dischargeId: a.discharge_id, wasteType: a.waste_type, payMethod: a.pay_method,
    appliedTTC: a.appliedTTC, fullyPaid: a.fullyPaid, remainingAfter: a.remainingAfter,
  }));

  // Build receiptByType — group by (waste_type, unit_price, billingMode)
  // Rotation: keep separate if partially paid; merge only when all fully paid
  const groups = {};
  for (const a of allocations) {
    const isRot = a.pay_method === 'rotation';
    const key   = `${a.waste_type}||${a.unit_price}||${isRot ? 'rotation' : 'tonnage'}`;
    if (!groups[key]) groups[key] = { wasteType: a.waste_type, unitPrice: a.unit_price,
      billingMode: isRot ? 'rotation' : 'tonnage', htTotal: 0, qtyTotal: 0, ttcTotal: 0, rotItems: [] };
    if (isRot) {
      groups[key].rotItems.push(a);
    } else {
      groups[key].htTotal  += a.appliedHT;
      groups[key].qtyTotal += a.appliedQty;
    }
    groups[key].ttcTotal += a.appliedTTC;
  }

  const receiptByType = Object.values(groups).flatMap(g => {
    if (g.billingMode === 'rotation') {
      const allFull = g.rotItems.every(r => r.fullyPaid);
      if (allFull && g.rotItems.length > 1) {
        // Merge all fully-paid rotations of same type+price into one line
        return [{ wasteType: g.wasteType, billingMode: 'rotation', unitPrice: g.unitPrice,
          qty: g.rotItems.length,
          montantHT: toHT(g.ttcTotal, vatSubject), montantTTC: g.ttcTotal, partial: false }];
      }
      // Keep each rotation as its own line (partial or single)
      return g.rotItems.map(r => ({
        wasteType: r.waste_type, billingMode: 'rotation', unitPrice: r.unit_price, qty: 1,
        montantHT: r.appliedHT, montantTTC: r.appliedTTC, partial: !r.fullyPaid,
        note: !r.fullyPaid
          ? `1 rotation — ${r.appliedTTC.toFixed(2)} DA réglés sur ${(r.due_c / 100).toFixed(2)} DA dus`
          : null,
      }));
    }
    return [{ wasteType: g.wasteType, billingMode: 'tonnage',
      unitPrice: Math.round(g.unitPrice * 100) / 100,
      qty:       Math.round(g.qtyTotal  * 1000) / 1000,
      montantHT: Math.round(g.htTotal   * 100) / 100,
      montantTTC:Math.round(g.ttcTotal  * 100) / 100, partial: false }];
  });

  // Correctness assertion — mismatch means a bug in allocation
  const receiptTTC = Math.round(receiptByType.reduce((s, l) => s + l.montantTTC, 0) * 100) / 100;
  if (Math.abs(receiptTTC - appliedAmount) > 0.02)
    console.error(`[RECEIPT ASSERTION] receipt=${receiptTTC} applied=${appliedAmount} diff=${receiptTTC - appliedAmount}`);

  return { allocations, unappliedAmount, appliedAmount, lines, receiptByType };
}

/* POST /api/bills/:billId/payments/preview — dry-run FIFO allocation (Phase 3B.2)
   Accepts {amountTTC} for waterfall or {dischargeIds:[...]} for specific selection.
   NO database writes — returns the allocation plan for the bill-generation step. */
app.post('/api/bills/:billId/payments/preview', async (req, res) => {
  const { amountTTC, dischargeIds } = req.body;
  const hasAmount = amountTTC != null && parseFloat(amountTTC) > 0;
  const hasIds    = Array.isArray(dischargeIds) && dischargeIds.length > 0;
  if (!hasAmount && !hasIds)
    return res.status(400).json({ error: 'amountTTC ou dischargeIds requis.' });
  try {
    const { rows: bills } = await q('SELECT * FROM bills WHERE id=$1', [req.params.billId]);
    if (!bills.length) return res.status(404).json({ error: 'Facture introuvable.' });
    const { rows: cls } = await q('SELECT vat_subject FROM clients WHERE id=$1', [bills[0].client_id]);
    const vatSubject = cls.length ? (cls[0].vat_subject || false) : false;
    const { rows: discs } = await q(`
      SELECT d.id, d.ts, d.waste_type, d.unit_price, d.pay_method,
        (CASE WHEN $2 THEN d.total * 1.19 ELSE d.total END)
          - COALESCE((SELECT SUM(dp.applied_amount_ttc) FROM discharge_payments dp
                      WHERE dp.discharge_id = d.id), 0) AS remaining_ttc
      FROM discharges d
      JOIN bill_discharges bd ON bd.discharge_id = d.id
      WHERE bd.bill_id = $1
      ORDER BY d.ts ASC, d.id ASC
    `, [req.params.billId, vatSubject]);
    const input  = hasIds ? { dischargeIds } : { amountTTC: parseFloat(amountTTC) };
    const result = computeFifoAllocation(discs, input, vatSubject);
    ok(res, { lines: result.lines, unappliedAmount: result.unappliedAmount,
              receiptByType: result.receiptByType, totalApplied: result.appliedAmount });
  } catch(e) { er(res, e); }
});

/* POST /api/bills/:billId/payments — commit FIFO payment (Phase 3.2 + 3B)
   Accepts {amountTTC} for waterfall or {dischargeIds:[...]} for specific selection.
   Uses the same computeFifoAllocation function as the preview endpoint. */
app.post('/api/bills/:billId/payments', async (req, res) => {
  const { amountTTC, dischargeIds, method, note, createdBy } = req.body;
  const hasAmount = amountTTC != null && parseFloat(amountTTC) > 0;
  const hasIds    = Array.isArray(dischargeIds) && dischargeIds.length > 0;
  if (!hasAmount && !hasIds)
    return res.status(400).json({ error: 'Montant ou sélection de dépôts requis.' });
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    const { rows: bills } = await dbClient.query(
      'SELECT * FROM bills WHERE id=$1 FOR UPDATE', [req.params.billId]
    );
    if (!bills.length) {
      await dbClient.query('ROLLBACK'); dbClient.release();
      return res.status(404).json({ error: 'Facture introuvable.' });
    }
    const bill = bills[0];
    if (bill.status === 'paid') {
      await dbClient.query('ROLLBACK'); dbClient.release();
      return res.status(400).json({ error: 'Cette facture est déjà soldée.' });
    }
    const { rows: cls } = await dbClient.query(
      'SELECT vat_subject FROM clients WHERE id=$1', [bill.client_id]
    );
    const vatSubject = cls.length ? (cls[0].vat_subject || false) : false;
    // Fetch discharges with live remaining balance, locked FOR UPDATE, FIFO order
    const { rows: discs } = await dbClient.query(`
      SELECT d.id, d.ts, d.waste_type, d.unit_price, d.pay_method,
        (CASE WHEN $2 THEN d.total * 1.19 ELSE d.total END)
          - COALESCE((SELECT SUM(dp.applied_amount_ttc) FROM discharge_payments dp
                      WHERE dp.discharge_id = d.id), 0) AS remaining_ttc
      FROM discharges d
      JOIN bill_discharges bd ON bd.discharge_id = d.id
      WHERE bd.bill_id = $1
      ORDER BY d.ts ASC, d.id ASC
      FOR UPDATE OF d
    `, [req.params.billId, vatSubject]);
    const input  = hasIds ? { dischargeIds } : { amountTTC: parseFloat(amountTTC) };
    const result = computeFifoAllocation(discs, input, vatSubject);
    if (result.appliedAmount <= 0) {
      await dbClient.query('ROLLBACK'); dbClient.release();
      return res.status(400).json({ error: 'Aucune allocation possible — solde déjà soldé ?' });
    }
    const paymentId = `PY-${Date.now().toString(36).toUpperCase()}`;
    await dbClient.query(
      `INSERT INTO payments(id,client_id,bill_id,amount_ttc,method,note,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [paymentId, bill.client_id, req.params.billId, result.appliedAmount,
       method||null, note||null, createdBy||null]
    );
    for (const a of result.allocations) {
      await dbClient.query(
        `INSERT INTO discharge_payments
           (discharge_id,payment_id,bill_id,applied_amount_ttc,applied_amount_ht,applied_qty)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [a.discharge_id, paymentId, req.params.billId, a.appliedTTC, a.appliedHT, a.appliedQty]
      );
    }
    // Recompute bill status
    const { rows: rem } = await dbClient.query(`
      SELECT COALESCE(SUM(
        (CASE WHEN $2 THEN d.total * 1.19 ELSE d.total END)
          - COALESCE((SELECT SUM(dp.applied_amount_ttc) FROM discharge_payments dp
                      WHERE dp.discharge_id = d.id), 0)
      ), 0) AS remaining
      FROM discharges d
      JOIN bill_discharges bd ON bd.discharge_id = d.id
      WHERE bd.bill_id = $1
    `, [req.params.billId, vatSubject]);
    const newStatus = parseFloat(rem[0].remaining) < 0.005 ? 'paid' : 'partial';
    await dbClient.query('UPDATE bills SET status=$1 WHERE id=$2', [newStatus, req.params.billId]);
    await dbClient.query('COMMIT');
    dbClient.release();
    ok(res, { paymentId, appliedAmount: result.appliedAmount, unappliedAmount: result.unappliedAmount,
              billStatus: newStatus, allocations: result.allocations, receiptLines: result.receiptByType });
  } catch(e) {
    await dbClient.query('ROLLBACK'); dbClient.release();
    er(res, e);
  }
});

app.get('/api/bills/:billId/payments', async (req, res) => {
  try {
    const { rows } = await q(
      'SELECT * FROM payments WHERE bill_id=$1 ORDER BY created_at DESC',
      [req.params.billId]
    );
    ok(res, rows);
  } catch(e) { er(res, e); }
});

/* GET /api/clients/:clientId/discharge-payments — per-discharge payment summary (Phase 3B.4)
   Returns a map of discharge_id → {paidTTC, details:[{paymentId,billId,appliedTTC,createdAt}]} */
app.get('/api/clients/:clientId/discharge-payments', async (req, res) => {
  try {
    const { rows } = await q(`
      SELECT dp.discharge_id,
        COALESCE(SUM(dp.applied_amount_ttc), 0) AS paid_ttc,
        json_agg(json_build_object(
          'paymentId', dp.payment_id, 'billId', dp.bill_id,
          'appliedTTC', dp.applied_amount_ttc, 'createdAt', dp.created_at
        ) ORDER BY dp.created_at) AS payment_details
      FROM discharge_payments dp
      JOIN discharges d ON d.id = dp.discharge_id
      WHERE d.client_id = $1
      GROUP BY dp.discharge_id
    `, [req.params.clientId]);
    const map = {};
    for (const r of rows)
      map[r.discharge_id] = { paidTTC: parseFloat(r.paid_ttc), details: r.payment_details };
    ok(res, map);
  } catch(e) { er(res, e); }
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
