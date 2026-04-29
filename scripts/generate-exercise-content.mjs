#!/usr/bin/env node
/**
 * Generate per-exercise tips, common mistakes, and breathing cue for the
 * 680-exercise library. Output is a sidecar JSON file the landing app loads
 * alongside exercises.json — the app falls back to heuristic getTips() /
 * getCommonMistakes() when an exercise has no AI content yet.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-exercise-content.mjs           # dry-run, 5 sample exercises
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-exercise-content.mjs --all     # all exercises
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-exercise-content.mjs --filter chest    # only chest
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-exercise-content.mjs --model claude-haiku-4-5
 *
 * Resumable: re-running picks up exercises not yet present in the sidecar.
 *
 * Cost estimate (680 exercises, Opus 4.7 default):
 *   - System prompt cached → ~0.1× rate for repeats
 *   - Output: 680 × ~450 tokens × $25/Mtok = ~$7.65
 *   - Input: 680 × ~150 tokens × $5/Mtok = ~$0.51
 *   - Total: ~$8 one-time
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const EXERCISES_JSON = path.join(REPO_ROOT, 'react-app', 'public', 'exercises.json');
const OUT_PATH = path.join(REPO_ROOT, 'react-app', 'public', 'exercise_content.json');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};

const ALL = flag('--all');
const SAMPLE = parseInt(arg('--sample') || '5', 10);
const FILTER = arg('--filter')?.toLowerCase();
const MODEL = arg('--model') || 'claude-opus-4-7';
const CONCURRENCY = parseInt(arg('--concurrency') || '4', 10);

const SYSTEM_PROMPT = `You are a strength and conditioning coach writing brief, actionable form notes for a fitness app's exercise library. For each exercise the user provides, you produce three things:

1. **Tips** — 3 to 4 concise tips on doing the exercise well. Focus on form cues a trainee will actually feel and check (e.g. "drive through your heels", "keep your wrists stacked over elbows"). Avoid platitudes ("listen to your body"). Each tip is one sentence, ≤ 18 words.

2. **Common Mistakes** — 3 to 4 specific mistakes a beginner-to-intermediate lifter is likely to make on this exercise, each paired with the fix in the same sentence. Format: "<Mistake> — <fix>." Each ≤ 22 words.

3. **Breathing Cue** — one short sentence describing when to inhale and exhale during this exercise. ≤ 18 words.

Style rules:
- Use second-person ("you") in tips/mistakes, imperative voice in the breathing cue.
- No emojis. No markdown. No bullet markers in the strings (the array format already conveys that).
- Be specific to the exercise — don't write generic gym advice. If it's a barbell bench press, talk about scapular retraction, bar path, leg drive. If it's a couch stretch, talk about pelvic tilt and quad lengthening.
- For mobility/stretching exercises, "Common Mistakes" should be about poor execution patterns, not "going too hard".
- For unilateral / left-right variants (e.g. "Single-Arm Dumbbell Row — Left"), treat them like the parent movement; tips/mistakes apply to one side.

Output a JSON object matching the provided schema exactly. Do not include any text outside the JSON.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    tips: {
      type: 'array',
      items: { type: 'string' },
    },
    commonMistakes: {
      type: 'array',
      items: { type: 'string' },
    },
    breathingCue: { type: 'string' },
  },
  required: ['tips', 'commonMistakes', 'breathingCue'],
  additionalProperties: false,
};

function userPromptFor(ex) {
  return `Exercise:
Name: ${ex.name}
Body Focus: ${ex.bodyFocus}
Equipment: ${ex.equipment}
Difficulty: ${ex.diff}
Category: ${ex.cat}${ex.primaryCat ? ` · ${ex.primaryCat}` : ''}${ex.subcat ? ` · ${ex.subcat}` : ''}
Setup notes (existing copy): ${ex.setupNotes || '(none)'}

Generate tips, common mistakes, and a breathing cue for this exercise.`;
}

async function generateOne(client, ex) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
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

  if (
    !Array.isArray(parsed.tips) ||
    !Array.isArray(parsed.commonMistakes) ||
    typeof parsed.breathingCue !== 'string'
  ) {
    throw new Error(`Invalid response shape for ${ex.id}`);
  }

  return {
    content: parsed,
    usage: response.usage,
  };
}

async function runWithConcurrency(items, fn, concurrency) {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      try {
        results[i] = await fn(items[i], i);
      } catch (err) {
        results[i] = { error: err };
      }
    }
  });

  await Promise.all(workers);
  return results;
}

function loadExisting() {
  try {
    return JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveContent(map) {
  fs.writeFileSync(OUT_PATH, JSON.stringify(map, null, 2));
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
  }

  const exercises = JSON.parse(fs.readFileSync(EXERCISES_JSON, 'utf8'));
  const existing = loadExisting();

  let candidates = exercises.filter((e) => !existing[e.id]);
  if (FILTER) {
    candidates = candidates.filter(
      (e) =>
        e.bodyFocus.toLowerCase().includes(FILTER) ||
        e.equipment.toLowerCase().includes(FILTER) ||
        e.name.toLowerCase().includes(FILTER),
    );
  }
  if (!ALL) candidates = candidates.slice(0, SAMPLE);

  console.log(`Model: ${MODEL}`);
  console.log(`Existing entries: ${Object.keys(existing).length}/${exercises.length}`);
  console.log(`Generating: ${candidates.length} exercise(s)`);
  if (!ALL) console.log(`(Dry-run sample. Use --all to process every remaining exercise.)`);
  if (candidates.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const client = new Anthropic();

  let completed = 0;
  let cacheReadTotal = 0;
  let cacheWriteTotal = 0;
  let inputTotal = 0;
  let outputTotal = 0;
  const errors = [];

  // Save incrementally — every 10 entries.
  const SAVE_EVERY = 10;
  let pendingSinceSave = 0;

  await runWithConcurrency(
    candidates,
    async (ex) => {
      try {
        const { content, usage } = await generateOne(client, ex);
        existing[ex.id] = content;
        completed++;
        cacheReadTotal += usage.cache_read_input_tokens || 0;
        cacheWriteTotal += usage.cache_creation_input_tokens || 0;
        inputTotal += usage.input_tokens || 0;
        outputTotal += usage.output_tokens || 0;

        pendingSinceSave++;
        if (pendingSinceSave >= SAVE_EVERY) {
          saveContent(existing);
          pendingSinceSave = 0;
        }

        const cacheTag = usage.cache_read_input_tokens > 0 ? 'cached' : 'fresh';
        console.log(
          `  ✓ [${completed}/${candidates.length}] ${ex.id} (${cacheTag} · in:${usage.input_tokens} out:${usage.output_tokens})`,
        );
      } catch (err) {
        errors.push({ id: ex.id, error: err.message });
        console.error(`  ✗ ${ex.id}: ${err.message}`);
      }
    },
    CONCURRENCY,
  );

  saveContent(existing);

  console.log('\n--- Summary ---');
  console.log(`Completed: ${completed}/${candidates.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Tokens — input: ${inputTotal}, output: ${outputTotal}`);
  console.log(`Cache — writes: ${cacheWriteTotal}, reads: ${cacheReadTotal}`);
  console.log(`Output: ${path.relative(REPO_ROOT, OUT_PATH)}`);

  if (errors.length) {
    console.log('\nFirst 5 errors:');
    for (const e of errors.slice(0, 5)) console.log(`  ${e.id}: ${e.error}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
