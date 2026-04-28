#!/usr/bin/env node
// Populate videoUrl in libo-app-v2/src/data/exercises.json for every exercise
// whose slug has a matching processed video in exercises_4x3/.
// After running, run sync-from-excel.py to propagate to libo-landing/libo-data.js.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LANDING_DIR = resolve(__dirname, '..');
loadEnv({ path: join(LANDING_DIR, '.env.local') });

const PUBLIC_BASE = process.env.R2_PUBLIC_BASE || 'https://videos.liboworld.com';
const KEY_PREFIX = 'exercises/';

const VIDEO_DIR = resolve(LANDING_DIR, '../libo-app-v2/assets/videos/exercises_4x3');
const EXERCISES_JSON = resolve(LANDING_DIR, '../libo-app-v2/src/data/exercises.json');

const DRY_RUN = process.argv.includes('--dry-run');

const allSlugs = readdirSync(VIDEO_DIR)
  .filter((f) => f.toLowerCase().endsWith('.mp4'))
  .map((f) => f.replace(/\.mp4$/i, ''));

// Alt-angle slugs end in `_side_view`. They are NOT independent exercises —
// they belong to the base slug (the same exercise shot from a second camera).
// Keep them out of the primary lookup so they don't get matched as orphan
// exercises; surface them via altSlugByBase for videoUrlAlt population.
const ALT_SUFFIX = '_side_view';
const altSlugByBase = new Map();
const slugsWithVideo = new Set();
for (const slug of allSlugs) {
  if (slug.endsWith(ALT_SUFFIX)) {
    altSlugByBase.set(slug.slice(0, -ALT_SUFFIX.length), slug);
  } else {
    slugsWithVideo.add(slug);
  }
}

console.log(`${slugsWithVideo.size} primary slugs + ${altSlugByBase.size} alt-angle slugs in ${VIDEO_DIR}`);

const exercises = JSON.parse(readFileSync(EXERCISES_JSON, 'utf8'));

// Some exercises are split into _left/_right variants but share one video clip.
// Some have apostrophe-normalization differences (farmer_s_walk vs farmers_walk).
// Try direct match, then sideless fallback, then s-contraction fallback.
const SIDE_SUFFIXES = [
  '_left_side', '_right_side',
  '_left_leg', '_right_leg',
  '_left_arm', '_right_arm',
  '_left_hip', '_right_hip',
  '_left', '_right',
];

function candidateVideoSlugs(exerciseSlug) {
  const out = new Set([exerciseSlug]);
  // strip side suffix
  for (const suf of SIDE_SUFFIXES) {
    if (exerciseSlug.endsWith(suf)) out.add(exerciseSlug.slice(0, -suf.length));
  }
  // s-contraction: farmer_s_walk -> farmers_walk, child_s_pose -> childs_pose
  for (const c of [...out]) out.add(c.replace(/_s_/g, 's_'));
  return [...out];
}

let added = 0;
let unchanged = 0;
let altAdded = 0;
let altUnchanged = 0;
let altRemoved = 0;
const usedSlugs = new Set();
const usedAltSlugs = new Set();

for (const ex of exercises) {
  if (!ex.slug) continue;
  let matchedBase = null;
  for (const cand of candidateVideoSlugs(ex.slug)) {
    if (slugsWithVideo.has(cand)) {
      usedSlugs.add(cand);
      matchedBase = cand;
      const url = `${PUBLIC_BASE}/${KEY_PREFIX}${cand}.mp4`;
      if (ex.videoUrl === url) unchanged++;
      else { ex.videoUrl = url; added++; }
      break;
    }
  }
  // If we matched a base slug, check whether an alt-angle clip exists for it.
  if (matchedBase) {
    const altSlug = altSlugByBase.get(matchedBase);
    if (altSlug) {
      usedAltSlugs.add(altSlug);
      const altUrl = `${PUBLIC_BASE}/${KEY_PREFIX}${altSlug}.mp4`;
      if (ex.videoUrlAlt === altUrl) altUnchanged++;
      else { ex.videoUrlAlt = altUrl; altAdded++; }
    } else if (ex.videoUrlAlt) {
      // Alt clip was deleted upstream — clean stale field
      delete ex.videoUrlAlt;
      altRemoved++;
    }
  }
}

const orphanSlugs = [...slugsWithVideo].filter((s) => !usedSlugs.has(s));
const orphanAltSlugs = [...altSlugByBase.values()].filter((s) => !usedAltSlugs.has(s));

console.log(`\nResults:`);
console.log(`  Exercises updated:      ${added}`);
console.log(`  Exercises already set:  ${unchanged}`);
console.log(`  Alt-angle videoUrlAlt added:    ${altAdded}`);
console.log(`  Alt-angle videoUrlAlt cached:   ${altUnchanged}`);
if (altRemoved) console.log(`  Alt-angle videoUrlAlt removed:  ${altRemoved}`);
console.log(`  Orphan video files (no matching exercise slug): ${orphanSlugs.length}`);
if (orphanSlugs.length) {
  console.log(`  Orphan slugs: ${orphanSlugs.sort().join(', ')}`);
}
if (orphanAltSlugs.length) {
  console.log(`  Orphan alt-angle slugs (base not matched): ${orphanAltSlugs.sort().join(', ')}`);
}

if (DRY_RUN) {
  console.log('\nDRY RUN — no files written');
} else {
  writeFileSync(EXERCISES_JSON, JSON.stringify(exercises, null, 2) + '\n');
  console.log(`\nWrote ${EXERCISES_JSON}`);
  console.log('Next: run `python3 ../sync-from-excel.py` to propagate videoUrl into libo-data.js');
}
