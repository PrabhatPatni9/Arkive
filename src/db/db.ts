import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { MIGRATIONS } from './schema'

const DB_NAME = 'arkive'
const _conn = new SQLiteConnection(CapacitorSQLite)
let _db: SQLiteDBConnection | null = null

export async function getDb(): Promise<SQLiteDBConnection> {
  if (_db) return _db
  const isConn = (await _conn.isConnection(DB_NAME, false)).result
  if (isConn) {
    _db = await _conn.retrieveConnection(DB_NAME, false)
  } else {
    _db = await _conn.createConnection(DB_NAME, false, 'no-encryption', 1, false)
    await _db.open()
    await runMigrations(_db)
  }
  return _db
}

export async function closeDb(): Promise<void> {
  if (!_db) return
  await _conn.closeConnection(DB_NAME, false)
  _db = null
}

async function runMigrations(db: SQLiteDBConnection): Promise<void> {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS _migrations (
       version INTEGER PRIMARY KEY,
       applied_at TEXT NOT NULL
     )`
  )
  const res = await db.query('SELECT COALESCE(MAX(version),0) AS v FROM _migrations')
  const current = (res.values?.[0]?.['v'] as number) ?? 0
  for (const m of MIGRATIONS) {
    if (m.version > current) {
      await db.execute(m.sql)
      await db.run('INSERT INTO _migrations (version, applied_at) VALUES (?,?)', [
        m.version,
        new Date().toISOString(),
      ])
    }
  }
}
