#!/usr/bin/env node
// Push marketing/funnel video renditions to Cloudflare R2 under `marketing/`.
//
//   node scripts/upload-marketing-video.mjs <file> [file ...] [--dry-run] [--force]
//
// Sibling of upload-videos.mjs, which does the same for the exercise library
// but scans a fixed directory. Marketing films are one-offs, so this takes
// explicit paths instead. Same bucket, same custom domain, different prefix.
//
// Renditions are produced by scripts/encode-marketing-video.sh. The web app
// references them through react-app/src/data/funnelVideos.ts — if a filename
// changes here, change it there too.

import { statSync, createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, basename } from 'node:path';
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

const KEY_PREFIX = 'marketing/';

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const FORCE = argv.includes('--force');
const files = argv.filter((a) => !a.startsWith('--'));

if (files.length === 0) {
  console.error('usage: upload-marketing-video.mjs <file.mp4> [more...] [--dry-run] [--force]');
  process.exit(1);
}

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

async function uploadOne(localPath) {
  const abs = resolve(localPath);
  const name = basename(abs);
  const size = statSync(abs).size;
  const key = `${KEY_PREFIX}${name}`;
  const publicUrl = `${R2_PUBLIC_BASE}/${key}`;
  const mb = (size / 1024 / 1024).toFixed(1);

  if (!FORCE) {
    const head = await headObject(key);
    if (head.exists && head.size === size) {
      console.log(`skipped-exists   ${name} (${mb}MB)`);
      return publicUrl;
    }
    if (head.exists) {
      console.log(`replacing        ${name} — remote is ${(head.size / 1024 / 1024).toFixed(1)}MB, local ${mb}MB`);
    }
  }

  if (DRY_RUN) {
    console.log(`would-upload     ${name} (${mb}MB) → ${key}`);
    return publicUrl;
  }

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: createReadStream(abs),
    ContentType: 'video/mp4',
    ContentLength: size,
    // Filenames are stable across re-encodes, so the cache is busted by the
    // `?v=` constant in funnelVideos.ts rather than by the key. Not marked
    // `immutable` for the same reason upload-videos.mjs doesn't: a re-cut has
    // to be replaceable at the same URL.
    CacheControl: 'public, max-age=31536000',
  }));

  console.log(`uploaded         ${name} (${mb}MB)`);
  return publicUrl;
}

console.log(`Target: ${R2_ENDPOINT}/${R2_BUCKET}/${KEY_PREFIX}`);
if (DRY_RUN) console.log('DRY RUN — no uploads will happen');
console.log('');

const urls = [];
for (const f of files) urls.push(await uploadOne(f));

console.log('\nPublic URLs:');
for (const u of urls) console.log('  ' + u);
console.log('\nRemember to bump `V` in react-app/src/data/funnelVideos.ts if a file was replaced.');
