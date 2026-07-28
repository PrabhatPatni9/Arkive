# Arkive — Deployment & Cloudflare Sync

> How the repo stays in sync with Cloudflare and auto-deploys, how to verify it, how to force a
> deploy, and how to fix it when it breaks. Everything here reflects the workflows in
> `.github/workflows/`.

## TL;DR

Push to the `main` branch → GitHub Actions builds and deploys to Cloudflare automatically:

| You push a change to… | Workflow that runs | What it deploys |
|-----------------------|--------------------|-----------------|
| anything except `relay/**` | `deploy-pages.yml` | **Web app** → Cloudflare Pages (`arkive` project) |
| `relay/**` | `deploy-relay.yml` | **Relay Worker** → Cloudflare Workers |
| anything, on `main` | `build-apk.yml` | Signed **APK** → GitHub Release + R2 |

There is nothing to run by hand. Commit → push to `main` → it deploys. Live URLs:
- Web app: **https://arkive-csk.pages.dev**
- Relay: **https://relay-arkive.punyakosh.in/health**

## What makes the auto-deploy work (the 4 requirements)

1. **The push lands on `main`.** Feature branches do not deploy. Merge/push to `main`.
2. **The build passes.** Both deploy jobs run `npm ci` then `npm run build` (`tsc -b && vite`).
   If either fails, nothing deploys — this is by design (never ship a broken build).
3. **These GitHub secrets exist and are valid** (Repo → Settings → Secrets and variables → Actions):
   - `CLOUDFLARE_API_TOKEN` — a token with **Pages:Edit** + **Workers Scripts:Edit** + **D1:Edit**
     + **R2:Edit** on your account.
   - `CLOUDFLARE_ACCOUNT_ID`
   - `VITE_RELAY_URL`, `VITE_UPDATE_PUBKEY`, `VITE_VAPID_PUBLIC_KEY`, `VITE_RAZORPAY_KEY`
   - (APK only) `SIGNING_KEY_BASE64`, `KEY_ALIAS`, `KEY_STORE_PASSWORD`, `KEY_PASSWORD`,
     `APK_SIGNING_SEED`, `RELAY_ADMIN_TOKEN`.
4. **The Cloudflare Pages project is named `arkive`** (the deploy command is
   `pages deploy dist --project-name=arkive`). If your project has a different name, either
   rename it in Cloudflare or change that line in `deploy-pages.yml`.

## How to verify a deploy worked

- **GitHub:** open the repo's **Actions** tab. A green check on the latest `main` commit for
  "Deploy Web App" (and "Deploy Relay Worker" if you touched the relay) means it deployed.
- **Cloudflare:** Pages → `arkive` → Deployments shows the newest build with the commit hash.
- **Live check:** `curl -I https://arkive-csk.pages.dev` should return `HTTP/2 200`.

## How to force a re-deploy (no code change needed)

Both deploy workflows now support **manual runs**. On GitHub:
**Actions → "Deploy Web App" (or "Deploy Relay Worker") → "Run workflow" → branch `main` → Run.**
Use this after rotating the Cloudflare token, or to re-publish without editing code.

## The one gotcha that silently breaks Cloudflare sync

**Do not run two deploy paths for the same Pages project.** Cloudflare Pages can deploy either
(a) via these GitHub Actions (what this repo uses), **or** (b) via Cloudflare's own "connect to
Git" integration in the Pages dashboard — **not both**. If the dashboard is *also* connected to
this GitHub repo, the two will race and one will serve stale builds. Pick one:
- **Keep GitHub Actions (recommended here):** in Cloudflare Pages → `arkive` → Settings → Builds &
  deployments, make sure it is **not** connected to a Git repo (it should say "Direct Upload" /
  "via Wrangler"). This is the current setup.
- **Or switch to Cloudflare's Git integration** (simpler, no token to rotate): connect the Pages
  project to the GitHub repo, set **build command** `npm run build`, **output directory** `dist`,
  add the `VITE_*` variables in the Pages dashboard, and then **delete `deploy-pages.yml`** so
  they don't conflict. Trade-off: you lose the shared lint/test gate that the Action gives you.

## Common failures & fixes

| Symptom | Cause | Fix |
|--------|-------|-----|
| Deploy job fails at `npm ci` with `ERESOLVE` | a dependency pinned to an incompatible major (this happened with `@capacitor/network@8` vs core 6) | align versions in `package.json`, run `npm install` to refresh the lockfile, commit both |
| Deploy job fails at `npm run build` (TS errors) | a type error merged to `main` | fix the errors (the build gate is doing its job); re-push |
| Deploy job fails at the Cloudflare step (401/403) | the `CLOUDFLARE_API_TOKEN` secret is missing, expired, or under-scoped (common after rotating it) | create a new token with the scopes above, update the GitHub secret, then "Run workflow" |
| Site looks stale even though Actions is green | two deploy paths racing (see gotcha above), or browser cache | disconnect the dashboard Git integration; hard-refresh |
| Push to `main` didn't trigger anything | you pushed to a feature branch, or only changed ignored paths | merge to `main`; or use "Run workflow" |

## Keeping the branches in sync

Work happens on `main` (which deploys) and mirrors to `claude/family-os-analysis-ooovol`. To keep
them identical after any change:
```bash
git checkout claude/family-os-analysis-ooovol && git merge origin/main && git push
git checkout main
```

## Health check (paste anytime)
```bash
curl -sS -o /dev/null -w "web %{http_code}\n"   https://arkive-csk.pages.dev
curl -sS -o /dev/null -w "relay %{http_code}\n" https://relay-arkive.punyakosh.in/health
```
Two `200`s means both are live.
