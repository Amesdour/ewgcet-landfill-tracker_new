-- Migration 010: add updated_at column + trigger to discharges
BEGIN;

ALTER TABLE discharges
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to update updated_at on update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at ON discharges;
CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON discharges
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMIT;
