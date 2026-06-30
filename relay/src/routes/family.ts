import type { Env } from '../types'
import { requireAuth } from '../auth'
import { deleteAllFamilyData } from '../db/d1'

export async function handleFamily(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'DELETE') return new Response('Method not allowed', { status: 405 })

  const ctx = await requireAuth(request, env)
  if (!ctx) return new Response('Unauthorized', { status: 401 })

  await deleteAllFamilyData(env, ctx.familyId)
  return new Response(null, { status: 204 })
}
