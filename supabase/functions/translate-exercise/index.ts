// ============================================================================
// translate-exercise — Supabase Edge Function (Deno)
// ============================================================================
// Auto-translates an exercise's English `setup_notes` into DE / ES / FR / PT
// via the Anthropic Claude API (Haiku, with tool-use for structured output and
// prompt caching on the system block). Writes back to
// `exercises.setup_notes_{de,es,fr,pt}` via the service-role client.
//
// Auth: caller must be a logged-in admin. We read `Authorization: Bearer <jwt>`,
// resolve the user, then call the existing `public.is_admin()` RPC. Non-admin
// callers get 403. Deploy with `--no-verify-jwt` because we do our own auth
// (we still need the JWT in the body to resolve the user — Supabase's verify
// also requires anon key issuance, which is not what we want for an admin tool).
//
// Required Supabase secrets (set via `supabase secrets set ...`):
//   ANTHROPIC_API_KEY           sk-ant-…
//   SUPABASE_URL                (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY   (auto-provided)
//
// Deploy:
//   cd libo-landing
//   supabase functions deploy translate-exercise --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@^2';

// ── CORS ──────────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN = 'https://liboworld.com';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ── Env ───────────────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Latest Haiku — translation is simple, no need for Sonnet/Opus.
const MODEL = 'claude-haiku-4-5-20251001';

// ── Prompt ────────────────────────────────────────────────────────────────
// System prompt is marked with cache_control so multiple translate calls in
// quick succession (e.g. bulk re-translate after a copy edit) reuse the cache
// and pay ~10% of input tokens after the first hit.
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

const TOOL_DEFINITION = {
  name: 'provide_translations',
  description:
    'Return the four translations of the English setup notes. Always call this tool exactly once.',
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

// ── Types ────────────────────────────────────────────────────────────────
type ReqBody = { exercise_id?: string; en_text?: string };
type Translations = { de: string; es: string; fr: string; pt: string };

// ── Anthropic call ───────────────────────────────────────────────────────
async function callClaude(enText: string): Promise<Translations> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [TOOL_DEFINITION],
      tool_choice: { type: 'tool', name: 'provide_translations' },
      messages: [{ role: 'user', content: enText }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`anthropic_${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const block = (data?.content ?? []).find(
    (b: { type: string; name?: string }) =>
      b.type === 'tool_use' && b.name === 'provide_translations',
  );
  if (!block?.input) throw new Error('no_tool_use_block');

  const { de, es, fr, pt } = block.input as Partial<Translations>;
  if (!de || !es || !fr || !pt) throw new Error('incomplete_translations');
  return { de, es, fr, pt };
}

// ── Handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
  }
  if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ ok: false, error: 'server_misconfigured' }, 500);
  }

  // ── Parse body ─────────────────────────────────────────────────────────
  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
  }
  const exercise_id = (body.exercise_id ?? '').trim();
  const en_text = (body.en_text ?? '').trim();
  if (!exercise_id) return jsonResponse({ ok: false, error: 'missing_exercise_id' }, 400);
  if (!en_text) return jsonResponse({ ok: false, error: 'missing_en_text' }, 400);
  if (en_text.length > 4000) {
    return jsonResponse({ ok: false, error: 'en_text_too_long' }, 400);
  }

  // ── Auth: JWT → user → is_admin() ──────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!jwt) return jsonResponse({ ok: false, error: 'missing_jwt' }, 403);

  // Service-role client for the actual DB write. We pass the caller's JWT
  // explicitly when checking admin status so RLS / auth.uid() resolves to
  // them, not the service role.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userRes?.user) {
    return jsonResponse({ ok: false, error: 'invalid_jwt' }, 403);
  }

  // Caller-scoped client just for the is_admin RPC so auth.uid() = caller.
  const asCaller = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: isAdmin, error: adminErr } = await asCaller.rpc('is_admin');
  if (adminErr) {
    console.error('is_admin RPC error', adminErr);
    return jsonResponse({ ok: false, error: 'auth_check_failed' }, 500);
  }
  if (!isAdmin) return jsonResponse({ ok: false, error: 'forbidden' }, 403);

  // ── Call Claude ────────────────────────────────────────────────────────
  let translations: Translations;
  try {
    translations = await callClaude(en_text);
  } catch (e) {
    console.error('Claude failure', e);
    return jsonResponse(
      { ok: false, error: `translation_failed: ${(e as Error).message}` },
      502,
    );
  }

  // ── Write back ─────────────────────────────────────────────────────────
  const { error: updateErr } = await admin
    .from('exercises')
    .update({
      setup_notes_de: translations.de,
      setup_notes_es: translations.es,
      setup_notes_fr: translations.fr,
      setup_notes_pt: translations.pt,
    })
    .eq('id', exercise_id);

  if (updateErr) {
    console.error('exercises update failed', updateErr);
    return jsonResponse({ ok: false, error: 'db_write_failed' }, 500);
  }

  return jsonResponse({ ok: true, exercise_id, translations });
});
