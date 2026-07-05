# ─────────────────────────────────────────────────────────────
# NCOS Frontend — multi-stage Docker build
# Stage 1: Node builds the Vite SPA into /app/dist
# Stage 2: nginx serves the static bundle with SPA fallback
# ─────────────────────────────────────────────────────────────

# ---------- Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (cached unless package files change)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# VITE_* vars MUST be present at build time — they are inlined into the bundle.
# Pass them via --build-arg or DO App Platform BUILD_TIME env vars.
ARG VITE_BASE44_APP_ID
ARG VITE_BASE44_FUNCTIONS_VERSION
ARG VITE_BASE44_APP_BASE_URL
ENV VITE_BASE44_APP_ID=$VITE_BASE44_APP_ID
ENV VITE_BASE44_FUNCTIONS_VERSION=$VITE_BASE44_FUNCTIONS_VERSION
ENV VITE_BASE44_APP_BASE_URL=$VITE_BASE44_APP_BASE_URL

# Production build
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine

# Custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]