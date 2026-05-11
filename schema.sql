-- ============================================================
--  EWGCET Landfill Tracker — Full Schema + Seed
--  Run once to initialise a fresh PostgreSQL database.
--  All statements are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- ============================================================

-- ─── SITES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
  id           VARCHAR(20)    PRIMARY KEY,
  name         VARCHAR(100)   NOT NULL,
  type         VARCHAR(20),
  region       VARCHAR(100),
  capacity     DECIMAL(14,2)  DEFAULT 0,
  used         DECIMAL(14,2)  DEFAULT 0,
  status       VARCHAR(20)    DEFAULT 'active',
  active_since DATE,
  manager      VARCHAR(100)   DEFAULT '',
  commune      VARCHAR(100)   DEFAULT '',
  localisation VARCHAR(200)   DEFAULT '',
  accepted_waste JSONB        DEFAULT '[]'
);

INSERT INTO sites (id, name, region, type, capacity, used, status, commune, localisation, accepted_waste) VALUES
  ('CDM-JIJ', 'CDM Jijel',     'Jijel (Chef-lieu)', 'CDM', 600000, 287400, 'active', 'Jijel',     '36.8167° N, 5.7667° E', '["MEN","IND","MED","INE"]'),
  ('CDM-TAH', 'CDM Taher',     'Taher',              'CDM', 400000, 156700, 'active', 'Taher',     '36.7333° N, 5.9000° E', '["MEN","IND","INE"]'),
  ('CDM-ELM', 'CDM El Milia',  'El Milia',           'CDM', 300000, 198300, 'active', 'El Milia',  '36.7500° N, 6.5667° E', '["MEN","IND"]'),
  ('CDI-TAS', 'CDI Tasselemt', 'Tasselemt',          'CDI', 500000,  89000, 'active', 'Tasselemt', '36.6833° N, 6.1333° E', '["INE"]')
ON CONFLICT (id) DO NOTHING;

-- ─── WASTE TYPES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waste_types (
  id             VARCHAR(20)   PRIMARY KEY,
  label          VARCHAR(100)  NOT NULL,
  price          DECIMAL(14,2) DEFAULT 0,
  rotation_price DECIMAL(14,2) DEFAULT 0,
  unit           VARCHAR(10)   DEFAULT 't',
  site_types     JSONB         DEFAULT '[]'
);
ALTER TABLE waste_types ADD COLUMN IF NOT EXISTS rotation_price DECIMAL(14,2) DEFAULT 0;

INSERT INTO waste_types (id, label, price, unit, site_types) VALUES
  ('MEN', 'Ménager (DMA)',     850,  't', '["CDM"]'),
  ('IND', 'Industriel (DIB)', 1200,  't', '["CDM"]'),
  ('MED', 'Médical (DASRI)',  2500,  't', '["CDM"]'),
  ('INE', 'Inerte / BTP',      600,  't', '["CDI","CDM"]')
ON CONFLICT (id) DO NOTHING;

-- ─── CLIENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id                VARCHAR(20)    PRIMARY KEY,
  name              VARCHAR(200)   NOT NULL,
  client_type       VARCHAR(30)    DEFAULT '',
  type              VARCHAR(30)    DEFAULT '',
  status            VARCHAR(30)    DEFAULT 'pending',
  credit_limit      DECIMAL(14,2)  DEFAULT 0,
  consumed          DECIMAL(14,2)  DEFAULT 0,
  credit_enabled    BOOLEAN        DEFAULT FALSE,
  weight_limit_year DECIMAL(12,3)  DEFAULT 0,
  pay_frequency     VARCHAR(20)    DEFAULT 'monthly',
  pay_instrument    VARCHAR(20)    DEFAULT 'cheque',
  phone             VARCHAR(50)    DEFAULT '',
  address           VARCHAR(200)   DEFAULT '',
  nif               VARCHAR(50)    DEFAULT '',
  rc                VARCHAR(50)    DEFAULT '',
  docs              JSONB          DEFAULT '[]',
  note              TEXT           DEFAULT '',
  vat_subject       BOOLEAN        DEFAULT FALSE,
  assigned_site     VARCHAR(20)    DEFAULT '',
  assigned_sites    JSONB          DEFAULT '[]'
);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS vat_subject BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_site VARCHAR(20) DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_sites JSONB DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rotation_limit INTEGER DEFAULT 0;

INSERT INTO clients (id, name, client_type, type, status, credit_enabled, weight_limit_year, credit_limit, consumed, pay_frequency, pay_instrument, phone, address, nif, rc, docs, note, vat_subject) VALUES
  ('C001', 'Commune de Jijel',       'state',   'convention', 'approved',     FALSE, 5000, 0,      0, 'monthly', 'cheque', '034 70 12 34',  'Jijel Centre',          '099012345678901', '',                 '["Arrêté communal","Convention signée"]',          '', FALSE),
  ('C002', 'Commune de Taher',        'state',   'convention', 'approved',     FALSE, 3000, 0,      0, 'annual',  'bank',   '034 70 23 45',  'Taher',                  '099023456789012', '',                 '["Arrêté communal","Convention signée"]',          '', FALSE),
  ('C003', 'Clinique Médicale AFAK',  'private', 'convention', 'approved',     TRUE,  0,    400000, 0, 'monthly', 'bank',   '034 70 34 56',  'Cité Cnep, Jijel',       '099034567890123', '18/00-1234567B18', '["RC","NIF","Assurance RC","Bail commercial"]',    '', TRUE),
  ('C004', 'EURL COSIDER BTP Jijel',  'private', 'convention', 'under_review', FALSE, 0,    0,      0, 'monthly', 'cheque', '034 70 45 67',  'Zone Activité, Jijel',   '099045678901234', '18/00-7654321B18', '["RC","NIF"]',                                     'Documents reçus, vérification en cours.', TRUE),
  ('C005', 'SPA Entraval Algérie',    'private', 'convention', 'pending_docs', FALSE, 0,    0,      0, 'monthly', 'cheque', '034 70 56 78',  'El Milia',                '',               '',                 '[]',                                               'En attente de dépôt des documents requis.', TRUE),
  ('C006', 'Hadj Mourad Rabah',       'cash',    'daily',      'approved',     FALSE, 0,    0,      0, '',        '',       '0770 11 22 33', 'Jijel',                   '',               '',                 '[]',                                               '', FALSE),
  ('C007', 'Entreprise Benali SARL',  'cash',    'daily',      'approved',     FALSE, 0,    0,      0, '',        '',       '0770 44 55 66', 'Taher',                   '',               '',                 '[]',                                               '', TRUE),
  ('C008', 'Rachid Benbrahim',        'private', 'prepaid',    'approved',     FALSE, 0,    200000, 0, '',        '',       '0550 33 44 55', 'Jijel',                   '',               '',                 '[]',                                               'Bonus prépayé 200 000 DA', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(20)  PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(100) UNIQUE NOT NULL,
  password   VARCHAR(100) NOT NULL,
  role       VARCHAR(20)  DEFAULT 'operator',
  status     VARCHAR(20)  DEFAULT 'active',
  phone      VARCHAR(50)  DEFAULT '',
  matricule  VARCHAR(50)  DEFAULT '',
  site_id    VARCHAR(20)  DEFAULT 'all',
  created_at DATE         DEFAULT CURRENT_DATE
);

INSERT INTO users (id, name, email, password, role, status, phone, matricule, site_id, created_at) VALUES
  ('U001', 'Directeur Administrateur', 'admin@ewgcet-jijel.dz',     'admin123', 'admin',    'active',  '034 48 00 01',  'ADM-001',     'all',     '2024-01-15'),
  ('U002', 'Karim Boudali',            'k.boudali@ewgcet-jijel.dz', 'op1234',   'operator', 'active',  '0771 23 45 67', 'OP-2024-001', 'CDM-JIJ', '2024-03-10'),
  ('U003', 'Sara Menacer',             's.menacer@ewgcet-jijel.dz', 'op1234',   'operator', 'active',  '0773 45 67 89', 'OP-2024-002', 'CDM-TAH', '2024-03-10'),
  ('U004', 'Yacine Ferhat',            'y.ferhat@ewgcet-jijel.dz',  'op1234',   'operator', 'pending', '0774 56 78 90', 'OP-2024-003', 'CDM-ELM', '2024-04-20')
ON CONFLICT (id) DO NOTHING;

-- ─── DISCHARGES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discharges (
  id                VARCHAR(40)   PRIMARY KEY,
  ts                TIMESTAMP     NOT NULL,
  site_id           VARCHAR(20),
  client_id         VARCHAR(20),
  client_name       VARCHAR(200),
  truck             VARCHAR(30),
  waste_type        VARCHAR(20),
  gross             DECIMAL(12,3) DEFAULT 0,
  tare              DECIMAL(12,3) DEFAULT 0,
  net               DECIMAL(12,3) DEFAULT 0,
  unit_price        DECIMAL(14,2) DEFAULT 0,
  total             DECIMAL(14,2) DEFAULT 0,
  status            VARCHAR(20)   DEFAULT 'ok',
  pay_method        VARCHAR(20),
  op_id             VARCHAR(20),
  correction_reason TEXT          DEFAULT ''
);

-- ─── INVOICES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id           VARCHAR(40)   PRIMARY KEY,
  client_id    VARCHAR(20),
  month        VARCHAR(7),
  total_amount DECIMAL(14,2) DEFAULT 0,
  paid_amount  DECIMAL(14,2) DEFAULT 0,
  status       VARCHAR(20)   DEFAULT 'pending',
  generated_at TIMESTAMP     DEFAULT NOW(),
  paid_at      TIMESTAMP,
  note         TEXT          DEFAULT '',
  UNIQUE (client_id, month)
);
