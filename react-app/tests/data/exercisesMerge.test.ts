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
