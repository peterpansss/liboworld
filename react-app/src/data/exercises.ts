// Lazy-loaded exercise and workout data
// Source: libo-data.js (302 KB) — loaded on demand, not at startup

export interface Exercise {
  id: string;
  name: string;
  cat: string;        // "gym" | "home" | "mobility"
  bodyFocus: string;  // "Chest" | "Back" | "Legs" etc.
  equipment: string;  // "Barbell" | "Bodyweight" | "Dumbbell" etc.
  machineRequired: boolean;
  diff: string;       // "beginner" | "intermediate" | "advanced"
  variation: string;
  emoji: string;
  setupNotes: string;
  videoUrl?: string;  // R2-hosted demo clip, present for ~264 exercises
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

/** Raw workout shape from workouts.json (warmup/main/cooldown with "exercise" key) */
interface RawWorkoutExercise {
  exercise: string;
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
    name: item.exercise,
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
let _workouts: Workout[] | null = null;
let _loading: Promise<void> | null = null;

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

async function loadData() {
  if (_exercises && _workouts) return;
  if (_loading) return _loading;

  _loading = (async () => {
    const [exRes, wkRes] = await Promise.all([
      fetch('/exercises.json'),
      fetch('/workouts.json'),
    ]);
    _exercises = (await exRes.json()) as Exercise[];
    const rawWorkouts = (await wkRes.json()) as RawWorkout[];
    _workouts = rawWorkouts.map(normalizeWorkout);
  })();

  return _loading;
}

export async function getExercises(lang: string = 'en'): Promise<Exercise[]> {
  await loadData();
  const base = _exercises!;
  const code = (lang || 'en').split('-')[0];
  if (code === 'en') return base;
  const overlay = await loadOverlay(code);
  if (!Object.keys(overlay).length) return base;
  return base.map(ex => {
    const o = overlay[ex.id];
    return o?.setupNotes ? { ...ex, setupNotes: o.setupNotes } : ex;
  });
}

export async function getWorkouts(): Promise<Workout[]> {
  await loadData();
  return _workouts!;
}
