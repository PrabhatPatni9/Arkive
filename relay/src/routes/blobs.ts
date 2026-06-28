import type { Env } from '../types'
import { requireAuth } from '../auth'

export async function handleBlobs(
  request: Request,
  env: Env,
  hash: string
): Promise<Response> {
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) {
    return new Response('Invalid blob hash', { status: 400 })
  }

  if (request.method === 'PUT') return putBlob(request, env, hash)
  if (request.method === 'GET') return getBlob(request, env, hash)
  return new Response('Method not allowed', { status: 405 })
}

async function putBlob(request: Request, env: Env, hash: string): Promise<Response> {
  const ctx = await requireAuth(request, env)
  if (!ctx) return new Response('Unauthorized', { status: 401 })

  const body = await request.arrayBuffer()
  if (body.byteLength === 0) return new Response('Empty body', { status: 400 })
  if (body.byteLength > 10 * 1024 * 1024) return new Response('Blob too large (10 MB max)', { status: 413 })

  const key = `blobs/${ctx.familyId}/${hash}`
  await env.OPS_BUCKET.put(key, body, {
    httpMetadata: { contentType: 'application/octet-stream' },
    customMetadata: { family_id: ctx.familyId, device_id: ctx.deviceId },
  })

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function getBlob(request: Request, env: Env, hash: string): Promise<Response> {
  const ctx = await requireAuth(request, env)
  if (!ctx) return new Response('Unauthorized', { status: 401 })

  const key = `blobs/${ctx.familyId}/${hash}`
  const obj = await env.OPS_BUCKET.get(key)
  if (!obj) return new Response('Not found', { status: 404 })

  return new Response(obj.body, {
    status: 200,
    headers: { 'Content-Type': 'application/octet-stream' },
  })
}
