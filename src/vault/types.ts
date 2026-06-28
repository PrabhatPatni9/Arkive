export type DocumentType =
  | 'aadhaar'
  | 'pan'
  | 'passport'
  | 'insurance'
  | 'rc'
  | 'puc'
  | 'driving_licence'
  | 'medical_report'
  | 'blood_report'
  | 'prescription'
  | 'discharge_summary'
  | 'bill'
  | 'other'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  aadhaar: 'Aadhaar',
  pan: 'PAN',
  passport: 'Passport',
  insurance: 'Insurance',
  rc: 'RC Book',
  puc: 'PUC',
  driving_licence: 'Driving Licence',
  medical_report: 'Medical Report',
  blood_report: 'Blood Report',
  prescription: 'Prescription',
  discharge_summary: 'Discharge Summary',
  bill: 'Bill',
  other: 'Other',
}

export interface DocumentRecord {
  docId: string
  type: DocumentType
  title: string
  scope: 'family' | 'member'
  memberId: string
  memberName: string
  expiryDate?: string    // ISO date string YYYY-MM-DD
  hash: string           // BLAKE2b-256 hex of plaintext
  wrappedDocKey: string  // base64 — per-doc key sealed to family key holder's pubkey
  scopeKeyId: string
  scopeKeyEpoch: number
  ocrText: string
  extractedFields: Record<string, string>
  sizeBytes: number
  mimeType: string
  createdAt: string
}
