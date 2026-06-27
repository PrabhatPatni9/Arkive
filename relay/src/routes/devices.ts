import type { Env, RegisterDeviceBody } from '../types'
import { upsertDevice, createDeviceToken } from '../db/d1'

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function handleDevices(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body: RegisterDeviceBody
  try {
    body = await request.json() as RegisterDeviceBody
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!body.device_id || !body.family_id || !body.sign_public_key) {
    return new Response('Missing required fields: device_id, family_id, sign_public_key', { status: 400 })
  }

  await upsertDevice(env, {
    device_id: body.device_id,
    family_id: body.family_id,
    sign_public_key: body.sign_public_key,
    push_endpoint: body.push_subscription?.endpoint ?? null,
    push_auth: body.push_subscription?.keys.auth ?? null,
    push_p256dh: body.push_subscription?.keys.p256dh ?? null,
    registered_at: new Date().toISOString(),
  })

  const token = randomHex(32)
  await createDeviceToken(env, {
    token,
    device_id: body.device_id,
    family_id: body.family_id,
    created_at: new Date().toISOString(),
  })

  return json({ ok: true, token }, 201)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
