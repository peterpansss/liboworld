#!/usr/bin/env node
/**
 * Fill the gap in per-exercise setupNotes overlays. The existing overlays at
 * react-app/public/exercises.{de,es,fr,pt}.json each cover ~434 of the 605
 * exercises with non-empty setupNotes — leaving 171 exercises whose detail
 * page falls back to English in non-en locales. This script translates only
 * the missing entries (idempotent — re-running picks up where it stopped) and
 * merges them into the existing overlay file.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/translate-setup-notes.mjs --lang de
 *   ANTHROPIC_API_KEY=sk-... node scripts/translate-setup-notes.mjs --lang es --concurrency 6
 *   ANTHROPIC_API_KEY=sk-... node scripts/translate-setup-notes.mjs --lang all   # de+es+fr+pt sequentially
 *   ANTHROPIC_API_KEY=sk-... node scripts/translate-setup-notes.mjs --lang de --sample 3   # dry-run
 *
 * Cost estimate (Haiku 4.5, 171 entries × 4 langs):
 *   - System prompt cached → ~0.1× rate after first hit per language
 *   - ~250 output tokens per entry × 684 = ~170K output tokens
 *   - Total: ~$0.20 across all four languages
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const EXERCISES_JSON = path.join(REPO_ROOT, 'react-app', 'public', 'exercises.json');
const overlayPath = (lang) =>
  path.join(REPO_ROOT, 'react-app', 'public', `exercises.${lang}.json`);

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};

const LANG = arg('--lang');
const SAMPLE = arg('--sample') ? parseInt(arg('--sample'), 10) : null;
const MODEL = arg('--model') || 'claude-haiku-4-5';
const CONCURRENCY = parseInt(arg('--concurrency') || '4', 10);

const SUPPORTED = ['de', 'es', 'fr', 'pt'];

const LANG_INSTRUCTIONS = {
  de: `Translate to German (Deutsch). Use coach-style, terse, imperative tone with informal "du" form. Match the existing app copy in the Libo locale file (informal, direct).
Vocabulary anchors:
  - Flachbank, Schrägbank, Schrägbank negativ (decline)
  - Power Rack, Smith Machine, Kabelzug (cable), Langhantel (barbell), Kurzhantel (dumbbell), Kettlebell, Widerstandsband
  - Schulterblätter retrahiert, Spotter empfohlen, Lockout / vollständige Streckung
  - Anatomy: Brust, Rücken, Schultern, Bizeps, Trizeps, Quadrizeps, Beinbeuger (hamstrings), Waden, Gesäß, Bauchmuskeln, schräge Bauchmuskeln, unterer Rücken, Latissimus, Trapezius
  - Side cues: links / rechts
Anglicisms accepted in German fitness culture: Power Rack, Lockout, Spotter, Cable, HIIT, Drop Set. Leave them in English where natural.`,
  es: `Translate to Spanish (Español, Latin American / neutral — avoid Iberian "vosotros"). Use coach-style, terse, imperative tone with informal "tú" form. Match the existing app copy in the Libo locale file.
Vocabulary anchors:
  - banco plano, banco inclinado, banco declinado
  - power rack, smith machine, cable / polea, barra (barbell), mancuerna (dumbbell), kettlebell or pesa rusa, banda de resistencia
  - escápulas retraídas, asistente recomendado / spotter, bloqueo (lockout)
  - Anatomy: pecho, espalda, hombros, bíceps, tríceps, cuádriceps, isquiotibiales, pantorrillas, glúteos, abdominales, oblicuos, zona lumbar, dorsales, trapecios, core
  - Side cues: izquierda / derecha
Anglicisms accepted in Spanish fitness culture: power rack, spotter, lockout, HIIT, drop set, core. Leave them in English where natural.`,
  fr: `Translate to French (Français). Use coach-style, terse, imperative tone with informal "tu" form. Match the existing app copy in the Libo locale file.
Vocabulary anchors:
  - banc plat, banc incliné, banc décliné
  - power rack, Smith Machine, poulie (cable), barre (barbell), haltère (dumbbell), kettlebell, élastique (resistance band)
  - omoplates rétractées, pareur recommandé, lockout / verrouillage complet
  - Anatomy: poitrine, dos, épaules, biceps, triceps, quadriceps, ischio-jambiers, mollets, fessiers, abdos, obliques, bas du dos, grand dorsal, trapèzes
  - Side cues: gauche / droite
Anglicisms accepted in French fitness culture: power rack, lockout, HIIT, drop set, hip thrust. Leave them in English where natural.`,
  pt: `Translate to Brazilian Portuguese (Português do Brasil — pt-BR). Use coach-style, terse, imperative tone with informal "você" form (often dropping the pronoun, using 3rd-person verbs as imperatives — e.g. "desce", "empurra", "mantém"). Match the existing app copy in the Libo locale file.
Vocabulary anchors:
  - banco reto, banco inclinado, banco declinado
  - power rack, smith machine, polia / cabo, barra (barbell), halter (dumbbell), kettlebell, faixa elástica (resistance band)
  - escápulas retraídas, spotter recomendado, extensão completa / lockout
  - Anatomy: peito, costas, ombros, bíceps, tríceps, quadríceps, posteriores da coxa, panturrilhas, glúteos, abdominais, oblíquos, lombar, latíssimo, trapézio
  - Side cues: esquerda / direita
Anglicisms accepted in BR fitness culture: power rack, spotter, lockout, HIIT, drop set, hip thrust, core. Leave them in English where natural.`,
};

const SYSTEM_PROMPT_BASE = `You translate exercise setup notes for a strength-training app's exercise library. The notes are terse, imperative coaching cues describing where to set up the equipment, body position, and the basic movement pattern.

Style rules:
- Match the source's brevity and structure — same number of sentences, same use of em-dashes (—) for cause-effect, same pattern of comma-separated cues.
- Use second-person imperative voice (informal — see the language-specific instructions below).
- Translate fitness-specific anatomy and equipment terms naturally; do NOT translate proper nouns (Smith Machine, Bowflex, exercise names) or numbers/units (30-45 degrees → use the target language's standard for "degrees").
- Preserve em-dashes and punctuation pattern when possible. The source uses "—" (Unicode em-dash, U+2014) for cause-effect; mirror it.
- No preamble, no explanation, no quotes around the output. Output ONLY the translated string.

`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    setupNotes: { type: 'string' },
  },
  required: ['setupNotes'],
  additionalProperties: false,
};

function userPromptFor(ex) {
  return `Exercise: ${ex.name}
Body focus: ${ex.bodyFocus}
Equipment: ${ex.equipment}
Source setup notes (English):
${ex.setupNotes}

Translate the setup notes following the style rules. Output the JSON object.`;
}

async function translateOne(client, ex, lang) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 768,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT_BASE + LANG_INSTRUCTIONS[lang],
        cache_control: { type: 'ephemeral' },
      },
    ],
    output_config: {
      format: {
        type: 'json_schema',
        schema: OUTPUT_SCHEMA,
      },
    },
    messages: [{ role: 'user', content: userPromptFor(ex) }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error(`No text block returned for ${ex.id}`);
  const parsed = JSON.parse(textBlock.text);
  if (typeof parsed.setupNotes !== 'string' || parsed.setupNotes.length < 5) {
    throw new Error(`Invalid response shape for ${ex.id}`);
  }
  return { setupNotes: parsed.setupNotes, usage: response.usage };
}

async function runWithConcurrency(items, fn, concurrency) {
  let nextIndex = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      try {
        await fn(items[i], i);
      } catch (err) {
        console.error(`  ✗ ${items[i].id}: ${err.message}`);
      }
    }
  });
  await Promise.all(workers);
}

function loadOverlay(lang) {
  try {
    return JSON.parse(fs.readFileSync(overlayPath(lang), 'utf8'));
  } catch {
    return {};
  }
}

function saveOverlay(lang, overlay) {
  fs.writeFileSync(overlayPath(lang), JSON.stringify(overlay, null, 2) + '\n');
}

async function translateLang(client, lang, exercises) {
  const overlay = loadOverlay(lang);
  const candidates = exercises.filter(
    (e) =>
      e.setupNotes &&
      e.setupNotes.length > 5 &&
      !overlay[e.id]?.setupNotes,
  );
  const batch = SAMPLE != null ? candidates.slice(0, SAMPLE) : candidates;

  console.log(`\n[${lang}] Overlay: ${Object.keys(overlay).length} entries · Missing translations: ${candidates.length} · Translating now: ${batch.length}`);
  if (batch.length === 0) {
    console.log(`[${lang}] Nothing to do.`);
    return { lang, completed: 0, total: 0 };
  }

  let completed = 0;
  let pendingSinceSave = 0;
  const SAVE_EVERY = 15;
  const errors = [];
  let outputTotal = 0;
  let inputTotal = 0;
  let cacheReadTotal = 0;

  await runWithConcurrency(
    batch,
    async (ex) => {
      try {
        const { setupNotes, usage } = await translateOne(client, ex, lang);
        overlay[ex.id] = { setupNotes };
        completed++;
        outputTotal += usage.output_tokens || 0;
        inputTotal += usage.input_tokens || 0;
        cacheReadTotal += usage.cache_read_input_tokens || 0;
        pendingSinceSave++;
        if (pendingSinceSave >= SAVE_EVERY) {
          saveOverlay(lang, overlay);
          pendingSinceSave = 0;
        }
        const tag = (usage.cache_read_input_tokens || 0) > 0 ? 'cached' : 'fresh';
        console.log(`  [${lang}] ✓ ${completed}/${batch.length} ${ex.id} (${tag} · out:${usage.output_tokens})`);
      } catch (err) {
        errors.push({ id: ex.id, error: err.message });
      }
    },
    CONCURRENCY,
  );

  saveOverlay(lang, overlay);

  console.log(`\n[${lang}] Done — ${completed}/${batch.length} translated · errors: ${errors.length}`);
  console.log(`[${lang}] Tokens — input: ${inputTotal}, output: ${outputTotal}, cache reads: ${cacheReadTotal}`);
  if (errors.length) {
    console.log(`[${lang}] First 5 errors:`);
    for (const e of errors.slice(0, 5)) console.log(`  ${e.id}: ${e.error}`);
  }
  return { lang, completed, total: batch.length, errors: errors.length };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
  }
  if (!LANG) {
    console.error('--lang required (de | es | fr | pt | all)');
    process.exit(1);
  }
  const langs = LANG === 'all' ? SUPPORTED : [LANG];
  for (const l of langs) {
    if (!SUPPORTED.includes(l)) {
      console.error(`Unsupported language: ${l}. Use one of: ${SUPPORTED.join(', ')} or 'all'.`);
      process.exit(1);
    }
  }

  const exercises = JSON.parse(fs.readFileSync(EXERCISES_JSON, 'utf8'));
  const client = new Anthropic();

  console.log(`Model: ${MODEL} · Concurrency: ${CONCURRENCY} · Source: ${exercises.length} exercises`);
  if (SAMPLE != null) console.log(`Dry-run sample: ${SAMPLE} per language`);

  const summaries = [];
  for (const lang of langs) {
    summaries.push(await translateLang(client, lang, exercises));
  }

  console.log('\n=== Summary ===');
  for (const s of summaries) {
    console.log(`  ${s.lang}: ${s.completed}/${s.total} translated, ${s.errors ?? 0} errors`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
