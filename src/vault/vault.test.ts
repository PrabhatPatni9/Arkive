import { describe, it, expect, beforeEach } from 'vitest'
import { listDocuments, saveDocument, deleteDocument, isExpired, isExpiringSoon } from './vaultStore'
import type { DocumentRecord } from './types'

// localStorage stub for Node environment
const store: Record<string, string> = {}
/* eslint-disable @typescript-eslint/no-dynamic-delete */
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i: number) => Object.keys(store)[i] ?? null,
} as Storage
/* eslint-enable @typescript-eslint/no-dynamic-delete */

// Minimal sodium mock for tests — real crypto tested in Phase 1
vi.mock('../crypto/sodium', () => ({
  sodium: {
    randombytes_buf: (n: number) => new Uint8Array(n).fill(1),
    to_hex: (b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join(''),
    to_base64: (b: Uint8Array) => btoa(String.fromCharCode(...b)),
    from_base64: (s: string) => new Uint8Array(atob(s).split('').map(c => c.charCodeAt(0))),
    crypto_generichash: () => new Uint8Array(32).fill(2),
  },
}))

// Mock envelope to be identity-ish for tests
vi.mock('../ocr/documentCrypto', () => ({
  generateDocumentKey: () => new Uint8Array(32).fill(3),
  encryptDocument: (_key: Uint8Array, plaintext: Uint8Array) => plaintext,
  decryptDocument: (_key: Uint8Array, ct: Uint8Array) => ct,
  contentHash: () => 'aabbcc',
  wrapDocumentKey: () => new Uint8Array(48).fill(4),
  unwrapDocumentKey: () => new Uint8Array(32).fill(3),
}))

beforeEach(() => {
  localStorage.clear()
})

describe('vaultStore', () => {
  const recipientPublicKey = new Uint8Array(32).fill(5)

  function makeParams(overrides: Partial<Parameters<typeof saveDocument>[0]> = {}) {
    return {
      type: 'aadhaar' as const,
      title: 'My Aadhaar',
      scope: 'member' as const,
      memberId: 'mem1',
      memberName: 'Alice',
      plaintext: new Uint8Array([1, 2, 3]),
      mimeType: 'image/jpeg',
      ocrText: 'some text',
      extractedFields: {},
      scopeKeyId: 'key1',
      scopeKeyEpoch: 0,
      recipientPublicKey,
      ...overrides,
    }
  }

  it('starts empty', () => {
    expect(listDocuments()).toHaveLength(0)
  })

  it('saves and lists a document', () => {
    const rec = saveDocument(makeParams())
    const docs = listDocuments()
    expect(docs).toHaveLength(1)
    expect(docs[0].title).toBe('My Aadhaar')
    expect(docs[0].docId).toBe(rec.docId)
    expect(docs[0].type).toBe('aadhaar')
  })

  it('stores blob in localStorage', () => {
    const rec = saveDocument(makeParams())
    const blobKey = `arkive_blob_${rec.docId}`
    expect(localStorage.getItem(blobKey)).toBeTruthy()
  })

  it('deletes document and its blob', () => {
    const rec = saveDocument(makeParams())
    deleteDocument(rec.docId)
    expect(listDocuments()).toHaveLength(0)
    expect(localStorage.getItem(`arkive_blob_${rec.docId}`)).toBeNull()
  })

  it('saves multiple documents independently', () => {
    saveDocument(makeParams({ title: 'Doc A', type: 'aadhaar' }))
    saveDocument(makeParams({ title: 'Doc B', type: 'pan' }))
    const docs = listDocuments()
    expect(docs).toHaveLength(2)
    expect(docs.map(d => d.title)).toContain('Doc A')
    expect(docs.map(d => d.title)).toContain('Doc B')
  })

  it('stores expiryDate when provided', () => {
    const rec = saveDocument(makeParams({ expiryDate: '2030-01-01' }))
    expect(listDocuments().find(d => d.docId === rec.docId)?.expiryDate).toBe('2030-01-01')
  })

  it('isExpired returns true for past date', () => {
    const rec: DocumentRecord = {
      docId: 'x', type: 'pan', title: 'PAN', scope: 'member',
      memberId: 'm1', memberName: 'A', expiryDate: '2020-01-01',
      hash: 'h', wrappedDocKey: 'w', scopeKeyId: 'k', scopeKeyEpoch: 0,
      ocrText: '', extractedFields: {}, sizeBytes: 0, mimeType: 'image/jpeg',
      createdAt: new Date().toISOString(),
    }
    expect(isExpired(rec)).toBe(true)
  })

  it('isExpired returns false for future date', () => {
    const rec: DocumentRecord = {
      docId: 'x', type: 'pan', title: 'PAN', scope: 'member',
      memberId: 'm1', memberName: 'A', expiryDate: '2099-01-01',
      hash: 'h', wrappedDocKey: 'w', scopeKeyId: 'k', scopeKeyEpoch: 0,
      ocrText: '', extractedFields: {}, sizeBytes: 0, mimeType: 'image/jpeg',
      createdAt: new Date().toISOString(),
    }
    expect(isExpired(rec)).toBe(false)
  })

  it('isExpiringSoon returns true within 30 days', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 10)
    const rec: DocumentRecord = {
      docId: 'x', type: 'pan', title: 'PAN', scope: 'member',
      memberId: 'm1', memberName: 'A', expiryDate: soon.toISOString().slice(0, 10),
      hash: 'h', wrappedDocKey: 'w', scopeKeyId: 'k', scopeKeyEpoch: 0,
      ocrText: '', extractedFields: {}, sizeBytes: 0, mimeType: 'image/jpeg',
      createdAt: new Date().toISOString(),
    }
    expect(isExpiringSoon(rec)).toBe(true)
  })

  it('isExpiringSoon returns false for far future', () => {
    const rec: DocumentRecord = {
      docId: 'x', type: 'pan', title: 'PAN', scope: 'member',
      memberId: 'm1', memberName: 'A', expiryDate: '2099-01-01',
      hash: 'h', wrappedDocKey: 'w', scopeKeyId: 'k', scopeKeyEpoch: 0,
      ocrText: '', extractedFields: {}, sizeBytes: 0, mimeType: 'image/jpeg',
      createdAt: new Date().toISOString(),
    }
    expect(isExpiringSoon(rec)).toBe(false)
  })
})
