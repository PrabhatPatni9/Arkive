import { sodium } from '../crypto/sodium'
import {
  generateDocumentKey,
  encryptDocument,
  decryptDocument,
  contentHash,
  wrapDocumentKey,
  unwrapDocumentKey,
} from '../ocr/documentCrypto'
import type { DocumentRecord, DocumentType } from './types'
import type { EncryptionKeypair } from '../crypto/keys'

const META_KEY = 'arkive_vault_v1'

function blobKey(docId: string): string {
  return `arkive_blob_${docId}`
}

export function listDocuments(): DocumentRecord[] {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? (JSON.parse(raw) as DocumentRecord[]) : []
  } catch { return [] }
}

function saveMeta(docs: DocumentRecord[]): void {
  localStorage.setItem(META_KEY, JSON.stringify(docs))
}

export interface SaveDocumentParams {
  type: DocumentType
  title: string
  scope: 'family' | 'member'
  memberId: string
  memberName: string
  expiryDate?: string
  plaintext: Uint8Array
  mimeType: string
  ocrText: string
  extractedFields?: Record<string, string>
  scopeKeyId: string
  scopeKeyEpoch: number
  recipientPublicKey: Uint8Array  // the family key holder's enc public key
}

export function saveDocument(params: SaveDocumentParams): DocumentRecord {
  const docKey = generateDocumentKey()
  const ciphertext = encryptDocument(docKey, params.plaintext)
  const hash = contentHash(params.plaintext)
  const docId = sodium.to_hex(sodium.randombytes_buf(16))
  const wrapped = wrapDocumentKey(docKey, params.recipientPublicKey)

  // Store encrypted blob in localStorage as base64
  localStorage.setItem(blobKey(docId), sodium.to_base64(ciphertext))

  const record: DocumentRecord = {
    docId,
    type: params.type,
    title: params.title,
    scope: params.scope,
    memberId: params.memberId,
    memberName: params.memberName,
    expiryDate: params.expiryDate,
    hash,
    wrappedDocKey: sodium.to_base64(wrapped),
    scopeKeyId: params.scopeKeyId,
    scopeKeyEpoch: params.scopeKeyEpoch,
    ocrText: params.ocrText,
    extractedFields: params.extractedFields ?? {},
    sizeBytes: params.plaintext.length,
    mimeType: params.mimeType,
    createdAt: new Date().toISOString(),
  }

  const docs = listDocuments()
  docs.push(record)
  saveMeta(docs)
  return record
}

export function deleteDocument(docId: string): void {
  localStorage.removeItem(blobKey(docId))
  const docs = listDocuments().filter(d => d.docId !== docId)
  saveMeta(docs)
}

export function decryptDocumentBytes(
  record: DocumentRecord,
  recipientKeypair: EncryptionKeypair
): Uint8Array {
  const blobB64 = localStorage.getItem(blobKey(record.docId))
  if (!blobB64) throw new Error('Blob not found for ' + record.docId)
  const ciphertext = sodium.from_base64(blobB64)
  const wrapped = sodium.from_base64(record.wrappedDocKey)
  const docKey = unwrapDocumentKey(wrapped, recipientKeypair)
  return decryptDocument(docKey, ciphertext)
}

export function getDocumentsByType(type: DocumentType): DocumentRecord[] {
  return listDocuments().filter(d => d.type === type)
}

export function getDocumentsByMember(memberId: string): DocumentRecord[] {
  return listDocuments().filter(d => d.memberId === memberId)
}

export function isExpiringSoon(record: DocumentRecord, days = 30): boolean {
  if (!record.expiryDate) return false
  const expiry = new Date(record.expiryDate).getTime()
  const now = Date.now()
  return expiry > now && expiry - now < days * 86400 * 1000
}

export function isExpired(record: DocumentRecord): boolean {
  if (!record.expiryDate) return false
  return new Date(record.expiryDate).getTime() < Date.now()
}
