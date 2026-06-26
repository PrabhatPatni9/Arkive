export interface Migration {
  version: number
  sql: string
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS family_meta (
        id            INTEGER PRIMARY KEY CHECK (id = 1),
        family_id     TEXT    NOT NULL,
        family_name   TEXT    NOT NULL,
        created_at    TEXT    NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS nodes (
        node_id       TEXT PRIMARY KEY,
        parent_id     TEXT,
        node_name     TEXT NOT NULL,
        created_at    TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS members (
        member_id         TEXT PRIMARY KEY,
        node_id           TEXT NOT NULL REFERENCES nodes(node_id),
        display_name      TEXT NOT NULL,
        account_type      TEXT NOT NULL CHECK (account_type IN ('full','dependent')),
        role              TEXT NOT NULL CHECK (role IN ('admin','member')),
        is_financial_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_financial_admin IN (0,1)),
        created_at        TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS devices (
        device_id          TEXT PRIMARY KEY,
        member_id          TEXT NOT NULL REFERENCES members(member_id),
        enc_public_key     TEXT NOT NULL,
        sign_public_key    TEXT NOT NULL,
        registered_at      TEXT NOT NULL,
        last_seen_at       TEXT
      );

      CREATE TABLE IF NOT EXISTS scope_keys (
        key_id        TEXT PRIMARY KEY,
        scope         TEXT NOT NULL CHECK (scope IN ('family','node','member')),
        epoch         INTEGER NOT NULL,
        encrypted_key TEXT NOT NULL,
        created_at    TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS op_log (
        op_id              TEXT PRIMARY KEY,
        scope              TEXT NOT NULL,
        key_epoch          INTEGER NOT NULL,
        prev_hash          TEXT NOT NULL,
        lamport_clock      INTEGER NOT NULL,
        author_device_id   TEXT NOT NULL,
        signature          TEXT NOT NULL,
        encrypted_payload  TEXT NOT NULL,
        hash               TEXT NOT NULL UNIQUE
      );

      CREATE INDEX IF NOT EXISTS idx_op_log_scope
        ON op_log (scope, lamport_clock);

      CREATE INDEX IF NOT EXISTS idx_op_log_hash
        ON op_log (hash);
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS reminders (
        reminder_id          TEXT PRIMARY KEY,
        family_id            TEXT NOT NULL,
        member_id            TEXT,
        type                 TEXT NOT NULL,
        title                TEXT NOT NULL,
        description          TEXT,
        due_date             TEXT NOT NULL,
        advance_notice_days  INTEGER NOT NULL DEFAULT 0,
        recurrence_json      TEXT,
        timezone             TEXT NOT NULL DEFAULT 'Asia/Kolkata',
        linked_document_id   TEXT,
        completions_json     TEXT NOT NULL DEFAULT '[]',
        created_at           TEXT NOT NULL,
        updated_at           TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_reminders_family
        ON reminders (family_id, due_date);
    `,
  },
]
