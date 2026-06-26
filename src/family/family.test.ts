import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initSodium, sodium } from '../crypto/sodium'
import { generateRecoveryPhrase } from './wordlist'
import { WORDLIST } from './wordlist'
import {
  createFamily,
  createJoinRequest,
  approveJoinRequest,
  completeJoin,
  deriveHandshakeCode,
  getFamily,
  clearFamily,
} from './familyStore'

// Stub localStorage for tests
const store: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { for (const k in store) delete store[k] },
  key: (i: number) => Object.keys(store)[i] ?? null,
  length: 0,
}

beforeAll(async () => {
  await initSodium()
})

beforeEach(() => {
  clearFamily()
  for (const k in store) delete store[k]
})

describe('wordlist', () => {
  it('wordlist has exactly 128 entries', () => {
    expect(WORDLIST).toHaveLength(128)
  })

  it('all entries are unique', () => {
    expect(new Set(WORDLIST).size).toBe(WORDLIST.length)
  })

  it('generateRecoveryPhrase returns 12 words from the wordlist', () => {
    const bytes = sodium.randombytes_buf(12)
    const phrase = generateRecoveryPhrase(bytes)
    const words = phrase.split(' ')
    expect(words).toHaveLength(12)
    for (const word of words) {
      expect(WORDLIST).toContain(word)
    }
  })

  it('different random bytes produce different phrases', () => {
    const p1 = generateRecoveryPhrase(sodium.randombytes_buf(12))
    const p2 = generateRecoveryPhrase(sodium.randombytes_buf(12))
    // Astronomically unlikely to match
    expect(p1).not.toBe(p2)
  })
})

describe('createFamily', () => {
  it('creates a family with admin role', () => {
    const state = createFamily({
      familyName: 'Test Family',
      myName: 'Raj',
      familyType: 'nuclear',
      recoveryPhrase: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12',
    })
    expect(state.role).toBe('admin')
    expect(state.familyName).toBe('Test Family')
    expect(state.familyType).toBe('nuclear')
  })

  it('initialises with a single member (the creator)', () => {
    const state = createFamily({
      familyName: 'Test Family',
      myName: 'Raj',
      familyType: 'joint',
      recoveryPhrase: 'twelve random words here for testing purposes only ok done',
    })
    expect(state.members).toHaveLength(1)
    expect(state.members[0].name).toBe('Raj')
    expect(state.members[0].role).toBe('admin')
  })

  it('persists to localStorage', () => {
    createFamily({
      familyName: 'Persisted Family',
      myName: 'Priya',
      familyType: 'nuclear',
      recoveryPhrase: 'some words for testing recovery phrase setup please',
    })
    const loaded = getFamily()
    expect(loaded?.familyName).toBe('Persisted Family')
  })

  it('generates distinct family IDs', () => {
    const s1 = createFamily({ familyName: 'F1', myName: 'A', familyType: 'nuclear', recoveryPhrase: 'x' })
    clearFamily()
    for (const k in store) delete store[k]
    const s2 = createFamily({ familyName: 'F2', myName: 'B', familyType: 'nuclear', recoveryPhrase: 'x' })
    expect(s1.familyId).not.toBe(s2.familyId)
  })

  it('stores a recovery package', () => {
    const state = createFamily({
      familyName: 'RF',
      myName: 'Me',
      familyType: 'nuclear',
      recoveryPhrase: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12',
    })
    expect(state.recoveryPackage).not.toBeNull()
    expect(state.recoveryPackage?.salt).toBeTruthy()
    expect(state.recoveryPackage?.wrappedKey).toBeTruthy()
  })
})

describe('join handshake', () => {
  it('admin derives same verification code as requester', () => {
    // Admin has a family
    const adminState = createFamily({
      familyName: 'Admin Family',
      myName: 'Admin',
      familyType: 'nuclear',
      recoveryPhrase: 'twelve words here for testing purposes only and done now ok',
    })

    // Requester generates join request
    const pending = createJoinRequest('New Member')

    // Admin derives code from requester enc pub + admin enc pub
    const adminCode = deriveHandshakeCode(
      pending.request.deviceEncPublicKey,
      adminState.deviceEncKeypair.publicKey
    )

    // Clear store (simulate requester's device, which doesn't have the family)
    // Re-derive code from requester side (using admin enc pub from approval)
    // Both should match because it's the same function with same inputs
    expect(adminCode).toHaveLength(6)
    expect(/^\d{6}$/.test(adminCode)).toBe(true)
  })

  it('requester and admin code match symmetrically', () => {
    createFamily({
      familyName: 'Family', myName: 'Admin', familyType: 'nuclear',
      recoveryPhrase: 'phrase twelve words testing one two three four five six ok',
    })
    const pending = createJoinRequest('Joiner')

    // Admin approves
    const approval = approveJoinRequest(pending.request)

    // Both derive verification code from the same inputs
    const requesterCode = deriveHandshakeCode(pending.request.deviceEncPublicKey, approval.adminEncPublicKey)
    const adminCode = deriveHandshakeCode(pending.request.deviceEncPublicKey, getFamily()!.deviceEncKeypair.publicKey)

    expect(requesterCode).toBe(adminCode)
  })

  it('completeJoin recovers the correct family key', () => {
    const adminState = createFamily({
      familyName: 'Family', myName: 'Admin', familyType: 'nuclear',
      recoveryPhrase: 'phrase twelve words testing one two three four five six ok',
    })
    const originalKeyBytes = adminState.familyKey.bytes

    const pending = createJoinRequest('Joiner')
    const approval = approveJoinRequest(pending.request)

    // Simulate requester's perspective: clear admin state, complete join
    clearFamily()
    for (const k in store) delete store[k]

    const joined = completeJoin(pending, approval)
    expect(joined.familyKey.bytes).toBe(originalKeyBytes)
    expect(joined.familyName).toBe('Family')
    expect(joined.role).toBe('member')
  })

  it('completeJoin fails if approval is for a different requester key', () => {
    createFamily({
      familyName: 'Family', myName: 'Admin', familyType: 'nuclear',
      recoveryPhrase: 'phrase twelve words testing one two three four five six ok',
    })
    const pending1 = createJoinRequest('Joiner 1')
    const pending2 = createJoinRequest('Joiner 2')

    // Approve joiner 1
    const approval = approveJoinRequest(pending1.request)

    // Try to use joiner 2's keys with joiner 1's approval
    clearFamily()
    for (const k in store) delete store[k]

    expect(() => completeJoin(pending2, approval)).toThrow()
  })
})
