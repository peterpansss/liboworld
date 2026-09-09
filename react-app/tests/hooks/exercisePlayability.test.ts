/**
 * Tests for the playability predicate exported by src/hooks/useExercises.ts.
 *
 * Regression cover for APP-NOTES-TRIAGE N35: a canonical whose only demo lives
 * on an L/R child must count as playable on BOTH data paths — the Supabase one
 * (children link by the parent's primary key) and the bundled-JSON fallback
 * (children keep that same key, but the snapshot stores the parent under its
 * slug, so the id link dangles and only the parent name connects them).
 */
import { describe, expect, it } from 'vitest';
import { buildChildrenWithVideoByParent, isPlayable } from '../../src/hooks/useExercises';

const parentSupabase = {
  id: 'single_arm_cable_overhead_triceps_extension_rope',
  slug: 'single_arm_cable_overhead_extension',
  name: 'Single-Arm Cable Overhead Extension',
  parentId: undefined,
  videoUrl: undefined,
};

const parentBundled = {
  id: 'single_arm_cable_overhead_extension',
  slug: 'single_arm_cable_overhead_extension',
  name: 'Single-Arm Cable Overhead Extension',
  parentId: undefined,
  videoUrl: undefined,
};

const child = {
  id: 'single_arm_cable_overhead_extension_left',
  slug: 'single_arm_cable_overhead_extension_left',
  name: 'Single-Arm Cable Overhead Extension — Left',
  parentId: 'single_arm_cable_overhead_triceps_extension_rope',
  parentName: 'Single-Arm Cable Overhead Extension',
  videoUrl: 'https://videos/left.mp4',
};

describe('isPlayable', () => {
  it('passes a canonical whose child links by the parent primary key', () => {
    const index = buildChildrenWithVideoByParent([parentSupabase, child]);
    expect(isPlayable(parentSupabase, index)).toBe(true);
  });

  it('passes the same canonical on the bundled path, where the id link dangles', () => {
    const index = buildChildrenWithVideoByParent([parentBundled, child]);
    expect(isPlayable(parentBundled, index)).toBe(true);
  });

  it('still drops a canonical with no video anywhere in its family', () => {
    const orphan = { id: 'home_164', slug: 'kegel_slow_hold', name: 'Kegel — Slow Hold' };
    const index = buildChildrenWithVideoByParent([orphan, child]);
    expect(isPlayable(orphan, index)).toBe(false);
  });

  it('a child is playable only on its own video, never on a sibling', () => {
    const index = buildChildrenWithVideoByParent([child]);
    expect(
      isPlayable(
        { ...child, id: 'single_arm_cable_overhead_extension_right', videoUrl: undefined },
        index,
      ),
    ).toBe(false);
  });

  it('a row with its own video needs no family at all', () => {
    const index = buildChildrenWithVideoByParent([]);
    expect(isPlayable({ id: 'gym_3a', videoUrl: 'https://videos/flat.mp4' }, index)).toBe(true);
  });
});
