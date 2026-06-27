import type { Env, PostJoinRequestBody, PostJoinApprovalBody } from '../types'
import {
  upsertJoinHandshake,
  getJoinHandshake,
  setJoinApproval,
  getPendingJoinRequests,
} from '../db/d1'
import { requireAuth } from '../auth'

export async function handleJoin(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  if (request.method === 'POST' && path === '/join/requests') {
    return postJoinRequest(request, env)
  }
  if (request.method === 'GET' && path === '/join/requests') {
    return listPendingRequests(request, env)
  }
  if (request.method === 'POST' && path === '/join/approvals') {
    return postApproval(request, env)
  }
  if (request.method === 'GET' && path.startsWith('/join/approvals/')) {
    const requestId = decodeURIComponent(path.slice('/join/approvals/'.length))
    return getApproval(env, requestId)
  }
  return new Response('Not found', { status: 404 })
}

async function postJoinRequest(request: Request, env: Env): Promise<Response> {
  let body: PostJoinRequestBody
  try {
    body = await request.json() as PostJoinRequestBody
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!body.family_id || !body.request_id || !body.request_json) {
    return new Response('Missing required fields: family_id, request_id, request_json', { status: 400 })
  }

  await upsertJoinHandshake(env, {
    request_id: body.request_id,
    family_id: body.family_id,
    request_json: body.request_json,
    approval_json: null,
    posted_at: new Date().toISOString(),
    approved_at: null,
  })

  return json({ ok: true }, 201)
}

async function listPendingRequests(request: Request, env: Env): Promise<Response> {
  const ctx = await requireAuth(request, env)
  if (!ctx) return new Response('Unauthorized', { status: 401 })

  const rows = await getPendingJoinRequests(env, ctx.familyId)
  return json({
    requests: rows.map(r => ({
      requestId: r.request_id,
      requestJson: r.request_json,
      postedAt: r.posted_at,
    })),
  })
}

async function postApproval(request: Request, env: Env): Promise<Response> {
  const ctx = await requireAuth(request, env)
  if (!ctx) return new Response('Unauthorized', { status: 401 })

  let body: PostJoinApprovalBody
  try {
    body = await request.json() as PostJoinApprovalBody
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!body.request_id || !body.approval_json) {
    return new Response('Missing required fields: request_id, approval_json', { status: 400 })
  }

  const handshake = await getJoinHandshake(env, body.request_id)
  if (!handshake) return new Response('Join request not found', { status: 404 })
  if (handshake.family_id !== ctx.familyId) return new Response('Forbidden', { status: 403 })

  await setJoinApproval(env, body.request_id, body.approval_json)
  return json({ ok: true })
}

async function getApproval(env: Env, requestId: string): Promise<Response> {
  if (!requestId) return new Response('Missing request ID', { status: 400 })
  const handshake = await getJoinHandshake(env, requestId)
  if (!handshake || !handshake.approval_json) return new Response('Not yet', { status: 404 })
  return json({ approvalJson: handshake.approval_json })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
