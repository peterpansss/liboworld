// Public web hook — exposes the multi-day program catalog.
//
// Programs are a Phase 5 concept: there's no static `/programs.json` shipped
// with the build yet, so this hook is Supabase-only. Behaviour:
//   1. On mount, query `programs` (status = 'published').
//   2. Empty array as the cold-start placeholder; replaces with rows on success.
//   3. On Supabase failure (e.g. migration not applied), the array stays empty
//      and the error is surfaced via `error` so the page can render an "in
//      development" empty state instead of an exception.
//
// `blocks` is the per-day plan and is intentionally kept loose — its shape is
// `Array<{ day: number, workout_id?: string, rest?: boolean, blocks?: ... }>`
// per the migration comment, but the public listing only needs the day count
// and high-level metadata to render. Detail pages can interpret blocks later.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ProgramRow } from '../lib/adminApi';

export type ProgramDayBlock = {
  day: number;
  workoutId?: string;
  rest?: boolean;
  warmup?: unknown[];
  main?: unknown[];
  cooldown?: unknown[];
};

export type ProgramDisplay = {
  id: string;
  slug: string;
  name: string;
  cat: string;
  subcat?: string;
  dur: number;
  diff: string;
  emoji: string;
  days: number;
  blocks: ProgramDayBlock[];
};

type RawDayBlock = {
  day?: number;
  workout_id?: string;
  rest?: boolean;
  warmup?: unknown[];
  main?: unknown[];
  cooldown?: unknown[];
};

function normalizeBlocks(blocks: unknown[]): ProgramDayBlock[] {
  return blocks.map((b, i) => {
    const raw = (b ?? {}) as RawDayBlock;
    return {
      day: typeof raw.day === 'number' ? raw.day : i + 1,
      workoutId: raw.workout_id,
      rest: raw.rest,
      warmup: raw.warmup,
      main: raw.main,
      cooldown: raw.cooldown,
    };
  });
}

function fromSupabase(p: ProgramRow): ProgramDisplay {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    cat: p.cat ?? '',
    subcat: p.subcat ?? undefined,
    dur: p.dur ?? 0,
    diff: p.diff ?? '',
    emoji: p.emoji,
    days: p.days,
    blocks: normalizeBlocks(p.blocks ?? []),
  };
}

let cachedSupabase: ProgramDisplay[] | null = null;

export function usePrograms(): {
  programs: ProgramDisplay[];
  loading: boolean;
  error: Error | null;
} {
  const [programs, setPrograms] = useState<ProgramDisplay[]>(cachedSupabase ?? []);
  const [loading, setLoading] = useState<boolean>(cachedSupabase === null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (cachedSupabase) {
      setPrograms(cachedSupabase);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const { data, error: sbError } = await supabase
          .from('programs')
          .select('*')
          .eq('status', 'published')
          .order('days');
        if (sbError) throw sbError;
        const rows = (data ?? []).map((r) => fromSupabase(r as ProgramRow));
        cachedSupabase = rows;
        if (!cancelled) {
          setPrograms(rows);
          setLoading(false);
        }
      } catch (e) {
        console.error('usePrograms: supabase fetch failed', e);
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { programs, loading, error };
}
