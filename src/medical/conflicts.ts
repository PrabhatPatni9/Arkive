/**
 * Medical conflict surfacing (Hard Constraint §3): medical fields must never resolve by silent
 * last-writer-wins. When a synced change would overwrite a locally-different medical record, we
 * record a conflict here and keep the local value; the user reconciles it explicitly.
 */
import { loadArray, saveArray } from '../modules/secureModuleStore'
import { registerReconcileStore } from '../sync/syncContext'

const KEY = 'arkive_med_conflicts_v1'

// The medical stores that require reconciliation (their localStorage keys).
const MEDICAL_STORE_KEYS = ['arkive_medicines_v1', 'arkive_vitals_v1', 'arkive_doctors_v1']

export interface MedConflict {
  conflictId: string
  store: string     // target store key
  idKey: string     // the record's id field name
  id: string        // the record id in conflict
  local: unknown    // the version currently on this device
  incoming: unknown // the version received from another device
  at: string
}

export function getMedConflicts(): MedConflict[] {
  return loadArray<MedConflict>(KEY)
}

function recordMedConflict(store: string, idKey: string, id: string, local: unknown, incoming: unknown): void {
  const all = getMedConflicts()
  // One open conflict per record; refresh the incoming value if it changes.
  const existing = all.find(c => c.store === store && c.id === id)
  if (existing) {
    existing.incoming = incoming
    existing.at = new Date().toISOString()
  } else {
    all.push({
      conflictId: Math.random().toString(36).slice(2, 12),
      store, idKey, id, local, incoming, at: new Date().toISOString(),
    })
  }
  saveArray(KEY, all)   // conflicts are local-only; never synced
}

/** Resolve a conflict: keep the local version, or apply the incoming one to the target store. */
export function resolveMedConflict(conflictId: string, useIncoming: boolean): void {
  const all = getMedConflicts()
  const c = all.find(x => x.conflictId === conflictId)
  if (!c) return
  if (useIncoming && c.incoming) {
    const arr = loadArray<Record<string, unknown>>(c.store)
    const idx = arr.findIndex(r => String(r[c.idKey]) === c.id)
    if (idx >= 0) arr[idx] = c.incoming as Record<string, unknown>
    else arr.push(c.incoming as Record<string, unknown>)
    saveArray(c.store, arr)   // apply raw (no re-emit); the user made this choice deliberately
  }
  saveArray(KEY, all.filter(x => x.conflictId !== conflictId))
}

/** Register the medical stores so incoming changes to them are reconciled, not overwritten. */
export function registerMedicalConflictPolicy(): void {
  for (const key of MEDICAL_STORE_KEYS) {
    registerReconcileStore(key, recordMedConflict)
  }
}
