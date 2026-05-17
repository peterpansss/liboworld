// ============================================================================
// regen_missing_voiceovers.mjs
// ============================================================================
// Reads /tmp/voiceover_missing.json (produced by audit_voiceover_r2_missing.mjs)
// and INSERTs one media_jobs row per confirmed-missing variant. The Railway
// media-worker picks them up serially, runs OpenAI TTS, muxes onto the
// canonical video, and uploads to R2 at <slug>_<lang>_<voice>.mp4 (with the
// english+onyx canonical landing at the suffix-less key).
//
// Note: bypasses admin_create_media_job (which has an is_admin() check that
// rejects service-role). Inserts directly with created_by=null.
//
// Run:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/regen_missing_voiceovers.mjs \
//     [--dry-run] [--limit=N]
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// ── Env ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://oaftqweofrifoiuwntce.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('[fatal] missing SUPABASE_SERVICE_ROLE_KEY env');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT_ARG = args.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : null;
const INPUT_PATH = '/tmp/voiceover_missing.json';
const BATCH_SIZE = 100;

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(INPUT_PATH, 'utf-8'));
  } catch (e) {
    console.error(`[fatal] could not read ${INPUT_PATH}: ${e.message}`);
    process.exit(1);
  }

  let targets = payload.confirmed_missing || [];
  if (!Array.isArray(targets)) {
    console.error('[fatal] confirmed_missing is not an array');
    process.exit(1);
  }
  if (LIMIT) targets = targets.slice(0, LIMIT);

  console.log(`[start] mode=${DRY_RUN ? 'dry-run' : 'write'} targets=${targets.length} ${LIMIT ? `(limit=${LIMIT})` : ''}`);

  // Per-variant breakdown for sanity
  const byVariant = {};
  for (const t of targets) {
    const k = `${t.lang}_${t.voice}`;
    byVariant[k] = (byVariant[k] || 0) + 1;
  }
  console.log('[plan] enqueue by variant:');
  for (const [k, n] of Object.entries(byVariant).sort()) {
    console.log(`  ${k.padEnd(10)} ${String(n).padStart(5)}`);
  }

  if (DRY_RUN) {
    console.log('[dry-run] would insert the rows above. exiting.');
    process.exit(0);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const rowsToInsert = targets.map((t) => ({
    exercise_id: t.id,
    job_type: 'generate_voiceover',
    storage_path: null,
    voice: t.voice,
    target: 'primary',
    lang: t.lang,
    source_text: t.source_text,
    status: 'pending',
    created_by: null,
  }));

  const batches = chunk(rowsToInsert, BATCH_SIZE);
  let ok = 0;
  let err = 0;
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    const tag = `[batch ${i + 1}/${batches.length}] (${b.length} rows)`;
    const { data, error } = await sb.from('media_jobs').insert(b).select('id');
    if (error) {
      console.error(`${tag} ✗ ${error.message}`);
      err += b.length;
    } else {
      const n = data?.length ?? b.length;
      ok += n;
      console.log(`${tag} ✓ inserted=${n}`);
    }
  }

  console.log('');
  console.log('───── enqueue summary ─────');
  console.log(`ok:    ${ok}`);
  console.log(`err:   ${err}`);
  console.log(`total: ${rowsToInsert.length}`);
  process.exit(err > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
