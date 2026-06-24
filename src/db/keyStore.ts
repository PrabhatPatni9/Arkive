import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { encryptScopeKeyForStorage, decryptScopeKeyFromStorage } from '../crypto/keys'
import type { ScopeKey, KeyScope } from '../crypto/keys'
import { sodium } from '../crypto/sodium'

export class KeyStore {
  constructor(
    private db: SQLiteDBConnection,
    private storageKey: Uint8Array
  ) {}

  async save(scopeKey: ScopeKey): Promise<void> {
    const enc = encryptScopeKeyForStorage(scopeKey, this.storageKey)
    await this.db.run(
      `INSERT OR REPLACE INTO scope_keys (key_id, scope, epoch, encrypted_key, created_at)
       VALUES (?,?,?,?,?)`,
      [
        scopeKey.keyId,
        scopeKey.scope,
        scopeKey.epoch,
        sodium.to_base64(enc),
        new Date().toISOString(),
      ]
    )
  }

  async load(keyId: string, scope: KeyScope, epoch: number): Promise<ScopeKey> {
    const res = await this.db.query(
      `SELECT encrypted_key FROM scope_keys WHERE key_id=? AND scope=? AND epoch=?`,
      [keyId, scope, epoch]
    )
    const row = res.values?.[0] as Record<string, unknown> | undefined
    if (!row) throw new Error(`KeyStore: key not found keyId=${keyId} scope=${scope} epoch=${epoch}`)
    const env = sodium.from_base64(row['encrypted_key'] as string)
    return decryptScopeKeyFromStorage(env, this.storageKey)
  }

  async loadLatest(scope: KeyScope): Promise<ScopeKey | null> {
    const res = await this.db.query(
      `SELECT encrypted_key FROM scope_keys WHERE scope=? ORDER BY epoch DESC LIMIT 1`,
      [scope]
    )
    const row = res.values?.[0] as Record<string, unknown> | undefined
    if (!row) return null
    const env = sodium.from_base64(row['encrypted_key'] as string)
    return decryptScopeKeyFromStorage(env, this.storageKey)
  }
}
