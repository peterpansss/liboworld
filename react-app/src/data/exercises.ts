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
  // Set by media-worker for admin-uploaded rows; null on the legacy bundled
  // catalog. Used by exerciseThumb() as the authoritative thumbnail source
  // before falling back to /images/thumbnails/<basename>.jpg.
  thumbnailUrl?: string;
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

/**
 * Pull every published exercise straight from the Supabase `exercises` table.
 *
 * Why: the bundled JSON is a build-time snapshot. Anything created via the
 * admin panel after that snapshot lives in Supabase only — without this fetch,
 * `getExercises()` would silently skip those rows and the public detail page
 * 404s on URLs that the admin clearly shows. Union'd into the base catalog
 * below by id; rows already present in the bundle still win on their own
 * row + override + locale chain.
 *
 * Defensive trim on URL fields: admin input occasionally lands with stray
 * leading/trailing whitespace (one row in the wild had two leading spaces on
 * `video_url`), which silently breaks every URL the row points at. Cheaper
 * to absorb here than to rely on every save path scrubbing perfectly.
 */
type SupabaseExerciseRow = {
  id: string;
  slug: string | null;
  name: string;
  cat: string | null;
  primary_cat: string | null;
  subcat: string | null;
  environment: string | null;
  body_focus: string | null;
  equipment: string | null;
  machine_required: boolean | null;
  diff: string | null;
  variation: string | null;
  emoji: string | null;
  setup_notes: string | null;
  parent_id: string | null;
  parent_name: string | null;
  video_url: string | null;
  video_url_alt: string | null;
  thumbnail_url: string | null;
};

let _supabaseExercises: Exercise[] | null = null;
let _supabaseExercisesPromise: Promise<Exercise[]> | null = null;

function trimOrEmpty(v: string | null | undefined): string {
  return typeof v === 'string' ? v.trim() : '';
}
function trimOrUndefined(v: string | null | undefined): string | undefined {
  const t = trimOrEmpty(v);
  return t ? t : undefined;
}

function supabaseRowToExercise(r: SupabaseExerciseRow): Exercise {
  return {
    id: r.id,
    slug: trimOrUndefined(r.slug),
    name: trimOrEmpty(r.name),
    cat: trimOrEmpty(r.cat),
    primaryCat: trimOrUndefined(r.primary_cat),
    subcat: trimOrUndefined(r.subcat),
    environment: trimOrUndefined(r.environment),
    bodyFocus: trimOrEmpty(r.body_focus),
    equipment: trimOrEmpty(r.equipment),
    machineRequired: !!r.machine_required,
    diff: trimOrEmpty(r.diff),
    variation: trimOrEmpty(r.variation),
    emoji: trimOrEmpty(r.emoji),
    setupNotes: trimOrEmpty(r.setup_notes),
    parentId: trimOrUndefined(r.parent_id),
    parentName: trimOrUndefined(r.parent_name),
    videoUrl: trimOrUndefined(r.video_url),
    videoUrlAlt: trimOrUndefined(r.video_url_alt),
    thumbnailUrl: trimOrUndefined(r.thumbnail_url),
  };
}

function loadSupabaseExercises(): Promise<Exercise[]> {
  if (_supabaseExercises) return Promise.resolve(_supabaseExercises);
  if (_supabaseExercisesPromise) return _supabaseExercisesPromise;
  _supabaseExercisesPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select(
          'id, slug, name, cat, primary_cat, subcat, environment, body_focus, equipment, machine_required, diff, variation, emoji, setup_notes, parent_id, parent_name, video_url, video_url_alt, thumbnail_url',
        )
        .eq('status', 'published');
      if (error) {
        _supabaseExercises = [];
        return _supabaseExercises;
      }
      _supabaseExercises = ((data ?? []) as SupabaseExerciseRow[]).map(
        supabaseRowToExercise,
      );
      return _supabaseExercises;
    } catch {
      _supabaseExercises = [];
      return _supabaseExercises;
    }
  })();
  return _supabaseExercisesPromise;
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
  // Fetch base data, admin overrides, locale overlay, AND the live Supabase
  // exercises table in parallel. The Supabase fetch surfaces admin-created
  // rows that don't exist in the bundled snapshot, so the public detail page
  // can resolve them by slug instead of 404-ing.
  const [base, overrides, overlay, supabaseRows] = await Promise.all([
    loadExercises(),
    loadExerciseOverrides(),
    code === 'en' ? Promise.resolve<LocaleOverlay>({}) : loadOverlay(code),
    loadSupabaseExercises(),
  ]);

  // Precedence (low -> high so the latter wins):
  //   base  <  admin override  <  locale overlay (non-en setupNotes)
  // Rationale: a translated setupNotes should win over an English admin edit.
  const merged = base.map((ex) => {
    const override = overrides[ex.id];
    const loc = overlay[ex.id];
    let out: Exercise = ex;
    if (override) out = { ...out, ...override };
    if (loc?.setupNotes) out = { ...out, setupNotes: loc.setupNotes };
    return out;
  });

  // Union admin-only rows. Anything whose id isn't in the bundled catalog is
  // appended; rows that ARE in the bundle stay on the existing override path
  // above to avoid changing precedence for the 99% case.
  if (supabaseRows.length > 0) {
    const baseIds = new Set(base.map((b) => b.id));
    for (const r of supabaseRows) {
      if (!baseIds.has(r.id)) merged.push(r);
    }
  }
  return merged;
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
