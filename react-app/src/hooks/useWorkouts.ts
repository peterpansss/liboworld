// Public web hook — exposes the workout catalog to liboworld.com pages.
//
// Same race-and-replace strategy as useExercises:
//   1. Fetch `/workouts.json` (build-time baseline, used for SEO + cold cache).
//   2. In parallel, query `workouts` from Supabase (status = 'published').
//   3. First result paints; Supabase result, when it arrives, replaces it.
//   4. Supabase failure → keep static, surface error.
//
// The static JSON shape and the Supabase row shape both carry warmup/main/
// cooldown blocks but with different inner keys:
//   static  → { exercise, sets, reps, dur?, rest? }       (RawWorkoutExercise)
//   db      → { exercise_id, exercise_name, sets, reps }  (WorkoutBlockEntry)
// The hook normalizes both into a `WorkoutBlock` array with camelCase keys
// (`exerciseId`, `exerciseName`, `sets`, `reps`) so call sites don't branch.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { WorkoutRow, WorkoutBlockEntry } from '../lib/adminApi';

export type WorkoutBlock = {
  exerciseId?: string;
  exerciseName: string;
  sets: string;
  reps: string;
  dur?: number;
  rest?: number;
};

export type WorkoutDisplay = {
  id: string;
  slug: string;
  name: string;
  cat: string;
  subcat?: string;
  dur: number;
  diff: string;
  emoji: string;
  warmup: WorkoutBlock[];
  main: WorkoutBlock[];
  cooldown: WorkoutBlock[];
};

type StaticWorkoutEntry = {
  exercise: string;
  sets: string;
  reps: string;
  dur?: number;
  rest?: number;
};

type StaticWorkout = {
  id: string;
  slug?: string;
  name: string;
  emoji: string;
  diff: string;
  dur: number;
  cat: string;
  subcat?: string;
  warmup?: StaticWorkoutEntry[];
  main?: StaticWorkoutEntry[];
  cooldown?: StaticWorkoutEntry[];
};

function blockFromStatic(e: StaticWorkoutEntry): WorkoutBlock {
  return {
    exerciseName: e.exercise,
    sets: e.sets,
    reps: e.reps,
    dur: e.dur,
    rest: e.rest,
  };
}

function blockFromSupabase(e: WorkoutBlockEntry): WorkoutBlock {
  return {
    exerciseId: e.exercise_id ?? undefined,
    exerciseName: e.exercise_name,
    sets: e.sets,
    reps: e.reps,
  };
}

function fromStatic(w: StaticWorkout): WorkoutDisplay {
  return {
    id: w.id,
    slug: w.slug ?? w.id,
    name: w.name,
    cat: w.cat,
    subcat: w.subcat,
    dur: w.dur,
    diff: w.diff,
    emoji: w.emoji,
    warmup: (w.warmup ?? []).map(blockFromStatic),
    main: (w.main ?? []).map(blockFromStatic),
    cooldown: (w.cooldown ?? []).map(blockFromStatic),
  };
}

function fromSupabase(w: WorkoutRow): WorkoutDisplay {
  return {
    id: w.id,
    slug: w.slug,
    name: w.name,
    cat: w.cat ?? '',
    subcat: w.subcat ?? undefined,
    dur: w.dur ?? 0,
    diff: w.diff ?? '',
    emoji: w.emoji,
    warmup: (w.warmup ?? []).map(blockFromSupabase),
    main: (w.main ?? []).map(blockFromSupabase),
    cooldown: (w.cooldown ?? []).map(blockFromSupabase),
  };
}

let cachedSupabase: WorkoutDisplay[] | null = null;
let cachedStatic: WorkoutDisplay[] | null = null;

export function useWorkouts(): {
  workouts: WorkoutDisplay[];
  loading: boolean;
  error: Error | null;
} {
  const [workouts, setWorkouts] = useState<WorkoutDisplay[]>(
    cachedSupabase ?? cachedStatic ?? []
  );
  const [loading, setLoading] = useState<boolean>(
    cachedSupabase === null && cachedStatic === null
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (cachedSupabase) {
      setWorkouts(cachedSupabase);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const staticPromise = (async () => {
      if (cachedStatic) return cachedStatic;
      try {
        const res = await fetch('/workouts.json');
        if (!res.ok) throw new Error(`workouts.json ${res.status}`);
        const rows = (await res.json()) as StaticWorkout[];
        cachedStatic = rows.map(fromStatic);
        return cachedStatic;
      } catch (e) {
        console.error('useWorkouts: static fetch failed', e);
        return null;
      }
    })();

    const supabasePromise = (async () => {
      try {
        const { data, error: sbError } = await supabase
          .from('workouts')
          .select('*')
          .eq('status', 'published')
          .order('cat');
        if (sbError) throw sbError;
        cachedSupabase = (data ?? []).map((r) => fromSupabase(r as WorkoutRow));
        return cachedSupabase;
      } catch (e) {
        console.error('useWorkouts: supabase fetch failed', e);
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
        return null;
      }
    })();

    let supabaseLanded = false;

    staticPromise.then((rows) => {
      if (cancelled || supabaseLanded || !rows) return;
      setWorkouts(rows);
      setLoading(false);
    });

    supabasePromise.then((rows) => {
      if (cancelled) return;
      supabaseLanded = true;
      if (rows) {
        setWorkouts(rows);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { workouts, loading, error };
}
