// Public web hook — exposes the exercise catalog to liboworld.com pages.
//
// Source-of-truth strategy (Phase 4):
//   1. Fetch the static `/exercises.json` baseline (shipped with the build —
//      this is what SEO crawlers and a cold cache see).
//   2. In parallel, query the canonical `exercises` table on Supabase, scoped
//      to `status = 'published'` (RLS enforces this for anon as well).
//   3. Whichever returns first paints the UI. When the Supabase result lands
//      it replaces the static baseline so newly-added admin content shows up
//      without a redeploy.
//   4. If Supabase fails (e.g. the migration isn't applied yet, or the user is
//      offline), keep the static rows and surface the error in `error`.
//
// Camelization happens here so call sites continue to consume the existing
// `Exercise` shape from `src/data/exercises.ts` — the page code is untouched.
//
// This hook is *separate* from the admin `listExercises` RPC in
// `src/lib/adminApi.ts`: that one requires admin auth and can return drafts;
// this one is anonymous and only sees published rows.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ExerciseRow } from '../lib/adminApi';

// Mirrors `Exercise` in src/data/exercises.ts. Defined locally so the hook is
// self-contained and doesn't pull on the lazy-loaded data module.
export type ExerciseDisplay = {
  id: string;
  slug: string;
  name: string;
  cat: string;
  primaryCat?: string;
  subcat?: string;
  environment?: string;
  bodyFocus: string;
  equipment: string;
  machineRequired: boolean;
  diff: string;
  variation: string;
  emoji: string;
  setupNotes: string;
  parentId?: string;
  parentName?: string;
  videoUrl?: string;
  videoUrlAlt?: string;
  thumbnailUrl?: string;
  voiceoverUrl?: string;
};

type StaticExerciseRow = {
  id: string;
  slug?: string;
  name: string;
  cat: string;
  primaryCat?: string;
  subcat?: string;
  environment?: string;
  bodyFocus: string;
  equipment: string;
  machineRequired: boolean;
  diff: string;
  variation: string;
  emoji: string;
  setupNotes: string;
  parentId?: string;
  parentName?: string;
  videoUrl?: string;
  videoUrlAlt?: string;
  thumbnailUrl?: string;
  voiceoverUrl?: string;
};

function fromStatic(row: StaticExerciseRow): ExerciseDisplay {
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    name: row.name,
    cat: row.cat,
    primaryCat: row.primaryCat,
    subcat: row.subcat,
    environment: row.environment,
    bodyFocus: row.bodyFocus,
    equipment: row.equipment,
    machineRequired: row.machineRequired,
    diff: row.diff,
    variation: row.variation,
    emoji: row.emoji,
    setupNotes: row.setupNotes,
    parentId: row.parentId,
    parentName: row.parentName,
    videoUrl: row.videoUrl,
    videoUrlAlt: row.videoUrlAlt,
    thumbnailUrl: row.thumbnailUrl,
    voiceoverUrl: row.voiceoverUrl,
  };
}

function fromSupabase(row: ExerciseRow): ExerciseDisplay {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    cat: row.cat ?? '',
    primaryCat: row.primary_cat ?? undefined,
    subcat: row.subcat ?? undefined,
    environment: row.environment ?? undefined,
    bodyFocus: row.body_focus ?? '',
    equipment: row.equipment ?? '',
    machineRequired: row.machine_required,
    diff: row.diff ?? '',
    variation: row.variation,
    emoji: row.emoji,
    setupNotes: row.setup_notes,
    parentId: row.parent_id || undefined,
    parentName: row.parent_name || undefined,
    videoUrl: row.video_url ?? undefined,
    videoUrlAlt: row.video_url_alt ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    voiceoverUrl: row.voiceover_url ?? undefined,
  };
}

/**
 * Per-row "is this exercise playable right now?" predicate. Belt-and-suspenders
 * alongside the admin status toggle: if a row is marked `published` but its
 * mp4 is missing (mid-production, freshly created row, etc.), an empty card on
 * the public site looks like a bug. The same predicate is reused at the
 * workout-block level so a workout that references a video-less exercise
 * silently drops that block instead of breaking the player.
 *
 * Rules:
 *   - A canonical (parent) exercise is playable if its own videoUrl is
 *     non-empty OR at least one of its children (rows whose parentId matches
 *     this exercise's id) has a non-empty videoUrl. Same fallback the detail
 *     page already uses to source a thumbnail/clip.
 *   - A child variant is playable only if its own videoUrl is non-empty.
 *
 * `childrenWithVideoByParent` is built once by the caller and threaded
 * through, so callers that filter many rows don't pay an O(n) scan per call.
 *
 * Future-proofing: when animations ship, widen the rule to
 * `hasVideo OR hasAnimation` in this one place — `filterPlayable` and the
 * workout-block filter both inherit the change.
 */
type PlayableExercise = Pick<ExerciseDisplay, 'id' | 'parentId' | 'videoUrl'>;

export function buildChildrenWithVideoByParent(
  rows: readonly PlayableExercise[],
): Set<string> {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.parentId && r.videoUrl) set.add(r.parentId);
  }
  return set;
}

export function isPlayable(
  ex: PlayableExercise,
  childrenWithVideoByParent: Set<string>,
): boolean {
  if (ex.videoUrl) return true;
  if (ex.parentId) return false;
  return childrenWithVideoByParent.has(ex.id);
}

function filterPlayable(rows: ExerciseDisplay[]): ExerciseDisplay[] {
  const childrenWithVideoByParent = buildChildrenWithVideoByParent(rows);
  return rows.filter((r) => isPlayable(r, childrenWithVideoByParent));
}

// Module-level cache so navigating away/back doesn't refetch.
let cachedSupabase: ExerciseDisplay[] | null = null;
let cachedStatic: ExerciseDisplay[] | null = null;

export function useExercises(): {
  exercises: ExerciseDisplay[];
  loading: boolean;
  error: Error | null;
} {
  const [exercises, setExercises] = useState<ExerciseDisplay[]>(
    cachedSupabase ?? cachedStatic ?? []
  );
  const [loading, setLoading] = useState<boolean>(
    cachedSupabase === null && cachedStatic === null
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    // If the canonical Supabase result is already cached we can short-circuit.
    if (cachedSupabase) {
      setExercises(cachedSupabase);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    // Static baseline — paints first when the cache is cold.
    const staticPromise = (async () => {
      if (cachedStatic) return cachedStatic;
      try {
        const res = await fetch('/exercises.json');
        if (!res.ok) throw new Error(`exercises.json ${res.status}`);
        const rows = (await res.json()) as StaticExerciseRow[];
        cachedStatic = filterPlayable(rows.map(fromStatic));
        return cachedStatic;
      } catch (e) {
        // A static fetch failure is non-fatal; Supabase may still rescue us.
        console.error('useExercises: static fetch failed', e);
        return null;
      }
    })();

    // Canonical Supabase rows — replaces static when ready.
    const supabasePromise = (async () => {
      try {
        const { data, error: sbError } = await supabase
          .from('exercises')
          .select('*')
          .eq('status', 'published')
          .order('cat');
        if (sbError) throw sbError;
        cachedSupabase = filterPlayable((data ?? []).map((r) => fromSupabase(r as ExerciseRow)));
        return cachedSupabase;
      } catch (e) {
        // Migration may not be applied yet, or the table is unreachable.
        // Surface the error but don't clobber the static fallback.
        console.error('useExercises: supabase fetch failed', e);
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
        return null;
      }
    })();

    // Paint whichever resolves first; Supabase result, if it lands later,
    // overrides the static one. If Supabase wins the race, don't downgrade
    // the UI by overwriting it with the (older) static rows afterwards.
    let supabaseLanded = false;

    staticPromise.then((rows) => {
      if (cancelled || supabaseLanded || !rows) return;
      setExercises(rows);
      setLoading(false);
    });

    supabasePromise.then((rows) => {
      if (cancelled) return;
      supabaseLanded = true;
      if (rows) {
        setExercises(rows);
      }
      // Always release the loading flag once the canonical query has resolved,
      // even on Supabase failure — at that point the static rows (if any) are
      // the final paint we'll show this session.
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { exercises, loading, error };
}
