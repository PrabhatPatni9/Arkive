import type { Env, PostOpBody } from '../types'
import { getDevice, indexOp, getOpsSince } from '../db/d1'
import { verifyEd25519Signature, canonicalJson } from '../crypto'
import { notifyFamilyDevices } from '../push/notify'

export async function handleOps(request: Request, env: Env): Promise<Response> {
  if (request.method === 'POST') return postOp(request, env)
  if (request.method === 'GET') return pullOps(request, env)
  return new Response('Method not allowed', { status: 405 })
}

async function postOp(request: Request, env: Env): Promise<Response> {
  let body: PostOpBody
  try {
    body = await request.json() as PostOpBody
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { op, family_id } = body
  if (!op || !family_id) return new Response('Missing op or family_id', { status: 400 })

  const device = await getDevice(env, op.author_device_id)
  if (!device) return new Response('Unknown device', { status: 401 })
  if (device.family_id !== family_id) return new Response('Device not in family', { status: 403 })

  // Reconstruct signed message (same as client-side signedFields())
  const { hash: _h, signature, ...signedFieldsObj } = op
  const signedMessage = canonicalJson(signedFieldsObj as Record<string, unknown>)
  const valid = await verifyEd25519Signature(device.sign_public_key, signedMessage, signature)
  if (!valid) return new Response('Invalid signature', { status: 401 })

  // Store the full op in R2 (blind — relay never decrypts encrypted_payload)
  await env.OPS_BUCKET.put(
    `ops/${family_id}/${op.hash}`,
    JSON.stringify(op),
    { httpMetadata: { contentType: 'application/json' } }
  )

  // Index in D1 for efficient pulls
  await indexOp(env, {
    op_hash: op.hash,
    family_id,
    scope: op.scope,
    lamport_clock: op.lamport_clock,
    author_device_id: op.author_device_id,
    posted_at: new Date().toISOString(),
  })

  void notifyFamilyDevices(env, family_id, op.author_device_id).catch(() => {})

  return json({ ok: true, hash: op.hash }, 201)
}

async function pullOps(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const familyId = url.searchParams.get('family_id')
  const since = parseInt(url.searchParams.get('since') ?? '0', 10)

  if (!familyId) return new Response('Missing family_id', { status: 400 })

  const index = await getOpsSince(env, familyId, since)

  const ops = await Promise.all(
    index.map(async row => {
      const obj = await env.OPS_BUCKET.get(`ops/${familyId}/${row.op_hash}`)
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
