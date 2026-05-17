// ============================================================================
// translate_missing_setup_notes.mjs — one-shot bulk translate
// ============================================================================
// Calls Claude Haiku 4.5 directly for every exercise row where:
//   setup_notes IS NOT NULL  AND  setup_notes_de IS NULL
// Writes setup_notes_{de,es,fr,pt} back via the Supabase service-role client.
//
// Uses the same prompt + tool-use schema as the production Edge Function at
// supabase/functions/translate-exercise/index.ts so the output style matches.
//
// Run:
//   ANTHROPIC_API_KEY=sk-ant-... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/translate_missing_setup_notes.mjs [--dry-run] [--limit=N]
//
// --dry-run         show what would be sent + write nothing
// --limit=N         only process the first N missing rows (good for spot-test)
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ── Env ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://oaftqweofrifoiuwntce.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!SERVICE_KEY) {
  console.error('[fatal] missing SUPABASE_SERVICE_ROLE_KEY env');
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  console.error('[fatal] missing ANTHROPIC_API_KEY env');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT_ARG = args.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : null;

const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You translate exercise "setup notes" for the Libo fitness app.

CONTEXT
Setup notes appear in the workout player just before a rep begins. They are short, second-person, imperative ("Plant your feet…", "Brace the core…"). They MUST sound like a gym coach in the target language, not a literal dictionary translation. Match the tone of the 714 existing translations already in the bundled data.

LANGUAGES
Translate English → German (de), Spanish (es), French (fr), Portuguese (pt-BR Brazilian).

LOANWORDS TO KEEP UNTRANSLATED (across all 4 langs)
Workout, Push-Up, Pull-Up, Plank, Burpee, Bonus, Pro, Elite, Challenge, Kettlebell, Cable, Bench Press, Squat (FR also keeps Squat), Cardio.

LOANWORDS TO TRANSLATE (use idiomatic local term)
Lunge, Deadlift, Curl, Row, Raise, Crunch, Twist, Bodyweight, Dumbbell, Barbell, Resistance Bands.

SIDE SUFFIXES
"Left" / "Right" map to:
  de: Links / Rechts
  es: Izquierda / Derecha
  fr: Gauche / Droite
  pt: Esquerda / Direita
For unilateral cues like "stand on your left foot", localize naturally — do not bolt the suffix on robotically.

STYLE
- Second-person imperative.
- Preserve sentence count and rough length (±20%).
- Keep punctuation and any embedded numbers / rep counts unchanged.
- No markdown, no quotes around the output.
- Do not add coaching that wasn't in the English source.

OUTPUT
Return your answer ONLY via the provide_translations tool. Do not write text alongside the tool call.`;

const TOOL = {
  name: 'provide_translations',
  description: 'Return the four translations of the English setup notes. Always call this tool exactly once.',
  input_schema: {
    type: 'object',
    properties: {
      de: { type: 'string', description: 'German translation' },
      es: { type: 'string', description: 'Spanish translation' },
      fr: { type: 'string', description: 'French translation' },
      pt: { type: 'string', description: 'Brazilian Portuguese translation' },
    },
    required: ['de', 'es', 'fr', 'pt'],
    additionalProperties: false,
  },
};

// ── Claude call ──────────────────────────────────────────────────────────
async function callClaude(enText) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'provide_translations' },
      messages: [{ role: 'user', content: enText }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const toolUse = data.content?.find((b) => b.type === 'tool_use');
  if (!toolUse?.input) {
    throw new Error(`No tool_use in response: ${JSON.stringify(data).slice(0, 200)}`);
  }
  const t = toolUse.input;
  if (!t.de || !t.es || !t.fr || !t.pt) {
    throw new Error(`Incomplete tool input: ${JSON.stringify(t)}`);
  }
  return { de: t.de, es: t.es, fr: t.fr, pt: t.pt };
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  console.log(`[start] mode=${DRY_RUN ? 'dry-run' : 'write'} ${LIMIT ? `limit=${LIMIT}` : ''}`);

  // Find missing rows
  let query = sb
    .from('exercises')
    .select('id, slug, setup_notes')
    .not('setup_notes', 'is', null)
    .is('setup_notes_de', null)
    .order('id');
  if (LIMIT) query = query.limit(LIMIT);

  const { data: rows, error } = await query;
  if (error) {
    console.error('[fatal] fetch failed:', error.message);
    process.exit(1);
  }

  const targets = (rows ?? []).filter((r) => (r.setup_notes ?? '').trim().length > 0);
  console.log(`[plan] ${targets.length} rows need translation`);

  let ok = 0, err = 0;
  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const tag = `[${i + 1}/${targets.length}] ${r.id} (${r.slug})`;
    try {
      const t = await callClaude(r.setup_notes);
      if (DRY_RUN) {
        console.log(`${tag} DRY de=${t.de.slice(0, 50)}…`);
      } else {
        const upd = await sb
          .from('exercises')
          .update({
            setup_notes_de: t.de,
            setup_notes_es: t.es,
            setup_notes_fr: t.fr,
            setup_notes_pt: t.pt,
          })
          .eq('id', r.id);
        if (upd.error) throw new Error(`db update: ${upd.error.message}`);
        console.log(`${tag} ✓`);
      }
      ok++;
    } catch (e) {
      console.error(`${tag} ✗ ${e.message}`);
      err++;
    }
  }

  console.log(`[done] ok=${ok} err=${err}`);
  process.exit(err > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
