import type { OpWithHash } from '../crypto/ops'

export async function pushToRelay(
  relayUrl: string,
  familyId: string,
  ops: OpWithHash[]
): Promise<void> {
  await Promise.all(
    ops.map(op =>
      fetch(`${relayUrl}/ops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_id: familyId, op }),
      }).then(res => {
        if (!res.ok) throw new Error(`Push failed for op ${op.op_id}: ${res.status}`)
      })
    )
  )
}
