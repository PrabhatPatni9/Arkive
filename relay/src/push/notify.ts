import type { Env, DeviceRow } from '../types'
import { getFamilyDevices } from '../db/d1'

export async function notifyFamilyDevices(
  env: Env,
  familyId: string,
  excludeDeviceId: string
): Promise<void> {
  const devices = await getFamilyDevices(env, familyId)
  const targets = devices.filter(d => d.device_id !== excludeDeviceId && d.push_endpoint)
  await Promise.allSettled(targets.map(d => sendPush(d)))
}

async function sendPush(device: DeviceRow): Promise<void> {
  if (!device.push_endpoint) return
  // Fire-and-forget; full VAPID signing wired in Phase 4 relay hardening
  await fetch(device.push_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'TTL': '86400' },
    body: JSON.stringify({ type: 'new_ops' }),
  })
}
