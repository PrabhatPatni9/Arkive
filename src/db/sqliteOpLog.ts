import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import type { OpWithHash } from '../crypto/ops'
import type { KeyScope } from '../crypto/keys'
import type { OpLogStore } from './opLog'

export class SQLiteOpLog implements OpLogStore {
  constructor(private db: SQLiteDBConnection) {}

  async append(op: OpWithHash): Promise<void> {
    await this.db.run(
      `INSERT INTO op_log
         (op_id,scope,key_epoch,prev_hash,lamport_clock,
          author_device_id,signature,encrypted_payload,hash)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        op.op_id, op.scope, op.key_epoch, op.prev_hash, op.lamport_clock,
        op.author_device_id, op.signature, op.encrypted_payload, op.hash,
      ]
    )
  }

  async getHead(scope: string): Promise<OpWithHash | null> {
    const res = await this.db.query(
      `SELECT * FROM op_log WHERE scope=? ORDER BY lamport_clock DESC LIMIT 1`,
      [scope]
    )
    return res.values?.[0] ? rowToOp(res.values[0] as Record<string, unknown>) : null
  }

  async getSince(scope: string, lamportClock: number): Promise<OpWithHash[]> {
    const res = await this.db.query(
      `SELECT * FROM op_log WHERE scope=? AND lamport_clock>=? ORDER BY lamport_clock ASC`,
      [scope, lamportClock]
    )
    return (res.values ?? []).map(r => rowToOp(r as Record<string, unknown>))
  }

  async getByHash(hash: string): Promise<OpWithHash | null> {
    const res = await this.db.query(`SELECT * FROM op_log WHERE hash=?`, [hash])
    return res.values?.[0] ? rowToOp(res.values[0] as Record<string, unknown>) : null
  }
}

function rowToOp(row: Record<string, unknown>): OpWithHash {
  return {
    op_id: row['op_id'] as string,
    scope: row['scope'] as KeyScope,
    key_epoch: row['key_epoch'] as number,
    prev_hash: row['prev_hash'] as string,
    lamport_clock: row['lamport_clock'] as number,
    author_device_id: row['author_device_id'] as string,
    signature: row['signature'] as string,
    encrypted_payload: row['encrypted_payload'] as string,
    hash: row['hash'] as string,
  }
}
