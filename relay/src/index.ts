import { handleOps } from './routes/ops'
import { handleDevices } from './routes/devices'
import { handleJoin } from './routes/join'
import { handleEntitlement } from './routes/entitlement'
import { handleBlobs } from './routes/blobs'
import { handleSignal } from './routes/signal'
import { handleFamily } from './routes/family'
import { handleEvent } from './routes/events'
import { handleVersion } from './routes/version'
import { handleRelease } from './routes/release'
import type { Env } from './types'

/**
 * Origins allowed to call the relay from a browser. Native (Capacitor) apps and
 * server-to-server calls usually send no `Origin` header at all and are unaffected by
 * CORS; this list only governs browser fetches. We never reflect an arbitrary Origin —
 * an unknown Origin simply gets no `Access-Control-Allow-Origin` header, so the browser
 * blocks the cross-origin read.
 */
const ALLOWED_ORIGINS = new Set<string>([
  'https://arkive-csk.pages.dev',   // Cloudflare Pages production
  'https://arkive.punyakosh.in',    // custom domain (once DNS is attached)
  'capacitor://localhost',          // Capacitor Android/iOS WebView
  'https://localhost',              // Capacitor (some Android configs)
  'http://localhost:5173',          // Vite dev server
  'http://localhost:4173',          // Vite preview
])

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
    } else if (pathname === '/version') {
      response = await handleVersion(request, env)
    } else if (pathname.startsWith('/release/')) {
      const sha256 = pathname.slice('/release/'.length)
      response = await handleRelease(request, env, sha256)
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

/** Returns the Origin to echo back, or null if it is not on the allowlist. */
function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin')
  if (origin && ALLOWED_ORIGINS.has(origin)) return origin
  return null
}

function corsHeaders(request: Request): Headers {
  const h = new Headers()
  const origin = allowedOrigin(request)
  if (origin) {
    h.set('Access-Control-Allow-Origin', origin)
    h.set('Vary', 'Origin')
  }
  h.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  h.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return h
}

function addCors(response: Response, request: Request): Response {
  const origin = allowedOrigin(request)
  // No header for unknown origins — the browser then blocks the cross-origin read.
  // Native callers send no Origin and are unaffected.
  if (!origin) return response
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', origin)
  headers.append('Vary', 'Origin')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
