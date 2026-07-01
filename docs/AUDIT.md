# Arkive — Security Audit (Build Brief v2 §0)

> Status of each security concern **verified against the real code in this repo**, not against
> the pasted external report. Date: 2026-06-30. Audited branch: `main` (see §A for why this,
> not `claude/family-os-analysis-ooovol`, is canonical).

## A. Reality corrections to the v2 brief's premises

| Brief assumption | Reality in this repo |
|---|---|
| "Latest build is on the working branch and **not merged to main**, so the live deploy looks stale." | **Inverted.** `main` is *ahead* of `claude/family-os-analysis-ooovol` (7 vs 5). The working branch's commits are content-duplicates of `main`'s with different hashes; `main` additionally has the Phase 5/6 merge and the code-quality pass. Pages **and** the relay both deploy from `main`. |
| The stale deploy is a branch/merge problem. | The webapp **is live and current** at **https://arkive-csk.pages.dev** (HTTP 200). The reason `arkive.punyakosh.in` won't open is that **it has no DNS record at all** (NXDOMAIN) — the custom domain was never attached to the Pages project. The relay subdomain `relay-arkive.punyakosh.in` *is* attached and returns 200. |
| Paths like `packages/crypto/src/*`. | Repo is flat `src/`; crypto lives at `src/crypto/*`. All findings below use real paths. |
| Committed secrets may need a history rewrite. | History + working-tree scan found **no committed secrets** — only placeholders and the public update key. **No `filter-repo`/BFG needed.** Still required: rotate the build-session Cloudflare token, and move infra IDs out of the committed `PROGRESS.md` (done in this pass). |

## B. Findings (each verified, with real path + real severity)

### Critical / High — do first (Phase A)

| # | Concern | Real? | Path (verified) | Severity | Notes |
|---|---------|-------|-----------------|----------|-------|
| 1 | Key material persisted in `localStorage` | **YES** | `src/family/familyStore.ts:108` (`saveFamily` → `localStorage.setItem(STORAGE_KEY, JSON.stringify(state))`); `FamilyState` includes `deviceEncSecKey`, `deviceSigSecKey` (base64) and the family `ScopeKey` bytes | **Critical** | Any injected script reads it; violates the hardware-keystore constraint. Also `clearFamily:112` / `leaveFamily` do a bare `removeItem` with no overwrite. Migrate: native → Android Keystore (Capacitor `SecureStorage`); web/PWA → IndexedDB + non-extractable WebCrypto keys where the primitive allows. |
| 2 | CORS reflects any Origin | **YES** | `relay/src/index.ts:55-72` (`corsHeaders`/`addCors` echo `request.headers.get('Origin')`) | **High** | Replace with an explicit allowlist: the Pages origin(s), the Capacitor app origin, `localhost` for dev. |
| 3 | Server trusts client-supplied hashes | **YES** | `relay/src/routes/ops.ts:39-52` stores `op.hash` (used as R2 key + D1 index) without recomputing; `relay/src/routes/blobs.ts:9-30` validates hash *format* but never recomputes SHA-256 of the body | **High (defense-in-depth)** | Recompute BLAKE2b over the canonical signed fields for ops, SHA-256 for blobs; reject on mismatch. The client puller already re-verifies on pull, so this hardens against a malicious *client* poisoning the shared log. |
| 4 | Device tokens never expire / can't be revoked; no rate limiting | **YES** | `relay/src/auth.ts` + `relay/src/db/d1.ts:22` (`createDeviceToken` stores `token, device_id, family_id, created_at` — no `expires_at`, no revoke). No rate limiting on any route. | **High** | Needed for the "remote-revoke a stolen device" flow. Add max lifetime (~90d), rotation-on-use, a revoke endpoint, and Cloudflare rate limiting (or a DO/in-memory counter) on `/ops`, `/blob`, `/join`, and verification attempts. |
| 5 | Join endpoint unauthenticated, no lockout | **YES** | `relay/src/routes/join.ts:31` (`postJoinRequest` takes unauth POST; no `family_id` existence check, no rate limit, no bad-code lockout) | **High** | Enables enumeration + DoS. Pair with #4's rate limiting; add a lockout on repeated bad verification codes. |
| 6 | No payload size ceiling on encrypt/decrypt | **YES** | `src/crypto/envelope.ts` (`sealEnvelope`/`openEnvelope` — no max length) | **Medium** | `blobs.ts:24` already caps blobs at 10 MB, but ops/envelopes are unbounded. Enforce a ceiling before encrypt/decrypt. |
| 7 | Recipient not bound into wrapped key | **Partially** | `src/crypto/keys.ts:58` (`unwrapKey` checks `keyId/scope/epoch` but not the recipient public key) | **Medium** | `crypto_box_seal` already guarantees only the holder of the recipient secret key can open it, so a "misroute" can only be opened by the true recipient — the real win is binding the wrap to a specific recipient identity to catch an admin wrapping to the wrong pubkey. Add recipient pubkey to the sealed metadata + constant-time check. |
| 8 | Exports are cleartext | **YES** | `src/screens/DataPrivacyScreen.tsx:23-32` (`exportFamilyData()` → plaintext `application/json` Blob download) | **Medium** | Encrypt exports under the family key or a user passphrase; show a prominent warning. |

### Lower severity — do, but don't over-prioritize (later in Phase A)

| # | Concern | Real? | Path | Severity | Notes |
|---|---------|-------|------|----------|-------|
| 9 | `===` on `prev_hash` | **YES** | `src/crypto/ops.ts:89` (`verifyChainLink`: `op.prev_hash === prevOpHash`) | **Low** | `prev_hash` is not secret; timing leak is negligible. Switch to `sodium.memcmp` for hygiene only. |
| 10 | 6-digit numeric verification code | **YES** | `src/family/*` (join handshake derives a 6-digit code) | **Low–Med** | The **lockout + rate-limit from #5/#4 is what actually stops brute force.** Code-length bump to 8-char base32 is secondary. |
| 11 | Canonical-JSON fragility; generic errors; Argon2 params; dep pinning | **YES** | hand-rolled `canonical()` in `src/crypto/ops.ts:22` and `relay/src/crypto.ts:24` | **Low–Med** | Consider a vetted `canonicalize`/CBOR for signed payloads; log error detail server-side only; store Argon2id params alongside ciphertext; exact-pin crypto deps; audit `shamirs-secret-sharing@2.0.1`. |

### Credential & infra hygiene

- **No committed secrets** (verified). Rotate the build-session Cloudflare API token regardless.
- **Infra IDs** (`account_id`, D1 UUID, the "Live Infrastructure" block) were in committed
  `PROGRESS.md` — **scrubbed in this pass** and the `account_id` removed from committed
  `relay/wrangler.toml` (CI passes `CLOUDFLARE_ACCOUNT_ID` separately). Add a gitleaks /
  git-secrets pre-commit hook (recommended, not yet wired).
- **Cert pinning:** `android/app/src/main/res/xml/network_security_config.xml` still holds
  **placeholder pins with a past `expiration`**, so pinning is currently inert (TLS enforced via
  system CAs, not pinned). Owner must generate real leaf + intermediate SPKI hashes from a
  non-proxied machine before any release that claims pinning. Web/PWA pinning is limited by the
  browser and should be described honestly (no app-layer pin).

## C. Sequencing decision

Per brief §7, no new features until Phase A passes tests. This audit is the §0 gate; Phase A
(security remediation) follows, **keys-out-of-`localStorage` first**, then CORS allowlist,
server-side hash recomputation, token expiry/revocation/rate-limit, join hardening, payload
limits, recipient binding, encrypted export. Phases B–D (Owner/Entity model, granular medical
records, managed-identity isolation, three-tier crypto enforcement, on-device Emergency Medical
Summary PDF) follow A.

## D. Phase A status — COMPLETE ✅

| # | Item | Status | Where |
|---|------|--------|-------|
| 1 | Keys out of localStorage | ✅ Done | `src/family/secureStore.ts` (AES-GCM + non-extractable WebCrypto key in IndexedDB), `familyStore.ts` cache + `hydrateFamilyStore()`, boot migration + overwrite-on-wipe |
| 2 | CORS allowlist | ✅ Done | `relay/src/index.ts` — explicit allowlist, no origin reflection |
| 3 | Server-side hash recompute | ✅ Done | ops: BLAKE2b (`blakejs`); blobs: SHA-256; reject on mismatch |
| 4 | Token expiry + revocation | ✅ Done (needs migration 005 applied) | `d1.ts` (90-day TTL, `revoked`), `POST /devices/revoke`, `relay/migrations/005_token_expiry.sql` |
| 5 | Join hardening | ✅ Done | `join.ts` — unknown-family reject + pending-request cap |
| 6 | Payload cap | ✅ Done | `envelope.ts` 10 MB ceiling |
| 7 | Recipient binding | ✅ Done | `keys.ts` wrap records + unwrap verifies recipient (constant-time) |
| 8 | Encrypted export | ✅ Done | `recovery.ts` `sealWithPassphrase`; `DataPrivacyScreen` passphrase prompt |
| 9 | memcmp on prev_hash | ✅ Done | `ops.ts` `verifyChainLink` |

**Open owner actions (cannot be done from the sandbox):**
- Apply `relay/migrations/005_token_expiry.sql` to the live D1 to activate token
  expiry/revocation (code degrades gracefully until then — no breakage).
- Replace the placeholder cert pins before any pinning-claimed release.
- Attach `arkive.punyakosh.in` as a Pages custom domain (or use the pages.dev URL).
- Rotate the build-session Cloudflare API token.

Rate limiting (item 4, the throughput-limit part): the join queue is now capped and unknown
families rejected; production per-IP/per-route rate limiting should be added as a Cloudflare
edge rule (dashboard) — noted as ops config, not code.

Next: **Phase B** — Owner/Entity model, granular typed medical records, managed-identity
isolation, three-tier crypto enforcement.
