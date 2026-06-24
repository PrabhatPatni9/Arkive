# ARKIVE — Master Build Brief

> Local-first, end-to-end encrypted family vault for emergencies and daily life.
> Family medical records, documents, and reminders that live on the family's own devices, sync encrypted, and work offline.

---

## 0. How to use this document (read first)

- This is the master spec and the source of truth. Build in the **phase order in §9**. Do not jump ahead.
- **§7 (Hard Constraints) are invariants.** Never break one for convenience, speed, or simplicity. If a constraint and a feature conflict, the constraint wins and you flag it.
- This is a **fresh build in a new repo.** The stack in §2 is locked. Do not substitute (no React Native, no Supabase, no cloud database holding plaintext).
- A Cloudflare account is provided **only for deploying the relay** (Workers + R2 + D1). **Never commit secrets, API tokens, private keys, or any family data to the repo.** All family keys are generated and held **client-side only**. The relay must never be able to decrypt anything.
- After each phase, write and pass the tests in §10 **before** moving to the next. Crypto and sync correctness gate everything downstream.
- When a decision is genuinely ambiguous and not covered here, prefer: less data held server-side, simpler crypto using vetted primitives, and the safety invariant (emergency data must be readable offline).
- Two real-world items are pending and are NOT your job: trademark + domain clearance for the name "Arkive", and the insurance-distribution legal path (handled with a CA/CS firm later). Build everything else; stub the insurance transaction only.

---

## 1. What Arkive is

A family installs Arkive, creates a family, and stores the things they would panic to find in an emergency: blood groups, allergies, conditions, medications, insurance policies, IDs, and key documents. Any family member can reach that information instantly, offline, when it matters. Extended (joint) families can organise into sub-family "nodes".

**The one principle that everything serves:** the operator (the company) never sees plaintext. Data lives on the family's devices, encrypted with keys only the family holds. The sync relay is a **blind post office**: it stores sealed envelopes it cannot open and introduces devices that cannot otherwise reach each other. It exists because phones sit behind NAT and are rarely online at the same instant, not because it needs the data.

**Why people use it:** in a medical emergency, nobody should be scrambling to find a policy number or a blood group. It is a discipline, not an install-and-forget app, and the reminder engine is what keeps the data fresh.

---

## 2. Stack (locked)

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript | strict mode |
| UI | React + Vite | |
| Mobile shell | **Capacitor** | Android APK first. iOS via Capacitor later. Same codebase also builds the PWA. **Not React Native.** |
| Local DB (native) | SQLite via `@capacitor-community/sqlite` | durable native storage on Android |
| Local DB (web/PWA) | wa-sqlite / IndexedDB fallback | see §6 iOS caveat |
| Crypto | **libsodium** (`libsodium-wrappers`) | NEVER hand-rolled. Primitives in §4. |
| Secret sharing | a vetted Shamir Secret Sharing lib | for threshold break-glass + recovery only |
| OCR | **Google ML Kit on-device** (Capacitor plugin) | bundled Latin model; no cloud, no per-call cost. Tesseract.js (WASM) fallback for PWA. |
| Relay backend | **Cloudflare Workers + R2 + D1** | optional Durable Objects (SQLite-backed, WS hibernation) deferred |
| Push | **FCM** (Android, content-free wake) + **Web Push + VAPID** (PWA/web/iOS) | |
| Billing | **Razorpay, web-only** | app reads entitlement; **no in-app purchases** |
| Web hosting | Cloudflare Pages | |
| CI | GitHub Actions | builds + signs the APK |

---

## 3. Architecture principles

1. **Local-first.** Every member device holds a local replica (full, or partial in lean mode). The app is fully usable on one device with zero network and zero payment.
2. **Relay = blind post office.** Holds only ciphertext + minimal metadata. Never holds keys. Never decrypts.
3. **Sync tiers, in build order:**
   - **Relay (primary, reliable):** encrypted blobs pass through Cloudflare. Always works. Managed (₹99/yr) or self-hosted.
   - **Internet P2P (best-effort):** opportunistic direct device-to-device when both online and NAT permits. Falls back to relay.
   - **LAN (best-effort):** same-network devices sync directly via mDNS, no relay. Subject to AP-isolation; never guaranteed.
4. **Offline emergency access is a safety invariant.** Emergency-critical fields MUST be present and decryptable on every device, offline, always. A medical app that cannot show a blood group because the network is down has failed.
5. **No login.** There is no username/password. There is **create a family** and **join a family**. Identity = membership + keys.

---

## 4. Crypto & key model (the heart of the system — get this right first)

**Primitives (libsodium, no substitutions):**
- Key wrapping / sealing: X25519 (`crypto_box` / sealed boxes).
- Signatures: Ed25519 (`crypto_sign`).
- Symmetric data encryption: XChaCha20-Poly1305 AEAD (`crypto_aead_xchacha20poly1305_ietf`). Large random nonces; never reuse a nonce.
- KDF for the recovery code: Argon2id (`crypto_pwhash`).
- Randomness: platform CSPRNG (`randombytes`).
- Keys at rest on device: Android Keystore / StrongBox. App-level lock + auto-lock timeout on top.

**Three key tiers (one per sharing scope):**
- **Family Key (joint family):** held **directly** on every member device. Encrypts family-shared data. Any single device decrypts family data offline, alone. (This is the safety invariant. Do NOT threshold-split this key for everyday access.)
- **Node Key (per sub-family node):** held directly on every device of that node's members. Encrypts node-level data. Other nodes never hold it, so they cannot read it.
- **Member Key (per person):** held on that person's devices. Encrypts that person's private records. 1:1 sharing is done by wrapping a single record's key to specific members.

**Person vs device:** identity is the **person**. A person may have several devices that share that person's member key. The threshold (below) counts **persons, not devices**.

**Envelope format (every encrypted blob and op):**
`[version_byte][algo_id][nonce][ciphertext][auth_tag]`
The version byte is mandatory from day one so the cipher can be migrated later if a primitive weakens.

**Operations & the sync log:**
- Every change is an **op**: `{ op_id, scope, key_epoch, prev_hash, lamport_clock, author_device_id, signature, encrypted_payload }`.
- The log is **append-only and hash-chained** (`prev_hash` references the previous op's hash) and each op is **signed (Ed25519)** by the authoring device.
- Records are reconstructed by replaying ops into CRDT/LWW maps. **Medical fields are an exception: surface conflicts for human reconciliation, never silently last-write-wins.** Losing a medication entry silently is the worst failure mode.
- Documents are immutable **content-addressed encrypted blobs** (id = content hash) referenced by ops. No conflict possible.
- Logical clocks (Lamport), **never device wall-clock**, order ops and back the replay counter.

**Threshold (break-glass + recovery only):**
- `M = clamp(ceil(0.3 * N), 2, 6)`, computed per scope on that scope's **person count**. Floor 2 (a single share never reconstructs); cap 6 (large joint families don't need an unwieldy quorum).
- Implemented via Shamir: the scope key (or a sealed record's key) is split into N shares, one per person, threshold M.
- Applies to: (a) **break-glass on sealed/private records** (M members cooperate to open), and (b) **device-loss recovery** of a scope key. It does NOT gate everyday access (that's direct possession, above).

**Recovery (three layers; medical app, so data loss must be prevented):**
1. **Recovery code (mandatory, the floor):** a BIP39-style code generated and shown at family creation, forced confirmation. For families with 3 or fewer devices, this is the ONLY backup; the UI must say so plainly. Single-handedly rebuilds the family key. The operator never holds it.
2. **Surviving device:** if any one device lives, it still holds the key and re-provisions a new device by invite. No code needed. (Common case.)
3. **Threshold social recovery:** for larger families, M persons reconstruct.
4. Optional: user-held encrypted backup to their **own** Google Drive / iCloud. Operator never holds it.

**Join handshake (a leaked invite link must NEVER by itself grant a key):**
1. New device generates a keypair and requests to join (via QR scan, app link, or WhatsApp deep link).
2. The admin sees the request **on their device** and approves it.
3. A short verification code derived from both keys is shown on **both** screens and must match (defeats handshake MITM).
4. Only then is the family/node key wrapped to the new device's public key. In-person QR scan is the strongest path.

**Key rotation = forward-only:** removing a member rotates that scope's key to a new epoch; new data uses the new epoch. **Never mass re-encrypt existing blobs** (performance disaster on a 20-person family, and pointless: the removed member already had the old key). Devices keep every epoch key they are entitled to, so they can still read old data.

**Admin transfer:** a member can request admin; only the **current admin** grants it, through the same matching-verification-code handshake as joining. Self-grant impossible. The system enforces **at least one admin at all times**. A **designated backup admin** is set at family creation so the death/disappearance of an admin never locks the family out. (Full threshold-based admin succession is V2.)

**Audit trail:** break-glass events and member-removal events are written to an **in-family audit log every member can see**. The owner of a sealed record is notified when it is opened. This deters insider abuse and makes break-glass visible.

---

## 5. Data model (carry the concrete fields from the prior product)

**Entities:**
- **Family** — the shared vault.
- **Node** — a sub-family within a joint family (households-within-family). Optional; nuclear families have node creation disabled.
- **Member / Profile** — a person. May be **digital** (joined with a device + keys) or **dependent** (managed by a steward/admin, no device, e.g. elderly or young children).
- **Device** — a phone holding a local replica. The admin can rename any device to a human label.
- **Roles:** `central_admin` → `node_admin` (household) → `member` → `view_only`. Plus an `is_financial_admin` flag (gates the insurance/policy module).

**Sharing scope on every record:** `private` (member key) | `node` (node key) | `family` (family key) | `custom` (wrapped to specific members). Maps directly onto the three key tiers + 1:1 wrapping. **Sealed** records are the `private` tier with break-glass via threshold.

**Member profile fields:** name, DOB, phone, email, blood group, allergies, chronic conditions, photo. (Birthdays auto-populate the calendar from DOB.)

**Document types (extensible, locale-aware; Indian set as default):** Aadhaar, PAN, Passport, Insurance, RC, PUC, Driving Licence, Medical, Blood Report, Prescription, Discharge Summary, Bill, Other. Each document carries an optional **expiry date** that feeds reminders.

**Reminder types:** document expiry, medical appointment, insurance renewal, PUC, birthday, anniversary, bill, custom. Recurrence: daily / weekly / monthly / yearly / custom interval; end never / on-date / after-N. Advance-notice days. Completion tracking (who marked done). **All date math is timezone-aware** (the family spans countries).

**Dependent → digital handover (claim flow):** when a dependent gains a device, they may keep, start fresh, or go private with their data. Because shared data already lives in the family vault, "migration" is just the device joining and syncing down; only `private`/member-key data needs an explicit handover of the member key to the new device.

---

## 6. Modules

**Build the platform first, then modules are uniform CRUD on top of it.** Define one **module pattern** (a record type + scope + list/detail/edit views + reminder hooks + sync registration) so every module is generated consistently and new ones are cheap.

**V1 core (the emotional core + the safety case):**
- **Onboarding:** create family / join family; family type selector (nuclear vs joint → enables nodes); QR + app link + WhatsApp deep link; managed-profile creation; dependent claim flow; recovery-code setup; backup-admin designation.
- **Family management:** members, profiles, nodes, roles, device naming, invites + approval handshake.
- **Document vault:** upload, the type enum above, scope/visibility, sealed docs, expiry tracking, **on-device OCR (ML Kit) with structured-field extraction the user confirms**, **compression at capture** (target ~200–500 KB, document-legible).
- **Medical & health:** medicines per member, medical parameters/vitals over time, blood reports, visit records, doctors directory. Integrated with the vault.
- **Reminders:** the engine above. Drives engagement and re-opens the app on a schedule.
- **Calendar:** event types (birthday, anniversary, appointment, trip, milestone, custom); auto birthdays from DOB.
- **Emergency access:** family-tier in-app access (any member sees critical fields offline) **plus** an **opt-in Emergency Card** per person holding only user-marked critical fields (blood group, allergies, conditions, current meds, contacts, policy numbers), printable / QR, for paramedics or non-member relatives. Consented plaintext on paper by the user's own choice. Default off. No separate emergency PIN. Audit-logged.
- **Settings:** per-family **feature flags**; **lean vs full sync toggle** (lean = critical fields local + bulky docs on-demand; must force critical fields to stay local regardless); **delete-my-data** and **export-my-data**.

**Feature-flagged modules (add after core is stable, via the module pattern):**
- Insurance **policy registry** (per member; gated by `is_financial_admin`) + expiry reminders + a **"Renew — coming soon from the app"** dummy button. The dummy button logs an anonymous `renew_clicked` event (family-id tagged, no policy data) to the relay on managed accounts only, to measure intent before the real flow exists. **No real insurance transaction in V1** (pending licensing).
- Vehicles, Expense tracking (petrol, milk, electricity, gas, water, other), Milk calculator, Contacts directory (doctor, plumber, etc.), Home device/appliance registry, Identity-documents per-member view.

**Delete-my-data (build it as three distinct operations, not one):**
- Delete one record → delete op propagates, blob purged from R2.
- Member leaves/removed → their `private` records deleted + scope key rotated (cuts future access). Family-shared data they touched **stays** (it belongs to the family). No mass resync.
- Admin deletes whole family → full purge of all blobs (R2) + metadata (D1); devices optionally wipe local copies. This is the DPDP/GDPR erasure right.
- Guardrail: an individual can delete their own private data and leave, but **cannot unilaterally wipe shared family data** others depend on. Only the admin deletes the whole family.

**iOS / PWA:** the same web app installs on iPhone as a PWA (no App Store, web push via VAPID works on installed iOS PWAs). **Caveat to honor:** iOS web storage can be evicted under storage pressure, so for iOS PWA users the **relay is the durable copy** (vault re-syncs on next open if cleared) and you must NOT promise them the same offline guarantee as Android. Native iOS via Capacitor (durable SQLite, Secure Enclave, native push, ML Kit) is the fast-follow once traction justifies the App Store lift.

---

## 7. Hard constraints (invariants — never violate)

1. Operator never holds plaintext or usable keys. Keys are generated and stored client-side only.
2. Emergency-critical fields are always local and offline-decryptable on every device, in any sync mode.
3. Medical fields surface conflicts for human reconciliation; never silent last-write-wins.
4. Compress images at capture (~200–500 KB). Never store the raw camera shot.
5. Batch the op log; never one R2 object or one D1 row per trivial edit.
6. Blobs in R2; ops + metadata in D1; never large blobs in D1 or a Durable Object.
7. Version byte in every envelope; versioned op format from day one (mixed-version families must keep syncing).
8. TLS + **certificate pinning** to the relay.
9. AEAD (XChaCha20-Poly1305) with unique per-op nonces; ops signed (Ed25519); append-only hash-chained log.
10. Hardware keystore for keys; app-lock + auto-lock.
11. Per-family scoped auth on the relay (family X cannot read or enumerate family Y).
12. **Signed + verified APK auto-updates:** the in-app updater verifies a new APK's signature against a pinned key over HTTPS-with-pinning before installing. Never install an unsigned/unverified binary. (Required because sideloaded APKs have no store auto-update; without this you cannot ship V2 to sideloaders.)
13. Vetted crypto libraries only (libsodium); never hand-rolled, never an obscure package.
14. Threshold counts persons, not devices.
15. Recovery code mandatory at family creation, with an explicit small-family warning.
16. Delete-my-data (3 operations) + export-my-data both ship in V1.
17. No in-app purchases; billing is web-only; the app only reads entitlement. Never put a sync pay-button inside the app (store anti-steering).
18. i18n: 15 LTR languages from day one (list in §8); lazy-loaded locale files; **human-review flag on emergency-critical and legal strings** (machine-translated "allergy" must not be wrong). No RTL in V1 (no Arabic/Urdu). TTS deferred.
19. Timezone-aware date math; logical clocks for op ordering.
20. Minimal dependencies, locked versions, reproducible build if feasible.

---

## 8. Relay spec (Cloudflare)

**Components:** a Worker (the dumb API), R2 (encrypted blobs), D1 (op log + metadata + cursors), optional Durable Object per family (real-time fan-out, SQLite-backed, WebSocket hibernation) — **deferred**; V1 uses poll-on-open + FCM/Web-Push wake.

**Worker endpoints (all over TLS + cert pinning, per-device token scoped to one family_id):**
- `POST /ops` — push batched ops (append to family log in D1; store any referenced new blobs in R2).
- `GET /ops?since=<cursor>` — pull ops since cursor.
- `PUT /blob/<hash>` / `GET /blob/<hash>` — encrypted blob put/get (R2).
- `POST /join/*` — relay the encrypted join handshake (request, approval, key-wrap envelope). Relay forwards opaque blobs only.
- `POST /family` / `DELETE /family` — create / full-purge.
- `GET /entitlement` — read managed subscription status (set by the web billing flow).
- `POST /event` — anonymous metadata events (e.g. `renew_clicked`), family-id tagged, no content.

**R2:** blobs keyed by `family_id` + content hash. Encrypted client-side. (Compression + dedup keep storage small.)

**D1 (metadata only — NO plaintext PII ever):** families, nodes, members (ids + roles + key-epoch refs only), devices (id + human label + pubkey), op rows (encrypted payload + scope + epoch + hashes + cursor), entitlement/billing status, audit events, anonymous intent events.

**Metadata the relay holds (must be listed verbatim in the README + privacy policy):** family email, billing cycle, sync timing/volume, device list (named), renew-clicks. **Nothing readable.**

**Operational:** per-family rate limits (block a token flooding the relay; Cloudflare edge absorbs DDoS); a **retention sweep** for abandoned families (R2 has no auto-delete, so orphaned blobs are a cost + privacy liability); a **per-family free-tier storage cap** (so the free relay isn't abused as an encrypted dead-drop).

**Self-host:** the same Worker is deployable to any Cloudflare account via a "Deploy to Cloudflare" button + `.env.example`. The app can point a