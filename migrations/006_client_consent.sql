DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='consent_given') THEN
    ALTER TABLE clients ADD COLUMN consent_given BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='consent_date') THEN
    ALTER TABLE clients ADD COLUMN consent_date TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='consent_by') THEN
    ALTER TABLE clients ADD COLUMN consent_by VARCHAR(100);
  END IF;
END$$;
