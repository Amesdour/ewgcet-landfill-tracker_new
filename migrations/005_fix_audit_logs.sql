-- ============================================================
--  Migration 005 — Fix audit_logs + consent_records + data_requests
--  Defensive: uses IF NOT EXISTS guards on every column
--  so this is safe to run on any DB state.
--  Law 25-11 Art.16 + Law 18-07 Art.7, 20-25
-- ============================================================

-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='ts') THEN
    ALTER TABLE audit_logs ADD COLUMN ts TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='event_type') THEN
    ALTER TABLE audit_logs ADD COLUMN event_type VARCHAR(60) NOT NULL DEFAULT 'UNKNOWN';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_id') THEN
    ALTER TABLE audit_logs ADD COLUMN user_id VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_name') THEN
    ALTER TABLE audit_logs ADD COLUMN user_name VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_role') THEN
    ALTER TABLE audit_logs ADD COLUMN user_role VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='ip_address') THEN
    ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(45);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='resource') THEN
    ALTER TABLE audit_logs ADD COLUMN resource VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='resource_id') THEN
    ALTER TABLE audit_logs ADD COLUMN resource_id VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='detail') THEN
    ALTER TABLE audit_logs ADD COLUMN detail TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='outcome') THEN
    ALTER TABLE audit_logs ADD COLUMN outcome VARCHAR(20) DEFAULT 'success';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_audit_ts    ON audit_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user  ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event_type);

COMMENT ON TABLE audit_logs IS
  'Loi 25-11 Art.16 — Journal de bord sécurité. Conservation 5 ans minimum.';

-- ─── CONSENT RECORDS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_records (
  id BIGSERIAL PRIMARY KEY
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consent_records' AND column_name='user_id') THEN
    ALTER TABLE consent_records ADD COLUMN user_id VARCHAR(20) NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consent_records' AND column_name='consented_at') THEN
    ALTER TABLE consent_records ADD COLUMN consented_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consent_records' AND column_name='policy_ver') THEN
    ALTER TABLE consent_records ADD COLUMN policy_ver VARCHAR(10) NOT NULL DEFAULT '1.0';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consent_records' AND column_name='scope') THEN
    ALTER TABLE consent_records ADD COLUMN scope TEXT DEFAULT 'system_access';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consent_records' AND column_name='ip_address') THEN
    ALTER TABLE consent_records ADD COLUMN ip_address VARCHAR(45);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consent_records' AND column_name='revoked_at') THEN
    ALTER TABLE consent_records ADD COLUMN revoked_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_consent_user_ver
  ON consent_records(user_id, policy_ver)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE consent_records IS
  'Loi 18-07 Art.7 — Base légale: consentement. Horodatage et version de politique.';

-- ─── DATA REQUESTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_requests (
  id BIGSERIAL PRIMARY KEY
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_requests' AND column_name='requested_at') THEN
    ALTER TABLE data_requests ADD COLUMN requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_requests' AND column_name='request_type') THEN
    ALTER TABLE data_requests ADD COLUMN request_type VARCHAR(30) NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_requests' AND column_name='user_id') THEN
    ALTER TABLE data_requests ADD COLUMN user_id VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_requests' AND column_name='subject_name') THEN
    ALTER TABLE data_requests ADD COLUMN subject_name VARCHAR(200);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_requests' AND column_name='subject_email') THEN
    ALTER TABLE data_requests ADD COLUMN subject_email VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_requests' AND column_name='status') THEN
    ALTER TABLE data_requests ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_requests' AND column_name='handled_by') THEN
    ALTER TABLE data_requests ADD COLUMN handled_by VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_requests' AND column_name='handled_at') THEN
    ALTER TABLE data_requests ADD COLUMN handled_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='data_requests' AND column_name='note') THEN
    ALTER TABLE data_requests ADD COLUMN note TEXT DEFAULT '';
  END IF;
END$$;

COMMENT ON COLUMN data_requests.request_type IS
  'access | rectification | erasure | portability | objection';
COMMENT ON TABLE data_requests IS
  'Loi 18-07 Art.20-25 — Droits des personnes concernées. Délai de réponse: 30 jours.';
