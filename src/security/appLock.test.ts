import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initSodium } from '../crypto/sodium'
import { isLockEnabled, setPin, verifyPin, disableLock } from './appLock'

// Stub localStorage (secureStore falls back to an in-memory map when IndexedDB is absent)
const store: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { Reflect.deleteProperty(store, k) },
  clear: () => { Object.keys(store).forEach(k => Reflect.deleteProperty(store, k)) },
  key: (i: number) => Object.keys(store)[i] ?? null,
  length: 0,
}

beforeAll(async () => { await initSodium() })
beforeEach(async () => { await disableLock(); Object.keys(store).forEach(k => Reflect.deleteProperty(store, k)) })

describe('app lock', () => {
  it('is off by default', () => {
    expect(isLockEnabled()).toBe(false)
  })

  it('enables the lock and verifies the correct PIN', async () => {
    await setPin('1234')
    expect(isLockEnabled()).toBe(true)
    expect(await verifyPin('1234')).toBe(true)
  })

  it('rejects the wrong PIN', async () => {
    await setPin('1234')
    expect(await verifyPin('0000')).toBe(false)
  })

  it('rejects a too-short PIN', async () => {
    await expect(setPin('12')).rejects.toThrow()
  })

  it('disables the lock and wipes the PIN', async () => {
    await setPin('4321')
    await disableLock()
    expect(isLockEnabled()).toBe(false)
    expect(await verifyPin('4321')).toBe(false)
  })
})
