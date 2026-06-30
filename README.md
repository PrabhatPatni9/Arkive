# Arkive

> A local-first, end-to-end encrypted family vault. Blood groups, allergies, medicines, IDs, policies — always offline, always private.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)

Arkive is a family vault for the things you'd panic to find in a medical emergency. Any family
member can reach critical health information instantly, **offline**, on their own device. The
sync relay is a **blind post office** — it stores sealed envelopes it cannot open, and nothing else.

---

## 📥 Download

**Android (signed APK):**
**https://github.com/prabhatpatni9/arkive/releases/latest/download/arkive.apk**

Sideload only (not on the Play Store yet) — allow "install unknown apps" on first install.
All builds are listed with their SHA-256 on the [Releases page](https://github.com/prabhatpatni9/arkive/releases),
and the app verifies every future update against an Ed25519-signed manifest before installing.

**iPhone / desktop (web app / PWA):** **https://arkive.punyakosh.in**

---

## 📖 Documentation — two READMEs

This project ships two guides so the right audience gets the right level of detail:

| Guide | For | What's inside |
|-------|-----|---------------|
| **[README.nontechnical.md](README.nontechnical.md)** | Everyone / families / community | How the family flow works, step by step; what you can and can't do today and why; privacy in plain words; how much data it uses; how it works offline; cost. |
| **[README.technical.md](README.technical.md)** | Developers | Architecture, crypto core, relay endpoints + trust boundary, sync model, the APK build/sign/release pipeline, env vars, self-hosting, cert pinning. |

---

## Why it exists

In a medical emergency, nobody should be scrambling to find a policy number or a blood group.
Arkive keeps that information on the family's own devices, encrypted with keys only the family
holds, readable offline, and kept fresh by a reminder engine.

**The promise that's true and defensible:** content is end-to-end encrypted and the relay is
mathematically blind, so neither a network attacker nor the operator's own server can read or
forge family data.

---

## License

[AGPL-3.0](LICENSE). Open source. No trademark is claimed on the name or branding.
