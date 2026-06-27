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

-- Migration 2: per-device auth tokens and relay-assisted join handshakes
CREATE TABLE IF NOT EXISTS device_tokens (
  token       TEXT PRIMARY KEY,
  device_id   TEXT NOT NULL,
  family_id   TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_device ON device_tokens (device_id);

CREATE TABLE IF NOT EXISTS join_handshakes (
  request_id    TEXT PRIMARY KEY,
  family_id     TEXT NOT NULL,
  request_json  TEXT NOT NULL,
  approval_json TEXT,
  posted_at     TEXT NOT NULL,
  approved_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_join_handshakes_family ON join_handshakes (family_id, posted_at);
