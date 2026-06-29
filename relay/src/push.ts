import type { Env, DeviceRow } from './types'

/**
 * Sends a content-free Web Push wake signal to a device.
 * Uses VAPID authentication (RFC 8292). The payload is empty — this is
 * purely a wake signal to prompt the app to poll for new ops.
 *
 * Silently ignores errors (best-effort; the relay poll loop is the
 * authoritative sync path).
 */
export async function sendWakePush(env: Env, device: DeviceRow): Promise<void> {
  if (!device.push_endpoint || !env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) return
  try {
    const vapidHeaders = await buildVapidHeaders(
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
      device.push_endpoint,
    )
    await fetch(device.push_endpoint, {
      method: 'POST',
      headers: {
        ...vapidHeaders,
        'TTL': '60',
        'Content-Length': '0',
      },
    })
  } catch {
    // Best-effort; never fail the op push because push is unavailable
  }
}

async function buildVapidHeaders(
  publicKeyB64url: string,
  privateKeyB64url: string,
  endpoint: string,
): Promise<Record<string, string>> {
  const audience = new URL(endpoint).origin
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600

  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const payload = b64url(JSON.stringify({ aud: audience, exp, sub: 'mailto:ops@arkive.app' }))
  const signingInput = `${header}.${payload}`

  const privateKey = await crypto.subtle.importKey(
    'raw',
    base64urlToBuffer(privateKeyB64url),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput),
  )

  const jwt = `${signingInput}.${bufferToBase64url(sig)}`
  return {
    'Authorization': `vapid t=${jwt},k=${publicKeyB64url}`,
    'Content-Type': 'application/octet-stream',
  }
}

function b64url(str: string): string {
  return bufferToBase64url(new TextEncoder().encode(str))
}

function bufferToBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlToBuffer(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - b64.length % 4) % 4)
  const binary = atob(padded)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return buf.buffer
}
