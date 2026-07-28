import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageOpLog } from './localStorageOpLog'
import type { OpWithHash } from '../crypto/ops'

const store: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { Reflect.deleteProperty(store, k) },
  clear: () => { Object.keys(store).forEach(k => Reflect.deleteProperty(store, k)) },
  key: (i: number) => Object.keys(store)[i] ?? null,
  length: 0,
}

beforeEach(() => { Object.keys(store).forEach(k => Reflect.deleteProperty(store, k)) })

function op(hash: string, lamport: number, prev: string): OpWithHash {
  return {
    op_id: hash, scope: 'family', key_epoch: 0, prev_hash: prev, lamport_clock: lamport,
    author_device_id: 'dev', signature: 'sig', encrypted_payload: 'ct', hash,
  }
}

describe('LocalStorageOpLog', () => {
  it('persists ops across a reload (new instance)', async () => {
    const a = new LocalStorageOpLog()
    await a.append(op('h1', 1, '0'.repeat(64)))
    await a.append(op('h2', 2, 'h1'))

    // Simulate a reload: a fresh instance reads the same backing store.
    const b = new LocalStorageOpLog()
    const head = await b.getHead('family')
    expect(head?.hash).toBe('h2')
    expect(await b.getByHash('h1')).not.toBeNull()
    expect(await b.getSince('family', 1)).toHaveLength(2)
  })

  it('rejects duplicate hashes (dedup on pull)', async () => {
    const log = new LocalStorageOpLog()
    await log.append(op('h1', 1, '0'.repeat(64)))
    await expect(log.append(op('h1', 1, '0'.repeat(64)))).rejects.toThrow(/Duplicate/)
  })

  it('getHead returns the highest Lamport op for the scope', async () => {
    const log = new LocalStorageOpLog()
    await log.append(op('h1', 1, '0'.repeat(64)))
    await log.append(op('h2', 5, 'h1'))
    await log.append(op('h3', 3, 'h2'))
    expect((await log.getHead('family'))?.hash).toBe('h2')
  })
})
