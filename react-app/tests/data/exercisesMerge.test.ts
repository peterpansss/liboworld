/**
 * Tests for the bundle ⇄ Supabase union in src/data/exercises.ts#getExercises.
 *
 * Regression cover for APP-NOTES-TRIAGE N35: the union used to key on `id`.
 * Because the bundled snapshot keys every row by its SLUG while Supabase keys
 * it by a different primary key (550 of 575 published canonicals have
 * `id <> slug`), that meant nearly the whole catalog was mistaken for
 * admin-only content and appended a second time — 797 duplicate rows — and the
 * Supabase primary key, which is what children's `parentId` points at, was
 * never associated with the bundled parent row.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseFrom = vi.fn();
vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: (table: string) => supabaseFrom(table) },
}));

const BUNDLED = [
  {
    id: 'single_arm_cable_overhead_extension',
    slug: 'single_arm_cable_overhead_extension',
    name: 'Single-Arm Cable Overhead Extension',
    cat: 'gym',
    bodyFocus: 'Triceps',
    equipment: 'Cable',
    machineRequired: true,
    diff: 'intermediate',
    variation: '',
    emoji: '💪',
    setupNotes: '',
  },
];

const SUPABASE_ROWS = [
  // Same exercise as the bundled row, under its real primary key.
  {
    id: 'single_arm_cable_overhead_triceps_extension_rope',
    slug: 'single_arm_cable_overhead_extension',
    name: 'Single-Arm Cable Overhead Extension',
    cat: 'gym',
    primary_cat: null,
    subcat: null,
    environment: null,
    body_focus: 'Triceps',
    equipment: 'Cable',
    machine_required: true,
    diff: 'intermediate',
    variation: '',
    emoji: '💪',
    setup_notes: '',
    parent_id: '',
    parent_name: null,
    video_url: null,
    video_url_alt: null,
    thumbnail_url: 'https://storage/parent.jpg',
  },
  // Admin-only row: no slug match in the bundle, so it must still be appended.
  {
    id: 'gym_999',
    slug: 'brand_new_admin_exercise',
    name: 'Brand New Admin Exercise',
    cat: 'gym',
    primary_cat: null,
    subcat: null,
    environment: null,
    body_focus: 'Chest',
    equipment: 'Machine',
    machine_required: true,
    diff: 'beginner',
    variation: '',
    emoji: '🆕',
    setup_notes: '',
    parent_id: '',
    parent_name: null,
    video_url: 'https://videos/new.mp4',
    video_url_alt: null,
    thumbnail_url: null,
  },
];

function stubTables() {
  supabaseFrom.mockImplementation((table: string) => {
    if (table === 'exercises') {
      return {
        select: () => ({ eq: () => Promise.resolve({ data: SUPABASE_ROWS, error: null }) }),
      };
    }
    // exercise_overrides / workout_overrides
    return { select: () => Promise.resolve({ data: [], error: null }) };
  });
}

describe('getExercises union', () => {
  beforeEach(() => {
    vi.resetModules();
    supabaseFrom.mockReset();
    stubTables();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => BUNDLED })),
    );
  });

  it('collapses a Supabase row onto the bundled row that shares its slug', async () => {
    const { getExercises } = await import('../../src/data/exercises');
    const rows = await getExercises('en');
    const matches = rows.filter((r) => (r.slug ?? r.id) === 'single_arm_cable_overhead_extension');
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('single_arm_cable_overhead_extension');
  });

  it('records the Supabase primary key as an alias so child links resolve', async () => {
    const { getExercises } = await import('../../src/data/exercises');
    const rows = await getExercises('en');
    const parent = rows.find((r) => r.slug === 'single_arm_cable_overhead_extension');
    expect(parent?.aliasIds).toEqual(['single_arm_cable_overhead_triceps_extension_rope']);
  });

  it('still appends rows that exist only in Supabase', async () => {
    const { getExercises } = await import('../../src/data/exercises');
    const rows = await getExercises('en');
    expect(rows.find((r) => r.slug === 'brand_new_admin_exercise')?.id).toBe('gym_999');
  });

  it('does not write aliases through into the cached bundled snapshot', async () => {
    const { getExercises } = await import('../../src/data/exercises');
    const first = await getExercises('en');
    const second = await getExercises('en');
    // One alias, not two — the second call must not compound onto the cache.
    expect(second.find((r) => r.slug === 'single_arm_cable_overhead_extension')?.aliasIds).toEqual([
      'single_arm_cable_overhead_triceps_extension_rope',
    ]);
    expect(BUNDLED[0]).not.toHaveProperty('aliasIds');
    expect(first).not.toBe(second);
  });
});

/**
 * The name_<lang> columns are on staging only as of 16 Sep 2026. PostgREST
 * rejects an entire query for one unknown column, so asking production for them
 * unconditionally would drop every admin-only row this fetch exists to surface
 * (the detail page 404s on URLs the admin panel clearly shows). The select is
 * therefore retried without the translation columns.
 */
describe('getExercises against a database without the name_<lang> columns', () => {
  const selectCalls: string[] = [];

  beforeEach(() => {
    vi.resetModules();
    supabaseFrom.mockReset();
    selectCalls.length = 0;
    supabaseFrom.mockImplementation((table: string) => {
      if (table === 'exercises') {
        return {
          select: (columns: string) => {
            selectCalls.push(columns);
            const missingColumn = columns.includes('name_de');
            return {
              eq: () =>
                Promise.resolve(
                  missingColumn
                    ? {
                        data: null,
                        error: {
                          code: '42703',
                          message: 'column exercises.name_de does not exist',
                        },
                      }
                    : { data: SUPABASE_ROWS, error: null },
                ),
            };
          },
        };
      }
      return { select: () => Promise.resolve({ data: [], error: null }) };
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => BUNDLED })),
    );
  });

  it('retries without the translation columns and still returns the rows', async () => {
    const { getExercises } = await import('../../src/data/exercises');
    const rows = await getExercises('en');
    expect(selectCalls).toHaveLength(2);
    expect(selectCalls[0]).toContain('name_de');
    expect(selectCalls[1]).not.toContain('name_de');
    // The admin-only row survives the missing columns.
    expect(rows.find((r) => r.slug === 'brand_new_admin_exercise')?.id).toBe('gym_999');
  });

  it('leaves every row on its English name', async () => {
    const { getExercises } = await import('../../src/data/exercises');
    const rows = await getExercises('en');
    const admin = rows.find((r) => r.slug === 'brand_new_admin_exercise');
    expect(admin?.name).toBe('Brand New Admin Exercise');
    expect(admin?.name_de).toBeUndefined();
  });
});

describe('getExercises with admin overrides over translated bundled rows', () => {
  const TRANSLATED_BUNDLE = [
    { ...BUNDLED[0], name_de: 'Einarmige Kabel-Trizepsstrecke' },
  ];

  function stubWithOverride(patch: Record<string, unknown>) {
    supabaseFrom.mockImplementation((table: string) => {
      if (table === 'exercises') {
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      }
      if (table === 'exercise_overrides') {
        return {
          select: () =>
            Promise.resolve({
              data: [{ id: 'single_arm_cable_overhead_extension', patch }],
              error: null,
            }),
        };
      }
      return { select: () => Promise.resolve({ data: [], error: null }) };
    });
  }

  beforeEach(() => {
    vi.resetModules();
    supabaseFrom.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => TRANSLATED_BUNDLE })),
    );
  });

  it('keeps the bundled translation when the patch does not rename the row', async () => {
    stubWithOverride({ equipment: 'Cable Machine' });
    const { getExercises } = await import('../../src/data/exercises');
    const rows = await getExercises('en');
    const row = rows.find((r) => r.slug === 'single_arm_cable_overhead_extension');
    expect(row?.equipment).toBe('Cable Machine');
    expect(row?.name_de).toBe('Einarmige Kabel-Trizepsstrecke');
  });

  it('drops the stale translation when the patch renames the row', async () => {
    stubWithOverride({ name: 'Single-Arm Cable Overhead Triceps Extension' });
    const { getExercises } = await import('../../src/data/exercises');
    const rows = await getExercises('en');
    const row = rows.find((r) => r.slug === 'single_arm_cable_overhead_extension');
    expect(row?.name).toBe('Single-Arm Cable Overhead Triceps Extension');
    // The old title's German must not stand in front of the new English one.
    expect(row?.name_de).toBeUndefined();
  });
});
