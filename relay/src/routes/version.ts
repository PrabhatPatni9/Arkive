import type { Env } from '../types'
import { requireAdminAuth } from '../auth'

const VERSION_KEY = '_version.json'

export async function handleVersion(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') return getVersion(env)
  if (request.method === 'PUT') return putVersion(request, env)
  return new Response('Method not allowed', { status: 405 })
}

async function getVersion(env: Env): Promise<Response> {
  const obj = await env.OPS_BUCKET.get(VERSION_KEY)
  if (!obj) return new Response('No update manifest published yet', { status: 404 })
  const json = await obj.text()
  return new Response(json, {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  })
}

async function putVersion(request: Request, env: Env): Promise<Response> {
  if (!requireAdminAuth(request, env)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await request.text()
  try {
    JSON.parse(body) // validate it's well-formed before storing
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  await env.OPS_BUCKET.put(VERSION_KEY, body, {
    httpMetadata: { contentType: 'application/json' },
  })
  return new Response(null, { status: 204 })
}
