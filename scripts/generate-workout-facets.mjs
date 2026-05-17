#!/usr/bin/env node
/**
 * Build workout-facets.json — the index that powers /best-workouts/<slug>
 * SEO landing pages. Joins workouts.json against exercises.json to derive
 * muscle/equipment/setting/duration/goal facets per workout, then groups by
 * facet for fast page lookup.
 *
 *   read   react-app/public/exercises.json
 *          react-app/public/workouts.json
 *   write  react-app/public/workout-facets.json
 *
 * Run:    node scripts/generate-workout-facets.mjs
 *         node scripts/generate-workout-facets.mjs --print  (coverage only)
 *
 * Why precomputed: workouts have no native muscle/equipment fields. Deriving
 * at runtime would force every page to load the full 781-exercise catalog
 * just to filter the workout list. Precomputing lets the page bundle stay
 * tiny and lets prerender-meta.mjs inject ItemList JSON-LD for rich results.
 *
 * Facet thresholds match the user-visible expectation:
 *   - Equipment: ≥50% of MAIN-phase exercises must require the equipment
 *     family. (Avoids tagging a bodyweight workout as "Barbell" because of
 *     one accessory move in the warmup.)
 *   - Muscle: ≥40% of MAIN-phase exercises must hit the body region. Lower
 *     than equipment because most workouts hit several muscles by design.
 *   - Setting: every MAIN exercise must have environment compatible with
 *     the setting (Home: env in {Home, Both}; Gym: env in {Gym, Both}).
 *
 * Playable filter is applied first so cards on the SEO page link to the
 * same workouts the live ProgramLibrary shows.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const EXERCISES_JSON = path.join(REPO_ROOT, 'react-app', 'public', 'exercises.json');
const WORKOUTS_JSON = path.join(REPO_ROOT, 'react-app', 'public', 'workouts.json');
const OUT_JSON = path.join(REPO_ROOT, 'react-app', 'public', 'workout-facets.json');

const PRINT_ONLY = process.argv.includes('--print');
const MIN_WORKOUTS_PER_FACET = 3;

// ---------------------------------------------------------------------------
// Facet taxonomy. The slug is the URL fragment. The label is the H1 fragment.
// Equipment/muscle facets carry a `match` predicate over a single exercise.

const MUSCLE_FACETS = [
  { slug: 'upper-body', label: 'Upper Body', tokens: ['chest', 'back', 'shoulders', 'arms', 'biceps', 'triceps', 'lats', 'traps', 'forearms', 'rear delts', 'rotator cuff', 'upper body'] },
  { slug: 'lower-body', label: 'Lower Body', tokens: ['legs', 'glutes', 'quads', 'hamstrings', 'calves', 'hips', 'adductors', 'hip flexors', 'it band', 'lower body'] },
  { slug: 'full-body',  label: 'Full Body',  tokens: ['full body'] },
  { slug: 'chest',      label: 'Chest',      tokens: ['chest'] },
  { slug: 'back',       label: 'Back',       tokens: ['back', 'lats'] },
  { slug: 'shoulders',  label: 'Shoulder',   tokens: ['shoulders', 'shoulder', 'rotator cuff', 'rear delts'] },
  { slug: 'arms',       label: 'Arm',        tokens: ['biceps', 'triceps', 'forearms'] },
  { slug: 'legs',       label: 'Leg',        tokens: ['legs', 'quads', 'hamstrings', 'calves', 'hip flexors'] },
  { slug: 'core',       label: 'Core',       tokens: ['core', 'obliques', 'abs', 'lower abs'] },
  { slug: 'glutes',     label: 'Glute',      tokens: ['glutes'] },
];

const EQUIPMENT_FACETS = [
  { slug: 'bodyweight',      label: 'Bodyweight',      match: (eq) => !eq || eq === 'bodyweight' },
  { slug: 'dumbbell',        label: 'Dumbbell',        match: (eq) => eq === 'dumbbell' || eq === 'dumbbell, ball' },
  { slug: 'barbell',         label: 'Barbell',         match: (eq) => eq === 'barbell' || eq === 'ez-bar' || eq === 'trap bar' },
  { slug: 'kettlebell',      label: 'Kettlebell',      match: (eq) => eq === 'kettlebell' },
  { slug: 'resistance-band', label: 'Resistance Band', match: (eq) => eq === 'resistance bands' },
  { slug: 'machine',         label: 'Machine',         match: (eq) => /^(cable|cable machine|machine|smith machine|air bike|elliptical|rowing machine|treadmill|stairmaster|stationary bike|ski erg)$/i.test(eq) },
];

const SETTING_FACETS = [
  { slug: 'home', label: 'Home', envOk: (env) => env === 'home' || env === 'both' },
  { slug: 'gym',  label: 'Gym',  envOk: (env) => env === 'gym'  || env === 'both' },
];

const DURATION_FACETS = [
  { slug: '15-minute', label: '15-Minute', match: (d) => d > 0 && d <= 15 },
  { slug: '30-minute', label: '30-Minute', match: (d) => d > 15 && d <= 30 },
  { slug: '45-minute', label: '45-Minute', match: (d) => d > 30 && d <= 45 },
];

const GOAL_FACETS = [
  { slug: 'strength',   label: 'Strength' },
  { slug: 'cardio',     label: 'Cardio' },
  { slug: 'mobility',   label: 'Mobility' },
  { slug: 'stretching', label: 'Stretching' },
  { slug: 'recovery',   label: 'Recovery' },
];

// Mirrors classifyGoal in ProgramLibrary.tsx — keep in sync.
function classifyGoal(w) {
  const cat = (w.cat || '').toLowerCase();
  const sub = (w.subcat || '').toLowerCase();
  if (sub === 'before sleep') return 'Evening';
  if (sub === 'wake-up') return 'Morning';
  if (sub === 'mobility' || sub === 'dynamic mobility') return 'mobility';
  if (sub === 'recovery' || sub.includes('rehab')) return 'recovery';
  if (cat === 'cardio' || sub.includes('hiit') || sub.includes('cardio') || sub === 'steady-state') return 'cardio';
  if (cat === 'morning routine') return 'Morning';
  if (cat === 'stretching') return 'stretching';
  return 'strength';
}

// ---------------------------------------------------------------------------
// Playable filter — matches src/hooks/useExercises.ts isPlayable.

function buildChildrenWithVideoByParent(exercises) {
  const set = new Set();
  for (const e of exercises) if (e.parentId && e.videoUrl) set.add(e.parentId);
  return set;
}

function isPlayable(ex, childrenSet) {
  if (ex.videoUrl) return true;
  if (ex.parentId) return false;
  return childrenSet.has(ex.id);
}

// ---------------------------------------------------------------------------

function workoutMainExercises(raw, exByName) {
  const out = [];
  for (const block of raw.main ?? []) {
    const name = (block.exercise_name ?? block.exercise ?? '').trim();
    if (!name) continue;
    const ex = exByName.get(name.toLowerCase());
    if (ex) out.push(ex);
  }
  return out;
}

function muscleTokens(bodyFocus) {
  return (bodyFocus || '')
    .toLowerCase()
    .split(/\s*\/\s*/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function workoutMatchesMuscle(mainEx, facet) {
  if (mainEx.length === 0) return false;
  let hits = 0;
  for (const ex of mainEx) {
    const tokens = muscleTokens(ex.bodyFocus);
    if (tokens.some((t) => facet.tokens.includes(t))) hits++;
  }
  return hits / mainEx.length >= 0.4;
}

function workoutMatchesEquipment(mainEx, facet) {
  if (mainEx.length === 0) return false;
  let hits = 0;
  for (const ex of mainEx) {
    const eq = (ex.equipment || '').toLowerCase().trim();
    if (facet.match(eq)) hits++;
  }
  return hits / mainEx.length >= 0.5;
}

function workoutMatchesSetting(mainEx, facet) {
  if (mainEx.length === 0) return false;
  return mainEx.every((ex) => facet.envOk((ex.environment || '').toLowerCase()));
}

// ---------------------------------------------------------------------------

function main() {
  const exercises = JSON.parse(fs.readFileSync(EXERCISES_JSON, 'utf8'));
  const rawWorkouts = JSON.parse(fs.readFileSync(WORKOUTS_JSON, 'utf8'));

  // Playable exercise set — by lowercase name (matches the src/lib/playableWorkouts predicate).
  const childrenSet = buildChildrenWithVideoByParent(exercises);
  const playableNames = new Set();
  const exByName = new Map();
  for (const ex of exercises) {
    if (isPlayable(ex, childrenSet)) {
      const k = ex.name.toLowerCase().trim();
      playableNames.add(k);
      exByName.set(k, ex);
    }
  }

  // Drop workouts where every main block is unplayable. Mirrors filterPlayableWorkouts.
  const surviving = [];
  for (const w of rawWorkouts) {
    const mainPlayable = (w.main ?? []).filter((b) => {
      const n = (b.exercise_name ?? b.exercise ?? '').toLowerCase().trim();
      return n && playableNames.has(n);
    });
    if (mainPlayable.length === 0) continue;
    surviving.push(w);
  }

  // Bucket each surviving workout into facets.
  const buckets = new Map(); // slug → { label, axis, workoutIds: [] }

  function add(facet, axis, workoutId) {
    let b = buckets.get(facet.slug);
    if (!b) {
      b = { slug: facet.slug, label: facet.label, axis, workoutIds: [] };
      buckets.set(facet.slug, b);
    }
    b.workoutIds.push(workoutId);
  }

  for (const w of surviving) {
    const mainEx = workoutMainExercises(w, exByName);

    for (const f of MUSCLE_FACETS)    if (workoutMatchesMuscle(mainEx, f))    add(f, 'muscle', w.id);
    for (const f of EQUIPMENT_FACETS) if (workoutMatchesEquipment(mainEx, f)) add(f, 'equipment', w.id);
    for (const f of SETTING_FACETS)   if (workoutMatchesSetting(mainEx, f))   add(f, 'setting', w.id);
    for (const f of DURATION_FACETS)  if (f.match(w.dur))                     add(f, 'duration', w.id);

    const goal = classifyGoal(w);
    const goalFacet = GOAL_FACETS.find((g) => g.slug === goal);
    if (goalFacet) add(goalFacet, 'goal', w.id);
  }

  // Sort each bucket: featured first, then by id (stable for diffs).
  const wkById = new Map(rawWorkouts.map((w) => [w.id, w]));
  for (const b of buckets.values()) {
    b.workoutIds.sort((a, c) => {
      const fa = wkById.get(a)?.featured ? 0 : 1;
      const fc = wkById.get(c)?.featured ? 0 : 1;
      if (fa !== fc) return fa - fc;
      return a.localeCompare(c);
    });
  }

  // Coverage report.
  const axes = ['muscle', 'equipment', 'setting', 'duration', 'goal'];
  console.log('\nFacet coverage (workouts surviving playable filter: %d / %d)\n', surviving.length, rawWorkouts.length);
  for (const axis of axes) {
    console.log(`  [${axis}]`);
    const axisFacets = [...buckets.values()].filter((b) => b.axis === axis);
    axisFacets.sort((a, b) => b.workoutIds.length - a.workoutIds.length);
    for (const b of axisFacets) {
      const flag = b.workoutIds.length < MIN_WORKOUTS_PER_FACET ? ' ❌ (suppressed)' : '';
      console.log(`    /best-workouts/${b.slug.padEnd(18)} ${String(b.workoutIds.length).padStart(3)} workouts${flag}`);
    }
    console.log('');
  }

  if (PRINT_ONLY) return;

  // Drop suppressed facets and write JSON.
  const facets = {};
  for (const b of buckets.values()) {
    if (b.workoutIds.length < MIN_WORKOUTS_PER_FACET) continue;
    facets[b.slug] = {
      label: b.label,
      axis: b.axis,
      workoutIds: b.workoutIds,
    };
  }

  const out = {
    generatedAt: new Date().toISOString(),
    totalWorkouts: surviving.length,
    facets,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  console.log(`wrote ${path.relative(REPO_ROOT, OUT_JSON)} (${Object.keys(facets).length} facets)`);
}

main();
