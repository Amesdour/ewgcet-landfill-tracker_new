-- ============================================================
--  Migration 007 — Bill/payment tracking tables (Phase 1)
--              + period_type on invoices (Phase 5.6)
-- ============================================================

-- A "bill" is an explicit, scoped snapshot of discharges owed at the time it is generated.
-- It is NOT the same as the existing month-based `invoices` table.
-- A bill can cover an arbitrary set of discharges (e.g. "everything unbilled as of today").
CREATE TABLE IF NOT EXISTS bills (
  id            VARCHAR(30) PRIMARY KEY,
  client_id     VARCHAR(10) NOT NULL REFERENCES clients(id),
  generated_at  TIMESTAMP DEFAULT NOW(),
  total_ht      DECIMAL(12,2) NOT NULL,
  total_ttc     DECIMAL(12,2) NOT NULL,
  status        VARCHAR(20) DEFAULT 'open',   -- open | partial | paid
  note          TEXT
);

-- Explicit scope: which discharges belong to which bill.
-- A discharge must appear in at most one open/partial bill at a time
-- (enforced in application logic via the NOT EXISTS check in POST /api/bills).
CREATE TABLE IF NOT EXISTS bill_discharges (
  id            SERIAL PRIMARY KEY,
  bill_id       VARCHAR(30) NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  discharge_id  VARCHAR(20) NOT NULL REFERENCES discharges(id),
  UNIQUE(bill_id, discharge_id)
);

-- Raw payment event — what the client actually handed over, before allocation.
CREATE TABLE IF NOT EXISTS payments (
  id            VARCHAR(30) PRIMARY KEY,
  client_id     VARCHAR(10) NOT NULL REFERENCES clients(id),
  bill_id       VARCHAR(30) REFERENCES bills(id),
  amount_ttc    DECIMAL(12,2) NOT NULL,
  method        VARCHAR(20),
  note          TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  created_by    VARCHAR(50)
);

-- The allocation ledger: exactly how much of each discharge was settled by each payment.
-- This is the source of truth for "how much of discharge X has been paid" — never a
-- manually-incremented column on the discharge itself.
CREATE TABLE IF NOT EXISTS discharge_payments (
  id                  SERIAL PRIMARY KEY,
  discharge_id        VARCHAR(20) NOT NULL REFERENCES discharges(id),
  payment_id          VARCHAR(30) NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  bill_id             VARCHAR(30) NOT NULL REFERENCES bills(id),
  applied_amount_ttc  DECIMAL(12,2) NOT NULL,
  applied_amount_ht   DECIMAL(12,2) NOT NULL,
  applied_qty         DECIMAL(10,3) NOT NULL,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discharge_payments_discharge ON discharge_payments(discharge_id);
CREATE INDEX IF NOT EXISTS idx_bill_discharges_bill        ON bill_discharges(bill_id);
CREATE INDEX IF NOT EXISTS idx_discharges_client_ts        ON discharges(client_id, ts);

-- Phase 5.6 — period_type on invoices (monthly | annual)
-- Set at generation time from the client's payFrequency.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='invoices' AND column_name='period_type'
  ) THEN
    ALTER TABLE invoices ADD COLUMN period_type VARCHAR(10) DEFAULT 'monthly';
  END IF;
END$$;
