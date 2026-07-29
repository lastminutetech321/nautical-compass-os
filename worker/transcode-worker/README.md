# NC Transcode Worker

External FFmpeg service for the NC Creator Media Vault. The Base44 Deno serverless
runtime cannot execute native binaries (`Deno.Command` is prohibited), so audio
transcoding is dispatched to this standalone Node.js worker that runs real
FFmpeg/FFprobe.

## What it does

One job, synchronously:

1. NC generates a time-limited signed URL for the master audio file.
2. NC calls `POST /transcode/audio` with the signed URL + target profile (AAC 256kbps).
3. The worker downloads the master, runs **real ffprobe**, runs **real ffmpeg**
   (`-c:a aac -b:a 256k`), runs **real ffprobe** on the output, verifies it, and
   returns a short-lived output URL.
4. NC fetches the derivative, stores it via `UploadPrivateFile` (private storage),
   marks the `MediaTranscodeJob` READY, and updates `CreatorMedia`.
5. The worker deletes its temp files (source immediately, output after 120s).

The master file is **never modified** — the worker only reads the downloaded copy.
NC asserts the master URI is unchanged before and after the transcode.

## Contract

| Method | Path | Body | Returns |
|--------|------|------|---------|
| GET | `/health` | — | `{ ok, ffmpeg, ffprobe }` |
| POST | `/inspect` | `{ source_url }` | `{ container, codec, duration_seconds, sample_rate, channels, bit_depth, bitrate_kbps, is_lossless, quality_label }` |
| POST | `/transcode/audio` | `{ job_id, source_url, target_format:"aac", target_bitrate_kbps:256 }` | `{ ok, job_id, source_probe, output_probe, output_url, output_size_bytes, processing_ms }` |
| GET | `/output/:id` | — | derivative binary (120s TTL) |

## Auth

A shared bearer token (`TRANSCODE_WORKER_TOKEN`). NC stores it in
`FounderConfiguration.transcode_worker_config.worker_token`; the worker reads it
from its env. Constant-time comparison. The worker never receives Base44,
storage, or Twilio secrets — only a signed source URL that expires.

## Deploy (DigitalOcean App Platform)

```bash
# 1. Set the shared token (use a long random string)
export TRANSCODE_WORKER_TOKEN="$(openssl rand -hex 32)"

# 2. Deploy the worker
doctl app spec deploy worker/transcode-worker/.do/app.yaml \
  --set-env TRANSCODE_WORKER_TOKEN="$TRANSCODE_WORKER_TOKEN"

# 3. Note the worker's public URL from the doctl output
#    e.g. https://nc-transcode-worker-xxxx.ondigitalocean.app

# 4. Verify the worker is healthy + FFmpeg is present
curl https://<worker-url>/health
# → { "ok": true, "ffmpeg": "ffmpeg version ...", "ffprobe": "ffprobe version ..." }
```

## Configure NC to use the worker

From the running NC app (Founder/Admin), call the `ncCreatorMedia` backend
function with the `set_transcode_config` operation:

```json
{
  "operation": "set_transcode_config",
  "params": {
    "worker_url": "https://nc-transcode-worker-xxxx.ondigitalocean.app",
    "worker_token": "<the same TRANSCODE_WORKER_TOKEN>"
  }
}
```

Or set it directly via the FounderConfiguration entity / the Creator Media Vault UI.

Once configured, `transcode_status` reports `available: true`, and the "Transcode"
button on each audio track dispatches a real FFmpeg job.

## Resource limits

| Limit | Default | Env var |
|-------|---------|---------|
| Max master size | 200 MB | `MAX_MASTER_SIZE_MB` |
| Max duration | 1800s (30min) | `MAX_DURATION_SECONDS` |
| Max concurrent transcodes | 1 | (enforced NC-side) |
| Max attempts | 2 | (enforced NC-side) |

## Local dev

```bash
cd worker/transcode-worker
npm install
TRANSCODE_WORKER_TOKEN=dev-token node server.js
# test: curl -H "Authorization: Bearer dev-token" http://localhost:8080/health
``