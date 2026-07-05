# NCOS — DigitalOcean Deployment Guide

This is a Base44 application: a Vite + React SPA frontend that talks to the Base44 BaaS (entities, serverless functions, auth) over HTTPS.

**What deploys to DigitalOcean:** the static frontend build (`dist/`), served by nginx in Docker.

**What stays on Base44:** the entire backend — database, serverless functions, auth, file storage, GitHub connector. No backend code runs on DigitalOcean.

---

## Prerequisites

1. Base44 account with a published app — note the App ID from the Base44 dashboard.
2. DigitalOcean account with App Platform access.
3. `doctl` CLI installed (optional, for CLI deploy).
4. A custom domain (optional but recommended for production).

---

## Environment Variables

All `VITE_*` variables are build-time only — Vite inlines them into the JS bundle during `npm run build`. Changing any value requires a rebuild.

| Variable | Required | Scope | Description |
|---|---|---|---|
| `VITE_BASE44_APP_ID` | Yes | Build | Your Base44 application ID |
| `VITE_BASE44_FUNCTIONS_VERSION` | No | Build | Pin a functions version; blank = latest |
| `VITE_BASE44_APP_BASE_URL` | Recommended | Build | Public URL of this frontend (must match Base44 allowed origins) |

No runtime env vars. Set them as BUILD_TIME env vars in DigitalOcean.

---

## Option A — DigitalOcean App Platform (recommended)

Via dashboard:
1. DigitalOcean then Apps then Create App
2. Choose GitHub source then select your repo
3. DO auto-detects the Dockerfile — keep it.
4. Set Build Time Environment Variables: `VITE_BASE44_APP_ID`, `VITE_BASE44_APP_BASE_URL`.
5. HTTP port = 80.
6. Create Resources.

Via doctl (CLI):

    doctl auth init
    export VITE_BASE44_APP_ID="your_app_id"
    export VITE_BASE44_APP_BASE_URL="https://ncos.ondigitalocean.app"
    doctl app spec deploy .do/app.yaml

Configure Base44 backend:
1. Base44 dashboard then app Settings then Domains.
2. Add your DO domain to allowed redirect origins.
3. Confirm App ID matches `VITE_BASE44_APP_ID`.

---

## Option B — DigitalOcean Droplet (Docker)

    ssh root@your-droplet-ip
    apt update && apt install -y docker.io
    git clone https://github.com/your-org/your-repo.git && cd your-repo
    docker build --build-arg VITE_BASE44_APP_ID="your_app_id" -t ncos-frontend .
    docker run -d --name ncos-frontend --restart unless-stopped -p 80:80 ncos-frontend
    curl -I http://localhost

For production on a Droplet, put nginx-proxy + Let Encrypt (or Caddy) in front for TLS.

---

## Build Verification (local)

    cp .env.example .env
    npm install
    npm run build
    npm run preview

---

## What is NOT deployed to DigitalOcean

| Component | Where it lives |
|---|---|
| Entity database | Base44 platform |
| Serverless functions | Base44 platform (Deno Deploy) |
| Authentication / OAuth | Base44 platform |
| File uploads / storage | Base44 platform |
| GitHub connector | Base44 platform |
| Workflows | Base44 platform |
| AI agents | Base44 platform |

Do not run `base44/` on DigitalOcean — it uses Base44-specific runtime APIs.

---

## Post-Deploy Checklist

- App loads at DO domain (no blank screen / 404)
- Login flow redirects to Base44 auth and back
- Entity data loads (Daily Compass shows data)
- No CORS errors (add DO domain to Base44 allowed origins if so)
- `VITE_BASE44_APP_BASE_URL` matches deployed domain exactly
- HTTPS active
- Health check passes

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Blank screen | `VITE_BASE44_APP_ID` missing — set BUILD_TIME, redeploy |
| Auth redirect fails | DO domain not in Base44 allowed origins — add it |
| 404 on refresh | nginx SPA fallback missing — confirm `nginx.conf` |
| CORS errors | Add DO domain to Base44 allowed origins |
| Old content | Hard refresh / confirm DO deploy completed |

---

## Rollback

DO App Platform: Apps then your app then Deployments then select previous then Rollback.

Droplet: `docker stop ncos-frontend && docker rm ncos-frontend && docker run -d --name ncos-frontend -p 80:80 ncos-frontend:previous-tag`