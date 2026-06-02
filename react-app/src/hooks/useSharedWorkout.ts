/**
 * Fetches a public shared_workouts row by id (anon SELECT; RLS allows public
 * read) and maps the snake_case DB columns to the camelCase SharedWorkout
 * contract. `notFound` is set when the id doesn't resolve to a row.
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
  owner_user_id: string | null;
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
    ownerUserId: row.owner_user_id,
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
        .from('shared_workouts')
        .select(
          'id, owner_user_id, kind, title, creator_username, meta, snapshot, muscle_summary, created_at',
        )
        .eq('id', id)
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
