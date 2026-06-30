# Arkive — Technical README

> A local-first, end-to-end encrypted family vault. Blood groups, allergies, medicines, IDs, policies — always offline, always private.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)

This is the **developer-facing** README. For a plain-language explanation of how the
app works for families, read [`README.nontechnical.md`](README.nontechnical.md).

---

## Download the app

**Latest signed Android APK:**
👉 **https://github.com/prabhatpatni9/arkive/releases/latest/download/arkive.apk**

- Published automatically by CI on every push to `main` (see [APK build pipeline](#apk-build-pipeline)).
- Sideload only — not on the Play Store. Allow "install unknown apps" on first install.
- Each build is also listed on the [Releases page](https://github.com/prabhatpatni9/arkive/releases)
  with its SHA-256 for verification.
- Once installed, the app verifies all future updates against an Ed25519-signed manifest
  (`/version` on the relay) before installing — a tampered or unsigned update is refused.

**Web app (PWA, installs on iOS/desktop):** https://arkive.punyakosh.in

---

## Architecture at a glance

```
┌────────────────────────┐         ┌────────────────────────┐
│  Device A (Android)    │         │  Device B (Android)    │
│  ┌──────────────────┐  │         │  ┌──────────────────┐  │
│  │ React + Vite UI  │  │         │  │ React + Vite UI  │  │
│  ├──────────────────┤  │         │  ├──────────────────┤  │
│  │ Crypto core      │  │         │  │ Crypto core      │  │
│  │ (libsodium)      │  │         │  │ (libsodium)      │  │
│  ├──────────────────┤  │  E2E    │  ├──────────────────┤  │
│  │ Local SQLite     │  │ cipher  │  │ Local SQLite     │  │
│  │ (durable replica)│  │ text    │  │ (durable replica)│  │
│  └──────────────────┘  │         │  └──────────────────┘  │
└───────────┬────────────┘         └────────────┬───────────┘
            │     LAN (mDNS + WebRTC, best effort)            │
            ├─────────────────────────────────────────────────┤
            │                                                  │
            ▼                                                  ▼
       ┌─────────────────────────────────────────────────────────┐
       │  Cloudflare relay — "blind post office"                  │
       │  Workers (router) · D1 (op index, metadata) · R2 (blobs) │
       │  Stores only ciphertext + routing metadata. Cannot       │
       │  decrypt, cannot forge (client verifies every op).       │
       └─────────────────────────────────────────────────────────┘
```

**The one principle everything serves:** the operator never sees plaintext. Data lives on
the family's devices, encrypted with keys only the family holds. The relay stores sealed
envelopes it cannot open and introduces devices that cannot otherwise reach each other.

---

## Stack (locked — see `ARKIVE_BUILD_BRIEF.md` §2)

| Layer | Choice | Notes |
|-------|--------|-------|
| Language | TypeScript (strict) | No `any` in shipped paths |
| UI | React 19 + Vite | PWA + Capacitor shell |
| Native shell | Capacitor | Android first; iOS via PWA, native iOS is fast-follow |
| Local DB | SQLite (`@capacitor-community/sqlite`) | Durable native storage on Android |
| Crypto | `libsodium-wrappers-sumo` | Vetted primitives only — never hand-rolled |
| Secret sharing | `shamirs-secret-sharing` | Threshold break-glass + recovery only |
| Relay | Cloudflare Workers + R2 + D1 | The only server-side component |
| Payments | Razorpay (web billing) | Managed-relay subscription only |

Substitutions are not allowed: no React Native, no Supabase, no plaintext on the server.

---

## Repository layout

```
src/
  crypto/        Envelope format, op signing/verification, hash chain, sodium init
  family/        Family/member/node model, key tiers, join handshake, recovery phrase
  reminders/     Recurrence engine (document expiry, birthdays, PUC, bills…)
  modules/       Feature-module registry + enable/disable flags
  sync/          Pull/push engine, relay client, LAN discovery, WebRTC transport, resolver
  push/          Web Push (PWA) + FCM (native) subscription
  updater/       Signed-APK update check + download + verify
  screens/       React screens (vault, emergency card, reminders, family, modules…)
  ocr/           On-device OCR field extraction (ML Kit)
  payments/      Razorpay web billing integration
relay/
  src/
    index.ts     Worker router + CORS
    auth.ts      Per-device token auth + admin-token auth
    crypto.ts    Ed25519 verification (Web Crypto), canonical JSON
    push.ts      VAPID Web Push wake signals
    db/d1.ts     All D1 queries
    routes/      ops, devices, join, entitlement, blobs, signal, family, events, version, release
android/         Capacitor Android project (network_security_config, manifest)
scripts/         sign-manifest.mjs (CI manifest signer)
.github/workflows/  build-apk.yml, deploy-pages.yml
```

---

## Cryptography

| Primitive | Use |
|-----------|-----|
| XChaCha20-Poly1305 | Symmetric data encryption (AEAD) |
| X25519 | Key wrapping between devices (sealed boxes) |
| Ed25519 | Op signing; APK update-manifest signing |
| Argon2id | Recovery-code KDF |
| BLAKE2b-256 | Op hash chain |
| Shamir SSS | Threshold break-glass + social recovery |

Randomness is always the platform CSPRNG (`randombytes`). Library: **libsodium-wrappers-sumo**.

**Envelope format:** every encrypted blob is `[version_byte][algo_id][nonce][ciphertext][auth_tag]`.
The version byte lets mixed-version families keep syncing across a cipher migration.

### Key tiers (held by direct possession — see brief §6)

- **Family key** — on every member device. Encrypts family-shared data. Any single device
  decrypts family data offline, alone. **This is the offline-emergency safety invariant — never
  threshold-split it for everyday access.**
- **Node key** — per sub-family node; on the devices of that node's members only.
- **Member key** — per person; on that person's devices. 1:1 sharing wraps a single record's
  key to specific members.

Identity is the **person**, not the device; a person may have several devices sharing their
member key. The recovery threshold counts **persons, not devices**.

**Key rotation is forward-only:** removing a member rotates that scope to a new epoch; new
data uses the new epoch. Old blobs are never mass re-encrypted (pointless — the removed member
already held the old key; and a performance disaster at scale). Devices keep every epoch key
they are entitled to.

---

## The relay (Cloudflare Worker)

The relay is the only server. It is untrusted by design.

### Endpoints

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/health` | GET | none | Liveness probe |
| `/devices` | POST | none¹ | Register a device into a family; returns a per-device bearer token |
| `/ops` | POST | device token | Append a signed, encrypted op (signature verified server-side) |
| `/ops?since=N` | GET | device token | Pull ops for the family since Lamport clock N |
| `/blob/:hash` | PUT/GET | device token | Store/fetch an encrypted blob (≤10 MB), family-scoped |
| `/join/requests` | POST/GET | none / token | Post a join request / list pending (admin) |
| `/join/approvals` | POST | device token | Admin posts an approval for a request |
| `/join/approvals/:id` | GET | none² | Requester polls for their approval |
| `/signal`, `/signal/presence`, `/signal/:id` | POST/GET/DELETE | device token | WebRTC signaling + presence, family-scoped, 5-min TTL |
| `/family` | DELETE | device token | Purge all relay-side data for the caller's family |
| `/event` | POST | device token | Record a content-free intent event (e.g. `renew_clicked`) |
| `/version` | GET | none | Fetch the signed update manifest |
| `/version` | PUT | **admin token** | CI publishes a new signed update manifest |
| `/release/:sha256` | GET | none | Public download of a signed APK by content hash |

¹ Device registration is intentionally open: `family_id` is a 128-bit random secret
capability (`randombytes_buf(16)`), unguessable, shared only through the in-person join
handshake. Knowing it is equivalent to being invited. Confidentiality is guaranteed by E2E
encryption regardless; **integrity** is guaranteed by client-side verification (below), not
by gating registration.

² Join approvals are opaque ciphertext keyed by a 128-bit `request_id`; the requester needs
the id to fetch, and the payload is encrypted to the requester's key.

### Trust boundary

- The relay stores **only ciphertext + routing metadata**. It cannot decrypt or forge.
- Every op carries an Ed25519 signature over its canonical JSON. `POST /ops` verifies the
  signature against the registered device key before storing; the **client re-verifies every
  pulled op** (`src/crypto/ops.ts` → `verifyOp` + `verifyChainLink`) and drops anything that
  fails. So a member who registers a device cannot inject ops that other devices will accept.
- Auth lives in one place: `relay/src/auth.ts` exposes `requireAuth` (per-device token →
  family scope) and `requireAdminAuth` (static `RELAY_ADMIN_TOKEN`, CI-only, for `PUT /version`).

### Metadata the relay holds (and nothing more)

Family ID · device IDs + Ed25519 public keys · device labels (display only) · op hashes +
Lamport clocks + scope · push endpoint · entitlement tier/expiry · aggregate sync volume ·
content-free intent-event counts. **Never**: names, health records, document content, keys,
or anything decryptable.

---

## Sync model

1. **Local-first.** Every device holds a full local replica. The app is fully usable on one
   device with zero network and zero payment.
2. **Pull/push engine** (`src/sync/engine.ts`) runs on an interval and on network changes;
   pulls ops since the last Lamport cursor, verifies + applies, then pushes pending ops.
3. **Transports, in preference order:** LAN (mDNS discovery + WebRTC, best-effort) → managed
   relay (durable). The relay is the durable copy; P2P is an opportunistic accelerator.
   - **Security note:** the P2P receive path does **not** apply ops for v1. Relay-side
     verification does not transfer to a LAN peer, so applying a P2P op would require the same
     `verifyOp` + `verifyChainLink` checks the puller runs. This is enforced as an invariant
     in `handleP2PPacket` (see `src/sync/engine.ts`).
4. **Conflict resolution** is last-writer-wins by Lamport clock with a deterministic tiebreak
   (`src/sync/resolver.ts`); the hash chain detects rollback/split-view (best-effort residual).

---

## APK build pipeline

`.github/workflows/build-apk.yml`, on push to `main`:

1. **Lint & test gate** — `tsc -b --noEmit`, ESLint, vitest. Build does not proceed if these fail.
2. **Build web assets** with the `VITE_*` secrets baked in.
3. **`cap sync android`** → `gradlew assembleRelease`.
4. **Sign** with the upload keystore (`r0adkll/sign-android-release`).
5. **Verify** the signature with `jarsigner -verify`.
6. **Upload to R2** at `_release/<sha256>` (served publicly at `/release/<sha256>`).
7. **Sign + publish the update manifest** — `scripts/sign-manifest.mjs` builds the canonical
   manifest (`version`, `buildNumber`, `apkUrl`, `sha256`, `signedAt`), signs it with the
   Ed25519 release seed, and `PUT`s it to `/version` with `RELAY_ADMIN_TOKEN`.
8. **Publish a GitHub Release** with the APK attached as `arkive.apk`, so
   `releases/latest/download/arkive.apk` is always the newest signed build.

`APP_VERSION` is read from `package.json` (not `github.ref_name`) so the manifest carries a
real semver, not a branch name. Bump `package.json` `version` as part of a release commit.

The in-app updater (`src/updater/index.ts`) checks `/version`, verifies the Ed25519 manifest
signature against `VITE_UPDATE_PUBKEY`, downloads the APK, checks SHA-256 **and** re-verifies
the signature, and only then hands the buffer to the installer. Any mismatch throws — it never
installs an unverified binary.

---

## Building locally

```bash
npm install

npm run dev          # browser / PWA mode
npx tsc -b --noEmit  # type check (app)
npm run lint         # ESLint
npm test             # vitest

npm run build        # production web build
npx cap sync android # sync web build into the Android project
npx cap open android # open in Android Studio
```

Relay:

```bash
cd relay
npm install
npx wrangler dev      # local Worker
npx wrangler deploy   # deploy to Cloudflare
```

### App environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_RELAY_URL` | Yes (for sync) | e.g. `https://relay-arkive.punyakosh.in` |
| `VITE_UPDATE_PUBKEY` | Yes (APK updates) | Ed25519 public key (base64) for manifest verification |
| `VITE_VAPID_PUBLIC_KEY` | Yes (Web Push) | VAPID public key for push wake signals |
| `VITE_RAZORPAY_KEY` | Optional | Razorpay key ID (public-safe) for managed-relay billing |

Copy `.env.example` to `.env` and fill in. **Never commit `.env` or any secret.**

### Relay secrets (set with `wrangler secret put`, never committed)

| Secret | Purpose |
|--------|---------|
| `VAPID_PRIVATE_KEY` | Signs Web Push wake JWTs (RFC 8292) |
| `RELAY_ADMIN_TOKEN` | Gates `PUT /version` (CI only) |

`wrangler.toml` carries only non-secret config and the **public** VAPID key.

---

## Self-hosting the relay

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/prabhatpatni9/arkive/tree/main/relay)

Requirements: a Cloudflare account (free tier suffices for one family), R2 enabled (10 GB
free), D1 enabled, Workers free plan (~100 k req/day). Generate VAPID keys with
`npx web-push generate-vapid-keys`, set `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, and point the
app at your relay via `VITE_RELAY_URL`.

---

## Certificate pinning (release gate)

The Android build pins the relay's TLS certificate via Network Security Config
(`android/app/src/main/res/xml/network_security_config.xml`). Cleartext traffic is disabled
app-wide; `allowBackup` is off; the only exported component is `MainActivity`.

> **Owner action required before claiming cert pinning.** The committed pin hashes are
> placeholders and the `pin-set` `expiration` is intentionally in the past, which means
> **pinning is currently inert** (TLS still enforced via system CAs, but not pinned). Generate
> the real leaf + intermediate SPKI hashes from a machine **not** behind an HTTPS-intercepting
> proxy, drop them into the `<pin-set>`, and set a future `expiration`. The exact `openssl`
> commands are in the file's header comment. Do not generate pins from inside a proxied CI/dev
> sandbox — you would pin the proxy, not Cloudflare, and brick real clients.

---

## Security reporting

There is **no public security contact published yet** (no domain, no security email). If you
find an issue, open a private GitHub Security Advisory on this repository. Please do not file
public issues for vulnerabilities.

---

## License

[AGPL-3.0](LICENSE). This is an open-source project; the name and branding are **not** trademarked
and no trademark is claimed. Forks are welcome under the AGPL terms.

---

## Contributing

- Follow the phase order in `ARKIVE_BUILD_BRIEF.md`; do not jump ahead.
- Never commit secrets, tokens, private keys, or family data.
- Changes to crypto primitives require a passing test suite.
- The insurance renew button stays a "coming soon" dummy until licensing is sorted.
