import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initSodium } from '../crypto/sodium'
import { generateScopeKey, generateSigningKeypair } from '../crypto/keys'
import type { OpWithHash } from '../crypto/ops'
import { MemoryOpLog } from '../db/opLog'
import { initSyncContext, clearSyncContext, whenEmitsSettled } from '../sync/syncContext'
import { readRecordOp } from '../sync/recordOps'
import {
  createFamily, getFamily, clearFamily, updateMemberProfile, applyMemberProfileFromSync,
} from './familyStore'

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
beforeEach(() => { clearFamily(); clearSyncContext() })

function newFamily() {
  return createFamily({
    familyName: 'Test Family', familyType: 'nuclear', myName: 'Asha',
    recoveryPhrase: 'some words for testing recovery phrase setup please',
  })
}

describe('member profile sync', () => {
  it('applies an incoming profile update, preserving role and keys', () => {
    const state = newFamily()
    const memberId = state.myMemberId

    applyMemberProfileFromSync({ id: memberId, record: { allergies: 'peanuts', bloodGroup: 'O+' } })

    const fam = getFamily()
    expect(fam).not.toBeNull()
    const m = fam?.members.find(x => x.memberId === memberId)
    expect(m?.allergies).toBe('peanuts')
    expect(m?.bloodGroup).toBe('O+')
    expect(m?.role).toBe('admin')          // membership fields preserved
    expect(m?.sigPublicKey).toBeTruthy()   // keys preserved
  })

  it('never lets a synced profile change role or keys', () => {
    const state = newFamily()
    applyMemberProfileFromSync({
      id: state.myMemberId,
      record: { role: 'view_only', sigPublicKey: 'HACKED', name: 'Asha R.' },
    })
    const m = getFamily()?.members.find(x => x.memberId === state.myMemberId)
    expect(m?.role).toBe('admin')          // ignored
    expect(m?.sigPublicKey).not.toBe('HACKED')  // ignored
    expect(m?.name).toBe('Asha R.')        // name is a syncable profile field
  })

  it('emits a family_members op on profile update when sync is active', async () => {
    const state = newFamily()
    const scopeKey = generateScopeKey('family', 0)
    const captured: OpWithHash[] = []
    initSyncContext({
      opLog: new MemoryOpLog(), scopeKeyBytes: scopeKey.bytes,
      signingSecretKey: generateSigningKeypair().secretKey, deviceId: 'd', keyEpoch: 0,
      onOp: (op) => captured.push(op),
    })

    updateMemberProfile(state.myMemberId, { allergies: 'dust' })
    await whenEmitsSettled()

    expect(captured).toHaveLength(1)
    const payload = readRecordOp(captured[0], scopeKey.bytes)
    expect(payload.store).toBe('family_members')
    expect(payload.id).toBe(state.myMemberId)
    expect((payload.record as Record<string, unknown>).allergies).toBe('dust')
  })
})
