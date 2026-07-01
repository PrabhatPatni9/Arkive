/**
 * Encrypted-at-rest storage for sensitive app state (family keys, device secret keys).
 *
 * WHY THIS EXISTS
 * Family state includes private key material. Persisting it as plaintext in `localStorage`
 * (the previous behaviour) means any injected script — or anyone with filesystem access to
 * the browser profile — can read the keys. This module keeps only *ciphertext* in storage.
 *
 * HOW IT WORKS
 * We hold a 256-bit AES-GCM key in IndexedDB as a **non-extractable** `CryptoKey`. Non-
 * extractable means scripts can ask the platform to encrypt/decrypt with it while the app is
 * open, but can never read the key's raw bytes to exfiltrate it. Each value is sealed with a
 * fresh random IV. This works identically on the web and inside the Capacitor Android WebView
 * (both have IndexedDB + WebCrypto), so one code path covers every platform.
 *
 * LIMITS (be honest)
 * This is not a hardware keystore. An attacker running script *inside the page* can still ask
 * the platform to decrypt while the app is unlocked — the win is that the key material never
 * exists as extractable bytes and never sits in plaintext storage. Hardware-backed Android
 * Keystore is a future upgrade; this is a strict improvement over plaintext localStorage and
 * the strongest option the web platform offers.
 *
 * FALLBACK
 * When IndexedDB or WebCrypto are unavailable (e.g. unit tests under Node), we transparently
 * fall back to an in-memory map so callers never crash. Nothing is persisted in that mode.
 */

const DB_NAME = 'arkive-secure'
const STORE = 'kv'
const AES_KEY_ID = '__aes_gcm_key__'

interface SealedRecord {
  iv: Uint8Array
  ct: ArrayBuffer
}

let memoryFallback: Map<string, string> | null = null
function memory(): Map<string, string> {
  return (memoryFallback ??= new Map())
}

function secureBackendAvailable(): boolean {
  return typeof indexedDB !== 'undefined' &&
    typeof crypto !== 'undefined' && !!crypto.subtle
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function idbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Fetch the per-install AES-GCM key, generating a non-extractable one on first use. */
async function getAesKey(db: IDBDatabase): Promise<CryptoKey> {
  const existing = await idbGet<CryptoKey>(db, AES_KEY_ID)
  if (existing) return existing
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable — the raw bytes can never leave the platform
    ['encrypt', 'decrypt']
  )
  await idbPut(db, AES_KEY_ID, key)
  return key
}

export async function secureSave(key: string, plaintext: string): Promise<void> {
  if (!secureBackendAvailable()) { memory().set(key, plaintext); return }
  try {
    const db = await openDB()
    const aes = await getAesKey(db)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aes,
      new TextEncoder().encode(plaintext)
    )
    await idbPut(db, key, { iv, ct } satisfies SealedRecord)
  } catch {
    memory().set(key, plaintext)
  }
}

export async function secureLoad(key: string): Promise<string | null> {
  if (!secureBackendAvailable()) return memory().get(key) ?? null
  try {
    const db = await openDB()
    const rec = await idbGet<SealedRecord>(db, key)
    if (!rec) return null
    const aes = await getAesKey(db)
    // Copy the IV into a fresh Uint8Array so its type is a plain BufferSource regardless of
    // how the structured-clone round-trip typed it.
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(rec.iv) }, aes, rec.ct)
    return new TextDecoder().decode(pt)
  } catch {
    return memory().get(key) ?? null
  }
}

export async function secureRemove(key: string): Promise<void> {
  memory().delete(key)
  if (!secureBackendAvailable()) return
  try {
    const db = await openDB()
    await idbDelete(db, key)
  } catch {
    // best-effort
  }
}
