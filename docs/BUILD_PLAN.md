# Arkive — Build Plan for Pending Work

> A task-by-task plan written for a **less capable coding agent** to complete the remaining work
> without needing to re-derive the architecture. Every task lists: the goal, the files to touch,
> the exact pattern to copy, acceptance criteria, and the verification commands. Do the tasks in
> order within a phase. Do **not** start a task until the previous one's acceptance criteria pass.
>
> Companion docs: `PRODUCTION_READINESS.md` (what's done vs pending) and `EMERGENCY_MODULES.md`
> (new modules to build later). Source of truth for intent: `ARKIVE_BUILD_BRIEF.md`.

---

## 0. How this repo works (read once before touching code)

**Stack:** TypeScript (strict) · React 19 + Vite · Capacitor (Android) · libsodium · Cloudflare
Workers/D1/R2 relay. **Never** substitute the stack.

**Golden rules (never break):**
1. The 20 Hard Constraints in `ARKIVE_BUILD_BRIEF.md §7` are invariants.
2. Never commit secrets. Never put plaintext family data on the relay.
3. Vetted crypto only (libsodium). Never hand-roll crypto.
4. **Additive UI:** never remove or restyle an existing screen when adding a feature. The route
   count must only grow. Match the existing screen's look (see any file in `src/screens/`).
5. Every change must pass: `npm run build` (this runs `tsc -b && vite build`), `npm run lint`,
   and `npm test`. The relay must pass `cd relay && npx tsc --noEmit`.

**Verify after every task:**
```bash
npm run build && npm run lint && npm test        # app
cd relay && npx tsc --noEmit && cd ..            # relay (if you touched relay/)
```

**How to add a feature module (the established pattern):**
- Data: `src/modules/<name>/types.ts` (interfaces + `XInput = Omit<X,'id'|'createdAt'|'updatedAt'>`)
  and `src/modules/<name>/store.ts`. The store MUST use the encrypted backing:
  ```ts
  import { loadArray, saveArray } from '../secureModuleStore'
  const KEY = 'arkive_<name>_v1'
  function loadAll(): X[] { return loadArray<X>(KEY) }
  function saveAll(x: X[]): void { saveArray(KEY, x) }
  // then getX(familyId) filters by familyId, addX/updateX/deleteX mutate.
  ```
- Screen: `src/screens/<Name>Screen.tsx`. Copy the structure of `src/screens/ContactsScreen.tsx`
  or `EntitiesScreen.tsx` (header with title/subtitle + Plus button, card list, empty state,
  bottom-sheet add modal).
- Register: add the id to `ModuleId` and `MODULE_REGISTRY` in `src/modules/types.ts`
  (`defaultEnabled: false`), add the label to `public/locales/en/translation.json` under
  `modules`, add a `<Route>` in `src/App.tsx`, and a card in `MODULE_CARDS` in `HomeScreen.tsx`.
- Test: `src/modules/<name>/<name>.test.ts` — stub `localStorage` (copy from `owners.test.ts`),
  test CRUD + family scoping.

**How to add an owner-linked record:** import `Owner` from `src/modules/owners/types.ts` and store
`owner: Owner` (`{kind:'person',memberId}` | `{kind:'entity',entityId}`). Seed `sharingTier` from
the owner (`defaultTierForEntityType` for entities, `'self'` for a person). See
`src/modules/assets/store.ts` and `src/screens/AssetsScreen.tsx` for the reference implementation.

---

## Phase A — Owner actions (NOT for the agent; the human owner must do these)

These cannot be done from a sandbox. List them in your PR description; do not attempt.
- A1. Replace placeholder cert pins in `android/app/src/main/res/xml/network_security_config.xml`.
- A2. Apply `relay/migrations/005_token_expiry.sql` to the live D1.
- A3. Attach the custom domain in Cloudflare Pages.
- A4. Rotate the build-session Cloudflare API token.
- A5. Add a Cloudflare edge rate-limit rule on `/ops`, `/blob`, `/join`.

---

## Phase B — Finish the security/recovery UIs (wire crypto that already exists)

### Task B1 — Device management screen (remote-revoke a lost device)
- **Goal:** a screen listing the family's devices with a "Revoke" action, calling the existing
  relay endpoint `POST /devices/revoke` (already implemented in `relay/src/routes/devices.ts`).
- **Files:** new `src/screens/DeviceManagementScreen.tsx`; add `revokeDevice(relayUrl, token,
  deviceId)` to `src/sync/relayClient.ts` (copy the shape of `deleteFamily` there — POST JSON
  `{ device_id }`, Bearer token, expect 204); add route `/settings/devices` in `App.tsx`; add a
  functional row back into the SettingsScreen Security section that navigates there.
- **Data source:** `family.members` (each member has `deviceId`); show device label + a Revoke button.
- **Acceptance:** revoking calls the endpoint; the current device is not revocable from itself
  (guard with a confirm); build/lint/test green.

### Task B2 — View recovery phrase (re-display, gated by app lock/PIN)
- **Goal:** let a user re-view their recovery phrase (they only saw it at creation). Currently
  the Settings "view recovery" idea is unbuilt.
- **Files:** new `src/screens/ViewRecoveryScreen.tsx`; route `/settings/recovery`; a Settings row.
- **Detail:** the recovery phrase is NOT stored (only a recovery *package* derived from it). So you
  CANNOT re-derive the words. Instead, this screen must explain that plainly and offer to
  **re-run the recovery test** (ask the user to type their phrase; verify it opens
  `family.recoveryPackage` via `openRecoveryPackage`). If it opens, confirm "your phrase is
  correct"; if not, warn. Do not fabricate or display a phrase that isn't stored.
- **Acceptance:** correct phrase → success; wrong phrase → failure; nothing sensitive persisted.

### Task B3 — Key rotation UI (member removal → forward-only new epoch)
- **Goal:** when an admin removes a member, rotate the affected scope key to a new epoch (crypto
  exists in `src/crypto/keys.ts` `rotateKey`; brief §6 "forward-only, never mass re-encrypt").
- **Files:** extend `FamilyScreen` member row with an admin-only "Remove & rotate" action; add
  `rotateFamilyKey()` / `rotateNodeKey(nodeId)` to `src/family/familyStore.ts` that bumps the
  stored epoch and re-wraps the new key to remaining members' device keys.
- **Acceptance:** removed member's device can no longer unwrap the new epoch; existing data (old
  epoch) still readable by remaining members; tests for the rotation round-trip.
- **Caution:** this touches core crypto. Add tests first (`src/family/family.test.ts`) and keep
  every epoch key the device is entitled to.

### Task B4 — Shamir social-recovery UI
- **Goal:** UI on top of the existing `src/crypto/threshold.ts` (`computeThreshold`, `splitKey`,
  `reconstructKey`). Let an admin split the family key into N shares for M trusted persons, and a
  flow to reconstruct from a threshold of shares.
- **Files:** new `src/screens/SocialRecoveryScreen.tsx`; route under `/settings`; store share
  metadata (NOT the shares) locally; shares are exported to trustees out-of-band.
- **Acceptance:** split → reconstruct round-trip works with exactly the threshold; fewer shares fail.

---

## Phase C — Granular medical records (brief v2 §4) — do additively

> Do NOT rip out the existing `/medical` screen (medicines/vitals/doctors). Add the typed-record
> model alongside it, then progressively surface the new types. This unlocks the Emergency PDF.

### Task C1 — Typed medical record data model
- **Files:** `src/medical/records/types.ts` — a discriminated union `MedicalRecord` with a `type`
  field over: `allergy | condition | medication | prescription | lab_report | imaging |
  clinical_note | procedure | medical_visit | vaccination | family_history`. Each variant has its
  own fields per brief §4. Add `defaultTierForRecordType()` (allergy & vaccination → `family`;
  most others → `self`; give critical conditions the option of `family`).
- **Store:** `src/medical/records/store.ts` using `loadArray`/`saveArray` (encrypted), keyed
  `arkive_medical_records_v1`, family-scoped, with `getRecords(familyId, type?)`.
- **Constraint:** OCR text is stored **separately** from the source image, both encrypted, text
  indexed locally only, never transmitted (brief §8).
- **Acceptance:** CRUD + tier defaults tested; every record has a `type`; no generic blob.

### Task C2 — Record entry screens (one per type, or one typed form)
- **Files:** new screens or one `AddMedicalRecordScreen` with a type picker that renders the right
  fields. Link from the existing `MedicalScreen` (add a "＋ Record" entry). Prescriptions can
  auto-populate a Medication with user confirmation; keep cross-reference IDs.
- **Acceptance:** each type can be created and listed; links (prescription→medication,
  procedure→imaging/lab) survive; broken links flagged for review.

### Task C3 — Emergency Medical Summary PDF (the payoff, brief §4/§C)
- **Goal:** generate a one-page clinician-readable PDF **entirely on-device, no network**, from the
  structured records: identity + blood group + allergies + current medications + active
  conditions + recent procedures/hospitalizations + the hereditary-risk summary from
  family_history.
- **Files:** `src/medical/emergencySummary.ts` (assemble the data) + a generator. Use a
  dependency-light PDF approach (e.g. render an HTML template to the print dialog via the existing
  print path used by `EmergencyCardScreen`, or add a small vetted PDF lib — prefer the print path
  to avoid a heavy dependency). Add a "Emergency Summary" button on `EmergencyScreen`.
- **Constraint:** no network call during generation. Exportable/printable/shareable.
- **Acceptance:** produces a readable one-pager offline; wired to the break-glass moment and
  on-demand from the Emergency screen.

---

## Phase D — Managed identity & three-tier crypto enforcement (brief §2, §3)

### Task D1 — Per-identity keys + managedBy audit
- **Goal:** each person (including dependents) is a distinct crypto identity; ops authored on a
  dependent's behalf carry `managedBy: <managerIdentityId>` in metadata, immutable, visible in the
  family audit log. Managing a dependent uses an **explicit context switch** ("Acting as: <name>").
- **Honest limit (must be reflected in code comments + UI):** to manage a dependent offline the
  manager's device necessarily holds the dependent's key, so manager↔managed separation is a
  **UX + audit boundary, not an unbreakable cryptographic wall**. Do NOT claim otherwise. On claim
  (dependent gets their own device), rotate the key forward.
- **Acceptance:** context switch is explicit and audited; other family members (not the manager)
  cannot read a dependent's private data; claim rotates keys.

### Task D2 — Enforce tiers at encrypt/decrypt (not just UI filtering)
- **Goal:** self/node/family/custom tiers decided by which scope key encrypts a record, not by UI
  hiding. Search/filter/list must never leak node/family data into the wrong context.
- **Files:** thread the tier → scope key selection through the module/vault write paths; non-members
  see only opaque ciphertext + metadata.
- **Acceptance:** a node member cannot decrypt another node's records; a packet-inspection test
  confirms zero plaintext for IMEI/document numbers/medication names/contact details on the relay.

---

## Phase E — Polish & completeness

- **E1. i18n coverage:** the newer module labels and screens use English strings / only `en` keys.
  Add the new `modules.*` and `insurance.*` keys to the other 14 locale files (fall back to `en`
  is acceptable short-term). Keep the human-review flag on emergency/medical strings.
- **E2. Cross-reference integrity sweep:** a utility that flags broken links (prescription→
  medication, asset→policy, procedure→imaging) for manual review.
- **E3. Replace `window.prompt/alert`** in the export flow (`DataPrivacyScreen`) with a proper
  in-app modal (match the bottom-sheet pattern) for a cleaner UX.
- **E4. Fold vehicles/home-devices into the Asset model** (optional): migrate their data into
  `assets` with `assetType` vehicle/appliance, then retire the old screens **only** if the owner
  agrees (this removes pages, so it needs explicit sign-off — otherwise keep them).

---

## Definition of done (per task)
1. `npm run build` passes (tsc + vite).
2. `npm run lint` clean.
3. `npm test` green, with new tests for new logic.
4. Relay `npx tsc --noEmit` clean if `relay/` changed.
5. No existing route removed; new pages match the existing UX.
6. Commit with a clear message; push to `main`; keep `claude/family-os-analysis-ooovol` in sync.
