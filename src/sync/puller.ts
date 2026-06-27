import { verifyOp, hashOp, verifyChainLink, GENESIS_HASH } from '../crypto/ops'
import type { OpWithHash } from '../crypto/ops'
import type { OpLogStore } from '../db/opLog'

export interface PullResult {
  applied: number
  skipped: number
}

export async function pullFromRelay(
  relayUrl: string,
  familyId: string,
  sinceLamport: number,
  signingKeys: Map<string, Uint8Array>,
  opLog: OpLogStore,
  deviceToken?: string
): Promise<PullResult> {
  const url = `${relayUrl}/ops?family_id=${encodeURIComponent(familyId)}&since=${sinceLamport}`
  const headers: Record<string, string> = {}
  if (deviceToken) headers['Authorization'] = `Bearer ${deviceToken}`

  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(`Relay pull failed: ${response.status}`)

  const { ops } = await response.json() as { ops: OpWithHash[] }
  let applied = 0
  let skipped = 0

  for (const op of ops) {
    try {
      const pubKey = signingKeys.get(op.author_device_id)
      if (!pubKey) { skipped++; continue }

      if (!verifyOp(op, pubKey)) { skipped++; continue }

      if (hashOp(op) !== op.hash) { skipped++; continue }

      if (op.prev_hash !== GENESIS_HASH) {
        const prev = await opLog.getByHash(op.prev_hash)
        if (!prev) { skipped++; continue }
      }

      if (!verifyChainLink(op, op.prev_hash)) { skipped++; continue }

      await opLog.append(op)
      applied++
    } catch {
      skipped++
    }
  }

  return { applied, skipped }
}
