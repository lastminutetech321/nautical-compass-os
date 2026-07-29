// NC Transcode Worker — external FFmpeg service for the Creator Media Vault.
//
// The Base44 Deno serverless runtime cannot execute native binaries (platform
// constraint). This standalone Node.js service runs FFmpeg/FFprobe and exposes
// a bounded, synchronous contract that the NC backend (ncCreatorMedia) calls.
//
// CONTRACT (Part 2):
//   GET  /health                          → { ok, ffmpeg, ffprobe }
//   POST /inspect      { source_url }      → { container, codec, duration_seconds, sample_rate, channels, bit_depth, bitrate_kbps, is_lossless, quality_label }
//   POST /transcode/audio { job_id, source_url, target_format, target_bitrate_kbps }
//                                        → { ok, job_id, source_probe, output_probe, output_url, processing_ms }
//   GET  /output/:id                      → derivative binary (short-lived, 120s)
//
// AUTH (Part 14): Bearer token (TRANSCODE_WORKER_TOKEN). Constant-time compare.
// The worker NEVER receives Base44/storage/Twilio secrets — only a signed source URL
// that expires. The derivative is served via an unguessable short-lived URL; NC fetches
// it immediately and stores it privately, then the worker deletes the temp file.
//
// MASTER IMMUTABILITY (Part 7): the worker never writes back to the source. It only
// reads the downloaded copy. The NC side asserts the master URI is unchanged.
//
// TEMP CLEANUP (Part 15): source deleted immediately after transcode; output deleted
// 120s after serving (or on a periodic sweep). No persistent creator media on disk.

import express from 'express';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile, rename, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';

const app = express();
app.use(express.json({ limit: '2mb' }));

const WORKER_TOKEN = process.env.TRANSCODE_WORKER_TOKEN || '';
const MAX_MASTER_SIZE_MB = parseInt(process.env.MAX_MASTER_SIZE_MB || '200', 10);
const MAX_DURATION_SECONDS = parseInt(process.env.MAX_DURATION_SECONDS || '1800', 10);
const OUTPUT_TTL_MS = 120000; // 2 minutes — NC fetches within seconds

const LOSSLESS_CODECS = ['pcm_s16le', 'pcm_s24le', 'pcm_s32le', 'pcm_u8', 'pcm_f32le', 'pcm_s16be', 'pcm_s24be', 'pcm_s32be', 'flac', 'alac', 'mlaw', 'mulaw', 'tta'];
const LOSSY_CODECS = ['mp3', 'aac', 'opus', 'vorbis', 'ac3', 'eac3', 'libmp3lame', 'libopus'];

const tmpRoot = await mkdtemp(join(tmpdir(), 'nc-transcode-'));

// ── Auth (Part 14) ──
function checkAuth(req) {
  if (!WORKER_TOKEN) return false; // fail closed if no token configured
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(WORKER_TOKEN);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function authGuard(req, res) {
  if (!checkAuth(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

// ── ffprobe ──
function runProbe(file) {
  return new Promise((resolve) => {
    execFile('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', file],
      { maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => {
        if (err) return resolve(null);
        try { resolve(JSON.parse(stdout)); } catch { resolve(null); }
      });
  });
}

function parseProbe(data) {
  if (!data) return null;
  const stream = (data.streams || []).find((s) => s.codec_type === 'audio') || (data.streams || [])[0];
  const format = data.format || {};
  const codec = stream?.codec_name || '';
  const isLossless = LOSSLESS_CODECS.includes(codec);
  const isLossy = LOSSY_CODECS.includes(codec);
  return {
    container: (format.format_name || '').split(',')[0] || 'unknown',
    codec,
    duration_seconds: parseFloat(format.duration || stream?.duration || '0') || 0,
    sample_rate: parseInt(stream?.sample_rate || '0', 10) || 0,
    channels: parseInt(stream?.channels || '0', 10) || 0,
    bit_depth: stream?.bits_per_sample && parseInt(stream.bits_per_sample, 10) > 0 ? parseInt(stream.bits_per_sample, 10) : null,
    bitrate_kbps: Math.round((parseInt(format.bit_rate || stream?.bit_rate || '0', 10) || 0) / 1000),
    is_lossless: isLossless,
    quality_label: isLossless ? 'LOSSLESS_SOURCE' : isLossy ? 'LOSSY_SOURCE' : 'UNKNOWN',
  };
}

// ── GET /health ──
app.get('/health', async (_req, res) => {
  try {
    const ff = await new Promise((r) => execFile('ffmpeg', ['-version'], (e, o) => r(e ? null : (o || '').split('\n')[0])));
    const fp = await new Promise((r) => execFile('ffprobe', ['-version'], (e, o) => r(e ? null : (o || '').split('\n')[0])));
    res.json({ ok: true, ffmpeg: ff, ffprobe: fp });
  } catch {
    res.status(500).json({ ok: false, error: 'ffmpeg/ffprobe not available' });
  }
});

// ── POST /inspect (Part 3 — real ffprobe) ──
app.post('/inspect', async (req, res) => {
  if (!authGuard(req, res)) return;
  const { source_url } = req.body || {};
  if (!source_url) return res.status(400).json({ error: 'source_url required' });
  const jobDir = await mkdtemp(join(tmpRoot, 'inspect-'));
  const srcPath = join(jobDir, 'source');
  try {
    const resp = await fetch(source_url);
    if (!resp.ok) throw new Error('source fetch failed: HTTP ' + resp.status);
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length > MAX_MASTER_SIZE_MB * 1024 * 1024) throw new Error(`source exceeds MAX_MASTER_SIZE_MB (${MAX_MASTER_SIZE_MB})`);
    await writeFile(srcPath, buf);
    const probe = parseProbe(await runProbe(srcPath));
    if (!probe) throw new Error('ffprobe failed — unreadable audio');
    res.json(probe);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await rm(jobDir, { recursive: true, force: true });
  }
});

// ── POST /transcode/audio (Part 4 — AAC-LC 256kbps, synchronous) ──
app.post('/transcode/audio', async (req, res) => {
  if (!authGuard(req, res)) return;
  const { job_id, source_url, target_format, target_bitrate_kbps } = req.body || {};
  if (!source_url) return res.status(400).json({ ok: false, error: 'source_url required' });
  if (target_format !== 'aac') return res.status(400).json({ ok: false, error: 'only target_format=aac is supported in this phase' });
  const bitrate = parseInt(target_bitrate_kbps, 10) || 256;
  const start = Date.now();
  const jobDir = await mkdtemp(join(tmpRoot, 'job-'));
  const srcPath = join(jobDir, 'source');
  const outPath = join(jobDir, 'output.m4a');
  try {
    // 1. Download source (Part 5 — signed master URL → temp)
    const resp = await fetch(source_url);
    if (!resp.ok) throw new Error('source fetch failed: HTTP ' + resp.status);
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length > MAX_MASTER_SIZE_MB * 1024 * 1024) throw new Error(`source exceeds MAX_MASTER_SIZE_MB (${MAX_MASTER_SIZE_MB})`);
    await writeFile(srcPath, buf);

    // 2. ffprobe source (Part 3 — real probe, no MIME inference)
    const sourceProbe = parseProbe(await runProbe(srcPath));
    if (!sourceProbe) throw new Error('source ffprobe failed — unreadable audio');
    if (sourceProbe.duration_seconds > MAX_DURATION_SECONDS) throw new Error(`source duration exceeds MAX_DURATION_SECONDS (${MAX_DURATION_SECONDS})`);

    // 3. ffmpeg → AAC-LC 256kbps in m4a (Part 4 — no loudness normalize, no EQ, no resample)
    await new Promise((resolve, reject) => {
      execFile('ffmpeg', ['-y', '-i', srcPath, '-c:a', 'aac', '-b:a', `${bitrate}k`, '-movflags', '+faststart', outPath],
        { maxBuffer: 8 * 1024 * 1024 }, (err, _stdout, stderr) => {
          if (err) reject(new Error('ffmpeg failed: ' + (stderr || err.message).slice(-500)));
          else resolve();
        });
    });

    // 4. ffprobe output (Part 6 — real verification probe)
    const outputProbe = parseProbe(await runProbe(outPath));
    if (!outputProbe) throw new Error('output ffprobe failed — unreadable output');

    // 5. Verify output before READY (Part 6)
    const sizeStat = await stat(outPath);
    const codecMatches = outputProbe.codec === 'aac';
    const bitrateApprox = Math.abs(outputProbe.bitrate_kbps - bitrate) <= bitrate * 0.35;
    const durationApprox = Math.abs(outputProbe.duration_seconds - sourceProbe.duration_seconds) <= 2;
    const sizeNonzero = sizeStat.size > 0;
    if (!(codecMatches && bitrateApprox && durationApprox && sizeNonzero)) {
      throw new Error(`output verification failed: codec=${outputProbe.codec} bitrate=${outputProbe.bitrate_kbps}kbps duration_delta=${Math.abs(outputProbe.duration_seconds - sourceProbe.duration_seconds).toFixed(1)}s size=${sizeStat.size}`);
    }

    // 6. Move output to a short-lived serve dir; clean source + temp immediately (Part 15)
    const outId = randomBytes(12).toString('hex');
    const serveDir = join(tmpRoot, 'serve-' + outId);
    await mkdir(serveDir, { recursive: true });
    await rename(outPath, join(serveDir, 'output.m4a'));
    await rm(jobDir, { recursive: true, force: true });

    const publicUrl = `${req.protocol}://${req.get('host')}/output/${outId}`;
    setTimeout(() => rm(serveDir, { recursive: true, force: true }).catch(() => {}), OUTPUT_TTL_MS);

    res.json({
      ok: true,
      job_id: job_id || null,
      source_probe: sourceProbe,
      output_probe: outputProbe,
      output_url: publicUrl,
      output_size_bytes: sizeStat.size,
      processing_ms: Date.now() - start,
    });
  } catch (e) {
    await rm(jobDir, { recursive: true, force: true }).catch(() => {});
    res.status(500).json({ ok: false, job_id: job_id || null, error: e.message });
  }
});

// ── GET /output/:id (short-lived derivative handoff) ──
app.get('/output/:id', async (req, res) => {
  const file = join(tmpRoot, 'serve-' + req.params.id, 'output.m4a');
  try {
    await stat(file);
    res.setHeader('content-type', 'audio/mp4');
    res.sendFile(file);
  } catch {
    res.status(404).json({ error: 'output expired or not found' });
  }
});

// ── Periodic cleanup safety net (Part 15) ──
setInterval(async () => {
  try {
    const { readdir, stat: st } = await import('node:fs/promises');
    const entries = await readdir(tmpRoot).catch(() => []);
    const now = Date.now();
    for (const name of entries) {
      if (!name.startsWith('serve-')) continue;
      const dir = join(tmpRoot, name);
      const s = await st(dir).catch(() => null);
      if (s && now - s.mtimeMs > OUTPUT_TTL_MS * 2) await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  } catch { /* best effort */ }
}, 60000);

const PORT = parseInt(process.env.PORT || '8080', 10);
app.listen(PORT, () => console.log(`nc-transcode-worker listening on :${PORT}`));