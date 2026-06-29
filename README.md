# Arkive

> A local-first, end-to-end encrypted family vault. Blood groups, allergies, medicines, IDs, policies — always offline, always private.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)

---

## What it is

Arkive is a family vault for the things you would panic to find in a medical emergency. Any family member can reach critical health information instantly, offline, on their own device. The sync relay is a **blind post office** — it stores sealed envelopes it cannot open, and nothing else.

---

## Privacy posture

**The operator never sees your data.**

Every record is encrypted on your device with keys only your family holds before it leaves the device. The sync relay stores only ciphertext. This is not a policy promise — it is enforced by the cryptographic design.

### Exact metadata the relay holds

The relay holds only the following (no content, no plaintext PII):

| Metadata | Why |
|----------|-----|
| Family ID (random UUID) | Routes ops to the right family |
| Device IDs + Ed25519 public keys | Verifies op signatures |
| Device human labels | Display only, set by the admin |
| Op hashes + Lamport clocks + scope | Indexes the op log for sync |
| Push subscription endpoint | Sends content-free wake signals |
| Entitlement status (tier, expiry) | Set by Razorpay web billing |
| Sync volume + timing (aggregate) | Rate limiting |
| `renew_clicked` event count (no policy data) | Intent measurement |

The relay **never** holds: family member names, health records, document content, encryption keys, or any decryptable data.

---

## Sync tiers

| Tier | Cost | How |
|------|------|-----|
| **Local only** | Free | Single device; no sync |
| **LAN** | Free | mDNS on the same network; best-effort |
| **Internet P2P** | Free | WebRTC; best-effort, relay fallback |
| **Managed relay** | ₹99/yr (free year 1) | Encrypted blobs via Cloudflare; reliable |
| **Self-hosted relay** | Free | Deploy to your own Cloudflare account |

All features — OCR, medical records, reminders, modules — are free. You pay only for the managed relay if you want encrypted off-device backup without running your own server.

---

## Cryptography

| Primitive | Use |
|-----------|-----|
| XChaCha20-Poly1305 | Symmetric data encryption (AEAD) |
| X25519 | Key wrapping between devices (sealed boxes) |
| Ed25519 | Op signing; APK update manifest signing |
| Argon2id | Recovery code KDF |
| BLAKE2b-256 | Op hash chain |
| Shamir SSS | Threshold break-glass + social recovery |

Library: **libsodium-wrappers-sumo**. No hand-rolled crypto, ever.

Every encrypted blob uses the envelope format `[version_byte][algo_id][nonce][ciphertext][auth_tag]`. The version byte ensures mixed-version families keep syncing after a cipher migration.

---

## Threat model

| Threat | Mitigation |
|--------|------------|
| Network eavesdropper / MITM | TLS + cert pinning (Android) + E2E ciphertext |
| Compromised relay | Only ciphertext + metadata; relay cannot decrypt or forge |
| Stolen device (locked) | Android Keystore; app lock + auto-lock timeout |
| Insider (family member) | Member-scoped keys; break-glass requires threshold quorum + audit log |
| Fake APK | Ed25519-signed manifests; SHA-256 integrity check; sideload guidance |
| Relay rollback / split-view | Hash-chained log + cross-device verification (best-effort residual) |

### Residual risks (honest disclosure)

- **Traffic metadata:** the relay can see that a family syncs and roughly how often and how much. It cannot see content.
- **Unlocked stolen device:** an unlocked phone exposes local decrypted data. Remote revoke + key rotation cuts future sync but cannot retroactively erase data the thief already pulled.
- **Existing member access:** any current member can read family-scoped records by design. Privacy between members comes from the member-scoped key tier and node isolation.
- **Rollback / split-view:** the hash chain and cross-device checks mitigate but do not eliminate a malicious relay selectively serving stale ops.
- **PWA storage eviction (iOS):** iOS web storage can be evicted under pressure; for PWA users the relay is the durable copy. Native Android has SQLite durability.

**The headline claim that is true and defensible:** content is end-to-end encrypted and the relay is mathematically blind, so neither a network attacker nor the operator's server can read or forge family data.

---

## Self-hosting

Deploy the relay to your own Cloudflare account:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/prabhatpatni9/arkive/tree/main/relay)

**Requirements:**
- A Cloudflare account (free tier is sufficient for a single family)
- R2 enabled (10 GB free — a family of documents will not exceed this; no charge expected)
- D1 enabled (free tier: ~150 M reads / ~3 M writes / 5 GB monthly)
- Workers free plan covers ~100 k req/day; paid plan ($5/mo) only needed past ~650 active families

**After deploying,** point the app at your relay URL via `VITE_RELAY_URL` in your build config.

Generate VAPID keys for Web Push:

```bash
npx web-push generate-vapid-keys
```

Set the result as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in your Worker secrets, and `VITE_VAPID_PUBLIC_KEY` in your app build.

---

## Building

```bash
# Install dependencies
npm install

# Run in browser (PWA mode)
npm run dev

# Type check
npx tsc --noEmit

# Run tests
npm test

# Build for production
npm run build

# Sync to Android and open in Android Studio
npx cap sync android
npx cap open android
```

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_RELAY_URL` | Yes (for sync) | `https://your-relay.workers.dev` |
| `VITE_UPDATE_PUBKEY` | Yes (APK updates) | Ed25519 public key (base64) for update manifest verification |
| `VITE_VAPID_PUBLIC_KEY` | Yes (Web Push) | VAPID public key for push wake signals |

---

## APK certificate pinning

The Android build pins the relay's TLS certificate via Android Network Security Config (`android/app/src/main/res/xml/network_security_config.xml`).

**Owner action required before release:** replace the placeholder pin hashes in that file with real values. Run this from a machine **not** behind a corporate HTTPS proxy:

```bash
# Leaf cert SPKI hash
openssl s_client -connect relay-arkive.punyakosh.in:443 \
  -servername relay-arkive.punyakosh.in 2>/dev/null \
  | openssl x509 -noout -pubkey \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64

# Intermediate CA SPKI hash (backup pin — run with -showcerts and extract cert 2)
openssl s_client -connect relay-arkive.punyakosh.in:443 -showcerts \
  -servername relay-arkive.punyakosh.in 2>/dev/null \
  | awk '/-----BEGIN CERTIFICATE-----/{n++; cert=""} {cert=cert"\n"$0}
         /-----END CERTIFICATE-----/ && n==2{print cert}' \
  | openssl x509 -noout -pubkey \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64
```

Put both hashes in the `<pin-set>` and set `expiration` to one month before the leaf cert's renewal date. Cloudflare rotates certs roughly every 90 days; check every 60 days. Keep the old pin alongside the new one during the rotation window.

---

## Security review

We invite independent security review. To report a vulnerability, email security@arkive.app or open a private GitHub advisory.

**Branch protection:**
- `main` requires signed commits and passing CI
- PRs touching `src/crypto/`, `src/sync/relayClient.ts`, `src/family/familyStore.ts`, `relay/src/`, or `android/` require owner review
- Force-push to `main` is disabled

---

## License

[AGPL-3.0](LICENSE) — see the LICENSE file.

**Trademark:** "Arkive" and the Arkive logo are trademarks of the project owner. Trademark clearance is pending. Forks must use a different name and logo.

---

## Contributing

- Follow the phase order in `ARKIVE_BUILD_BRIEF.md`; never jump ahead
- Never commit secrets, tokens, private keys, or family data
- All changes to crypto primitives require a passing test suite and owner review
- The insurance renew button remains a dummy until licensing is sorted
