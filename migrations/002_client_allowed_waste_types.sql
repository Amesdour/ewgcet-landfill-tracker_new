ALTER TABLE clients ADD COLUMN IF NOT EXISTS allowed_waste_types JSONB DEFAULT '[]';
