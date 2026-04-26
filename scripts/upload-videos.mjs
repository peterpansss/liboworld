#!/usr/bin/env node
// Upload processed exercise videos from libo-app-v2/assets/videos/exercises_4x3/
// to Cloudflare R2 bucket libo-exercise-videos, keyed by <slug>.mp4.
//
// Idempotent: skips files already in R2 with matching size.
// Emits scripts/video-manifest.json with what was uploaded.

import { readdirSync, statSync, createReadStream, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LANDING_DIR = resolve(__dirname, '..');
loadEnv({ path: join(LANDING_DIR, '.env.local') });

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
  R2_BUCKET,
  R2_PUBLIC_BASE = 'https://videos.liboworld.com',
} = process.env;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET) {
  console.error('Missing R2 credentials in libo-landing/.env.local');
  process.exit(1);
}

const VIDEO_DIR = resolve(LANDING_DIR, '../libo-app-v2/assets/videos/exercises_4x3');
const MANIFEST_PATH = join(__dirname, 'video-manifest.json');
const KEY_PREFIX = 'exercises/';
const CONCURRENCY = 4;

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const FORCE = args.has('--force');
const onlyMatch = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function headObject(key) {
  try {
    const out = await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return { exists: true, size: Number(out.ContentLength) };
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 404 || err.name === 'NotFound') return { exists: false };
    throw err;
  }
}

async function uploadOne(file) {
  const localPath = join(VIDEO_DIR, file);
  const size = statSync(localPath).size;
  const slug = file.replace(/\.mp4$/i, '');
  const key = `${KEY_PREFIX}${file}`;
  const publicUrl = `${R2_PUBLIC_BASE}/${key}`;

  if (!FORCE) {
    const head = await headObject(key);
    if (head.exists && head.size === size) {
      return { slug, file, key, publicUrl, size, status: 'skipped-exists' };
    }
  }

  if (DRY_RUN) return { slug, file, key, publicUrl, size, status: 'would-upload' };

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: createReadStream(localPath),
    ContentType: 'video/mp4',
    ContentLength: size,
    // No `immutable` directive — videos at the same URL CAN be replaced
    // (e.g. when voiceover audio is regenerated). Browsers still cache for
    // a year via max-age but will revalidate via ETag on hard-refresh.
    CacheControl: 'public, max-age=31536000',
  }));

  return { slug, file, key, publicUrl, size, status: 'uploaded' };
}

async function runPool(tasks, concurrency) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < tasks.length) {
      const idx = i++;
      try {
        const r = await tasks[idx]();
        results[idx] = r;
        const { status, slug, size } = r;
        const kb = (size / 1024 / 1024).toFixed(1) + 'MB';
        console.log(`[${idx + 1}/${tasks.length}] ${status.padEnd(16)} ${slug} (${kb})`);
      } catch (err) {
        results[idx] = { error: err.message, task: idx };
        console.error(`[${idx + 1}/${tasks.length}] FAILED: ${err.message}`);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

const allFiles = readdirSync(VIDEO_DIR)
  .filter((f) => f.toLowerCase().endsWith('.mp4'))
  .filter((f) => !onlyMatch || f.replace(/\.mp4$/i, '') === onlyMatch)
  .sort();

if (allFiles.length === 0) {
  console.error(`No .mp4 files found in ${VIDEO_DIR}${onlyMatch ? ` matching --only=${onlyMatch}` : ''}`);
  process.exit(1);
}

console.log(`Found ${allFiles.length} video(s) in ${VIDEO_DIR}`);
console.log(`Target: ${R2_ENDPOINT}/${R2_BUCKET}/${KEY_PREFIX}`);
console.log(`Public base: ${R2_PUBLIC_BASE}`);
if (DRY_RUN) console.log('DRY RUN — no uploads will happen');
console.log('');

const results = await runPool(allFiles.map((f) => () => uploadOne(f)), CONCURRENCY);

const summary = results.reduce((acc, r) => {
  acc[r.status || 'errored'] = (acc[r.status || 'errored'] || 0) + 1;
  return acc;
}, {});
console.log('\nSummary:', summary);

writeFileSync(MANIFEST_PATH, JSON.stringify({
  generatedAt: new Date().toISOString(),
  bucket: R2_BUCKET,
  publicBase: R2_PUBLIC_BASE,
  keyPrefix: KEY_PREFIX,
  entries: results.filter((r) => r && !r.error).map(({ slug, file, key, publicUrl, size }) => ({ slug, file, key, publicUrl, size })),
}, null, 2));
console.log(`Wrote ${MANIFEST_PATH}`);
