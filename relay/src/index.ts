import { handleOps } from './routes/ops'
import { handleDevices } from './routes/devices'
import type { Env } from './types'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    let response: Response
    if (pathname === '/ops') response = await handleOps(request, env)
    else if (pathname === '/devices') response = await handleDevices(request, env)
    else if (pathname === '/health') response = new Response('ok', { status: 200 })
    else response = new Response('Not found', { status: 404 })

    return addCors(response, request)
  },
}

function corsHeaders(request: Request): Headers {
  const origin = request.headers.get('Origin') ?? '*'
  const h = new Headers()
  h.set('Access-Control-Allow-Origin', origin)
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  h.set('Access-Control-Allow-Headers', 'Content-Type')
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
