export type DocumentCategory =
  | 'medical'
  | 'legal'
  | 'financial'
  | 'identity'
  | 'insurance'
  | 'other'

export interface OcrBlock {
  text: string
  frame: { x: number; y: number; width: number; height: number }
}

export interface OcrResult {
  text: string
  blocks: OcrBlock[]
}

export interface DocumentMeta {
  docId: string
  category: DocumentCategory
  filename: string
  mimeType: string
  sha256: string        // hex BLAKE2b-256 of plaintext bytes
  ocrText: string
  sizeBytes: number
  createdAt: string
  scopeKeyId: string
  scopeKeyEpoch: number
  // Per-document random key, wrapped under scope key holder's X25519 pubkey
  wrappedDocKey: string // base64
}
