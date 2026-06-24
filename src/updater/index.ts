/**
 * Signed APK auto-update mechanism — Phase 0 skeleton.
 *
 * Flow (implemented in Phase 1+):
 *   1. Fetch a signed UpdateManifest from GET /version on the relay.
 *   2. Compare buildNumber against the running build.
 *   3. If newer: download the APK, verify SHA-256, then verify the Ed25519
 *      signature against the pinned RELEASE_PUBKEY_B64.
 *   4. Only after both checks pass: hand the buffer to installUpdate.
 *
 * Hard constraint §12: a signature mismatch is fatal — never install.
 * Never remove or bypass the verification step.
 */

/** Shape of the signed manifest served at GET /version on the relay. */
export interface UpdateManifest {
  version: string
  buildNumber: number
  apkUrl: string
  /** Hex-encoded SHA-256 of the APK binary. */
  sha256: string
  /** Base64 Ed25519 signature over the canonical JSON of this manifest
   *  (keys sorted, no extra whitespace), signed by the release private key. */
  ed25519Signature: string
  /** ISO-8601 timestamp this manifest was signed. */
  signedAt: string
}

/**
 * Pinned release public key (Ed25519, base64).
 * Set at build time via VITE_UPDATE_PUBKEY in .env.
 * An empty string causes downloadAndVerify to reject every update (safe default).
 */
const RELEASE_PUBKEY_B64: string = import.meta.env.VITE_UPDATE_PUBKEY ?? ''

/**
 * Fetch the latest version manifest and return it if a newer build is
 * available. Returns null when already on the latest version or when the
 * check cannot be completed (always fail-safe — never block the app).
 */
export async function checkForUpdate(
  _currentBuildNumber: number,
): Promise<UpdateManifest | null> {
  // TODO Phase 1+: GET ${VITE_RELAY_URL}/version, verify manifest signature,
  // compare buildNumber against _currentBuildNumber.
  throw new Error('checkForUpdate: not implemented — Phase 0 skeleton')
}

/**
 * Download the APK at manifest.apkUrl, verify the SHA-256 integrity hash,
 * then verify the Ed25519 signature with libsodium crypto_sign_verify_detached
 * using RELEASE_PUBKEY_B64. Throws on any verification failure.
 * Never returns a buffer that has not passed both checks.
 */
export async function downloadAndVerify(
  _manifest: UpdateManifest,
): Promise<ArrayBuffer> {
  if (!RELEASE_PUBKEY_B64) {
    throw new Error('downloadAndVerify: VITE_UPDATE_PUBKEY is not configured')
  }
  // TODO Phase 1+: fetch APK, SHA-256 check, libsodium signature verify.
  throw new Error('downloadAndVerify: not implemented — Phase 0 skeleton')
}

/**
 * Install the verified APK via the Capacitor native bridge.
 * Only ever called after downloadAndVerify returns successfully.
 */
export async function installUpdate(_apk: ArrayBuffer): Promise<void> {
  // TODO Phase 1+: invoke Capacitor plugin / Android intent to sideload APK.
  throw new Error('installUpdate: not implemented — Phase 0 skeleton')
}
