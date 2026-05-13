#!/usr/bin/env node
/**
 * Backfill legacy setup_notes translations from the public overlay files
 * (react-app/public/exercises.{de,es,fr,pt}.json) into the canonical
 * `exercises` table's setup_notes_{lang} columns.
 *
 * One-shot, idempotent:
 *   - Only writes a setup_notes_{lang} column when it is currently NULL.
 *   - Only writes when the overlay has a non-empty translation for the row's
 *     slug.
 *   - Safe to re-run any time. After Phase 3 rolls translations into Supabase
 *     and the Edge Function becomes the live source of truth, this script
 *     remains a no-op (every column will already be non-NULL).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill_translations.mjs
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill_translations.mjs --dry-run
 *
 * Optional env:
 *   SUPABASE_URL          — defaults to the project URL hardcoded below.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://oaftqweofrifoiuwntce.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error(
    'SUPABASE_SERVICE_ROLE_KEY is required. Set it in your env and re-run.',
  );
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

const LANGS = /** @type {const} */ (['de', 'es', 'fr', 'pt']);

/**
 * Load all four overlay files into memory. Missing files become an empty
 * object — the row still gets written for the langs that DO have coverage.
 */
function loadOverlays() {
  const overlays = {};
  for (const lang of LANGS) {
    const p = path.join(
      REPO_ROOT,
      'react-app',
      'public',
      `exercises.${lang}.json`,
    );
    try {
      const raw = fs.readFileSync(p, 'utf8');
      overlays[lang] = JSON.parse(raw);
      console.log(
        `[overlay] ${lang}: loaded ${Object.keys(overlays[lang]).length} entries from ${path.relative(REPO_ROOT, p)}`,
      );
    } catch (e) {
      console.warn(
        `[overlay] ${lang}: failed to load ${path.relative(REPO_ROOT, p)} — ${e.message}. Continuing with empty overlay for this lang.`,
      );
      overlays[lang] = {};
    }
  }
  return overlays;
}

/**
 * Pull every canonical exercise row missing at least one setup_notes_{lang}.
 * Paginates in chunks of 1000 to defeat the default PostgREST cap.
 */
async function fetchMissingRows(supabase) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('exercises')
      .select(
        'id, slug, setup_notes_de, setup_notes_es, setup_notes_fr, setup_notes_pt',
      )
      .or(
        'setup_notes_de.is.null,setup_notes_es.is.null,setup_notes_fr.is.null,setup_notes_pt.is.null',
      )
      .order('slug', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log(
    `[backfill] mode=${DRY_RUN ? 'dry-run' : 'write'} supabase=${SUPABASE_URL}`,
  );

  const overlays = loadOverlays();
  const rows = await fetchMissingRows(supabase);
  console.log(
    `[backfill] ${rows.length} rows have at least one NULL setup_notes_{lang} column`,
  );

  let updated = 0;
  let skipped = 0;
  let errored = 0;

  for (const row of rows) {
    const patch = {};
    for (const lang of LANGS) {
      const col = `setup_notes_${lang}`;
      // Only fill columns that are currently NULL.
      if (row[col] != null) continue;
      const overlayHit = overlays[lang]?.[row.slug];
      const text =
        overlayHit && typeof overlayHit.setupNotes === 'string'
          ? overlayHit.setupNotes.trim()
          : '';
      if (text.length === 0) continue;
      patch[col] = text;
    }

    if (Object.keys(patch).length === 0) {
      skipped += 1;
      continue;
    }

    if (DRY_RUN) {
      console.log(
        `[dry] ${row.slug} → would set ${Object.keys(patch).join(', ')}`,
      );
      updated += 1;
      continue;
    }

    const { error } = await supabase
      .from('exercises')
      .update(patch)
      .eq('id', row.id);
    if (error) {
      console.error(`[err] ${row.slug}: ${error.message}`);
      errored += 1;
      continue;
    }
    updated += 1;
    if (updated % 25 === 0) {
      console.log(`[progress] updated=${updated} skipped=${skipped} errored=${errored}`);
    }
  }

  console.log(
    `[done] ${updated} rows updated, ${skipped} skipped (no overlay coverage), ${errored} errored`,
  );
  if (errored > 0) process.exit(1);
}

main().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
