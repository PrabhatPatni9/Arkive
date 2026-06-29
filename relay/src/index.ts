import { handleOps } from './routes/ops'
import { handleDevices } from './routes/devices'
import { handleJoin } from './routes/join'
import { handleEntitlement } from './routes/entitlement'
import { handleBlobs } from './routes/blobs'
import { handleSignal } from './routes/signal'
import { handleFamily } from './routes/family'
import { handleEvent } from './routes/events'
import type { Env } from './types'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    let response: Response
    if (pathname === '/ops') {
      response = await handleOps(request, env)
    } else if (pathname === '/devices') {
      response = await handleDevices(request, env)
    } else if (pathname === '/entitlement') {
      response = await handleEntitlement(request, env)
    } else if (pathname === '/health') {
      response = new Response('ok', { status: 200 })
    } else if (pathname === '/family') {
      response = await handleFamily(request, env)
    } else if (pathname === '/event') {
      response = await handleEvent(request, env)
    } else if (pathname.startsWith('/join/')) {
      response = await handleJoin(request, env, pathname)
    } else if (pathname.startsWith('/blob/')) {
      const hash = pathname.slice('/blob/'.length)
      response = await handleBlobs(request, env, hash)
    } else if (pathname === '/signal' || pathname === '/signal/presence' || pathname.startsWith('/signal/')) {
      response = await handleSignal(request, env, pathname)
    } else {
      response = new Response('Not found', { status: 404 })
    }

    return addCors(response, request)
  },
}

function corsHeaders(request: Request): Headers {
  const origin = request.headers.get('Origin') ?? '*'
  const h = new Headers()
  h.set('Access-Control-Allow-Origin', origin)
  h.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return h
}

function addCors(response: Response, request: Request): Response {
  const origin = request.headers.get('Origin') ?? '*'
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', origin)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
