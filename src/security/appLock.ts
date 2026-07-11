/**
 * App lock (Hard Constraint §10): an optional PIN gate with auto-lock on backgrounding.
 *
 * The PIN itself is never stored. We seal a fixed marker string under the PIN using the same
 * vetted Argon2id + XChaCha20-Poly1305 primitive used for recovery, and store the sealed blob
 * in the encrypted secure store. Verifying a PIN means trying to open that blob — a wrong PIN
 * fails the AEAD tag, so there is nothing to brute-force offline beyond the Argon2id cost.
 */
import { sodium } from '../crypto/sodium'
import { sealWithPassphrase, openWithPassphrase, interactiveParams } from '../crypto/recovery'
import type { PassphraseSealed } from '../crypto/recovery'
import { secureSave, secureLoad, secureRemove } from '../family/secureStore'

const ENABLED_KEY = 'arkive_lock_enabled'   // non-sensitive flag (localStorage)
const PIN_KEY = 'arkive_lock_pin'           // sealed marker (secure store)
const MARKER = 'arkive-lock-ok'
const MIN_PIN_LENGTH = 4

/** Whether the user has turned the app lock on. Synchronous so the boot gate can read it. */
export function isLockEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

/** Set (or change) the PIN and enable the lock. Throws if the PIN is too short. */
export async function setPin(pin: string): Promise<void> {
  if (pin.length < MIN_PIN_LENGTH) {
    throw new Error(`PIN must be at least ${MIN_PIN_LENGTH} digits`)
  }
  const sealed = sealWithPassphrase(sodium.from_string(MARKER), pin, interactiveParams())
  await secureSave(PIN_KEY, JSON.stringify(sealed))
  try { localStorage.setItem(ENABLED_KEY, '1') } catch { /* ignore */ }
}

/** True if the supplied PIN opens the sealed marker. */
export async function verifyPin(pin: string): Promise<boolean> {
  const raw = await secureLoad(PIN_KEY)
  if (!raw) return false
  try {
    const sealed = JSON.parse(raw) as PassphraseSealed
    return sodium.to_string(openWithPassphrase(sealed, pin)) === MARKER
  } catch {
    return false
  }
}

/** Turn the lock off and wipe the stored PIN material. */
export async function disableLock(): Promise<void> {
  try { localStorage.removeItem(ENABLED_KEY) } catch { /* ignore */ }
  await secureRemove(PIN_KEY)
}
