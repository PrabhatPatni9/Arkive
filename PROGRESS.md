# Arkive Build Progress

## Current Phase: Phase 1 — Crypto Core

## Phase 0 — Scaffold (COMPLETE)

- [x] TypeScript strict mode (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `isolatedModules`)
- [x] Vite + React 18 + Capacitor 6 wired together
- [x] GitHub Actions: `lint-and-test` (all branches) + `build-apk` (main only)
- [x] APK signing via `r0adkll/sign-android-release@v1` (secrets wired, not yet provisioned by owner)
- [x] Version-check endpoint skeleton (`src/updater/index.ts`) with pubkey guard
- [x] Signed-update mechanism skeleton with Ed25519 verify stub
- [x] ESLint config (typescript-eslint strict + react-hooks + react-refresh)
- [x] Vitest config (node environment, globals, `src/**/*.test.ts`)
- [x] No secrets in repo (`.env.example` documents required vars only)
- [x] `.gitignore` covers node_modules, dist, .env*, .capacitor/
- [x] `capacitor.config.ts` — appId `com.arkive.app`, webDir `dist`, APK release

## Phase 1 — Crypto Core (IN PROGRESS)

### Deliverables pushed

- [x] `src/crypto/sodium.ts` — libsodium init singleton
- [x] `src/crypto/envelope.ts` — versioned AEAD envelope `[version:1][algo:1][nonce:24][ct+tag]`
- [x] `src/crypto/keys.ts` — three-tier ScopeKey (family/node/member), X25519 wrap/unwrap, Ed25519 keypair gen, key rotation
- [x] `src/crypto/ops.ts` — Op struct, Ed25519 sign/verify, hash-chain (BLAKE2b-256), encrypted_payload, `MemoryOpLog`-compatible createOp
- [x] `src/crypto/threshold.ts` — Shamir split/reconstruct, `computeThreshold(N)` formula `clamp(ceil(0.3N), 2, 6)`
- [x] `src/crypto/recovery.ts` — Argon2id KDF, createRecoveryPackage / openRecoveryPackage
- [x] `src/crypto/handshake.ts` — 6-digit join verification code (BLAKE2b-8 mod 10^6), constant-time codesMatch
- [x] `src/crypto/index.ts` — barrel export
- [x] `src/db/schema.ts` — SQLite DDL: family_meta, nodes, members, devices, scope_keys, op_log + indexes
- [x] `src/db/opLog.ts` — `OpLogStore` interface + `MemoryOpLog` in-memory impl for tests
- [x] `src/db/index.ts` — barrel export
- [x] `src/types/shamirs-secret-sharing.d.ts` — type shim for untyped SSS lib
- [x] `src/crypto/crypto.test.ts` — comprehensive test suite (envelope, keys, ops, threshold, recovery, handshake)
- [x] `package.json` — added `libsodium-wrappers`, `shamirs-secret-sharing`, `@types/libsodium-wrappers`

### Phase 1 Test Checklist (§10)

- [ ] CI green on `lint-and-test` job
- [ ] envelope: round-trip, wrong key, tampered ciphertext, version byte, unknown version
- [ ] keys: distinct generation, wrap/unwrap, wrong recipient fails, rotation increments epoch
- [ ] ops: signed op verifies, tampered payload rejected, wrong key rejected, payload decrypt, hash chain, broken chain
- [ ] threshold: 10 formula cases pass, M shares reconstructs, N shares reconstructs, M-1 cannot reconstruct
- [ ] recovery: correct code round-trips, wrong code throws
- [ ] handshake: same code both sides, swapped keys differ, codesMatch true/false

## Phase 2 — SQLite Persistence (PENDING)
## Phase 3 — Relay (PENDING)
## Phase 4 — Sync Engine (PENDING)
## Phase 5 — UI Shell (PENDING)
## Phase 6 — OCR / Documents (PENDING)
## Phase 7 — Payments & Subscriptions (PENDING)

## Open Questions for Owner

1. APK signing keystore → upload as `SIGNING_KEY_BASE64` / `KEY_ALIAS` / `KEY_STORE_PASSWORD` / `KEY_PASSWORD` GitHub secrets
2. `VITE_UPDATE_PUBKEY` — Ed25519 public key (base64) for signed-update verification
3. `VITE_RELAY_URL` — Cloudflare Worker relay URL
4. Trademark/domain clearance for "Arkive" name
5. Insurance licensing decision (§12 of brief)
