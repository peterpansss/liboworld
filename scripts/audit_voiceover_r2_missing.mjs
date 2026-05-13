// ============================================================================
// audit_voiceover_r2_missing.mjs
// ============================================================================
// Walks every published exercise (setup_notes + video_url, not archived) and
// probes all 10 voiceover variants on R2 (5 langs × 2 voices). Treats a
// 200/206 as "present" and a 404 as "missing". Retries transient errors
// (timeout / 0 / 5xx) up to 3 times with 500ms backoff before classifying a
// slot as "ambiguous". Excludes slots whose source_text is empty/null.
//
// Output: /tmp/voiceover_missing.json with shape
//   {
//     generated_at, total_exercises, total_slots,
//     confirmed_missing: [{id, slug, lang, voice, source_text}, ...],
//     ambiguous: [{id, slug, lang, voice, url, last_status}, ...],
//     missing_source_text: [{id, slug, lang, voice}, ...]
//   }
//
// Run:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/audit_voiceover_r2_missing.mjs
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

// ── Env ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://oaftqweofrifoiuwntce.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('[fatal] missing SUPABASE_SERVICE_ROLE_KEY env');
  process.exit(1);
}

const R2_BASE = 'https://videos.liboworld.com/exercises';
const LANGS = ['en', 'de', 'es', 'fr', 'pt'];
const VOICES = ['onyx', 'nova'];
const CONCURRENCY = 6;
const MAX_RETRIES = 3;
const BACKOFF_MS = 500;
const REQ_TIMEOUT_MS = 10000;
const OUT_PATH = '/tmp/voiceover_missing.json';

// ── Suffix convention ────────────────────────────────────────────────────
// en+onyx  → ''        (canonical)
// en+nova  → '_nova'
// <l>+<v>  → '_<lang>_<voice>'
function suffixFor(lang, voice) {
  if (lang === 'en' && voice === 'onyx') return '';
  if (lang === 'en' && voice === 'nova') return '_nova';
  return `_${lang}_${voice}`;
}

function r2UrlFor(slug, lang, voice) {
  return `${R2_BASE}/${slug}${suffixFor(lang, voice)}.mp4`;
}

function sourceTextFor(row, lang) {
  if (lang === 'en') return row.setup_notes ?? null;
  return row[`setup_notes_${lang}`] ?? null;
}

// ── HTTP probe with retry ────────────────────────────────────────────────
async function probeOnce(url) {
  const ctl = new AbortController();
  const tid = setTimeout(() => ctl.abort(), REQ_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      signal: ctl.signal,
    });
    // drain body so the socket can be reused (we only care about status)
    try {
      await res.arrayBuffer();
    } catch {
      /* ignore */
    }
    return { status: res.status };
  } catch (e) {
    return { status: 0, error: e?.name === 'AbortError' ? 'timeout' : (e?.message || 'fetch_error') };
  } finally {
    clearTimeout(tid);
  }
}

async function probe(url) {
  let last = { status: 0, error: 'never_ran' };
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    last = await probeOnce(url);
    if (last.status === 200 || last.status === 206 || last.status === 404) {
      return { ...last, attempts: attempt };
    }
    // transient (0 / timeout / 5xx / etc) — back off then retry
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS));
    }
  }
  return { ...last, attempts: MAX_RETRIES };
}

// ── Concurrency pool ─────────────────────────────────────────────────────
async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let idx = 0;
  async function next() {
    while (true) {
      const my = idx++;
      if (my >= items.length) return;
      results[my] = await worker(items[my], my);
    }
  }
  const runners = [];
  for (let i = 0; i < concurrency; i++) runners.push(next());
  await Promise.all(runners);
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  console.log('[start] fetching exercises…');

  // Paginate (Supabase caps default range at 1000)
  const PAGE = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    const { data, error } = await sb
      .from('exercises')
      .select('id, slug, setup_notes, setup_notes_de, setup_notes_es, setup_notes_fr, setup_notes_pt, video_url, status')
      .not('setup_notes', 'is', null)
      .not('video_url', 'is', null)
      .neq('status', 'archived')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('[fatal] fetch failed:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`[plan] ${rows.length} exercises in scope`);

  // Build slot list
  const slots = [];
  for (const row of rows) {
    if (!row.slug) continue;
    for (const lang of LANGS) {
      for (const voice of VOICES) {
        slots.push({
          id: row.id,
          slug: row.slug,
          lang,
          voice,
          url: r2UrlFor(row.slug, lang, voice),
          source_text: sourceTextFor(row, lang),
        });
      }
    }
  }
  console.log(`[plan] ${slots.length} total slots (${rows.length} × 10)`);
  console.log(`[plan] concurrency=${CONCURRENCY} retries=${MAX_RETRIES} timeout=${REQ_TIMEOUT_MS}ms`);

  let done = 0;
  const startedAt = Date.now();
  const tick = setInterval(() => {
    const pct = ((done / slots.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
    const rate = done > 0 ? (done / (Date.now() - startedAt) * 1000).toFixed(1) : '0';
    console.log(`[probe] ${done}/${slots.length} (${pct}%) elapsed=${elapsed}s rate=${rate}/s`);
  }, 5000);

  const probed = await runPool(
    slots,
    async (slot) => {
      const r = await probe(slot.url);
      done++;
      return { slot, status: r.status, error: r.error, attempts: r.attempts };
    },
    CONCURRENCY,
  );

  clearInterval(tick);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[probe] done in ${elapsed}s`);

  // Classify
  const present = [];
  const confirmed_missing = [];
  const ambiguous = [];
  const missing_source_text = [];
  const missingByVariant = {};
  const ambigByVariant = {};

  for (const p of probed) {
    const { slot, status } = p;
    const variantKey = `${slot.lang}_${slot.voice}`;
    if (status === 200 || status === 206) {
      present.push(slot);
    } else if (status === 404) {
      const txt = (slot.source_text ?? '').trim();
      if (!txt) {
        missing_source_text.push({
          id: slot.id,
          slug: slot.slug,
          lang: slot.lang,
          voice: slot.voice,
        });
      } else {
        confirmed_missing.push({
          id: slot.id,
          slug: slot.slug,
          lang: slot.lang,
          voice: slot.voice,
          source_text: txt,
        });
        missingByVariant[variantKey] = (missingByVariant[variantKey] || 0) + 1;
      }
    } else {
      ambiguous.push({
        id: slot.id,
        slug: slot.slug,
        lang: slot.lang,
        voice: slot.voice,
        url: slot.url,
        last_status: status,
        last_error: p.error || null,
      });
      ambigByVariant[variantKey] = (ambigByVariant[variantKey] || 0) + 1;
    }
  }

  const out = {
    generated_at: new Date().toISOString(),
    total_exercises: rows.length,
    total_slots: slots.length,
    present_count: present.length,
    confirmed_missing_count: confirmed_missing.length,
    ambiguous_count: ambiguous.length,
    missing_source_text_count: missing_source_text.length,
    missing_by_variant: missingByVariant,
    ambiguous_by_variant: ambigByVariant,
    confirmed_missing,
    ambiguous,
    missing_source_text,
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

  // Summary
  console.log('');
  console.log('───── audit summary ─────');
  console.log(`total exercises:           ${rows.length}`);
  console.log(`total slots:               ${slots.length}  (${rows.length} × 10)`);
  console.log(`present (200/206):         ${present.length}`);
  console.log(`confirmed missing (404):   ${confirmed_missing.length}`);
  console.log(`ambiguous (after retries): ${ambiguous.length}`);
  console.log(`missing-source-text skip:  ${missing_source_text.length}`);
  console.log('');
  console.log('missing by variant:');
  for (const lang of LANGS) {
    for (const voice of VOICES) {
      const k = `${lang}_${voice}`;
      const n = missingByVariant[k] || 0;
      console.log(`  ${k.padEnd(10)} ${String(n).padStart(5)}`);
    }
  }
  if (ambiguous.length > 0) {
    console.log('');
    console.log('ambiguous by variant:');
    for (const lang of LANGS) {
      for (const voice of VOICES) {
        const k = `${lang}_${voice}`;
        const n = ambigByVariant[k] || 0;
        if (n > 0) console.log(`  ${k.padEnd(10)} ${String(n).padStart(5)}`);
      }
    }
  }
  const projSecs = confirmed_missing.length * 18;
  const projH = (projSecs / 3600).toFixed(1);
  console.log('');
  console.log(`projected worker time @ 18s/job: ~${projH}h (${confirmed_missing.length} jobs)`);
  console.log('');
  console.log(`[done] wrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
