import type { Env } from '../types'
import { requireAuth } from '../auth'
import { checkRateLimit, getBlobUsage, addBlobUsage } from '../db/d1'

// Per-family blob storage cap and upload rate. The cap protects R2 from a single family
// filling the bucket; 120 uploads/min is ample for burst photo/document capture.
const FAMILY_BLOB_QUOTA_BYTES = 100 * 1024 * 1024
const BLOB_RATE_LIMIT = 120
const BLOB_RATE_WINDOW_SEC = 60

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

  if (!await checkRateLimit(env, `blob:${ctx.familyId}`, BLOB_RATE_LIMIT, BLOB_RATE_WINDOW_SEC)) {
    return new Response('Rate limit exceeded', { status: 429 })
  }

  const body = await request.arrayBuffer()
  if (body.byteLength === 0) return new Response('Empty body', { status: 400 })
  if (body.byteLength > 10 * 1024 * 1024) return new Response('Blob too large (10 MB max)', { status: 413 })

  // Defense-in-depth: recompute the content hash and reject if the client lied about it.
  // The blob is content-addressed by SHA-256, so a mismatched hash would corrupt the
  // address space (one key serving different bytes across devices).
  const actualHash = await sha256Hex(body)
  if (actualHash !== hash.toLowerCase()) {
    return new Response('Blob hash mismatch', { status: 400 })
  }

  const key = `blobs/${ctx.familyId}/${hash}`
  // Content-addressed writes are idempotent: re-PUTting an existing blob (same hash) is a
  // no-op for storage, so only a genuinely new blob counts against the quota.
  const existing = await env.OPS_BUCKET.head(key)
  if (!existing) {
    const usage = await getBlobUsage(env, ctx.familyId)
    if (usage + body.byteLength > FAMILY_BLOB_QUOTA_BYTES) {
      return new Response('Storage quota exceeded', { status: 413 })
    }
  }

  await env.OPS_BUCKET.put(key, body, {
    httpMetadata: { contentType: 'application/octet-stream' },
    customMetadata: { family_id: ctx.familyId, device_id: ctx.deviceId },
  })
  if (!existing) void addBlobUsage(env, ctx.familyId, body.byteLength).catch(() => {})

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
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
