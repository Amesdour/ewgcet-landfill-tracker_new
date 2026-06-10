-- ============================================================
--  Migration 004 — Algerian Data Protection Compliance
--  Law 18-07 (Protection of Natural Persons in Personal Data Processing)
--  Law 25-11 (Electronic Communications and Information Security)
-- ============================================================

-- ─── AUDIT LOG ───────────────────────────────────────────────
-- Art. 20 Law 18-07: Controller must maintain records of all processing operations
CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL     PRIMARY KEY,
  ts           TIMESTAMP     NOT NULL DEFAULT NOW(),
  actor_id     VARCHAR(20),              -- user who performed the action
  actor_name   VARCHAR(100),
  actor_role   VARCHAR(20),
  action       VARCHAR(50)   NOT NULL,   -- CREATE_USER, DELETE_USER, LOGIN, etc.
  entity_type  VARCHAR(50),              -- users, clients, discharges
  entity_id    VARCHAR(100),
  detail       TEXT,                     -- human-readable summary
  ip_address   VARCHAR(60),
  result       VARCHAR(20)   DEFAULT 'success'  -- success | failure
);

CREATE INDEX IF NOT EXISTS idx_audit_log_ts       ON audit_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action   ON audit_log(action);

-- ─── DATA SUBJECT REQUESTS ───────────────────────────────────
-- Art. 22-28 Law 18-07: Right of access, rectification, erasure, opposition
CREATE TABLE IF NOT EXISTS data_subject_requests (
  id           BIGSERIAL     PRIMARY KEY,
  submitted_at TIMESTAMP     NOT NULL DEFAULT NOW(),
  request_type VARCHAR(30)   NOT NULL,  -- access | rectification | erasure | opposition
  subject_name VARCHAR(200)  NOT NULL,
  subject_id   VARCHAR(100),            -- client_id or user_id if known
  contact_info TEXT,
  description  TEXT,
  status       VARCHAR(20)   NOT NULL DEFAULT 'pending',  -- pending | in_progress | completed | rejected
  handled_by   VARCHAR(20),
  handled_at   TIMESTAMP,
  response_note TEXT,
  deadline     TIMESTAMP     GENERATED ALWAYS AS (submitted_at + INTERVAL '30 days') STORED
);

-- ─── DATA PROCESSING REGISTRY ────────────────────────────────
-- Art. 16 Law 18-07: Controller must declare processing activities to ANPDP
CREATE TABLE IF NOT EXISTS processing_registry (
  id              SERIAL        PRIMARY KEY,
  created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
  name            VARCHAR(200)  NOT NULL,
  purpose         TEXT          NOT NULL,
  legal_basis     VARCHAR(50)   NOT NULL,  -- legal_obligation | legitimate_interest | consent | contract
  data_categories TEXT[]        NOT NULL DEFAULT '{}',
  data_subjects   TEXT[]        NOT NULL DEFAULT '{}',
  retention_days  INTEGER,
  recipients      TEXT[],
  third_country   BOOLEAN       DEFAULT FALSE,
  security_measures TEXT,
  active          BOOLEAN       DEFAULT TRUE
);

-- Seed the registry with EPWGCET's actual processing activities
INSERT INTO processing_registry (name, purpose, legal_basis, data_categories, data_subjects, retention_days, security_measures)
VALUES
  (
    'Gestion des déchargements et pesées',
    'Enregistrement des apports de déchets aux CET/CDI, calcul des tonnages et facturation',
    'legal_obligation',
    ARRAY['identité entreprise', 'données de pesée', 'données de facturation'],
    ARRAY['clients conventionnés', 'entreprises privées', 'communes'],
    3650,
    'Accès restreint aux agents habilités, journalisation des actions'
  ),
  (
    'Gestion des comptes opérateurs',
    'Administration des accès au système de gestion EPWGCET',
    'legitimate_interest',
    ARRAY['nom', 'email professionnel', 'téléphone professionnel', 'matricule', 'mot de passe haché'],
    ARRAY['agents EPWGCET', 'opérateurs de site'],
    1825,
    'Mots de passe hachés bcrypt, limitation des tentatives de connexion'
  ),
  (
    'Gestion des dossiers clients',
    'Constitution et suivi des dossiers administratifs des clients (NIF, RC, conventions)',
    'legal_obligation',
    ARRAY['dénomination sociale', 'NIF', 'RC', 'adresse', 'téléphone'],
    ARRAY['entreprises privées', 'communes', 'établissements publics'],
    3650,
    'Documents stockés en base de données sécurisée, accès admin uniquement'
  ),
  (
    'Journalisation des accès et actions système',
    'Traçabilité des opérations pour contrôle interne et conformité légale',
    'legal_obligation',
    ARRAY['identifiant utilisateur', 'horodatage', 'action effectuée', 'adresse IP'],
    ARRAY['agents EPWGCET'],
    1825,
    'Logs non modifiables, accès restreint au DPO et à l''administrateur'
  )
ON CONFLICT DO NOTHING;
