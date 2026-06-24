# Arkive — Progress

## Current phase
Phase 0 — Scaffold (in progress)

## Done
- Brief read in full (§0–§12)
- `ARKIVE_BUILD_BRIEF.md` markdown structure restored
- `PROGRESS.md` created
- Phase 0 scaffold committed:
  - TypeScript strict + Vite + React project skeleton
  - Capacitor config targeting Android
  - ESLint (strict TS rules) + Vitest setup
  - GitHub Actions APK build + signing workflow
  - Signed-update mechanism skeleton (`src/updater/index.ts`)
  - `.env.example` (no real secrets)

## Phase 0 test checklist
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run lint` passes clean
- [ ] `npm run test` runs and passes (skeleton tests)
- [ ] GitHub Actions workflow parses without YAML errors
- [ ] `git log` + `.gitignore` confirm no secrets committed

## Next — Phase 1 (Crypto core)
- libsodium wrappers for all three key tiers (family / node / member)
- Envelope format with version byte + algo_id
- Op structure: `op_id, scope, key_epoch, prev_hash, lamport_clock, author_device_id, signature, encrypted_payload`
- Append-only hash-chained op log (Ed25519 signed)
- Shamir threshold module: `M = clamp(ceil(0.3 * N), 2, 6)`
- Local SQLite schema
- Full test suite (round-trips, rotation, threshold per scope, join handshake, wrong-code rejection)

Nothing in Phase 2+ starts until Phase 1 tests pass.

## Open questions (owner handles — not Claude)
- APK signing keystore: owner generates offline, adds as GitHub Secrets (`SIGNING_KEY_BASE64`, `KEY_ALIAS`, `KEY_STORE_PASSWORD`, `KEY_PASSWORD`)
- `VITE_UPDATE_PUBKEY`: Ed25519 public key for signed updater — generated alongside the keystore
- Cloudflare account credentials: needed for Phase 3 relay deployment
- Trademark / domain clearance for "Arkive"
- Insurance distribution licensing (stub only in V1)
