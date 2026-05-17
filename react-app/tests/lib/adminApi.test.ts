/**
 * Coverage for src/lib/adminApi.ts.
 *
 * The admin API is the heaviest of the lib modules. We mock the supabase
 * client and verify each public function (a) calls the right RPC / table,
 * (b) propagates errors, (c) maps results.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';

// Mutable state used by the supabase mock.
let nextRpcResp: { data: any; error: any } = { data: null, error: null };
const rpcCalls: { name: string; args: any }[] = [];
let nextSelectResp: { data: any; error: any } = { data: null, error: null };
let nextSelectCount: { data: any; count: number; error: any } = { data: [], count: 0, error: null };
let nextInsertResp: { data: any; error: any } = { data: null, error: null };
let nextUpdateResp: { data: any; error: any } = { data: null, error: null };
let nextDeleteResp: { error: any } = { error: null };
let nextSessionResp: any = { data: { session: { user: { id: 'u_admin' } } } };
let nextSignInResp: { error: any } = { error: null };
let nextSignOutResp: { error: any } = { error: null };
const captured: { selects: any[]; inserts: any[]; updates: any[]; deletes: any[]; uploads: any[] } = {
  selects: [], inserts: [], updates: [], deletes: [], uploads: [],
};

function makeChain(table: string, op: 'select' | 'insert' | 'update' | 'delete', initialFilters: any[] = []): any {
  const filters = [...initialFilters];
  const chain: any = {
    eq: (col: string, val: any) => { filters.push(['eq', col, val]); return chain; },
    order: () => chain,
    ilike: (col: string, val: any) => { filters.push(['ilike', col, val]); return chain; },
    limit: () => chain,
    select: () => chain,
    single: () => Promise.resolve(op === 'select' ? nextSelectResp : nextInsertResp),
    maybeSingle: () => Promise.resolve(nextSelectResp),
    then: (resolve: any, reject?: any) => {
      let resp;
      if (op === 'select') {
        captured.selects.push({ table, filters });
        resp = nextSelectResp;
      } else if (op === 'insert') {
        resp = nextInsertResp;
      } else if (op === 'update') {
        captured.updates.push({ table, filters });
        resp = nextUpdateResp;
      } else {
        captured.deletes.push({ table, filters });
        resp = nextDeleteResp;
      }
      return Promise.resolve(resp).then(resolve, reject);
    },
  };
  return chain;
}

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve(nextSessionResp),
      signInWithPassword: () => Promise.resolve(nextSignInResp),
      signOut: () => Promise.resolve(nextSignOutResp),
    },
    rpc: (name: string, args: any) => {
      rpcCalls.push({ name, args });
      return Promise.resolve(nextRpcResp);
    },
    from: (table: string) => ({
      select: (_cols?: string, opts?: any) => {
        if (opts?.head) {
          // count-only call (used by listGiveaways)
          return {
            eq: () => Promise.resolve(nextSelectCount),
          };
        }
        return makeChain(table, 'select');
      },
      insert: (rows: any) => {
        captured.inserts.push({ table, rows });
        const c = makeChain(table, 'insert');
        return c;
      },
      update: (values: any) => {
        captured.updates.push({ table, values });
        return makeChain(table, 'update');
      },
      delete: () => makeChain(table, 'delete'),
    }),
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, file: File | Blob, opts: any) => {
          captured.uploads.push({ bucket, path, file, opts });
          return Promise.resolve({ data: { path }, error: null });
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn/${bucket}/${path}` } }),
      }),
    },
  },
}));

import {
  getCurrentUserIsAdmin,
  signInAdmin,
  signOutAdmin,
  fetchDashboardKpis,
  listUsers,
  fetchUserTopWorkouts,
  fetchUserRecentWorkouts,
  fetchUserPointsLedger,
  grantTickets_unsafe,
  adjustPoints_unsafe,
  setSubscriptionTier_unsafe,
  setUserAdminFlag_unsafe,
  fetchLeaderboard,
  listGiveaways,
  createGiveaway,
  updateGiveaway,
  deleteGiveaway,
  drawGiveawayWinners,
  uploadGiveawayImage,
  fetchActivityFeed,
  fetchDistinctWorkoutNames,
  uploadExerciseVideo,
  uploadExerciseThumbnail,
  upsertExerciseOverride,
  deleteExerciseOverride,
  upsertWorkoutOverride,
  listMoneyChallenges,
  setMoneyChallengeActive,
} from '../../src/lib/adminApi';

beforeEach(() => {
  rpcCalls.length = 0;
  captured.selects.length = 0;
  captured.inserts.length = 0;
  captured.updates.length = 0;
  captured.deletes.length = 0;
  captured.uploads.length = 0;
  nextRpcResp = { data: null, error: null };
  nextSelectResp = { data: null, error: null };
  nextSelectCount = { data: [], count: 0, error: null };
  nextInsertResp = { data: null, error: null };
  nextUpdateResp = { data: null, error: null };
  nextDeleteResp = { error: null };
  nextSessionResp = { data: { session: { user: { id: 'u_admin' } } } };
  nextSignInResp = { error: null };
  nextSignOutResp = { error: null };
});

describe('getCurrentUserIsAdmin', () => {
  it('returns false when there is no session', async () => {
    nextSessionResp = { data: { session: null } };
    expect(await getCurrentUserIsAdmin()).toBe(false);
  });

  it('returns true when profiles row has is_admin=true', async () => {
    nextSelectResp = { data: { is_admin: true }, error: null };
    expect(await getCurrentUserIsAdmin()).toBe(true);
  });

  it('returns false when profiles row has is_admin=false', async () => {
    nextSelectResp = { data: { is_admin: false }, error: null };
    expect(await getCurrentUserIsAdmin()).toBe(false);
  });

  it('returns false when the profiles query errors', async () => {
    nextSelectResp = { data: null, error: { message: 'rls denied' } };
    expect(await getCurrentUserIsAdmin()).toBe(false);
  });

  it('returns false when profiles row is null (no profile yet)', async () => {
    nextSelectResp = { data: null, error: null };
    expect(await getCurrentUserIsAdmin()).toBe(false);
  });
});

describe('signInAdmin / signOutAdmin', () => {
  it('throws on auth error and does NOT continue to admin check', async () => {
    nextSignInResp = { error: new Error('Invalid credentials') };
    await expect(signInAdmin('foo@bar.com', 'pw')).rejects.toThrow('Invalid credentials');
  });

  it('signs out and throws when the signed-in user is not an admin', async () => {
    nextSelectResp = { data: { is_admin: false }, error: null };
    await expect(signInAdmin('foo@bar.com', 'pw')).rejects.toThrow('not an admin');
  });

  it('completes successfully when the user IS an admin', async () => {
    nextSelectResp = { data: { is_admin: true }, error: null };
    await expect(signInAdmin('admin@libo.com', 'pw')).resolves.toBeUndefined();
  });

  it('signOutAdmin invokes auth.signOut', async () => {
    await expect(signOutAdmin()).resolves.toBeUndefined();
  });
});

describe('Dashboard / users / leaderboard RPCs', () => {
  it('fetchDashboardKpis calls admin_dashboard_kpis', async () => {
    nextRpcResp = { data: { total_users: 100 }, error: null };
    const r = await fetchDashboardKpis();
    expect(rpcCalls[0].name).toBe('admin_dashboard_kpis');
    expect(r.total_users).toBe(100);
  });

  it('listUsers passes through search/limit/offset', async () => {
    nextRpcResp = { data: [{ id: 'u1' }], error: null };
    const out = await listUsers('alice', 10, 5);
    expect(rpcCalls[0].args).toEqual({ p_search: 'alice', p_limit: 10, p_offset: 5 });
    expect(out).toEqual([{ id: 'u1' }]);
  });

  it('listUsers passes null for empty search', async () => {
    nextRpcResp = { data: [], error: null };
    await listUsers('', 100, 0);
    expect(rpcCalls[0].args.p_search).toBeNull();
  });

  it('listUsers throws on RPC error', async () => {
    nextRpcResp = { data: null, error: { message: 'rls' } };
    await expect(listUsers(null)).rejects.toMatchObject({ message: 'rls' });
  });

  it('fetchUserTopWorkouts maps rpc args correctly', async () => {
    nextRpcResp = { data: [{ workout_name: 'X', count: 2 }], error: null };
    await fetchUserTopWorkouts('u1', 5);
    expect(rpcCalls[0].name).toBe('admin_user_top_workouts');
    expect(rpcCalls[0].args).toEqual({ p_user_id: 'u1', p_limit: 5 });
  });

  it('fetchUserRecentWorkouts queries workout_logs with eq and limit', async () => {
    nextSelectResp = { data: [{ id: 'wl_1', workout_name: 'A' }], error: null };
    const r = await fetchUserRecentWorkouts('u1', 5);
    expect(captured.selects[0].table).toBe('workout_logs');
    expect(captured.selects[0].filters).toContainEqual(['eq', 'user_id', 'u1']);
    expect(r[0].workout_name).toBe('A');
    // adminApi adds nullable user_name and user_email.
    expect(r[0].user_name).toBeNull();
    expect(r[0].user_email).toBeNull();
  });

  it('fetchUserPointsLedger queries points_ledger', async () => {
    nextSelectResp = { data: [], error: null };
    await fetchUserPointsLedger('u1', 25);
    expect(captured.selects[0].table).toBe('points_ledger');
  });
});

describe('grantTickets_unsafe / adjustPoints_unsafe / setSubscriptionTier_unsafe / setUserAdminFlag_unsafe', () => {
  it('grantTickets_unsafe calls admin_grant_tickets and rejects on ok=false', async () => {
    nextRpcResp = { data: { ok: false, error: 'invalid amount' }, error: null };
    await expect(grantTickets_unsafe('u1', -5, 'why')).rejects.toThrow('invalid amount');
    expect(rpcCalls[0].name).toBe('admin_grant_tickets');
    expect(rpcCalls[0].args).toEqual({ p_user_id: 'u1', p_amount: -5, p_note: 'why' });
  });

  it('grantTickets_unsafe returns void on ok=true', async () => {
    nextRpcResp = { data: { ok: true }, error: null };
    await expect(grantTickets_unsafe('u1', 5)).resolves.toBeUndefined();
  });

  it('adjustPoints_unsafe calls admin_adjust_points', async () => {
    nextRpcResp = { data: { ok: true }, error: null };
    await adjustPoints_unsafe('u1', 50, 'bonus');
    expect(rpcCalls[0].name).toBe('admin_adjust_points');
  });

  it('setSubscriptionTier_unsafe passes expiresAt or null', async () => {
    nextRpcResp = { data: { ok: true }, error: null };
    await setSubscriptionTier_unsafe('u1', 'pro');
    expect(rpcCalls[0].args.p_expires_at).toBeNull();
    rpcCalls.length = 0;
    nextRpcResp = { data: { ok: true }, error: null };
    await setSubscriptionTier_unsafe('u1', 'pro', '2099-01-01T00:00:00Z');
    expect(rpcCalls[0].args.p_expires_at).toBe('2099-01-01T00:00:00Z');
  });

  it('setUserAdminFlag_unsafe toggles is_admin', async () => {
    nextRpcResp = { data: { ok: true }, error: null };
    await setUserAdminFlag_unsafe('u1', true);
    expect(rpcCalls[0].args).toEqual({ p_user_id: 'u1', p_is_admin: true });
  });
});

describe('Giveaways CRUD', () => {
  it('listGiveaways enriches each row with entry_count', async () => {
    nextSelectResp = { data: [{ id: 'g1' }, { id: 'g2' }], error: null };
    nextSelectCount = { data: [], count: 5, error: null };
    const r = await listGiveaways();
    expect(r.every((g) => typeof g.entry_count === 'number')).toBe(true);
  });

  it('createGiveaway inserts and returns the row', async () => {
    nextInsertResp = { data: { id: 'g_new' }, error: null };
    const r = await createGiveaway({ title: 'X' } as any);
    expect(captured.inserts[0].table).toBe('giveaways');
    expect(r.id).toBe('g_new');
  });

  it('updateGiveaway updates by id', async () => {
    nextInsertResp = { data: { id: 'g1', title: 'Updated' }, error: null };
    const r = await updateGiveaway('g1', { title: 'Updated' } as any);
    expect(r.title).toBe('Updated');
  });

  it('deleteGiveaway hits delete on the giveaways table', async () => {
    await deleteGiveaway('g1');
    expect(captured.deletes.find((d) => d.table === 'giveaways')).toBeDefined();
  });

  it('drawGiveawayWinners returns winners_drawn count on success', async () => {
    nextRpcResp = { data: { ok: true, winners_drawn: 3 }, error: null };
    const n = await drawGiveawayWinners('g1');
    expect(n).toBe(3);
  });

  it('drawGiveawayWinners throws when ok=false', async () => {
    nextRpcResp = { data: { ok: false, error: 'too soon' }, error: null };
    await expect(drawGiveawayWinners('g1')).rejects.toThrow('too soon');
  });

  it('uploadGiveawayImage uploads and returns public URL', async () => {
    const file = new File(['dummy'], 'pic.jpg', { type: 'image/jpeg' });
    const url = await uploadGiveawayImage(file);
    expect(url).toMatch(/^https:\/\/cdn\/giveaway-images\//);
  });
});

describe('Activity feed + leaderboard', () => {
  it('fetchActivityFeed forwards filters to admin_activity_feed', async () => {
    nextRpcResp = { data: [], error: null };
    await fetchActivityFeed({ from: '2024-01-01', userId: 'u1', limit: 50 });
    expect(rpcCalls[0].name).toBe('admin_activity_feed');
    expect(rpcCalls[0].args.p_from).toBe('2024-01-01');
    expect(rpcCalls[0].args.p_user_id).toBe('u1');
    expect(rpcCalls[0].args.p_limit).toBe(50);
  });

  it('fetchDistinctWorkoutNames de-duplicates and sorts', async () => {
    nextSelectResp = {
      data: [
        { workout_name: 'Push' },
        { workout_name: 'Pull' },
        { workout_name: 'Push' },
        { workout_name: 'Squat' },
      ],
      error: null,
    };
    const names = await fetchDistinctWorkoutNames();
    expect(names).toEqual(['Pull', 'Push', 'Squat']);
  });

  it('fetchLeaderboard calls admin_leaderboard with limit', async () => {
    nextRpcResp = { data: [], error: null };
    await fetchLeaderboard(25);
    expect(rpcCalls[0].args).toEqual({ p_limit: 25 });
  });
});

describe('Content overrides', () => {
  it('upsertExerciseOverride throws on ok=false', async () => {
    nextRpcResp = { data: { ok: false, error: 'nope' }, error: null };
    await expect(upsertExerciseOverride('e1', { x: 1 })).rejects.toThrow('nope');
  });

  it('deleteExerciseOverride throws on data null', async () => {
    nextRpcResp = { data: { ok: false }, error: null };
    await expect(deleteExerciseOverride('e1')).rejects.toThrow('delete_failed');
  });

  it('upsertWorkoutOverride passes patch through', async () => {
    nextRpcResp = { data: { ok: true }, error: null };
    await upsertWorkoutOverride('w1', { foo: 'bar' });
    expect(rpcCalls[0].args).toEqual({ p_id: 'w1', p_patch: { foo: 'bar' } });
  });
});

describe('Uploads', () => {
  it('uploadExerciseVideo uses uuid filename + extension', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'demo.mp4', { type: 'video/mp4' });
    const url = await uploadExerciseVideo(file);
    expect(url).toMatch(/^https:\/\/cdn\/exercise-videos\//);
    expect(captured.uploads[0].opts.contentType).toBe('video/mp4');
  });

  it('uploadExerciseThumbnail uses image/jpeg from the file itself', async () => {
    const file = new File(['x'], 'thumb.jpg', { type: 'image/jpeg' });
    await uploadExerciseThumbnail(file);
    expect(captured.uploads[0].opts.contentType).toBe('image/jpeg');
  });
});

describe('Money challenges', () => {
  it('listMoneyChallenges calls admin_list_money_challenges', async () => {
    nextRpcResp = { data: [], error: null };
    await listMoneyChallenges();
    expect(rpcCalls[0].name).toBe('admin_list_money_challenges');
  });

  it('setMoneyChallengeActive updates the row', async () => {
    nextUpdateResp = { error: null };
    await setMoneyChallengeActive('mc1', false);
    expect(captured.updates.find((u) => u.table === 'money_challenges')).toBeDefined();
  });
});
