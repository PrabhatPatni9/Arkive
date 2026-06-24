-- Run via: wrangler d1 execute arkive-relay --file=schema.sql

CREATE TABLE IF NOT EXISTS devices (
  device_id       TEXT PRIMARY KEY,
  family_id       TEXT NOT NULL,
  sign_public_key TEXT NOT NULL,
  push_endpoint   TEXT,
  push_auth       TEXT,
  push_p256dh     TEXT,
  registered_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_devices_family ON devices (family_id);

CREATE TABLE IF NOT EXISTS op_index (
  op_hash          TEXT PRIMARY KEY,
  family_id        TEXT NOT NULL,
  scope            TEXT NOT NULL,
  lamport_clock    INTEGER NOT NULL,
  author_device_id TEXT NOT NULL,
  posted_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_op_index_family ON op_index (family_id, lamport_clock);
