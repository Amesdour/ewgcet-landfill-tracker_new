-- ============================================================
--  Migration 011 — Offline discharge logging tables
--                + PWA offline queue + sync tracking
-- ============================================================

-- Offline queue: stores discharge records created while offline
CREATE TABLE IF NOT EXISTS offline_queue (
  id                    SERIAL PRIMARY KEY,
  user_id               VARCHAR(20),
  client_id             VARCHAR(20),
  client_name           VARCHAR(200),
  truck                 VARCHAR(30),
  waste_type            VARCHAR(20),
  gross                 DECIMAL(12,3),
  tare                  DECIMAL(12,3),
  net                   DECIMAL(12,3),
  unit_price            DECIMAL(14,2),
  total                 DECIMAL(14,2),
  status                VARCHAR(20) DEFAULT 'pending',
  pay_method            VARCHAR(20),
  op_type               VARCHAR(20) DEFAULT 'treatment',
  site_id               VARCHAR(20),
  created_at            TIMESTAMP DEFAULT NOW(),
  synced_at             TIMESTAMP,
  sync_status           VARCHAR(20) DEFAULT 'pending',  -- pending | success | conflict | failed
  server_discharge_id   VARCHAR(40),
  conflict_data         JSONB DEFAULT NULL,
  retry_count           INTEGER DEFAULT 0,
  last_error            TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_status     ON offline_queue(sync_status);
CREATE INDEX IF NOT EXISTS idx_offline_queue_user       ON offline_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_created    ON offline_queue(created_at DESC);

-- Sync tracking: records each sync attempt and its result
CREATE TABLE IF NOT EXISTS sync_log (
  id                    SERIAL PRIMARY KEY,
  user_id               VARCHAR(20) NOT NULL,
  device_id             VARCHAR(100),
  sync_start            TIMESTAMP DEFAULT NOW(),
  sync_end              TIMESTAMP,
  total_records         INTEGER DEFAULT 0,
  synced_records        INTEGER DEFAULT 0,
  failed_records        INTEGER DEFAULT 0,
  conflict_records      INTEGER DEFAULT 0,
  sync_status           VARCHAR(20) DEFAULT 'in_progress',  -- in_progress | success | partial | failed
  error_message         TEXT,
  offline_queue_ids     INTEGER[] DEFAULT ARRAY[]::INTEGER[]
);

CREATE INDEX IF NOT EXISTS idx_sync_log_user            ON sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_start           ON sync_log(sync_start DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_status          ON sync_log(sync_status);

-- Conflict resolution: tracks data conflicts during sync
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id                    SERIAL PRIMARY KEY,
  offline_queue_id      INTEGER REFERENCES offline_queue(id) ON DELETE CASCADE,
  sync_log_id           INTEGER REFERENCES sync_log(id),
  conflict_type         VARCHAR(50),  -- duplicate | price_mismatch | qty_mismatch | client_mismatch
  local_data            JSONB NOT NULL,
  server_data           JSONB,
  resolution            VARCHAR(20),  -- use_local | use_server | merge | manual_review
  resolved_by           VARCHAR(20),
  resolved_at           TIMESTAMP,
  resolution_notes      TEXT,
  created_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conflicts_queue         ON sync_conflicts(offline_queue_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_type          ON sync_conflicts(conflict_type);
CREATE INDEX IF NOT EXISTS idx_conflicts_resolution    ON sync_conflicts(resolution);

-- Offline metadata: tracks PWA offline state and device info
CREATE TABLE IF NOT EXISTS offline_metadata (
  id                    SERIAL PRIMARY KEY,
  user_id               VARCHAR(20) NOT NULL UNIQUE,
  device_id             VARCHAR(100),
  last_online           TIMESTAMP,
  is_online             BOOLEAN DEFAULT TRUE,
  app_version           VARCHAR(20),
  storage_used_bytes    BIGINT DEFAULT 0,
  storage_quota_bytes   BIGINT DEFAULT 0,
  last_sync             TIMESTAMP,
  pending_sync_count    INTEGER DEFAULT 0,
  updated_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_metadata_user   ON offline_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_metadata_online ON offline_metadata(is_online);

-- Add sync-related columns to discharges table if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='discharges' AND column_name='synced_from_offline') THEN
    ALTER TABLE discharges ADD COLUMN synced_from_offline BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='discharges' AND column_name='offline_queue_id') THEN
    ALTER TABLE discharges ADD COLUMN offline_queue_id INTEGER REFERENCES offline_queue(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='discharges' AND column_name='sync_timestamp') THEN
    ALTER TABLE discharges ADD COLUMN sync_timestamp TIMESTAMP;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_discharges_synced_offline ON discharges(synced_from_offline);
