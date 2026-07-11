/**
 * Encrypted-at-rest backing for the feature-module stores.
 *
 * Module records (insurance, contacts, assets, …) are family-shared data. Previously each store
 * kept them as plaintext JSON in localStorage; on web/PWA that is readable by any script on the
 * origin. This helper seals the whole record array under the **family key** (the same key that
 * protects family-tier vault data) using the vetted XChaCha20-Poly1305 envelope, so only
 * ciphertext is written. libsodium is synchronous once initialised, so the stores keep their
 * simple synchronous load/save API and no screen has to change.
 *
 * Transparent migration: a value written by an older build is plain JSON; a value written here
 * is prefixed with `ENC_PREFIX`. `loadArray` reads both, and the next `saveArray` re-writes it
 * encrypted — so existing installs upgrade the first time a module is edited, with no data loss.
 *
 * Safety: if the family key is unavailable (e.g. before a family exists, or in unit tests), we
 * fall back to plaintext rather than lose data — encryption resumes as soon as the key is present.
 */
import { sodium } from '../crypto/sodium'
import { sealEnvelope, openEnvelope } from '../crypto/envelope'
import { getFamily } from '../family/familyStore'

const ENC_PREFIX = 'enc1:'

function familyKeyBytes(): Uint8Array | null {
  const fam = getFamily()
  if (!fam?.familyKey?.bytes) return null
  try {
    return sodium.from_base64(fam.familyKey.bytes)
  } catch {
    return null
  }
}

export function loadArray<T>(storageKey: string): T[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    if (raw.startsWith(ENC_PREFIX)) {
      const key = familyKeyBytes()
      if (!key) return []   // locked out / no key — cannot decrypt right now
      const plaintext = openEnvelope(key, sodium.from_base64(raw.slice(ENC_PREFIX.length)))
      return JSON.parse(sodium.to_string(plaintext)) as T[]
    }
    // Legacy plaintext record — still readable; will be re-encrypted on the next save.
    return JSON.parse(raw) as T[]
  } catch {
    return []
  }
}

export function saveArray<T>(storageKey: string, items: T[]): void {
  const json = JSON.stringify(items)
  const key = familyKeyBytes()
  if (!key) {
    // No family key available — keep plaintext rather than drop the write.
    localStorage.setItem(storageKey, json)
    return
  }
  const ciphertext = sealEnvelope(key, sodium.from_string(json))
  localStorage.setItem(storageKey, ENC_PREFIX + sodium.to_base64(ciphertext))
}
