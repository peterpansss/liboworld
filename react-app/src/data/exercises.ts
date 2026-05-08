// Lazy-loaded exercise and workout data
// Source: libo-data.js (302 KB) — loaded on demand, not at startup

import { supabase } from '../lib/supabase';

export interface Exercise {
  id: string;
  name: string;
  slug?: string;       // Stable URL slug (== id for current data)
  cat: string;        // "gym" | "home" | "mobility"
  primaryCat?: string; // "Strength" | "Cardio" | "Accessory" | "Core Stability" etc.
  subcat?: string;     // "Upper Body" | "Lower Body" etc.
  environment?: string; // "Gym" | "Home" | "Both"
  bodyFocus: string;  // "Chest" | "Back" | "Legs" etc.
  equipment: string;  // "Barbell" | "Bodyweight" | "Dumbbell" etc.
  machineRequired: boolean;
  diff: string;       // "beginner" | "intermediate" | "advanced"
  variation: string;
  emoji: string;
  setupNotes: string;
  videoUrl?: string;  // R2-hosted demo clip, present for ~264 exercises
  /** Optional alternate-angle video (e.g. side view). Same base slug + `_side_view`. */
  videoUrlAlt?: string;
  animationUrl?: string;  // Optional 3D/2D animation alternative (gym/equipment only)
  parentId?: string;    // L/R variants inherit parent's media (thumb + video)
  parentName?: string;
}

export interface WorkoutExercise {
  name: string;
  sets: string;
  reps: string;
  dur?: number;
  rest?: number;
  phase?: 'warmup' | 'main' | 'cooldown';
}

export interface Workout {
  id: string;
  name: string;
  emoji: string;
  diff: string;
  dur: number;
  cat: string;
  subcat?: string;
  exercises: WorkoutExercise[];
  featured?: boolean;
  type?: string;
}

/** Raw workout shape from workouts.json (warmup/main/cooldown). Admin/Supabase
 * persists snake_case (`exercise_name`/`exercise_id`); a handful of legacy
 * blocks still use the older `exercise` key. Both are read defensively. */
interface RawWorkoutExercise {
  exercise?: string;
  exercise_name?: string;
  exercise_id?: string | null;
  sets: string;
  reps: string;
  dur?: number;
  rest?: number;
}

interface RawWorkout {
  id: string;
  name: string;
  emoji: string;
  diff: string;
  dur: number;
  cat: string;
  subcat?: string;
  warmup?: RawWorkoutExercise[];
  main?: RawWorkoutExercise[];
  cooldown?: RawWorkoutExercise[];
  featured?: boolean;
  type?: string;
}

/** Normalize raw workout: merge warmup/main/cooldown into flat exercises array with phase tags */
function normalizeWorkout(raw: RawWorkout): Workout {
  const toExercise = (item: RawWorkoutExercise, phase: 'warmup' | 'main' | 'cooldown'): WorkoutExercise => ({
    name: item.exercise_name ?? item.exercise ?? '',
    sets: item.sets,
    reps: item.reps,
    dur: item.dur,
    rest: item.rest,
    phase,
  });

  const exercises: WorkoutExercise[] = [
    ...(raw.warmup ?? []).map(e => toExercise(e, 'warmup')),
    ...(raw.main ?? []).map(e => toExercise(e, 'main')),
    ...(raw.cooldown ?? []).map(e => toExercise(e, 'cooldown')),
  ];

  return {
    id: raw.id,
    name: raw.name,
    emoji: raw.emoji,
    diff: raw.diff,
    dur: raw.dur,
    cat: raw.cat,
    subcat: raw.subcat,
    exercises,
    featured: raw.featured,
    type: raw.type,
  };
}

let _exercises: Exercise[] | null = null;
let _workoutsRaw: RawWorkout[] | null = null;
let _exercisesPromise: Promise<Exercise[]> | null = null;
let _workoutsRawPromise: Promise<RawWorkout[]> | null = null;

type LocaleOverlay = Record<string, { setupNotes?: string }>;
const _overlays: Partial<Record<string, LocaleOverlay>> = {};
const _overlayPromises: Partial<Record<string, Promise<LocaleOverlay>>> = {};

async function loadOverlay(lang: string): Promise<LocaleOverlay> {
  if (lang === 'en') return {};
  if (_overlays[lang]) return _overlays[lang]!;
  if (_overlayPromises[lang]) return _overlayPromises[lang]!;

  _overlayPromises[lang] = (async () => {
    try {
      const res = await fetch(`/exercises.${lang}.json`);
      if (!res.ok) return (_overlays[lang] = {});
      return (_overlays[lang] = (await res.json()) as LocaleOverlay);
    } catch {
      return (_overlays[lang] = {});
    }
  })();

  return _overlayPromises[lang]!;
}

function loadExercises(): Promise<Exercise[]> {
  if (_exercises) return Promise.resolve(_exercises);
  if (_exercisesPromise) return _exercisesPromise;
  _exercisesPromise = (async () => {
    const res = await fetch('/exercises.json');
    _exercises = (await res.json()) as Exercise[];
    return _exercises;
  })();
  return _exercisesPromise;
}

// --- AI-generated content sidecar -------------------------------------------
// `exercise_content.json` is produced by scripts/generate-exercise-content.mjs.
// Missing entries fall back to the heuristic getTips()/getCommonMistakes() in
// utils/exerciseInfo.ts, so it's safe to ship with partial coverage.

export interface ExerciseContent {
  tips: string[];
  commonMistakes: string[];
  breathingCue?: string;
}

let _exerciseContent: Record<string, ExerciseContent> | null = null;
let _exerciseContentPromise: Promise<Record<string, ExerciseContent>> | null = null;

export function loadExerciseContent(): Promise<Record<string, ExerciseContent>> {
  if (_exerciseContent) return Promise.resolve(_exerciseContent);
  if (_exerciseContentPromise) return _exerciseContentPromise;
  _exerciseContentPromise = (async () => {
    try {
      const res = await fetch('/exercise_content.json');
      if (!res.ok) {
        _exerciseContent = {};
        return _exerciseContent;
      }
      _exerciseContent = (await res.json()) as Record<string, ExerciseContent>;
      return _exerciseContent;
    } catch {
      _exerciseContent = {};
      return _exerciseContent;
    }
  })();
  return _exerciseContentPromise;
}

function loadRawWorkouts(): Promise<RawWorkout[]> {
  if (_workoutsRaw) return Promise.resolve(_workoutsRaw);
  if (_workoutsRawPromise) return _workoutsRawPromise;
  _workoutsRawPromise = (async () => {
    const res = await fetch('/workouts.json');
    _workoutsRaw = (await res.json()) as RawWorkout[];
    return _workoutsRaw;
  })();
  return _workoutsRawPromise;
}

// --- Supabase content overrides ---------------------------------------------
// `exercise_overrides` / `workout_overrides`: { id TEXT PK, patch JSONB, updated_at }.
// Admin panel writes; RLS allows anon SELECT. Fetched in parallel with JSON,
// cached at module level, and merged before normalization / locale overlay.

type OverrideRow = { id: string; patch: Record<string, unknown>; updated_at?: string };

let _exerciseOverrides: Record<string, Partial<Exercise>> | null = null;
let _workoutOverrides: Record<string, Partial<RawWorkout>> | null = null;
let _exerciseOverridesPromise: Promise<Record<string, Partial<Exercise>>> | null = null;
let _workoutOverridesPromise: Promise<Record<string, Partial<RawWorkout>>> | null = null;

function loadExerciseOverrides(): Promise<Record<string, Partial<Exercise>>> {
  if (_exerciseOverrides) return Promise.resolve(_exerciseOverrides);
  if (_exerciseOverridesPromise) return _exerciseOverridesPromise;
  _exerciseOverridesPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_overrides')
        .select('id, patch');
      if (error) {
        _exerciseOverrides = {};
        return _exerciseOverrides;
      }
      const map: Record<string, Partial<Exercise>> = {};
      for (const r of (data ?? []) as OverrideRow[]) {
        if (r && r.id && r.patch && typeof r.patch === 'object') {
          map[r.id] = r.patch as Partial<Exercise>;
        }
      }
      _exerciseOverrides = map;
      return map;
    } catch {
      _exerciseOverrides = {};
      return _exerciseOverrides;
    }
  })();
  return _exerciseOverridesPromise;
}

function loadWorkoutOverrides(): Promise<Record<string, Partial<RawWorkout>>> {
  if (_workoutOverrides) return Promise.resolve(_workoutOverrides);
  if (_workoutOverridesPromise) return _workoutOverridesPromise;
  _workoutOverridesPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('workout_overrides')
        .select('id, patch');
      if (error) {
        _workoutOverrides = {};
        return _workoutOverrides;
      }
      const map: Record<string, Partial<RawWorkout>> = {};
      for (const r of (data ?? []) as OverrideRow[]) {
        if (r && r.id && r.patch && typeof r.patch === 'object') {
          map[r.id] = r.patch as Partial<RawWorkout>;
        }
      }
      _workoutOverrides = map;
      return map;
    } catch {
      _workoutOverrides = {};
      return _workoutOverrides;
    }
  })();
  return _workoutOverridesPromise;
}

export async function getExercises(lang: string = 'en'): Promise<Exercise[]> {
  const code = (lang || 'en').split('-')[0];
  // Fetch base data, admin overrides, and (if needed) locale overlay in parallel.
  const [base, overrides, overlay] = await Promise.all([
    loadExercises(),
    loadExerciseOverrides(),
    code === 'en' ? Promise.resolve<LocaleOverlay>({}) : loadOverlay(code),
  ]);

  const hasOverrides = Object.keys(overrides).length > 0;
  const hasOverlay = Object.keys(overlay).length > 0;
  if (!hasOverrides && !hasOverlay) return base;

  // Precedence (low -> high so the latter wins):
  //   base  <  admin override  <  locale overlay (non-en setupNotes)
  // Rationale: a translated setupNotes should win over an English admin edit.
  return base.map((ex) => {
    const override = overrides[ex.id];
    const loc = overlay[ex.id];
    let out: Exercise = ex;
    if (override) out = { ...out, ...override };
    if (loc?.setupNotes) out = { ...out, setupNotes: loc.setupNotes };
    return out;
  });
}

export async function getWorkouts(): Promise<Workout[]> {
  // Overrides apply to the RawWorkout shape (warmup/main/cooldown) BEFORE
  // normalization, so admin edits to those arrays flow through normalizeWorkout.
  const [raw, overrides] = await Promise.all([
    loadRawWorkouts(),
    loadWorkoutOverrides(),
  ]);
  const hasOverrides = Object.keys(overrides).length > 0;
  if (!hasOverrides) return raw.map(normalizeWorkout);
  return raw.map((w) => {
    const o = overrides[w.id];
    const merged: RawWorkout = o ? { ...w, ...o } : w;
    return normalizeWorkout(merged);
  });
}
