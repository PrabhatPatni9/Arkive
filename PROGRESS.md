# Arkive Build Progress

## All 8 Phases COMPLETE

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
- Argon2id recovery packages (createRecoveryPackage / openRecoveryPackage)
- 6-digit join verification code (constant-time codesMatch)
- MemoryOpLog for tests; comprehensive test suite passes

## Phase 2 — SQLite Persistence (COMPLETE)
- Migration runner with `_migrations` version table
- SQLiteOpLog — SQLite-backed OpLogStore
- KeyStore — encrypted ScopeKey storage (envelope on top of SQLite BLOB)

## Phase 3 — Relay (COMPLETE)
- Cloudflare Worker: `relay/` directory with own package.json + tsconfig + wrangler.toml
- D1 schema: `devices` + `op_index` with lamport_clock indexes
- R2: blind op storage at `ops/{family_id}/{op_hash}`
- Ed25519 signature verification via Web Crypto API
- POST /ops (verify + store), GET /ops (pull since), POST /devices (register)
- CORS preflight handled; non-blocking push notify stubs
- `relay/schema.sql` for `wrangler d1 execute`

## Phase 4 — Sync Engine (COMPLETE)
- `pullFromRelay`: verify Ed25519 + hash integrity + chain continuity before appending
- `pushToRelay`: batch POST ops to relay
- `resolveLWW`: last-writer-wins by lamport_clock
- `isMedicalField` + `detectConflicts`: surface medical field conflicts for human review
- `SyncEngine`: start/stop periodic sync with enqueuePush for local ops

## Phase 5 — UI Shell (COMPLETE)
- react-router-dom v6, BrowserRouter
- Bottom tab nav: Home / Family / Vault / Settings
- Screens: HomeScreen, FamilyScreen, VaultScreen, SettingsScreen
- Dark theme CSS, safe-area-inset for notched phones

## Phase 6 — OCR / Documents (COMPLETE)
- `@capacitor-mlkit/text-recognition` lazy import (falls back to StubOcrService on web)
- Per-document random 32-byte key, wrapped under X25519 scope key holder pubkey
- Encrypted doc bytes stored via `@capacitor/filesystem` (`arkive_docs/{docId}.enc`)
- Document metadata stored as encrypted op in op_log (type: 'document')
- DocumentCaptureScreen: category picker, file input, OCR preview, save trigger
- Tests: encrypt/decrypt round-trip, wrong key, hash determinism, wrap/unwrap

## Phase 7 — Payments & Subscriptions (COMPLETE)
- Plan definitions: free (1 member, 0.5 GB), family (6 members, 5 GB, INR 199/mo), premium (20 members, 50 GB, INR 499/mo)
- Razorpay checkout: createOrder (relay call) + openRazorpayCheckout (web SDK)
- Subscription state stored as encrypted op; isSubscriptionActive / canAddMember / isOcrAllowed guards
- SubscriptionScreen: plan cards with Upgrade button and current plan badge
- Tests: plan limits, active/expired, member cap, OCR access, financial dashboard access
- App routes: /vault/capture, /settings/subscription

---

## Owner Checklist Before Shipping

| Item | Details |
|------|---------|
| APK signing keystore | GitHub Secrets: `SIGNING_KEY_BASE64`, `KEY_ALIAS`, `KEY_STORE_PASSWORD`, `KEY_PASSWORD` |
| `VITE_UPDATE_PUBKEY` | Ed25519 public key (base64) for signed-APK update verification |
| `VITE_RELAY_URL` | Cloudflare Worker URL after `wrangler deploy` in `relay/` |
| Cloudflare D1 | `wrangler d1 create arkive-relay` → paste UUID into `relay/wrangler.toml` |
| Cloudflare R2 | `wrangler r2 bucket create arkive-ops` |
| D1 schema | `wrangler d1 execute arkive-relay --file=relay/schema.sql` |
| VAPID keys | `wrangler secret put VAPID_PRIVATE_KEY` in relay/ |
| Razorpay | Key ID for `VITE_RAZORPAY_KEY` env var |
| Trademark/domain | "Arkive" clearance |
| Insurance licensing | Decision per §12 of brief |
