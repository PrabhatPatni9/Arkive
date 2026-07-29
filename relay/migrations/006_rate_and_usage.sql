-- Migration 6: per-family rate limiting + storage-quota accounting (brief §8).
--
-- Apply ONCE to the live database:
--   wrangler d1 execute arkive-relay --remote --file=relay/migrations/006_rate_and_usage.sql
--
-- Fresh databases get these from schema.sql. Safe to apply at any time; the Worker degrades
-- gracefully (best-effort) if the tables are missing.

-- Fixed-window request counters, keyed by "<endpoint>:<family_id>".
CREATE TABLE IF NOT EXISTS rate_counters (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,   -- unix epoch seconds, aligned to the window
  count        INTEGER NOT NULL
);

-- Per-family blob storage accounting (bytes) + last activity for retention decisions.
CREATE TABLE IF NOT EXISTS family_usage (
  family_id      TEXT PRIMARY KEY,
  blob_bytes     INTEGER NOT NULL DEFAULT 0,
  last_active_at INTEGER            -- unix epoch seconds
);
