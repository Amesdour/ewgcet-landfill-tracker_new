-- (partial) ensure discharges table has updated_at for fresh installs
-- This file mirrors migrations for schema generation on new installs.

ALTER TABLE discharges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
