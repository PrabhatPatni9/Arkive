import type { Env, PostOpBody } from '../types'
import { getDevice, indexOp, getOpsSince } from '../db/d1'
import { requireAuth } from '../auth'
import { verifyEd25519Signature, canonicalJson } from '../crypto'
import { notifyFamilyDevices } from '../push/notify'

export async function handleOps(request: Request, env: Env): Promise<Response> {
  if (request.method === 'POST') return postOp(request, env)
  if (request.method === 'GET') return pullOps(request, env)
  return new Response('Method not allowed', { status: 405 })
}

async function postOp(request: Request, env: Env): Promise<Response> {
  const ctx = await requireAuth(request, env)
  if (!ctx) return new Response('Unauthorized', { status: 401 })

  let body: PostOpBody
  try {
    body = await request.json() as PostOpBody
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { op } = body
  if (!op) return new Response('Missing op', { status: 400 })

  if (op.author_device_id !== ctx.deviceId) {
    return new Response('Device mismatch', { status: 403 })
  }

  const device = await getDevice(env, ctx.deviceId)
  if (!device) return new Response('Unknown device', { status: 401 })

  const { hash: _h, signature, ...signedFieldsObj } = op
  const signedMessage = canonicalJson(signedFieldsObj as Record<string, unknown>)
  const valid = await verifyEd25519Signature(device.sign_public_key, signedMessage, signature)
  if (!valid) return new Response('Invalid signature', { status: 401 })

  await env.OPS_BUCKET.put(
    `ops/${ctx.familyId}/${op.hash}`,
    JSON.stringify(op),
    { httpMetadata: { contentType: 'application/json' } }
  )

  await indexOp(env, {
    op_hash: op.hash,
    family_id: ctx.familyId,
    scope: op.scope,
    lamport_clock: op.lamport_clock,
    author_device_id: op.author_device_id,
    posted_at: new Date().toISOString(),
  })

  void notifyFamilyDevices(env, ctx.familyId, ctx.deviceId).catch(() => {})

  return json({ ok: true, hash: op.hash }, 201)
}

async function pullOps(request: Request, env: Env): Promise<Response> {
  const ctx = await requireAuth(request, env)
  if (!ctx) return new Response('Unauthorized', { status: 401 })

  const url = new URL(request.url)
  const since = parseInt(url.searchParams.get('since') ?? '0', 10)

  const index = await getOpsSince(env, ctx.familyId, since)

  const ops = await Promise.all(
    index.map(async row => {
      const obj = await env.OPS_BUCKET.get(`ops/${ctx.familyId}/${row.op_hash}`)
      if (!obj) return null
      return obj.json()
    })
  )

  return json({ ops: ops.filter(o => o !== null) })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
