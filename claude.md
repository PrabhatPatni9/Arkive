# Arkive — Project Instructions for Claude Code

## Read this first, every session
The full specification is in `docs/ARKIVE_BUILD_BRIEF.md`. **Read it in full at the
start of every session and again at the start of each new build phase.** It is the
source of truth. This file only summarises how to work; the brief holds the actual spec.

## Non-negotiable
- Operator never holds plaintext or usable keys. All family keys are generated and stored
  client-side only. **Never commit secrets, tokens, private keys, or family data to this repo.**
- The Cloudflare account provided is ONLY for deploying the relay (Workers + R2 + D1).
- Build strictly in the phase order in §9 of the brief. Do not jump ahead.
- The Hard Constraints in §7 of the brief are invariants. If a feature conflicts with one,
  the constraint wins and you flag it. Never skip: image compression, signed-APK updates,
  cert pinning, versioned envelopes, or vetted-only crypto (libsodium, never hand-rolled).
- Phase 1 is the crypto core. Nothing downstream proceeds until its test suite passes.

## Workflow
- Maintain `docs/PROGRESS.md`: current phase, what is done, what is next, open questions.
  Update it at the end of every working session.
- After each phase, write and pass the tests in §10 of the brief before advancing.
- Stack is locked (§2): TypeScript, Vite, React, Capacitor, SQLite, libsodium, Cloudflare.
  No React Native, no Supabase, no plaintext on the server. Do not substitute.

## Pending (owner handles, not you)
- Name/trademark/domain clearance for "Arkive".
- Insurance transaction stays a "coming soon" dummy button until licensing is sorted.