import type { Env, PostSignalBody } from '../types'
import { requireAuth } from '../auth'
import {
  insertSignal,
  getSignalsForDevice,
  deleteSignal,
  getPresences,
  purgeExpiredSignals,
  SIGNAL_TTL_SECONDS,
} from '../db/d1'

export async function handleSignal(
  request: Request,
  env: Env,
  pathname: string
): Promise<Response> {
  const ctx = await requireAuth(request, env)
  if (!ctx) return new Response('Unauthorized', { status: 401 })

  // Opportunistic: purge expired signals on every write (cheap for small tables)
  if (request.method === 'POST' || request.method === 'DELETE') {
    void purgeExpiredSignals(env)
  }

  // POST /signal — send a signal to another device
  if (request.method === 'POST' && pathname === '/signal') {
    const body = await request.json<PostSignalBody>()
    if (!body.recipient_device_id || !body.type || body.payload === undefined) {
      return new Response('Missing fields', { status: 400 })
    }

    const id = crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)

    await insertSignal(env, {
      id,
      sender_id: ctx.deviceId,
      recipient_id: body.recipient_device_id,
      family_id: ctx.familyId,
      type: body.type,
      payload: body.payload,
      expires_at: now + SIGNAL_TTL_SECONDS,
    })

    return new Response(JSON.stringify({ ok: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // GET /signal — poll for signals addressed to this device
  if (request.method === 'GET' && pathname === '/signal') {
    const signals = await getSignalsForDevice(env, ctx.deviceId, ctx.familyId)
    return new Response(JSON.stringify({ signals }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // GET /signal/presence — list all online devices in this family
  if (request.method === 'GET' && pathname === '/signal/presence') {
    const presences = await getPresences(env, ctx.familyId)
    const online = presences.map(p => ({
      deviceId: p.sender_id,
      payload: p.payload,
    }))
    return new Response(JSON.stringify({ online }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // DELETE /signal/:id — acknowledge + remove a signal
  if (request.method === 'DELETE' && pathname.startsWith('/signal/')) {
    const id = pathname.slice('/signal/'.length)
    if (!id) return new Response('Missing id', { status: 400 })
    await deleteSignal(env, id, ctx.deviceId)
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response('Not found', { status: 404 })
}
