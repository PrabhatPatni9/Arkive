# Arkive Build Progress

## All 8 Phases COMPLETE — Infrastructure Provisioned

---

## Phase 0 — Scaffold (COMPLETE)
- TypeScript strict, Vite + React 18 + Capacitor 6
- GitHub Actions: lint-and-test (all branches), build-apk (main only)
- ESLint, Vitest, signed-APK skeleton, no secrets in repo

## Phase 1 — Crypto Core (COMPLETE)
- libsodium singleton, versioned AEAD envelope `[version:1][algo:1][nonce:24][ct+tag]`
- Three-tier ScopeKey (family/node/member), X25519 wrap/unwrap, Ed25519 sign/verify
- Append-only Op struct with hash chain (BLAKE2b-256)
- Shamir SSS: `computeThreshold(N) = clamp(ceil(0.3N), 2, 6)`, split/reconstruct
- Argon2id recovery packages, 6-digit join verification code
- MemoryOpLog; comprehensive test suite

## Phase 2 — SQLite Persistence (COMPLETE)
- Migration runner, SQLiteOpLog, KeyStore

## Phase 3 — Relay (COMPLETE)
- Cloudflare Worker in `relay/` — D1 + R2 + Ed25519 verify + CORS
- POST /ops, GET /ops, POST /devices, GET /health

## Phase 4 — Sync Engine (COMPLETE)
- puller (verify + hash-chain check), pusher, LWW + medical conflict resolver
- SyncEngine with start/stop/enqueuePush

## Phase 5 — UI Shell (COMPLETE)
- react-router-dom v6, bottom tab nav, dark CSS, safe-area support
- Home / Family / Vault / Settings screens

## Phase 6 — OCR / Documents (COMPLETE)
- ML Kit lazy import (StubOcrService fallback on web)
- Per-doc key crypto, Filesystem encrypted storage, doc op creation
- DocumentCaptureScreen

## Phase 7 — Payments (COMPLETE)
- Razorpay checkout, plan definitions, subscription guards as ops
- SubscriptionScreen

---

## Live Infrastructure

| Resource | Value |
|----------|-------|
| Cloudflare account | `df08a4524c6b150c79348335a7211040` |
| D1 database | `arkive-relay` — `d050374e-99db-4d1d-9ff4-ce593233f5c4` (APAC) |
| R2 bucket | `arkive-ops` |
| Relay URL | `https://relay-arkive.punyakosh.in` |
| Web app URL | `https://arkive.punyakosh.in` (after Pages first deploy) |

---

## Owner Checklist to Ship

### 1. GitHub Secrets (Settings → Secrets → Actions)

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | The Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | `df08a4524c6b150c79348335a7211040` |
| `VITE_RELAY_URL` | `https://relay-arkive.punyakosh.in` |
| `VITE_UPDATE_PUBKEY` | Ed25519 pubkey base64 (see §3 below) |
| `VITE_RAZORPAY_KEY` | Razorpay key ID |
| `SIGNING_KEY_BASE64` | APK keystore base64 (see §2 below) |
| `KEY_ALIAS` | `arkive-release` |
| `KEY_STORE_PASSWORD` | Your chosen password |
| `KEY_PASSWORD` | Your chosen key password |

### 2. APK Signing Keystore (run locally, JDK 17+ required)

```bash
# Generate keystore
keytool -genkey -v \
  -keystore arkive-release.keystore \
  -alias arkive-release \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=Arkive, O=Arkive, C=IN"

# Base64 encode (macOS)
base64 -i arkive-release.keystore | pbcopy
# Linux
base64 arkive-release.keystore
# Paste output as SIGNING_KEY_BASE64 GitHub Secret

# KEEP arkive-release.keystore somewhere safe offline — losing it means
# you cannot update the app on devices that installed this build.
```

### 3. Ed25519 Update Keypair (for signed APK self-updates)

```bash
# Run once in the project root after npm ci
node -e "
const s = require('libsodium-wrappers');
s.ready.then(() => {
  const kp = s.crypto_sign_keypair();
  console.log('VITE_UPDATE_PUBKEY =', s.to_base64(kp.publicKey));
  console.log('SECRET KEY (keep offline):', s.to_base64(kp.privateKey));
});"
```

Add the public key as `VITE_UPDATE_PUBKEY` GitHub Secret.  
Store the private key offline — used only to sign release manifests.

### 4. VAPID Keys (Web Push notifications)

```bash
npx web-push generate-vapid-keys --json
# Copy publicKey → relay/wrangler.toml [vars] VAPID_PUBLIC_KEY
# Set private key as Cloudflare secret:
cd relay
npx wrangler secret put VAPID_PRIVATE_KEY
```

### 5. First Deploy (triggers everything)

```bash
# Push to main — GitHub Actions run automatically:
# build-apk.yml → signed APK artifact
# deploy-relay.yml → Worker live at relay-arkive.punyakosh.in
# deploy-pages.yml → Web app live at *.pages.dev (then map custom domain)
```

### 6. Custom Domain for Pages

After first deploy to Pages:  
Cloudflare Dashboard → Pages → arkive → Custom domains → Add `arkive.punyakosh.in`

The `relay-arkive.punyakosh.in` custom domain is auto-wired via `wrangler.toml` on Worker deploy — but `punyakosh.in` must be a zone in **this** Cloudflare account. If it's on a different account/registrar, add a CNAME manually:
```
relay-arkive.punyakosh.in CNAME arkive-relay.YOUR_ACCOUNT.workers.dev
```

### 7. Razorpay
- Create account at razorpay.com
- Get Key ID from Dashboard → Settings → API Keys
- Add as `VITE_RAZORPAY_KEY` GitHub Secret
- Set up webhook endpoint `https://relay-arkive.punyakosh.in/payments/webhook` in Razorpay dashboard

### 8. Rotate credentials
After everything is wired: rotate the Cloudflare API token and R2 keys that were shared in this session.
