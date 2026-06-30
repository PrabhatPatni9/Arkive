#!/usr/bin/env node
/**
 * CI script: sign the release APK and publish a signed UpdateManifest to the relay.
 *
 * Required env vars:
 *   APK_SIGNING_SEED    — base64 Ed25519 private seed (32 bytes raw, libsodium-compatible)
 *   RELAY_URL           — https://relay-arkive.punyakosh.in
 *   RELAY_ADMIN_TOKEN   — bearer token for PUT /version
 *   APK_PATH            — path to the signed release APK
 *   BUILD_NUMBER        — monotonically increasing integer (use GITHUB_RUN_NUMBER)
 *   APP_VERSION         — semver string, e.g. "1.0.0"
 */

import { createHash, createPrivateKey, createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const required = ['APK_SIGNING_SEED', 'RELAY_URL', 'RELAY_ADMIN_TOKEN', 'APK_PATH', 'BUILD_NUMBER', 'APP_VERSION']
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`)
    process.exit(1)
  }
}

const { APK_SIGNING_SEED, RELAY_URL, RELAY_ADMIN_TOKEN, APK_PATH, BUILD_NUMBER, APP_VERSION } = process.env

// 1. Compute SHA-256 of the APK
const apkBytes = readFileSync(APK_PATH)
const sha256 = createHash('sha256').update(apkBytes).digest('hex')
console.log(`APK SHA-256: ${sha256}`)

// 2. Build the APK download URL — relay serves release APKs at /release/<sha256>
// The APK is uploaded to R2 via wrangler r2 object put in a prior CI step.
const apkUrl = `${RELAY_URL}/release/${sha256}`

// 3. Assemble the manifest (no signature field yet)
const partial = {
  apkUrl,
  buildNumber: Number(BUILD_NUMBER),
  sha256,
  signedAt: new Date().toISOString(),
  version: APP_VERSION,
}

// 4. Canonical JSON: keys sorted alphabetically, no extra whitespace
const canonical = JSON.stringify(
  Object.fromEntries(Object.entries(partial).sort(([a], [b]) => a.localeCompare(b)))
)
console.log(`Canonical manifest (pre-signature): ${canonical}`)

// 5. Sign with Ed25519 — reconstruct PKCS8 DER from raw 32-byte seed
const seedBytes = Buffer.from(APK_SIGNING_SEED, 'base64')
if (seedBytes.length !== 32) {
  console.error(`APK_SIGNING_SEED must be 32 bytes (got ${seedBytes.length})`)
  process.exit(1)
}
// PKCS8 DER header for Ed25519: SEQUENCE { v=0, AlgorithmId(OID 1.3.101.112), OCTET STRING { OCTET STRING { seed } } }
const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex')
const pkcs8Der = Buffer.concat([pkcs8Header, seedBytes])
const privateKey = createPrivateKey({ key: pkcs8Der, format: 'der', type: 'pkcs8' })

const signer = createSign('ed25519')
signer.update(canonical)
const ed25519Signature = signer.sign(privateKey).toString('base64')
console.log(`Signature (base64): ${ed25519Signature}`)

// 6. Assemble the final manifest
const manifest = { ...partial, ed25519Signature }

// 7. Upload to relay PUT /version
const res = await fetch(`${RELAY_URL}/version`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${RELAY_ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(manifest),
})

if (!res.ok) {
  console.error(`Failed to publish manifest: ${res.status} ${await res.text()}`)
  process.exit(1)
}

console.log(`UpdateManifest published for v${APP_VERSION} build #${BUILD_NUMBER}`)
console.log(JSON.stringify(manifest, null, 2))
