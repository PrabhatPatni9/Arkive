// Ed25519 verification using the Web Crypto API (available in Cloudflare Workers).
export async function verifyEd25519Signature(
  signPublicKeyBase64: string,
  message: string,
  signatureBase64: string
): Promise<boolean> {
  try {
    const pubKeyBytes = base64ToBytes(signPublicKeyBase64)
    const sigBytes = base64ToBytes(signatureBase64)
    const msgBytes = new TextEncoder().encode(message)
    const key = await crypto.subtle.importKey(
      'raw',
      pubKeyBytes,
      { name: 'Ed25519' },
      false,
      ['verify']
    )
    return await crypto.subtle.verify('Ed25519', key, sigBytes, msgBytes)
  } catch {
    return false
  }
}

export function canonicalJson(obj: Record<string, unknown>): string {
  const sorted = Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
  )
  return JSON.stringify(sorted)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}
