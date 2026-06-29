import type { Env } from '../types'
import { requireAuth } from '../auth'
import { insertIntentEvent } from '../db/d1'

interface EventBody {
  event?: string
  family_id?: string
}

export async function handleEvent(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const ctx = await requireAuth(request, env)
  if (!ctx) return new Response('Unauthorized', { status: 401 })

  let body: EventBody
  try {
    body = await request.json() as EventBody
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  const eventName = typeof body.event === 'string' ? body.event.slice(0, 64) : 'unknown'
  await insertIntentEvent(env, ctx.familyId, eventName)

  return new Response(null, { status: 204 })
}
