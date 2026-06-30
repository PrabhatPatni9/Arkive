import type { Env } from './types'
import { getDeviceByToken } from './db/d1'

export interface AuthContext {
  deviceId: string
  familyId: string
}

export async function requireAuth(
  request: Request,
  env: Env
): Promise<AuthContext | null> {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7).trim()
  if (!token) return null
  return getDeviceByToken(env, token)
}

export function requireAdminAuth(request: Request, env: Env): boolean {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return false
  const token = auth.slice(7).trim()
  return !!env.RELAY_ADMIN_TOKEN && token === env.RELAY_ADMIN_TOKEN
}
