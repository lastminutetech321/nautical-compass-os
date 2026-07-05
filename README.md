# Nautical Compass OS (NCOS)

**An autonomous, self-evolving Career Operating System** that integrates professional management, talent partnership, and an evolutionary intelligence layer (EvoSystem) to continuously improve enterprise performance.

Built on **Base44** (Backend-as-a-Service) with a **Vite + React** frontend.

---

## Architecture Overview

```
┌─────────────────────────────────┐       HTTPS (SDK)       ┌─────────────────────────────┐
│   Frontend (this repo)           │  ────────────────────►  │   Base44 BaaS Backend       │
│                                  │                          │                             │
│   • Vite + React 18 SPA          │                          │   • Entities (database)      │
│   • Tailwind CSS + shadcn/ui     │                          │   • Serverless functions      │
│   • React Router 6               │                          │     (Deno Deploy)            │
│   • TanStack Query               │                          │   • Auth (email + OAuth)     │
│   • 250+ pages, 100+ components  │                          │   • File storage             │
│                                  │                          │   • GitHub connector          │
│   Deploys as static build (dist/)│                          │   • Workflows + AI agents     │
│   to DigitalOcean (nginx)        │                          │                             │
└─────────────────────────────────┘                          └─────────────────────────────┘
```

**Key principle:** The frontend is a static SPA. All business logic, data, auth, and integrations run on the Base44 backend. The frontend communicates exclusively via the `@base44/sdk` client.

---

## Folder Structure

```
nautical-compass-os/
├── base44/
│   ├── entities/          # Database schemas (JSON) — 180+ entities
│   ├── functions/         # Serverless backend functions (Deno) — 45+ functions
│   ├── workflows/         # Automated multi-step workflows — 12+ workflows
│   └── agents/           # AI agent configurations
├── src/
│   ├── pages/            # React page components — 250+ pages
│   ├── components/        # Reusable UI components — 100+ components
│   │   └── ui/           # shadcn/ui primitives
│   ├── api/              # Base44 SDK client initialization
│   ├── lib/              # Auth context, utils, query client
│   ├── hooks/           # Custom React hooks
│   ├── App.jsx          # Router (all routes defined here)
│   ├── main.jsx          # React entry point
│   └── index.css         # Design tokens (Tailwind theme)
├── Dockerfile            # Multi-stage build (Node → nginx)
├── nginx.conf            # SPA routing config
├── .dockerignore
├── .do/app.yaml          # DigitalOcean App Platform spec
├── .env.example          # Environment variable template
├── DEPLOYMENT.md         # Full deployment guide
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── index.html
```

---

## Environment Variables

All variables are **build-time** (inlined by Vite into the JS bundle). Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `VITE_BASE44_APP_ID` | Yes | Base44 application ID (dashboard → app settings) |
| `VITE_BASE44_FUNCTIONS_VERSION` | No | Pin functions version; blank = latest |
| `VITE_BASE44_APP_BASE_URL` | No | Public URL of this frontend (for auth redirects) |

> Changing any value requires a rebuild — they are not runtime-configurable.

---

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   edit .env → set VITE_BASE44_APP_ID

# 3. Start dev server
npm run dev

# 4. Open the printed local URL
```

For full-stack local dev with the Base44 backend, use the Base44 CLI:
```bash
npm install -g base44@latest
base44 dev
```

---

## Build & Preview

```bash
npm run build      # production build → dist/
npm run preview    # preview the build locally on :4173
```

---

## Docker Instructions

```bash
# Build the image (pass build-time env vars)
docker build \
  --build-arg VITE_BASE44_APP_ID="your_app_id" \
  --build-arg VITE_BASE44_APP_BASE_URL="https://your-domain.com" \
  -t ncos-frontend .

# Run on port 80
docker run -d --name ncos-frontend --restart unless-stopped -p 80:80 ncos-frontend

# Verify
curl -I http://localhost   # → HTTP/1.1 200 OK
```

The Dockerfile is multi-stage: `node:20-alpine` builds the Vite SPA, then `nginx:1.27-alpine` serves the static `dist/` with SPA fallback routing.

---

## DigitalOcean Deployment

**Recommended:** DigitalOcean App Platform (static container).

### Via App Platform dashboard
1. Apps → Create App → GitHub source → select this repo
2. DO auto-detects the `Dockerfile`
3. Set Build Time env vars: `VITE_BASE44_APP_ID`, `VITE_BASE44_APP_BASE_URL`
4. HTTP port = 80 → Create Resources

### Via doctl CLI
```bash
doctl auth init
export VITE_BASE44_APP_ID="your_app_id"
export VITE_BASE44_APP_BASE_URL="https://ncos.ondigitalocean.app"
doctl app spec deploy .do/app.yaml
```

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the complete guide, post-deploy checklist, and troubleshooting.

**Important:** Only the frontend deploys to DigitalOcean. The backend (entities, functions, auth, GitHub connector) stays on Base44. Do not attempt to run `base44/` on DigitalOcean.

---

## GitHub Workflow

This repository is the **source of truth** for the NCOS project.

### 2-Way Repo Sync with Base44
Base44 supports 2-way sync between this repo and the builder:
- Changes pushed to `main` are reflected in the Base44 Builder
- Changes made in the Builder can be pulled back

### Branch Strategy
- `main` — production-ready, deployable
- Feature branches — prefix with `feat/`, `fix/`, `docs/`

### Canon / Governance Files
The `/canon`, `/governance`, `/constitution`, `/legal-research`, `/prompts`, `/development-memory`, `/engineering` folders (when created) hold the platform's doctrine, governance, and legal research — managed by the Founder and synced via the Canon Inventory engine.

---

## Current Platform Status

| Domain | Status | Notes |
|---|---|---|
| Frontend | ✅ Built | Vite + React SPA, 250+ pages |
| Backend | ✅ Hosted on Base44 | 180+ entities, 45+ functions, 12+ workflows |
| Auth | ✅ Active | Email/password + Google OAuth |
| GitHub connector | ✅ Connected | `repo, read:user` scopes |
| Canon Inventory | ✅ Operational | 33 files classified across 5 repos |
| Payment Fabric | ⚠️ Stripe staging only | Production secrets pending |
| Canon Migration | 🔄 In progress | Legal Canon not yet in GitHub |
| DigitalOcean deploy | ✅ Config ready | Dockerfile + app spec + docs created |

---

## Known Limitations

1. **No self-hosted backend** — the entire backend runs on Base44. DigitalOcean hosts the static frontend only.
2. **Build-time env vars** — `VITE_*` variables are inlined at build; changing them requires a rebuild, not a redeploy.
3. **Canon incompleteness** — the full legal Canon is not yet in GitHub (some files remain in Termius/local + Chat history). Canon import is paused pending Founder migration.
4. **Stripe production** — production payment secrets are not configured; the Payment Fabric runs in sandbox mode.
5. **No runtime configuration** — the production image is nginx serving static files; no Node.js runtime, no env var hot-reload.
6. **CORS dependency** — the DO domain must be registered in Base44 allowed origins for auth and API calls to work.

---

## Remaining Tasks Before Production

- [ ] **Full repo sync** — sync all app source files (pages, components, entities, functions, workflows) to GitHub via Base44 2-way repo sync
- [ ] **Canon migration** — export Termius/local + Chat doctrine to GitHub `/canon`, `/governance`, `/legal-research` folders
- [ ] **Set `VITE_BASE44_APP_ID`** — get the real App ID from Base44 dashboard
- [ ] **Register DO domain** in Base44 allowed auth redirect origins
- [ ] **Configure Stripe production secrets** on Base44 for live payments
- [ ] **Verify build** — run `npm run build` locally to confirm zero errors before first deploy
- [ ] **First deploy** — push to GitHub → DO App Platform builds and deploys
- [ ] **Post-deploy verification** — login flow, entity loads, no CORS errors
- [ ] **Custom domain** — point DNS to DO, update `VITE_BASE44_APP_BASE_URL`, rebuild

---

## Docs & Support

- **Deployment guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Base44 docs:** [https://docs.base44.com](https://docs.base44.com)
- **Base44 GitHub sync:** [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)
- **Base44 CLI:** `npm install -g base44@latest`
- **Support:** [https://app.base44.com/support](https://app.base44.com/support)