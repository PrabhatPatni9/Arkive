/**
 * Signed APK auto-update (HC §12).
 *
 * Flow:
 *  1. GET ${RELAY_URL}/version → signed UpdateManifest
 *  2. Verify Ed25519 manifest signature against VITE_UPDATE_PUBKEY
 *  3. If buildNumber > current: download APK, verify SHA-256 + Ed25519 signature
 *  4. Hand verified buffer to installUpdate — never install without both checks
 *
 * A signature mismatch or SHA-256 mismatch is always fatal — throws, never installs.
 */

const RELAY_URL = (import.meta.env.VITE_RELAY_URL as string | undefined) ?? ''

/** Ed25519 public key (base64) pinned at build time via VITE_UPDATE_PUBKEY. */
const RELEASE_PUBKEY_B64: string = import.meta.env.VITE_UPDATE_PUBKEY ?? ''

export interface UpdateManifest {
  version: string
  buildNumber: number
  apkUrl: string
  /** Hex-encoded SHA-256 of the APK binary. */
  sha256: string
  /**
   * Base64 Ed25519 signature over the canonical JSON of this manifest
   * (keys sorted alphabetically, no extra whitespace), excluding this field.
   */
  ed25519Signature: string
  /** ISO-8601 timestamp this manifest was signed. */
  signedAt: string
}

/**
 * Fetch the latest version manifest; return it if a newer build is available.
 * Returns null when already on latest or when the check cannot be completed —
 * always fail-safe, never blocks the app.
 */
export async function checkForUpdate(currentBuildNumber: number): Promise<UpdateManifest | null> {
  if (!RELAY_URL || !RELEASE_PUBKEY_B64) return null
  try {
    const res = await fetch(`${RELAY_URL}/version`)
    if (!res.ok) return null
    const manifest = await res.json() as UpdateManifest

    if (typeof manifest.buildNumber !== 'number' || manifest.buildNumber <= currentBuildNumber) return null

    if (!await verifyManifestSignature(manifest)) return null
    return manifest
  } catch {
    return null
  }
}

/**
 * Download the APK, verify SHA-256 integrity, then verify Ed25519 signature.
 * Throws on any verification failure — never returns an unverified buffer.
 */
export async function downloadAndVerify(manifest: UpdateManifest): Promise<ArrayBuffer> {
  if (!RELEASE_PUBKEY_B64) {
    throw new Error('downloadAndVerify: VITE_UPDATE_PUBKEY is not configured')
  }

  const res = await fetch(manifest.apkUrl)
  if (!res.ok) throw new Error(`APK download failed: ${res.status}`)
  const buffer = await res.arrayBuffer()

  // 1. SHA-256 integrity check
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  if (hashHex !== manifest.sha256.toLowerCase()) {
    throw new Error('SHA-256 mismatch — APK is corrupted or tampered; refusing to install')
  }

  // 2. Ed25519 signature check
  if (!await verifyManifestSignature(manifest)) {
    throw new Error('Ed25519 signature invalid — APK manifest is tampered; refusing to install')
  }

  return buffer
}

/**
 * Install the verified APK via the Capacitor native bridge.
 * Only ever called after downloadAndVerify returns successfully.
 */
export async function installUpdate(apk: ArrayBuffer): Promise<void> {
  // Persist the APK to a temporary file, then fire an Android install intent.
  // Requires the FileOpener Capacitor plugin or equivalent.
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const base64 = bufferToBase64(apk)
  const path = 'arkive-update.apk'
  await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache })
  const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })
  const { FileOpener } = await import('@capacitor-community/file-opener')
  await FileOpener.open({ filePath: uri, contentType: 'application/vnd.android.package-archive' })
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function verifyManifestSignature(manifest: UpdateManifest): Promise<boolean> {
  try {
    const { sodium } = await import('../crypto/sodium')
    const { ed25519Signature, ...rest } = manifest
    const canonical = JSON.stringify(
      Object.fromEntries(Object.entries(rest).sort(([a], [b]) => a.localeCompare(b)))
    )
    return sodium.crypto_sign_verify_detached(
      sodium.from_base64(ed25519Signature),
      sodium.from_string(canonical),
      sodium.from_base64(RELEASE_PUBKEY_B64)
    )
  } catch {
    return false
  }
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const CHUNK = 8192
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}
