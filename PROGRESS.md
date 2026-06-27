# Arkive Build Progress

## Current Phase: 2 (Family Lifecycle) — In Progress

---

## Phase 0 — Scaffold (COMPLETE)
- TypeScript strict, Vite + React 18 + Capacitor 6
- GitHub Actions: `lint-and-test` (all branches), `build-apk` (main only)
- ESLint, Vitest, signed-APK skeleton, no secrets in repo
- `android/` directory committed; CI reaches Gradle step

## Phase 1 — Crypto Core (COMPLETE)
- libsodium-wrappers-sumo singleton with ESM fix (postinstall copy)
- Versioned AEAD envelope `[version:1][algo:1][nonce:24][ct+tag]`
- Three-tier ScopeKey (family / node / member), X25519 wrap/unwrap, Ed25519 sign/verify
- Append-only Op struct with hash chain (BLAKE2b-256)
- Shamir SSS: `computeThreshold(N) = clamp(ceil(0.3N), 2, 6)`, split/reconstruct
- Argon2id recovery packages (sumo-only), 6-digit join verification code
- MemoryOpLog + SQLiteOpLog; 71/71 tests pass

## Phase 2 — Family Lifecycle (IN PROGRESS)
### Done this session:
- **Payment model corrected:** removed OCR gating, financial-dashboard tier, member caps, monthly
  pricing. New model: free local/LAN/OCR; managed relay ₹99/yr (free year 1); self-host free.
  `plans.ts`, `subscription.ts`, `checkout.ts`, `payments.test.ts`, `SubscriptionScreen.tsx` all updated.
- **Create family flow:** `CreateFamilyScreen` → `RecoveryPhraseScreen` (forced 12-word confirmation).
  Recovery package created via Argon2id. Hard Constraint #15 (mandatory recovery) enforced.
- **Join family flow (requester):** `JoinFamilyScreen` — generates device keypair, shows join request
  JSON, pastes approval, derives 6-digit verification code, calls `completeJoin()` to unwrap family key.
- **Admin approval flow:** `ApproveJoinScreen` — parses join request, shows matching 6-digit code,
  calls `approveJoinRequest()`, shows approval JSON to share back.
- **Join handshake crypto:** `familyStore.ts` wires `deriveVerificationCode`, `wrapKeyTo`,
  `unwrapKey` from Phase 1. Both sides derive the same code; mismatched key fails `unwrapKey`.
- **Onboarding gate:** `App.tsx` redirects to `/onboarding` when no family, to `/home` after creation.
  `initSodium()` called on app mount before rendering.
- **Family screen:** now shows real members from `familyStore`, links to approve-join flow.
- **SQLite schema migration 2:** reminders table added.
- **Emergency access (§6):**
  - `EmergencyScreen` — shows all members' critical fields (blood group, allergies, conditions,
    meds, contacts) offline-readable.
  - `EmergencyCardScreen` — opt-in per person (default off), saves health fields, generates
    printable card + QR (via `qrcode` package, imported dynamically). Audit note in UI.
  - Hard Constraint #2 (always offline-decryptable) enforced.
- **Reminders engine (§5):**
  - `src/reminders/types.ts` — full type model: 8 reminder types, recurrence, timezone-aware.
  - `src/reminders/engine.ts` — `computeNextDue`, `isOverdue`, `isDueSoon`, `shouldNotify`,
    `markDone` (advances due date on recurrence), `createDocumentExpiryReminder`,
    `createBirthdayReminder`. All date math local-midnight, timezone-aware label.
  - `RemindersScreen` — list by overdue/upcoming, inline add form, mark-done.
  - Home screen shows overdue/upcoming counts with links.
- **New tests:** `family.test.ts` (wordlist, createFamily, join handshake round-trip, wrong-key
  rejection) and `reminders.test.ts` (CRUD, recurrence, overdue, due-soon, builders).

### Also done (follow-up session):
- **Backup admin designation:** Warning banner in FamilyScreen; inline member picker;
  `setBackupAdmin()` in familyStore (admin-only, excludes dependents).
- **Dependent profile creation (steward flow):** `AddDependentScreen` — name, DOB, health
  fields at creation. `createDependentMember()` in familyStore; admin-only guard.
- **Device naming/renaming:** Pencil icon on FamilyScreen device card; inline edit; `renameDevice()`.
- **Delete/export data (HC #16):** `DataPrivacyScreen` — export JSON (members + reminders,
  no keys), leave family (clears local state), delete vault (admin, type family name to confirm).
  Accessible from Settings > Data & Privacy.
- **Bug fixes backported from main:**
  - `sodium.ts` imports from `libsodium-wrappers-sumo` (Argon2id support restored)
  - `ops.ts` signedFields/hashOp strip both signature and hash (fixes verifyOp)
  - Threshold test corrected (n=6 vs n=20)

### Still needed in Phase 2:
- Wire family state to SQLite op log (currently localStorage) for durable sync
- i18n scaffold (15 languages — Hard Constraint #18; large task, defer to Phase 6)

## Phase 3 — Relay + Sync (CORE COMPLETE)
- Cloudflare Worker deployed at `https://relay-arkive.punyakosh.in` (LIVE)
- D1 database `arkive-relay`, R2 bucket `arkive-ops` provisioned

### Done this session:
- **Per-family auth (HC #11):** `device_tokens` D1 table; `POST /devices` generates+returns 64-hex bearer token; `requireAuth` middleware on all `POST/GET /ops`; `Authorization: Bearer` on all relay calls from client
- **Join handshake relay endpoints:** `POST /join/requests` (no auth — requester posts); `GET /join/requests` (admin auth — list pending); `POST /join/approvals` (admin auth — post approval); `GET /join/approvals/:id` (no auth — requester polls)
- **Join relay UX:** `JoinFamilyScreen` — enter Family ID to post request via relay and poll for approval instead of copy-paste; falls back to in-person JSON flow. `ApproveJoinScreen` — fetches pending list from relay, one-click approve auto-posts via relay; toggle to paste flow.
- **Entitlement endpoint:** `GET /entitlement` (auth) returns tier stub (Phase 6 wires Razorpay)
- **SyncEngine wired:** `App.tsx` starts engine (30s interval) when family + `relayDeviceToken` + `VITE_RELAY_URL` are available
- **Auto-register:** `RecoveryPhraseScreen` and `JoinFamilyScreen` call `registerWithRelay()` after family creation/join; token saved to `FamilyState.relayDeviceToken`
- **relayClient.ts:** `registerWithRelay`, `lookupEntitlement`, `postJoinRequest`, `pollJoinApproval`, `getPendingJoinRequests`, `postJoinApproval`
- **Schema migration 3:** `device_tokens` + `join_handshakes` tables (run: `wrangler d1 execute arkive-relay --file=relay/schema.sql`)

### Still needed in Phase 3:
- LAN sync (mDNS — Phase 5)
- P2P sync (Phase 5)

## Phase 4 — Core Modules (PARTIAL)
- Document vault UI skeleton (`VaultScreen`, `DocumentCaptureScreen`)
- OCR service (`ocrService.ts`, ML Kit stub + Tesseract fallback)
- Per-doc crypto (`documentCrypto.ts`), encrypted blob store (`documentStore.ts`)
- **NOT YET:** full document CRUD with ops; compression at capture; sealed documents;
  medical/health module; calendar

## Phases 5–7 — NOT STARTED
- Phase 5: Internet P2P, LAN mDNS sync
- Phase 6: i18n (15 languages), web-billing entitlement read
- Phase 7: Insurance registry, vehicles, expenses, milk, contacts — all feature-flagged

---

## Live Infrastructure

| Resource | Value |
|----------|-------|
| Relay Worker | **LIVE** `https://relay-arkive.punyakosh.in` |
| Web app | **LIVE** `https://arkive-csk.pages.dev` / `arkive.punyakosh.in` |
| D1 database | `arkive-relay` — `d050374e-99db-4d1d-9ff4-ce593233f5c4` (APAC) |
| R2 bucket | `arkive-ops` |
| Cloudflare account | `df08a4524c6b150c79348335a7211040` |

## Test status (as of this session)
- Phase 1 crypto: 71/71 ✅
- Phase 2 payments: 8/8 ✅
- Phase 2 family: 13/13 ✅
- Phase 2 reminders: 12/12 ✅
- Total: 104/104 ✅

## Owner Checklist

### GitHub Secrets (ONE-TIME MANUAL)
Go to: `https://github.com/prabhatpatni9/arkive/settings/secrets/actions`

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Rotate after use — get from Cloudflare dashboard |
| `CLOUDFLARE_ACCOUNT_ID` | `df08a4524c6b150c79348335a7211040` |
| `VITE_RELAY_URL` | `https://relay-arkive.punyakosh.in` |
| `VITE_UPDATE_PUBKEY` | Ed25519 public key — shared out-of-band |
| `VITE_RAZORPAY_KEY` | Razorpay live key (`rzp_live_...`) |
| `KEY_ALIAS` | `arkive-release` |
| `KEY_STORE_PASSWORD` | Shared out-of-band during setup |
| `KEY_PASSWORD` | Shared out-of-band during setup |
| `SIGNING_KEY_BASE64` | Base64 keystore — shared out-of-band |

### Pending (owner, not Claude)
- Name/trademark/domain clearance for "Arkive"
- Insurance transaction stays dummy button until licensing sorted
- Razorpay account + live key
- Rotate Cloudflare API token after wiring CI
- Revoke the GitHub PAT shared in the previous session

## Open Questions
- Should the initial Phase 2 localStorage store be migrated to SQLite immediately, or wait for
  Phase 3 when sync is wired? (Recommendation: migrate in next session alongside relay wire-up)
- Backup admin: should it be set at family creation (required) or deferred to settings?
  (Brief says "set at family creation" — add to CreateFamilyScreen next session)
