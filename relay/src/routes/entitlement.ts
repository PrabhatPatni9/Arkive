import type { Env } from '../types'
import { requireAuth } from '../auth'

export async function handleEntitlement(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const ctx = await requireAuth(request, env)
  if (!ctx) return new Response('Unauthorized', { status: 401 })

  // Stub: all registered families get managed_relay access for now.
  // Phase 6 will wire this to a subscriptions table populated by Razorpay webhooks.
  const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  return new Response(
    JSON.stringify({
      active: true,
      tier: 'managed_relay',
      validUntil,
      familyId: ctx.familyId,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
