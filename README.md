# Nautical Compass OS (NCOS)

**An autonomous, self-evolving Career Operating System** built on Base44 (BaaS) with a Vite + React frontend.

---

## Architecture

- **Frontend (this repo):** Vite + React 18 SPA, Tailwind CSS + shadcn/ui, React Router 6, 250+ pages, 100+ components. Deploys as a static build to DigitalOcean (nginx in Docker).
- **Backend (Base44 platform):** 180+ entities (database), 45+ serverless functions (Deno Deploy), auth, file storage, GitHub connector, workflows, AI agents. The frontend talks to Base44 over HTTPS via the @base44/sdk client.

**Key principle:** The frontend is a static SPA. All business logic, data, auth, and integrations run on the Base44 backend.

---

## Folder Structure

- `base44/entities/` — Database schemas (JSON), 180+ entities
- `base44/functions/` — Serverless backend functions (Deno), 45+ functions
- `base44/workflows/` — Automated multi-step workflows, 12+ workflows
- `base44/agents/` — AI agent configurations
- `src/pages/` — React page components, 250+ pages
- `src/components/` — Reusable UI components, 100+ components
- `src/components/ui/` — shadcn/ui primitives
- `src/api/` — Base44 SDK client initialization
- `src/lib/` — Auth context, utils, query client
- `Dockerfile` — Multi-stage build (Node 20 to nginx)
- `nginx.conf` — SPA routing config
- `.do/app.yaml` — DigitalOcean App Platform spec
- `.env.example` — Environment variable template
- `DEPLOYMENT.md` — Full deployment guide

---

## Environment Variables

All VITE_* variables are build-time (inlined by Vite). Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `VITE_BASE44_APP_ID` | Yes | Base44 application ID |
| `VITE_BASE44_FUNCTIONS_VERSION` | No | Pin functions version; blank = latest |
| `VITE_BASE44_APP_BASE_URL` | No | Public URL of frontend (for auth redirects) |

Changing any value requires a rebuild — they are not runtime-configurable.

---

## Quick Start

1. Install dependencies: `npm install`
2. Configure: `cp .env.example .env` then set VITE_BASE44_APP_ID
3. Dev server: `npm run dev`
4. Build: `npm run build` (outputs dist/)
5. Preview: `npm run preview`

---

## Docker

Build and run the containerized frontend:

    docker build --build-arg VITE_BASE44_APP_ID="your_app_id" -t ncos-frontend .
    docker run -d --name ncos-frontend -p 80:80 ncos-frontend

Multi-stage: node:20-alpine builds the Vite SPA, nginx:1.27-alpine serves dist/ with SPA fallback.

---

## DigitalOcean Deployment

**Recommended:** App Platform. See `DEPLOYMENT.md` for the full guide.

Via doctl:

    doctl auth init
    export VITE_BASE44_APP_ID="your_app_id"
    export VITE_BASE44_APP_BASE_URL="https://ncos.ondigitalocean.app"
    doctl app spec deploy .do/app.yaml

**Important:** Only the frontend deploys to DigitalOcean. The backend stays on Base44.

---

## GitHub Workflow

This repository is the **source of truth** for the NCOS project. Base44 supports 2-way repo sync: changes pushed to `main` reflect in the Base44 Builder.

---

## Current Status

- Frontend: Built (Vite + React SPA, 250+ pages)
- Backend: Hosted on Base44 (180+ entities, 45+ functions, 12+ workflows)
- Auth: Active (email/password + Google OAuth)
- GitHub connector: Connected (repo, read:user scopes)
- Canon Inventory: Operational (33 files classified across 5 repos)
- Payment Fabric: Stripe staging only (production secrets pending)
- Canon Migration: In progress (legal Canon not yet in GitHub)
- DigitalOcean deploy: Config ready (Dockerfile + app spec + docs)

---

## Known Limitations

1. No self-hosted backend — the entire backend runs on Base44. DigitalOcean hosts the static frontend only.
2. Build-time env vars — VITE_* variables are inlined at build; changing requires a rebuild.
3. Canon incompleteness — the full legal Canon is not yet in GitHub (Termius/local + Chat history).
4. Stripe production — production payment secrets not configured; Payment Fabric runs in sandbox.
5. No runtime configuration — production image is nginx serving static files.
6. CORS dependency — the DO domain must be registered in Base44 allowed origins.

---

## Remaining Tasks

- Full repo sync — sync all app source files (pages, components, entities, functions) via Base44 2-way repo sync
- Canon migration — export Termius/local + Chat doctrine to GitHub /canon, /governance, /legal-research folders
- Set VITE_BASE44_APP_ID — get the real App ID from Base44 dashboard
- Register DO domain in Base44 allowed auth redirect origins
- Configure Stripe production secrets on Base44
- Verify build — run `npm run build` locally to confirm zero errors
- First deploy — push to GitHub, DO App Platform builds and deploys

---

## Docs

- Deployment guide: DEPLOYMENT.md
- Base44 docs: https://docs.base44.com
- Base44 GitHub sync: https://docs.base44.com/Integrations/Using-GitHub