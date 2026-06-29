import type { Env } from '../types'
import { getFamilyDevices } from '../db/d1'
import { sendWakePush } from '../push'

export async function notifyFamilyDevices(
  env: Env,
  familyId: string,
  excludeDeviceId: string
): Promise<void> {
  const devices = await getFamilyDevices(env, familyId)
  const targets = devices.filter(d => d.device_id !== excludeDeviceId && d.push_endpoint)
  await Promise.allSettled(targets.map(d => sendWakePush(env, d)))
}
