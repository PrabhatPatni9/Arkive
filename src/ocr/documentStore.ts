import { Directory, Filesystem } from '@capacitor/filesystem'
import { sodium } from '../crypto/sodium'
import {
  generateDocumentKey,
  encryptDocument,
  decryptDocument,
  contentHash,
  wrapDocumentKey,
  unwrapDocumentKey,
} from './documentCrypto'
import type { DocumentMeta, DocumentCategory } from './types'
import type { EncryptionKeypair, ScopeKey } from '../crypto/keys'
import type { OpWithHash } from '../crypto/ops'
import { createOp } from '../crypto/ops'
import { sealEnvelope } from '../crypto/envelope'

const DOCS_DIR = 'arkive_docs'

export interface StoreDocumentParams {
  category: DocumentCategory
  filename: string
  mimeType: string
  plaintext: Uint8Array
  ocrText: string
  scopeKey: ScopeKey
  recipientPublicKey: Uint8Array
  authorDeviceId: string
  signingSecretKey: Uint8Array
  prevHash: string
  lamportClock: number
}

export async function storeDocument(params: StoreDocumentParams): Promise<{
  op: OpWithHash
  meta: DocumentMeta
}> {
  const docKey = generateDocumentKey()
  const encrypted = encryptDocument(docKey, params.plaintext)
  const hash = contentHash(params.plaintext)
  const docId = sodium.to_hex(sodium.randombytes_buf(16))
  const encPath = `${DOCS_DIR}/${docId}.enc`

  await Filesystem.writeFile({
    path: encPath,
    data: sodium.to_base64(encrypted),
    directory: Directory.Data,
    recursive: true,
  })

  const wrapped = wrapDocumentKey(docKey, params.recipientPublicKey)

  const meta: DocumentMeta = {
    docId,
    category: params.category,
    filename: params.filename,
    mimeType: params.mimeType,
    sha256: hash,
    ocrText: params.ocrText,
    sizeBytes: params.plaintext.length,
    createdAt: new Date().toISOString(),
    scopeKeyId: params.scopeKey.keyId,
    scopeKeyEpoch: params.scopeKey.epoch,
    wrappedDocKey: sodium.to_base64(wrapped),
  }

  const payload = sodium.from_string(JSON.stringify({ type: 'document', ...meta }))
  const op = createOp(
    {
      scope: params.scopeKey.scope,
      keyEpoch: params.scopeKey.epoch,
      prevHash: params.prevHash,
      lamportClock: params.lamportClock,
      authorDeviceId: params.authorDeviceId,
      signingSecretKey: params.signingSecretKey,
      plaintextPayload: payload,
      scopeKeyBytes: params.scopeKey.bytes,
    },
    sealEnvelope
  )

  return { op, meta }
}

export async function readDocumentBytes(
  meta: DocumentMeta,
  recipientKeypair: EncryptionKeypair
): Promise<Uint8Array> {
  const encPath = `${DOCS_DIR}/${meta.docId}.enc`
  const file = await Filesystem.readFile({
    path: encPath,
    directory: Directory.Data,
  })
  const encrypted = sodium.from_base64(file.data as string)
  const wrapped = sodium.from_base64(meta.wrappedDocKey)
  const docKey = unwrapDocumentKey(wrapped, recipientKeypair)
  return decryptDocument(docKey, encrypted)
}
