import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const calls: Array<{ name: string; args: unknown }> = [];
let nextRow: Record<string, unknown> | null = null;

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    rpc: (name: string, args: unknown) => {
      calls.push({ name, args });
      return { maybeSingle: async () => ({ data: nextRow, error: null }) };
    },
  },
}));

import { useSharedWorkout } from '../../src/hooks/useSharedWorkout';

beforeEach(() => {
  calls.length = 0;
  nextRow = null;
});

describe('useSharedWorkout', () => {
  it('uses only the ID-scoped public lookup and maps its public fields', async () => {
    nextRow = {
      id: 'Ab12Cd34Ef5',
      kind: 'workout',
      title: 'Public routine',
      creator_username: 'Coach',
      meta: {},
      snapshot: { sessions: [] },
      muscle_summary: [],
      created_at: '2026-11-08T00:00:00Z',
    };

    const { result } = renderHook(() => useSharedWorkout('Ab12Cd34Ef5'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(calls).toEqual([{ name: 'get_shared_workout', args: { p_id: 'Ab12Cd34Ef5' } }]);
    expect(result.current.workout?.title).toBe('Public routine');
    expect(result.current.workout).not.toHaveProperty('ownerUserId');
  });

  it('does not query without an id', async () => {
    const { result } = renderHook(() => useSharedWorkout(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notFound).toBe(true);
    expect(calls).toEqual([]);
  });

  it('lets the ID-scoped RPC decide whether a legacy link exists', async () => {
    const { result } = renderHook(() => useSharedWorkout('legacy-share-id'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls).toEqual([{ name: 'get_shared_workout', args: { p_id: 'legacy-share-id' } }]);
  });

  it('accepts the URL-safe alphabet used by newer share ids', async () => {
    const { result } = renderHook(() => useSharedWorkout('Ab12_-34Ef5'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls).toEqual([{ name: 'get_shared_workout', args: { p_id: 'Ab12_-34Ef5' } }]);
  });
});
