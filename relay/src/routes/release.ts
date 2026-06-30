import type { Env } from '../types'

/**
 * Public APK release downloads.
 * CI uploads APKs directly to R2 via wrangler; this handler serves them without auth.
 * Key pattern: _release/<sha256-hex>
 */
export async function handleRelease(request: Request, env: Env, sha256: string): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 })
  if (!/^[0-9a-f]{64}$/i.test(sha256)) return new Response('Bad request', { status: 400 })

  const obj = await env.OPS_BUCKET.get(`_release/${sha256}`)
  if (!obj) return new Response('Not found', { status: 404 })

  return new Response(obj.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': `attachment; filename="arkive.apk"`,
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
