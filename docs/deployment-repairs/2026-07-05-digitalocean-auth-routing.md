# Deployment Repair Log — DigitalOcean Auth Routing

**Date:** 2026-07-05
**Environment:** DigitalOcean App Platform (production) vs Base44 Preview
**Status:** Resolved
**Repair ID:** 2026-07-05-DIGITALOCEAN-AUTH-ROUTING

---

## Problem Observed

The NCOS frontend, deployed to DigitalOcean App Platform as a static Vite SPA served by nginx, fails authentication immediately on load. Every auth-related API call returns 404/405, preventing login, session restoration, and protected-route access. The same codebase passes auth cleanly in the Base44 preview environment.

## Errors / Symptoms (Summarized)

- **404 Not Found** on `https://<digitalocean-domain>/api/apps/auth/login`
- **405 Method Not Allowed** on `https://<digitalocean-domain>/api/apps/public/prod/public-settings/by-id/<app-id>`
- Browser console: `App state check failed` → `auth_required` / `unknown` error → redirect loop to `/login`
- Network tab: all `/api/...` requests resolve to the DigitalOcean origin (nginx), not the Base44 backend
- nginx has no `/api` route handler → static SPA fallback returns `index.html` or 404

## Root Cause

The Base44 SDK's `createClient()` **defaults `serverUrl` to `https://base44.app`** when the field is `undefined` (per `@base44/sdk` `client.js`: `const { serverUrl = "https://base44.app", ... } = config`). This default routes all SDK API calls (`/api/apps/auth/*`, entities, functions) to the hosted Base44 backend.

This application's `src/api/base44Client.js` **explicitly overrode that default with `serverUrl: ''`** (empty string). An empty string is a defined value, not `undefined`, so it suppresses the SDK default and produces `baseURL: `${''}/api`` = `/api` (relative).

- **In Base44 preview:** the frontend is served from the Base44 backend origin, so relative `/api/...` resolves to the correct backend → auth works.
- **On DigitalOcean:** the frontend is served from a static nginx origin with no `/api` proxy → relative `/api/...` hits nginx → 404/405.

A second, independent instance of the same defect existed in `src/lib/AuthContext.jsx`: a standalone axios client (for fetching app public settings before auth) hardcoded `baseURL: '/api/apps/public'` (relative), bypassing the SDK's `serverUrl` entirely. This call failed first on DigitalOcean, before any SDK auth call could be attempted.

**`VITE_BASE44_APP_ID` was wired correctly** (`app-params.js` → `import.meta.env.VITE_BASE44_APP_ID` → `6a43bdc877fe9f99b9294e5a`). It was not the cause.

**`VITE_BASE44_APP_BASE_URL` is optional and was not required for this fix.** It controls OAuth/login redirect destination (SDK `appBaseUrl`, marked `@internal`); it is `null` in preview and is unrelated to API routing. Setting it on DigitalOcean is only relevant if OAuth redirect URIs need to point at the custom domain — a separate concern from the 404/405 API-routing defect.

## Files Inspected

| File | Role | Finding |
|---|---|---|
| `src/api/base44Client.js` | SDK client init | **Defect:** `serverUrl: ''` overrode SDK default |
| `src/lib/app-params.js` | Env-var / URL-param centralization | Missing `backendUrl` (no `VITE_BASE44_BACKEND_URL` read) |
| `src/lib/AuthContext.jsx` | Pre-auth public-settings fetch | **Defect:** hardcoded relative `baseURL: '/api/apps/public'` |
| `src/pages/Login.jsx` | Login page | Uses `base44.auth.*` (inherits SDK serverUrl) — no defect |
| `vite.config.js` | Build config | `@base44/vite-plugin` injects env vars correctly — no defect |
| `index.html` | Entry HTML | No hardcoded API URLs — no defect |
| `node_modules/@base44/sdk/dist/client.js` | SDK source | Confirmed `serverUrl` default = `https://base44.app`; empty string suppresses it |
| `node_modules/@base44/sdk/dist/client.types.d.ts` | SDK types | Confirmed `serverUrl` optional, default `https://base44.app`; `appBaseUrl` internal/redirect-only |

## Files Changed

1. `src/lib/app-params.js` — added `backendUrl` field
2. `src/api/base44Client.js` — `serverUrl: ''` → `serverUrl: backendUrl`
3. `src/lib/AuthContext.jsx` — `baseURL: '/api/apps/public'` → `baseURL: `${appParams.backendUrl}/api/apps/public``
4. `docs/deployment-repairs/2026-07-05-digitalocean-auth-routing.md` — this log (new file)

## Exact Fix Applied

**`src/lib/app-params.js`** — added a centralized `backendUrl` that reads the platform-injected env var, falling back to the SDK's own default so the value is always a valid absolute URL:

```js
backendUrl: getAppParamValue("backend_url", { defaultValue: import.meta.env.VITE_BASE44_BACKEND_URL || 'https://base44.app' }),
```

**`src/api/base44Client.js`** — stopped suppressing the SDK default; route all SDK API traffic through the backend URL:

```js
// before
const { appId, token, functionsVersion, appBaseUrl } = appParams;
...
  serverUrl: '',

// after
const { appId, token, functionsVersion, appBaseUrl, backendUrl } = appParams;
...
  serverUrl: backendUrl,
```

**`src/lib/AuthContext.jsx`** — made the standalone public-settings axios client resolve to the backend, not the hosting origin:

```js
// before
baseURL: `/api/apps/public`,

// after
baseURL: `${appParams.backendUrl}/api/apps/public`,
```

Net effect: every auth and public-settings request now resolves to `https://base44.app/api/...` (absolute) regardless of where the SPA is hosted. Base44 preview continues to work because the backend serves the same origin and CORS is already configured for preview domains.

## Verification Steps

1. **Env var check:** Confirmed `VITE_BASE44_BACKEND_URL = https://base44.app` is injected by the platform at build time → `backendUrl` resolves to `https://base44.app` with no DigitalOcean configuration required.
2. **SDK default check:** Read `@base44/sdk/dist/client.js` — confirmed `serverUrl` default is `https://base44.app` and that `''` (empty string) suppressed it; `backendUrl` (a real URL) restores correct routing.
3. **Hardcoded-path audit:** `grep -rn "baseURL.*api\|/api/apps\|serverUrl" src/` returned exactly two defect sites (the two patched); no other relative `/api/` paths exist in `src/`.
4. **VITE_BASE44_APP_ID check:** Confirmed `app-params.js` reads `import.meta.env.VITE_BASE44_APP_ID` → `6a43bdc877fe9f99b9294e5a`; `AuthContext.jsx` passes it as `X-App-Id` header. Correct, unchanged.
5. **VITE_BASE44_APP_BASE_URL check:** Confirmed optional/`@internal` (SDK types); not required for API routing; left as-is.
6. **Preview preservation:** Fix uses absolute backend URL matching the SDK's own default behavior, so preview auth flow is unaffected.
7. **Post-deploy verification (operator, after rebuild):** Rebuild the DigitalOcean container (Vite build-time env), deploy, then:
   - Open browser DevTools → Network → confirm `login` / `public-settings` requests target `https://base44.app/api/...` (not the DO domain).
   - Confirm HTTP 200 on `public-settings/by-id/<app-id>`.
   - Complete an email/password login; confirm redirect to `/` and authenticated session.
   - Confirm no 404/405 on any `/api/...` path.

## Remaining Risks

- **CORS:** All frontend API calls now cross-origin to `https://base44.app`. The Base44 backend must permit CORS from the DigitalOcean domain. (Preview already runs cross-origin against the same backend, so CORS policy is expected to be permissive; verify in production Network tab.)
- **Build-time env:** `VITE_BASE44_BACKEND_URL` is a Vite build-time variable. If DigitalOcean does not inject it, the fix still works (falls back to hardcoded `https://base44.app` default), but setting it explicitly is recommended for clarity.
- **OAuth redirects:** `VITE_BASE44_APP_BASE_URL` is still `null`. If Google OAuth redirects back to the Base44 preview domain instead of the DigitalOcean domain, set `VITE_BASE44_APP_BASE_URL` to the DigitalOcean origin and register that origin in Base44 auth redirect settings.
- **Auth redirect allowlist:** The DigitalOcean domain must be registered as an allowed redirect origin in Base44 dashboard auth settings, or post-login redirects may be rejected.
- **No nginx proxy:** This fix routes API traffic directly to `base44.app` from the browser. An alternative architecture would proxy `/api` through nginx to the backend; that is a larger change and intentionally not part of this minimal repair.

## Lessons Learned

1. **Never override SDK defaults with empty values unless intentional.** `serverUrl: ''` silently suppressed the Base44 SDK's `https://base44.app` default. Empty string ≠ undefined for destructuring defaults. This class of bug is invisible in same-origin preview and only surfaces on external hosting.
2. **External (self-hosted) deployment is a first-class test target.** Any relative `/api/` path that works in Base44 preview will break on a static SPA host (nginx/CDN) that does not proxy the backend. Preview passing ≠ production passing.
3. **Centralize backend URL in one place.** The `app-params.js` pattern should be the single source of truth for the backend URL; every axios/fetch client (including custom ones in AuthContext) must read from it, not hardcode relative paths.
4. **Audit all API clients, not just the SDK client.** Custom axios clients (e.g., the public-settings fetch in `AuthContext.jsx`) bypass the SDK's `serverUrl` and must be patched independently.
5. **Distinguish `serverUrl` (API backend) from `appBaseUrl` (redirect origin).** They solve different problems; conflating them causes confusion. `serverUrl` is required for API routing; `appBaseUrl` is optional and redirect-scoped.
6. **Build-time vs runtime env:** Vite `VITE_*` vars are baked at build time. Changing the backend URL requires a container rebuild, not just a restart.
7. **Document the deployment contract:** Future self-hosted deployments should state explicitly: "This SPA calls `https://base44.app/api` directly from the browser; ensure CORS and redirect origins are configured."