import type { OpWithHash } from '../crypto/ops'

export interface ConflictRecord {
  scope: string
  fieldKey: string
  ops: OpWithHash[]
}

// Medical fields require human reconciliation instead of silent LWW.
const MEDICAL_FIELDS = new Set([
  'blood_type',
  'allergies',
  'medications',
  'diagnoses',
  'emergency_contact',
  'organ_donor',
])

export function isMedicalField(fieldKey: string): boolean {
  return MEDICAL_FIELDS.has(fieldKey)
}

// Last-writer-wins by lamport_clock. Caller ensures candidates.length >= 1.
export function resolveLWW<T extends { lamport_clock: number }>(candidates: T[]): T {
  return candidates.reduce((winner, c) =>
    c.lamport_clock > winner.lamport_clock ? c : winner
  )
}

// Partition ops by field key; return those that map to medical fields.
// Ops must carry a `fieldKey` in their decrypted payload — this helper
// operates on pre-parsed metadata passed in by the app layer after decryption.
export function detectConflicts(
  opsByField: Map<string, OpWithHash[]>
): ConflictRecord[] {
  const conflicts: ConflictRecord[] = []
  for (const [fieldKey, ops] of opsByField.entries()) {
    if (ops.length > 1 && isMedicalField(fieldKey)) {
      conflicts.push({ scope: ops[0].scope, fieldKey, ops })
    }
  }
  return conflicts
}
