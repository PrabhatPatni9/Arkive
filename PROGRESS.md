# Arkive Build Progress

## All 8 Phases COMPLETE — Infrastructure Live — UI Redesigned

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
| Relay Worker | **LIVE** at `https://relay-arkive.punyakosh.in` (deployed + VAPID secret set) |
| Web app | **LIVE** at `https://arkive-csk.pages.dev` (custom domain `arkive.punyakosh.in` initializing) |
| Pages project | `arkive` on Cloudflare Pages |

## UI / Design

- **Matches family-os design language**: Inter font, white surface cards, 12px radius, light-mode default
- **Accent colour picker**: 6 options (blue default, green, purple, teal, rose, indigo) — NOT orange
- **Theme toggle**: Light / Dark, persisted in `localStorage`
- `lucide-react` icons throughout (same library as family-os)

---

## Owner Checklist to Ship

### ✅ Already Done Automatically

| Task | Status |
|------|--------|
| APK signing keystore generated | ✅ (stored in session scratchpad) |
| Ed25519 update keypair generated | ✅ |
| VAPID keys generated | ✅ |
| Relay Worker deployed | ✅ `relay-arkive.punyakosh.in` |
| `VAPID_PRIVATE_KEY` set as Cloudflare secret | ✅ |
| `relay-arkive.punyakosh.in` custom domain | ✅ |
| Pages project created + deployed | ✅ `arkive-csk.pages.dev` |
| `arkive.punyakosh.in` custom domain | ✅ (initializing/cert provisioning) |
| Pages env vars set | ✅ (`VITE_RELAY_URL`, `VITE_UPDATE_PUBKEY`, `VITE_RAZORPAY_KEY`) |

### 1. GitHub Secrets (ONE-TIME MANUAL STEP)

Go to: **https://github.com/prabhatpatni9/arkive/settings/secrets/actions**

Add these as repository secrets:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | *rotate after use — get from Cloudflare dashboard* |
| `CLOUDFLARE_ACCOUNT_ID` | `df08a4524c6b150c79348335a7211040` |
| `VITE_RELAY_URL` | `https://relay-arkive.punyakosh.in` |
| `VITE_UPDATE_PUBKEY` | *Ed25519 public key — shared out-of-band during setup session* |
| `VITE_RAZORPAY_KEY` | *Your Razorpay live key (starts with `rzp_live_`)* |
| `KEY_ALIAS` | `arkive-release` |
| `KEY_STORE_PASSWORD` | *generated during setup — shared out-of-band* |
| `KEY_PASSWORD` | *generated during setup — shared out-of-band* |
| `SIGNING_KEY_BASE64` | *base64 keystore — shared out-of-band during setup session* |

> **All private credentials were shared directly in the Claude session chat — store them offline, never commit to repo.**

### 2. Merge to main to trigger CI/CD

```bash
# Merge the feature branch to main to trigger all GitHub Actions:
# build-apk.yml → signed APK artifact
# deploy-relay.yml → re-deploys Worker (or do it manually via wrangler)
# deploy-pages.yml → re-deploys web app
git checkout main && git merge claude/family-os-analysis-ooovol && git push
```

### 3. Razorpay
- Create account at razorpay.com
- Get Key ID from Dashboard → Settings → API Keys
- Update `VITE_RAZORPAY_KEY` GitHub Secret with real key
- Set webhook: `https://relay-arkive.punyakosh.in/payments/webhook`

### 4. Rotate credentials (IMPORTANT)
After wiring GitHub Secrets: rotate the Cloudflare API token at  
https://dash.cloudflare.com/profile/api-tokens
