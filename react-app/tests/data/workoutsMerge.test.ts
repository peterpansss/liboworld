/**
 * Tests for the bundle ⇄ Supabase merge in src/data/exercises.ts#getWorkouts.
 *
 * The web used to read workouts from `public/workouts.json` only (plus the
 * `workout_overrides` patch table), so a workout created or edited in the admin
 * panel's canonical `workouts` table never reached liboworld.com until somebody
 * re-ran scripts/regen_landing_workouts_json.py. These cover the merge that
 * fixes that, and — just as important — that the bundle still carries the page
 * whenever Supabase can't: a blank workouts page is worse than a stale one.
 *
 * Block shapes in play (both live in production: ~1821 blocks vs 6):
 *   {exercise_name, exercise_slug, exercise_id, sets, reps}   admin/Supabase
 *   {exercise, sets, reps}                                    legacy bundle
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseFrom = vi.fn();
vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: (table: string) => supabaseFrom(table) },
}));

const BUNDLED = [
  {
    id: 'wk_chest_barbell_foundations',
    name: 'Chest Barbell Foundations',
    name_de: 'Brust-Langhantel-Grundlagen',
    cat: 'Gym',
    subcat: 'Upper Body',
    dur: 45,
    diff: 'intermediate',
    emoji: '💪',
    // Legacy block shape — the only one 6 production blocks still use.
    warmup: [{ exercise: 'Arm Circles', sets: '1', reps: '30 sec' }],
    main: [{ exercise_id: null, exercise_name: 'Flat Barbell Bench Press', sets: '4', reps: '8 reps' }],
    cooldown: [],
  },
  {
    id: 'wk_home_core_blast',
    name: 'Home Core Blast',
    cat: 'Home',
    dur: 20,
    diff: 'beginner',
    emoji: '🔥',
    warmup: [],
    main: [{ exercise_id: null, exercise_name: 'Forearm Plank', sets: '3', reps: '45 sec' }],
    cooldown: [],
  },
];

// Live rows: one is an edit of a bundled workout, one exists only in Supabase.
const LIVE_ROWS = [
  {
    id: 'wk_chest_barbell_foundations',
    slug: 'chest-barbell-foundations',
    name: 'Chest Barbell Foundations',
    cat: 'Gym',
    subcat: 'Upper Body',
    dur: 50,
    diff: 'intermediate',
    emoji: '💪',
    status: 'published',
    warmup: [
      { reps: '30 sec', sets: '1', exercise_id: null, exercise_slug: 'arm_circles', exercise_name: 'Arm Circles' },
    ],
    main: [
      { reps: '8 reps', sets: '5', exercise_id: null, exercise_slug: 'flat_barbell_bench_press', exercise_name: 'Flat Barbell Bench Press' },
      { reps: '10 reps', sets: '3', exercise_id: null, exercise_slug: 'incline_dumbbell_press', exercise_name: 'Incline Dumbbell Press' },
    ],
    cooldown: [],
  },
  {
    id: 'wk_brand_new_admin_workout',
    slug: 'brand-new-admin-workout',
    name: 'Brand New Admin Workout',
    cat: 'Gym',
    subcat: null,
    dur: 30,
    diff: 'beginner',
    emoji: '🆕',
    status: 'published',
    warmup: [],
    main: [
      { reps: '15 reps', sets: '3', exercise_id: null, exercise_slug: 'bodyweight_squat', exercise_name: 'Bodyweight Squat' },
    ],
    cooldown: [],
  },
];

type TableStub = { data: unknown; error: unknown } | (() => never);

/**
 * Stub `workouts` and `workout_overrides` independently so each test can fail
 * one without the other. A thrown stub stands in for a network/client error,
 * which supabase-js surfaces as a rejection rather than an `error` payload.
 */
function stubTables(opts: { workouts?: TableStub; overrides?: TableStub } = {}) {
  const workouts = opts.workouts ?? { data: LIVE_ROWS, error: null };
  const overrides = opts.overrides ?? { data: [], error: null };
  supabaseFrom.mockImplementation((table: string) => {
    if (table === 'workouts') {
      return {
        select: () => ({
          eq: () => (typeof workouts === 'function' ? workouts() : Promise.resolve(workouts)),
        }),
      };
    }
    // workout_overrides
    return {
      select: () => (typeof overrides === 'function' ? overrides() : Promise.resolve(overrides)),
    };
  });
}

function stubBundle(rows: unknown = BUNDLED, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok, status: ok ? 200 : 404, json: async () => rows })),
  );
}

async function loadWorkouts() {
  const { getWorkouts } = await import('../../src/data/exercises');
  return getWorkouts();
}

describe('getWorkouts bundle ⇄ Supabase merge', () => {
  beforeEach(() => {
    vi.resetModules();
    supabaseFrom.mockReset();
    stubTables();
    stubBundle();
  });

  it('normalizes both block shapes onto a single flat exercises array', async () => {
    const workouts = await loadWorkouts();
    const chest = workouts.find((w) => w.id === 'wk_chest_barbell_foundations');
    // Legacy `exercise` (bundle) and `exercise_name` (live) both resolve.
    expect(chest?.exercises.map((e) => e.name)).toEqual([
      'Arm Circles',
      'Flat Barbell Bench Press',
      'Incline Dumbbell Press',
    ]);
    expect(chest?.exercises.map((e) => e.phase)).toEqual(['warmup', 'main', 'main']);
  });

  it('lets the live row win over the stale bundled snapshot', async () => {
    const workouts = await loadWorkouts();
    const chest = workouts.find((w) => w.id === 'wk_chest_barbell_foundations');
    expect(chest?.dur).toBe(50);
    expect(chest?.exercises).toHaveLength(3);
  });

  it('appends workouts that exist only in Supabase', async () => {
    const workouts = await loadWorkouts();
    const created = workouts.find((w) => w.id === 'wk_brand_new_admin_workout');
    expect(created?.name).toBe('Brand New Admin Workout');
    expect(created?.exercises.map((e) => e.name)).toEqual(['Bodyweight Squat']);
    // A NULL column must not surface as a string.
    expect(created?.subcat).toBeUndefined();
  });

  it('leaves bundled workouts Supabase does not publish untouched', async () => {
    const workouts = await loadWorkouts();
    expect(workouts.find((w) => w.id === 'wk_home_core_blast')?.dur).toBe(20);
  });

  it('does not duplicate a workout that is in both sources', async () => {
    const workouts = await loadWorkouts();
    expect(workouts.filter((w) => w.id === 'wk_chest_barbell_foundations')).toHaveLength(1);
    expect(workouts).toHaveLength(3);
  });

  it('drops a live row whose blocks have no name, keeping the bundled version', async () => {
    stubTables({
      workouts: {
        data: [
          {
            ...LIVE_ROWS[0],
            main: [{ reps: '8 reps', sets: '5', exercise_id: null, exercise_name: '' }],
          },
        ],
        error: null,
      },
    });
    const workouts = await loadWorkouts();
    const chest = workouts.find((w) => w.id === 'wk_chest_barbell_foundations');
    // Bundled dur + blocks, i.e. the corrupt live row was ignored wholesale.
    expect(chest?.dur).toBe(45);
    expect(chest?.exercises.map((e) => e.name)).toEqual([
      'Arm Circles',
      'Flat Barbell Bench Press',
    ]);
  });

  it('skips a Supabase-only row with no name rather than shipping a blank card', async () => {
    stubTables({ workouts: { data: [{ ...LIVE_ROWS[1], name: '   ' }], error: null } });
    const workouts = await loadWorkouts();
    expect(workouts.map((w) => w.id)).toEqual([
      'wk_chest_barbell_foundations',
      'wk_home_core_blast',
    ]);
  });

  it('drops the stale bundled translations when the live row renames a workout', async () => {
    stubTables({
      workouts: { data: [{ ...LIVE_ROWS[0], name: 'Barbell Chest Builder' }], error: null },
    });
    const workouts = await loadWorkouts();
    const chest = workouts.find((w) => w.id === 'wk_chest_barbell_foundations');
    expect(chest?.name).toBe('Barbell Chest Builder');
    expect(chest?.name_de).toBeUndefined();
  });
});

describe('getWorkouts fallback to the bundle', () => {
  beforeEach(() => {
    vi.resetModules();
    supabaseFrom.mockReset();
    stubBundle();
  });

  it('renders the bundle when the workouts query errors', async () => {
    stubTables({
      workouts: { data: null, error: { code: '42P01', message: 'relation does not exist' } },
    });
    const workouts = await loadWorkouts();
    expect(workouts.map((w) => w.id)).toEqual([
      'wk_chest_barbell_foundations',
      'wk_home_core_blast',
    ]);
    expect(workouts[0].dur).toBe(45);
  });

  it('renders the bundle when the Supabase client throws', async () => {
    stubTables({
      workouts: () => {
        throw new Error('Failed to fetch');
      },
    });
    const workouts = await loadWorkouts();
    expect(workouts).toHaveLength(2);
    expect(workouts[0].exercises.map((e) => e.name)).toEqual([
      'Arm Circles',
      'Flat Barbell Bench Press',
    ]);
  });

  it('renders the bundle when Supabase returns an empty set', async () => {
    stubTables({ workouts: { data: [], error: null } });
    const workouts = await loadWorkouts();
    expect(workouts).toHaveLength(2);
  });

  it('still renders the live rows when the bundle itself is unreachable', async () => {
    stubTables();
    stubBundle(null, false);
    const workouts = await loadWorkouts();
    expect(workouts.map((w) => w.id)).toEqual([
      'wk_chest_barbell_foundations',
      'wk_brand_new_admin_workout',
    ]);
  });
});

describe('getWorkouts admin overrides', () => {
  beforeEach(() => {
    vi.resetModules();
    supabaseFrom.mockReset();
    stubBundle();
  });

  it('applies an override on top of the bundled row', async () => {
    stubTables({
      workouts: { data: [], error: null },
      overrides: {
        data: [{ id: 'wk_home_core_blast', patch: { name: 'Home Core Blast v2', dur: 25 } }],
        error: null,
      },
    });
    const workouts = await loadWorkouts();
    const home = workouts.find((w) => w.id === 'wk_home_core_blast');
    expect(home?.name).toBe('Home Core Blast v2');
    expect(home?.dur).toBe(25);
  });

  it('applies an override on top of the live row, not under it', async () => {
    // WorkoutsPage diffs the override against the bundled base and shows the
    // merged result as what the site serves, so it has to outrank the live row.
    stubTables({
      overrides: { data: [{ id: 'wk_chest_barbell_foundations', patch: { dur: 60 } }], error: null },
    });
    const workouts = await loadWorkouts();
    const chest = workouts.find((w) => w.id === 'wk_chest_barbell_foundations');
    expect(chest?.dur).toBe(60);
    // Fields the override doesn't touch still come from the live row.
    expect(chest?.exercises).toHaveLength(3);
  });

  it('applies an override to a Supabase-only workout', async () => {
    stubTables({
      overrides: {
        data: [{ id: 'wk_brand_new_admin_workout', patch: { emoji: '🏋️' } }],
        error: null,
      },
    });
    const workouts = await loadWorkouts();
    expect(workouts.find((w) => w.id === 'wk_brand_new_admin_workout')?.emoji).toBe('🏋️');
  });

  it('keeps overrides working when the overrides table errors', async () => {
    stubTables({ overrides: { data: null, error: { message: 'boom' } } });
    const workouts = await loadWorkouts();
    // No patch applied, no throw — the live + bundled merge still renders.
    expect(workouts).toHaveLength(3);
  });
});
