# Arkive Build Progress

## Current Phase: 7 (Feature-Flagged Modules) — COMPLETE; Phase 8 is next

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

## Phase 4 — Core Modules (COMPLETE)

### Done this session:
- **Relay blob endpoints:** `relay/src/routes/blobs.ts` — `PUT /blob/:hash` (auth, 10 MB limit,
  family-scoped R2 key); `GET /blob/:hash` (auth, family-scoped). Wired into `relay/src/index.ts`.
  CORS updated to include `PUT`. Deployed — smoke-tested live.
- **Vault types (`src/vault/types.ts`):** Full `DocumentType` enum (13 types: Aadhaar, PAN,
  Passport, Insurance, RC, PUC, Driving Licence, Medical Report, Blood Report, Prescription,
  Discharge Summary, Bill, Other) + `DocumentRecord` interface.
- **Vault store (`src/vault/vaultStore.ts`):** localStorage metadata (`arkive_vault_v1`) +
  per-doc encrypted blob (`arkive_blob_<docId>`). Per-doc random key wrapped to family enc
  pubkey via sealed box. CRUD: `saveDocument`, `deleteDocument`, `decryptDocumentBytes`,
  `getDocumentsByType`, `isExpired`, `isExpiringSoon`.
- **Compression (`src/vault/compression.ts`):** Canvas API, multi-pass JPEG quality (0.85/0.70/
  0.55/0.40), targets ≤300 KB (HC #4). PDF and other types pass through as-is.
- **DocumentCaptureScreen:** Full 3-step flow — type picker (13 types) → take photo/upload
  (compresses, OCRs) → confirm title/expiry/member → save encrypted.
- **VaultScreen:** Type filter chips (scrollable), document cards showing title/type/member/
  expiry status (expired/expiring-soon indicators). Empty state with Add CTA.
- **VaultDocumentScreen:** Inline image preview, PDF iframe preview, metadata grid, OCR text,
  delete with confirmation. Decrypt on mount using device enc keypair.
- **Medical types (`src/medical/types.ts`):** `VitalType` (6), `MedicineFrequency` (5),
  `Medicine`, `Vital`, `Doctor` interfaces with labels/units.
- **Medical store (`src/medical/medicalStore.ts`):** Full CRUD for medicines, vitals, doctors
  in separate localStorage keys. `getLatestVitals` per-type.
- **MedicalScreen:** Member picker chips + tabbed view (Medicines / Vitals / Doctors). Delete
  inline on each card.
- **AddMedicineScreen:** All fields (name, dosage, frequency, timing, ongoing toggle, start/end
  date, notes). Member picker.
- **AddVitalScreen:** Type picker, value (BP as "120/80", others numeric), notes. Member picker.
- **AddDoctorScreen:** Name, speciality, phone (tel: link), address, notes. Member picker.
- **Calendar store (`src/calendar/calendarStore.ts`):** `CalendarEvent` interface + localStorage
  store. `syncBirthdayEvents` — idempotent birthday event generation from member DOBs (yearly
  recurring). `addEvent`, `deleteEvent`, `getEventsForMonth`, `getEventsForDate`.
- **CalendarScreen:** Full monthly calendar grid (7-col, correct first-weekday offset), event
  dots, date event list. Inline add-event form. Birthday events auto-populated.
- **Nav updated:** Added Medical (Heart icon) as 5th nav item.
- **HomeScreen updated:** Medical + Calendar quick access cards added.
- **App.tsx:** Routes for `/vault/doc/:docId`, `/medical`, `/medical/add-{medicine,vital,doctor}`,
  `/calendar`.
- **Tests:** `vault.test.ts` (10 tests), `medical.test.ts` (14 tests); total 128/128 ✅

## Phase 5 — Best-Effort Transports (COMPLETE)

### Relay additions (DEPLOYED to relay-arkive.punyakosh.in):
- **`relay/schema.sql` migration 3:** `signals` table with indexes on `(recipient_id, family_id, expires_at)` and `(family_id, type, expires_at)`. 5-minute TTL; opportunistic purge on write.
- **`relay/src/routes/signal.ts`:** `POST /signal` (create), `GET /signal` (poll by device), `GET /signal/presence` (all presence for family), `DELETE /signal/:id` (ack). All auth-required.
- **`relay/src/db/d1.ts`:** `insertSignal`, `getSignalsForDevice`, `deleteSignal`, `getPresences`, `purgeExpiredSignals`. `SIGNAL_TTL_SECONDS = 300`.
- **`relay/src/index.ts`:** Signal routes wired; `DELETE` added to CORS.
- **`relay/src/types.ts`:** `SignalRow` + `PostSignalBody` interfaces.

### Client additions:
- **`src/sync/network.ts`:** `@capacitor/network` wrapper — `getConnectionType()`, `isOnWifi()`, `onNetworkChange(cb)`.
- **`src/sync/signalClient.ts`:** `postSignal`, `pollSignals`, `ackSignal`, `postPresence`, `getOnlineDevices`. Typed `SignalMessage` + `PresenceEntry`.
- **`src/sync/webrtcTransport.ts`:** `WebRTCTransport` class with inner `PeerConnection`. STUN: `stun.l.google.com:19302`. `start` (poll every 2s), `stop`, `connect(peerId)` (wait up to 8s), `send`, `connectedPeers`. ICE candidates buffered 500ms. Handles offer/answer/ice signals; skips presence. Works for both Internet P2P and LAN (ICE auto-picks local path).
- **`src/sync/prefetch.ts`:** `recordViewed`, `getRecentlyViewed` (capped at 20), `markPrefetched`, `isPrefetched`, `prefetchOnWifi` (WiFi-only, sorted by recency, 100ms pause between fetches).
- **`src/plugins/nsd.ts`:** `NsdPlugin` interface + PWA no-op stubs via `registerPlugin`. `NsdService {name, host, port}`.
- **`src/sync/lanDiscovery.ts`:** `LanDiscovery` — tries native NSD first, falls back to relay-presence. `LanPeer {deviceId, host?, port?, via: 'nsd'|'relay'}`.
- **`src/sync/engine.ts`:** Rewrote with `enableP2P?` in `SyncConfig`. `initP2P()` creates WebRTCTransport + LanDiscovery. `enqueuePush()` delivers immediately to connected WebRTC peers. Relay push always runs for durability. `maybePrefetch()` on every sync cycle. `maybePostPresence()` on WiFi change.
- **`android/.../NsdPlugin.java`:** Full Android NsdManager plugin: registers `_arkive._tcp.` service named `arkive-<deviceId>`, fires `serviceFound`/`serviceLost` events. Methods: `register`, `startDiscovery`, `stop`.
- **`android/.../MainActivity.java`:** `registerPlugin(NsdPlugin.class)` in `onCreate`.
- **`android/.../AndroidManifest.xml`:** INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, CHANGE_NETWORK_STATE permissions.
- **`src/sync/transport.test.ts`:** 21 new tests covering: `recordViewed`/`getRecentlyViewed`, `markPrefetched`/`isPrefetched`, `prefetchOnWifi` (mocked fetch), signal message shape validation, `signalClient` functions (mocked fetch), network detection.

## Phase 6 — i18n + Billing Read (COMPLETE)

### Done:
- **i18next + react-i18next + i18next-http-backend** installed; lazy-loads locale JSON from `/locales/{{lng}}/translation.json` at runtime.
- **`src/i18n/config.ts`:** `SUPPORTED_LANGUAGES` (15 LTR locales), `getStoredLocale`/`saveLocale` (localStorage), `needsReview(locale)`, `REVIEW_REQUIRED_LOCALES`, `REVIEW_REQUIRED_KEYS` (HC #18 human-review flag on emergency medical strings).
- **Locale files created for all 15 languages** under `public/locales/`:
  - `en` (English — base, no review needed)
  - `hi` (Hindi), `mr` (Marathi), `kn` (Kannada), `bn` (Bengali), `ta` (Tamil), `te` (Telugu), `gu` (Gujarati) — review required for emergency keys
  - `es` (Spanish), `fr` (French), `de` (German), `pt` (Portuguese) — no review needed
  - `zh` (Chinese Simplified), `ja` (Japanese) — review required
  - `id` (Bahasa Indonesia) — no review needed
  - Each file has `_meta.review_required` listing emergency keys needing human check.
- **`main.tsx`:** `import './i18n/config'` before render; wrapped in `<Suspense>` for lazy locale load.
- **`SettingsScreen.tsx`:** Language picker with full 15-locale list; `AlertTriangle` icon on languages needing review; disclaimer text; instant language switch via `i18n.changeLanguage`.
- **`src/payments/entitlement.ts`:** `refreshEntitlementFromRelay(relayUrl, token)` — calls relay `GET /entitlement`, maps `tier` → `SyncTierId`, calls `saveEntitlement()`; best-effort (silent on failure).
- **`App.tsx`:** Calls `refreshEntitlementFromRelay` in background after `initSodium()` when family + relay token present.
- **`src/i18n/i18n.test.ts`:** 19 tests covering: language count, locale list, `getStoredLocale`, `saveLocale`, `needsReview`, `REVIEW_REQUIRED_KEYS`, entitlement mapping (managed_relay, unknown tier → local_lan, network failure → null).
- **Tests: 168/168 passing** ✅

## Phase 7 — Feature-Flagged Modules (COMPLETE)

### Done:
- **`src/modules/types.ts`:** `ModuleId` union + `ModuleMeta` interface + `MODULE_REGISTRY` (7 modules: insurance, vehicles, expenses, milk, contacts, home_devices, identity). `identity` on by default, rest off.
- **`src/modules/store.ts`:** `isModuleEnabled`, `setModuleEnabled`, `getAllModuleStates` — backed by `localStorage` key `arkive_modules_v1`. Dead-code bug fixed.
- **Insurance module:** `types.ts` (InsurancePolicy, PolicyType, PremiumCycle) + `store.ts` (CRUD + `isPolicyExpiringSoon`). `InsuranceScreen.tsx` — list + add modal; dummy renew button fires `logEvent('renew_clicked')` fire-and-forget on managed relay accounts then shows coming-soon alert (HC compliance); auto-creates insurance_renewal reminder 30d before expiry; gated to `isFinancialAdmin` for writes.
- **Vehicles module:** `types.ts` (Vehicle, FuelType) + `store.ts` (CRUD + `isVehicleDocExpiringSoon`). `VehiclesScreen.tsx` — PUC/insurance expiry warnings.
- **Expenses module:** `types.ts` (Expense, ExpenseCategory) + `store.ts` (CRUD + `sumByCategory`). `ExpensesScreen.tsx` — monthly view with prev/next nav, category breakdown totals.
- **Milk module:** `types.ts` (MilkEntry) + `store.ts` (CRUD + upsert-by-date + `monthlyMilkTotal`). `MilkScreen.tsx` — monthly view, summary card (litres + cost).
- **Contacts module:** `types.ts` (Contact, ContactCategory) + `store.ts` (CRUD). `ContactsScreen.tsx` — category filter chips, tel: links.
- **Home Devices module:** `types.ts` (HomeDevice, DeviceCategory) + `store.ts` (CRUD + `isWarrantyExpiringSoon`). `HomeDevicesScreen.tsx` — warranty/purchase date cards with expiry warnings.
- **Identity module:** `IdentityScreen.tsx` — read-only, filters vault docs by type (aadhaar, pan, passport, driving_licence), links to `/vault/doc/:docId`. No separate store needed.
- **`src/family/familyStore.ts`:** Added `isFinancialAdmin?: boolean` to `FamilyMember`.
- **`src/sync/relayClient.ts`:** Added `logEvent()` fire-and-forget event reporter.
- **`src/App.tsx`:** 7 new module routes wired.
- **`src/screens/HomeScreen.tsx`:** `MODULE_CARDS` array; renders enabled modules in "Modules" section below core cards.
- **`src/screens/SettingsScreen.tsx`:** Module toggle section with `ToggleLeft`/`ToggleRight` per module.
- **i18n:** All new keys added to `public/locales/en/translation.json`; all 14 other locales updated via Node script (hi, mr, kn, bn, ta, te, gu, es, fr, de, pt, zh, ja, id).
- **`src/modules/modules.test.ts`:** 34 tests covering feature-flag store, insurance CRUD + `isPolicyExpiringSoon`, vehicles + `isVehicleDocExpiringSoon`, expenses `sumByCategory`, milk upsert + `monthlyMilkTotal`, contacts CRUD, home devices CRUD + `isWarrantyExpiringSoon`.
- **Tests: 34/34 passing** (202/202 total runnable) ✅

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
- Phase 4 vault: 10/10 ✅
- Phase 4 medical: 14/14 ✅
- Phase 5 transport: 21/21 ✅
- Phase 6 i18n + billing: 19/19 ✅
- Phase 7 modules: 34/34 ✅
- Total: 202/202 runnable ✅

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
