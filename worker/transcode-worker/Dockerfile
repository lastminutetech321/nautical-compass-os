# NC Transcode Worker — runs FFmpeg/FFprobe for the Creator Media Vault.
# Base44's Deno serverless runtime cannot execute native binaries, so this
# standalone Node.js service runs FFmpeg and exposes the bounded contract
# that ncCreatorMedia dispatches to.
#
# Deploy to DigitalOcean App Platform (see .do/app.yaml) or any container host.

FROM node:20-alpine

# FFmpeg + FFprobe (Part 3, 4) — real binary execution, not WASM/faked
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./

# Temp workspace for source download + derivative output (Part 15 — cleaned after use)
ENV TMPDIR=/tmp
RUN mkdir -p /tmp

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "server.js"]