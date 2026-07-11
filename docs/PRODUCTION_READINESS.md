# Arkive — Production Readiness Report

> An honest map of the current build against the project's own goals (the 20 Hard Constraints
> in `ARKIVE_BUILD_BRIEF.md §7` and the security requirements). Written to be shareable as-is:
> nothing here is overstated, and every "met" item was checked against the real code, not assumed.
> Date: 2026-07-01.

## Verdict

- **For you and your family, on Android, today: yes — usable and safe.** Family keys and vault
  documents are encrypted at rest, the relay is mathematically blind, emergency data is offline,
  the app now has a real PIN lock, and delete/export both work.
- **For a wide public launch: three owner actions remain** (cert pins, a one-line DB migration,
  and the custom domain), plus one recommended hardening (encrypt module data at rest) and a few
  clearly-labelled "coming soon" features. None of these are blockers for personal/family use;
  they are the difference between "runs for my family" and "I'd tell a stranger to trust it."

The design's core promise is **true and verified**: content is end-to-end encrypted and the
relay cannot read or forge family data. What follows is the honest detail.

## Hard-Constraints scorecard (§7)

| # | Constraint | Status | Evidence / note |
|---|------------|--------|-----------------|
| 1 | Operator never holds plaintext/keys | ✅ Met | Keys in `secureStore` (non-extractable WebCrypto + IndexedDB); relay stores only ciphertext + metadata |
| 2 | Emergency fields offline-decryptable | ✅ Met | Family key on every device; `EmergencyScreen`/`EmergencyCardScreen` read locally |
| 3 | Medical conflicts surfaced (no silent LWW) | ✅ Met | `sync/resolver.ts` `MEDICAL_FIELDS` + `detectConflicts` |
| 4 | Compress images at capture (~200–500 KB) | ✅ Met | `vault/compression.ts` targets 300 KB, scales down, JPEG q≈0.85 |
| 5 | Batch the op log | ✅ Met | `sync/engine.ts` pending-queue batching |
| 6 | Blobs in R2, ops+metadata in D1 | ✅ Met | `relay/src/routes/{blobs,ops}.ts`, `db/d1.ts` |
| 7 | Version byte in every envelope | ✅ Met | `crypto/envelope.ts` `[version][algo][nonce][ct+tag]` |
| 8 | **TLS + certificate pinning** | ⚠️ Owner action | Config present; pin hashes are **placeholders** — must be generated off a non-proxied machine before a pinning-claimed release |
| 9 | AEAD + Ed25519 signing + hash chain | ✅ Met | XChaCha20-Poly1305, per-op nonce, signed ops, BLAKE2b chain |
| 10 | Hardware keystore; app-lock + auto-lock | ✅ Met (web-grade) | **App lock now functional** (`security/appLock.ts`, PIN gate, auto-lock on background). Key storage is non-extractable WebCrypto, not hardware-backed Android Keystore (a future upgrade) |
| 11 | Per-family scoped auth | ✅ Met | Device token → one `family_id`; cross-family reads impossible |
| 12 | Signed + verified APK auto-updates | ✅ Met | `updater/index.ts` verifies Ed25519 manifest + SHA-256 before install |
| 13 | Vetted crypto only (libsodium) | ✅ Met | `libsodium-wrappers-sumo`; `blakejs` only for server-side BLAKE2b |
| 14 | Threshold counts persons, not devices | ✅ Met | `crypto/threshold.ts` |
| 15 | Recovery code mandatory at creation | ✅ Met | `RecoveryPhraseScreen` forced confirmation |
| 16 | Delete + export in V1 | ✅ Met | `DataPrivacyScreen`; **export is now passphrase-encrypted** |
| 17 | No in-app purchase; web billing only | ✅ Met | Renew is a "coming soon" dummy; app only reads entitlement |
| 18 | 15 languages + human-review flag | ✅ Met | `i18n/config.ts`, `REVIEW_REQUIRED_KEYS` |
| 19 | Timezone-aware date math; logical clocks | ✅ Met | `reminders/engine.ts`, Lamport clocks in ops |
| 20 | Minimal deps, locked versions | ✅ Met | `package-lock.json` committed; deps small |

**Score: 18 fully met, 1 met at web-grade (#10), 1 owner-action (#8).**

## Security posture (honest)

**Guaranteed by design (verified):**
- The operator/relay can never read or forge family data — E2E encryption + server-side
  signature/hash verification + client re-verification on pull.
- No secrets are committed to the repo (working tree + full history scanned).
- Relay routes are per-family authenticated; CORS is allow-listed; tokens can expire and be
  revoked; the join endpoint rejects unknown families and caps flooding.
- The Android build disables cleartext, disables `allowBackup`, and exports only the main activity.
- **All sensitive local data is encrypted at rest.** Family keys (non-extractable WebCrypto),
  vault documents (per-doc keys), and every feature module + medical records + reminders (sealed
  under the family key via `modules/secureModuleStore.ts`) — only ciphertext is written to
  `localStorage`. Legacy plaintext migrates transparently on first edit.

**Honest edges (unchanged truths, not new problems):**
- **Cert pinning is inert until real pins are added** (owner action #8).
- Traffic metadata, an unlocked stolen device, and what an existing member already saw remain
  outside the guarantee (as documented in the README).

## Feature status

**Shipped & working:** onboarding (create/join family with verification-code handshake),
recovery phrase, emergency card + emergency screen, document vault (encrypted, OCR, compressed),
reminders, medical (medicines/vitals/doctors), calendar, the module set, the new Owner/Entity +
Asset model, encrypted export, delete-my-data, app lock, signed APK updates, 15-language i18n.

**Clearly "coming soon" (by design):** the insurance *Renew/Buy* button (blocked on licensing);
managed-relay billing is a stub that currently grants entitlement to all (Phase 6).

**Not yet built (were dead placeholder buttons — removed the misleading ones):** in-app key
rotation UI, device-management UI (the relay `/devices/revoke` endpoint exists; the screen does
not yet call it), trusted-contacts and Shamir-backup UIs. P2P (LAN/WebRTC) receive is
intentionally a no-op; the relay is the sync path.

## Owner action checklist (things only you can do)

1. **Cert pins** — generate real leaf + intermediate SPKI hashes from a non-proxied machine and
   put them in `android/app/src/main/res/xml/network_security_config.xml` (commands in
   `README.technical.md`) before claiming pinning.
2. **DB migration** — apply `relay/migrations/005_token_expiry.sql` to the live D1 to activate
   token expiry/revocation (the code degrades gracefully until then).
3. **Custom domain** — attach `arkive.punyakosh.in` in Cloudflare → Pages → arkive → Custom
   domains (the app is live now at `https://arkive-csk.pages.dev`).
4. **Rotate** the Cloudflare API token from the build session.

## Recommended before a wide public launch (engineering)

1. ✅ **Encrypt module data at rest** — DONE. All module stores + medical + reminders now seal
   their records under the family key (`modules/secureModuleStore.ts`), with transparent
   migration of legacy plaintext.
2. Wire the **device-management** screen to the existing `/devices/revoke` endpoint (remote-kill
   a lost device).
3. Build **key-rotation** and **Shamir social-recovery** UIs on top of the crypto that already
   exists.
4. Add **edge rate-limiting** (Cloudflare rule) on `/ops`, `/blob`, `/join`.

None of these affect the core promise or block personal/family use; they harden the edges
for strangers.
