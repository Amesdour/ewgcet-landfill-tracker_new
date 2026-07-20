-- ============================================================
--  Migration 008 — Security hardening: clear plaintext
--  verification codes so they can no longer be read from DB.
--  After this migration, codes are stored as SHA-256 hashes.
--  All existing unverified operators will need a new code
--  (admin regenerates via "Régénérer le code" button).
-- ============================================================
UPDATE users
SET verification_code = NULL,
    verification_expires_at = NULL
WHERE verification_code IS NOT NULL;
