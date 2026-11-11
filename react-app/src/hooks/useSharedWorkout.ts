/**
 * Fetches one shared workout by id via the `get_shared_workout` RPC, and maps the
 * snake_case DB columns to the camelCase SharedWorkout contract. `notFound` is set
 * when the id doesn't resolve to a row.
 *
 * WHY AN RPC AND NOT A TABLE SELECT (audit finding LIBO-09)
 * `shared_workouts` used to carry `FOR SELECT USING (true)`. This hook filtered
 * with `.eq('id', id)`, but PostgREST applies the filter AFTER the policy, so
 * anyone who dropped the filter got the whole table — verified live with the
 * public anon key: every row, with usernames and full snapshots. RLS cannot say
 * "only when filtered by id", so the lookup moved to a SECURITY DEFINER function
 * that REQUIRES the id as an argument and can only ever return one row.
 *
 * The RPC deliberately does NOT return `owner_user_id`. Nothing renders it (only
 * `creatorUsername` reaches the screen), and that UUID is the join key that
 * de-anonymises other surfaces. `ownerUserId` is kept in the mapped shape as null
 * so the SharedWorkout contract is unchanged.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type {
  SharedWorkout,
  SharedSnapshot,
  SharedWorkoutMeta,
  SharedMuscleSummaryEntry,
  SharedWorkoutKind,
} from '../types/sharedWorkout';

interface SharedWorkoutRow {
  id: string;
  kind: string;
  title: string;
  creator_username: string | null;
  meta: SharedWorkoutMeta | null;
  snapshot: SharedSnapshot | null;
  muscle_summary: SharedMuscleSummaryEntry[] | null;
  created_at: string;
}

function mapRow(row: SharedWorkoutRow): SharedWorkout {
  return {
    id: row.id,
    ownerUserId: null, // never published: see the LIBO-09 note above
    kind: (row.kind === 'plan' ? 'plan' : 'workout') as SharedWorkoutKind,
    title: row.title,
    creatorUsername: row.creator_username,
    meta: row.meta ?? {},
    snapshot: row.snapshot ?? { sessions: [] },
    muscleSummary: row.muscle_summary ?? [],
    createdAt: row.created_at,
  };
}

export interface UseSharedWorkoutResult {
  workout: SharedWorkout | null;
  loading: boolean;
  notFound: boolean;
}

export function useSharedWorkout(id: string | undefined): UseSharedWorkoutResult {
  const [workout, setWorkout] = useState<SharedWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setNotFound(false);
    setWorkout(null);

    (async () => {
      const { data, error } = await supabase
        .rpc('get_shared_workout', { p_id: id })
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setWorkout(mapRow(data as SharedWorkoutRow));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { workout, loading, notFound };
}
