-- ============================================================
--  Migration 004 — Compliance Tables
--  Law 18-07 (Personal Data Protection) +
--  Law 25-11 (Cybersecurity)
--  Applied: 2025-07
-- ============================================================

-- ─── AUDIT LOG (Law 25-11, Art. 16 — Security event tracing) ─────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL     PRIMARY KEY,
  ts          TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
  event_type  VARCHAR(60)   NOT NULL,
  user_id     VARCHAR(20),
  user_name   VARCHAR(100),
  user_role   VARCHAR(20),
  ip_address  VARCHAR(45),
  resource    VARCHAR(100),
  resource_id VARCHAR(100),
  detail      TEXT,
  outcome     VARCHAR(20)   DEFAULT 'success'
);
CREATE INDEX IF NOT EXISTS idx_audit_ts    ON audit_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user  ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event_type);

COMMENT ON TABLE audit_logs IS
  'Loi 25-11 Art.16 — Journal de bord sécurité. Conservation 5 ans minimum.';

-- ─── CONSENT RECORDS (Law 18-07, Art. 7 — Lawful basis: consent) ─────────
CREATE TABLE IF NOT EXISTS consent_records (
  id           BIGSERIAL     PRIMARY KEY,
  user_id      VARCHAR(20)   NOT NULL,
  consented_at TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
  policy_ver   VARCHAR(10)   NOT NULL DEFAULT '1.0',
  scope        TEXT          DEFAULT 'system_access',
  ip_address   VARCHAR(45),
  revoked_at   TIMESTAMPTZ   DEFAULT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_consent_user_ver
  ON consent_records(user_id, policy_ver)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE consent_records IS
  'Loi 18-07 Art.7 — Base légale: consentement. Horodatage et version de politique.';

-- ─── DATA SUBJECT REQUESTS (Law 18-07, Art. 20-25 — Data subject rights) ─
CREATE TABLE IF NOT EXISTS data_requests (
  id            BIGSERIAL     PRIMARY KEY,
  requested_at  TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
  request_type  VARCHAR(30)   NOT NULL,
  user_id       VARCHAR(20),
  subject_name  VARCHAR(200),
  subject_email VARCHAR(100),
  status        VARCHAR(20)   DEFAULT 'pending',
  handled_by    VARCHAR(20),
  handled_at    TIMESTAMPTZ,
  note          TEXT          DEFAULT ''
);
COMMENT ON COLUMN data_requests.request_type IS
  'access | rectification | erasure | portability | objection';
COMMENT ON TABLE data_requests IS
  'Loi 18-07 Art.20-25 — Droits des personnes concernées. Délai de réponse: 30 jours.';
