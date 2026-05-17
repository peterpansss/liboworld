#!/usr/bin/env node
// Delete specific objects from Cloudflare R2 by key.
//
// Usage:
//   node delete-r2-objects.mjs <key1> [<key2> ...]
//
// Example:
//   node delete-r2-objects.mjs exercises/childs_pose.mp4 exercises/childs_pose_nova.mp4
//
// Idempotent: missing keys are reported as "not found, skipping" and do not
// cause a non-zero exit. Real errors (auth, network) will exit non-zero.

import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import {
  S3Client,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LANDING_DIR = resolve(__dirname, '..');
loadEnv({ path: join(LANDING_DIR, '.env.local') });

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
  R2_BUCKET,
} = process.env;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET) {
  console.error('Missing R2 credentials in libo-landing/.env.local');
  process.exit(1);
}

const keys = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (keys.length === 0) {
  console.error('Usage: node delete-r2-objects.mjs <key1> [<key2> ...]');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch (err) {
    if (
      err.$metadata?.httpStatusCode === 404 ||
      err.name === 'NotFound' ||
      err.Code === 'NotFound'
    ) {
      return false;
    }
    throw err;
  }
}

async function deleteOne(key) {
  const present = await exists(key);
  if (!present) {
    console.log(`[skip ] ${key} — not found, skipping`);
    return { key, status: 'not-found' };
  }
  const out = await s3.send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })
  );
  const code = out.$metadata?.httpStatusCode ?? '???';
  console.log(`[ok   ] ${key} — deleted (HTTP ${code})`);
  return { key, status: 'deleted', httpStatusCode: code };
}

console.log(`Bucket: ${R2_BUCKET}`);
console.log(`Endpoint: ${R2_ENDPOINT}`);
console.log(`Keys to delete (${keys.length}):`);
for (const k of keys) console.log(`  - ${k}`);
console.log('');

let hadError = false;
const results = [];
for (const key of keys) {
  try {
    results.push(await deleteOne(key));
  } catch (err) {
    hadError = true;
    console.error(`[ERROR] ${key} — ${err.name}: ${err.message}`);
    results.push({ key, status: 'error', error: err.message });
  }
}

const summary = results.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] || 0) + 1;
  return acc;
}, {});
console.log('\nSummary:', summary);

process.exit(hadError ? 1 : 0);
