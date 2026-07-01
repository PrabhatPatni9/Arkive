-- Migration 5: device-token expiry + revocation
--
-- Apply ONCE to the existing live database:
--   wrangler d1 execute arkive-relay --remote --file=relay/migrations/005_token_expiry.sql
--
-- Fresh databases created from schema.sql already include these columns, so this file is
-- only for upgrading a database provisioned before this migration existed. SQLite has no
-- "ADD COLUMN IF NOT EXISTS", so do not run it twice — a second run errors on duplicate column.
--
-- The Worker code degrades gracefully if this has not been applied yet (it falls back to the
-- pre-migration behaviour: no expiry, no revocation), so applying it is safe at any time.

ALTER TABLE device_tokens ADD COLUMN expires_at INTEGER;
ALTER TABLE device_tokens ADD COLUMN revoked INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_device_tokens_family ON device_tokens (family_id);
