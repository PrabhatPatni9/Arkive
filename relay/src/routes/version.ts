import type { Env } from '../types'

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
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!env.RELAY_ADMIN_TOKEN || token !== env.RELAY_ADMIN_TOKEN) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await request.text()
  try {
    JSON.parse(body) // validate it's valid JSON before storing
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  await env.OPS_BUCKET.put(VERSION_KEY, body, {
    httpMetadata: { contentType: 'application/json' },
  })
  return new Response(null, { status: 204 })
}
