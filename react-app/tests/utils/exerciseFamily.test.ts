/**
 * Tests for src/utils/exerciseFamily.ts — parent ⇄ child (L/R variant)
 * resolution.
 *
 * The production shape these guard is APP-NOTES-TRIAGE N35: 28 published
 * canonicals carry no video of their own and borrow one from a child, while
 * `id` and `slug` differ for 550 of 575 canonicals, so the child's `parentId`
 * points at a key the bundled snapshot does not use.
 */
import { describe, expect, it } from 'vitest';
import {
  findChildVideoDonor,
  isChildOf,
  normalizeExerciseName,
  parentIdentifiers,
} from '../../src/utils/exerciseFamily';

describe('normalizeExerciseName', () => {
  it('folds dash variants, case and stray whitespace', () => {
    expect(normalizeExerciseName('Dumbbell Row - Standard ')).toBe('dumbbell row - standard');
    expect(normalizeExerciseName('Dumbbell Row — Standard')).toBe('dumbbell row - standard');
    expect(normalizeExerciseName('Dumbbell  Row – Standard')).toBe('dumbbell row - standard');
  });

  it('returns an empty string for absent names', () => {
    expect(normalizeExerciseName(undefined)).toBe('');
    expect(normalizeExerciseName(null)).toBe('');
    expect(normalizeExerciseName('   ')).toBe('');
  });
});

describe('parentIdentifiers', () => {
  it('collects id, slug and aliases', () => {
    const ids = parentIdentifiers({
      id: 'single_arm_cable_overhead_extension',
      slug: 'single_arm_cable_overhead_extension',
      aliasIds: ['single_arm_cable_overhead_triceps_extension_rope'],
    });
    expect([...ids].sort()).toEqual([
      'single_arm_cable_overhead_extension',
      'single_arm_cable_overhead_triceps_extension_rope',
    ]);
  });

  it('drops empty strings — Supabase stores parent_id as "" on canonicals', () => {
    expect([...parentIdentifiers({ id: 'gym_1', slug: '', aliasIds: [''] })]).toEqual(['gym_1']);
  });
});

describe('isChildOf', () => {
  const parent = {
    id: 'single_arm_cable_overhead_extension',
    slug: 'single_arm_cable_overhead_extension',
    name: 'Single-Arm Cable Overhead Extension',
    aliasIds: ['single_arm_cable_overhead_triceps_extension_rope'],
  };

  it('links via the Supabase id the bundle does not use', () => {
    expect(
      isChildOf(
        { id: 'left', parentId: 'single_arm_cable_overhead_triceps_extension_rope' },
        parent,
      ),
    ).toBe(true);
  });

  it('links via the slug id', () => {
    expect(isChildOf({ id: 'left', parentId: 'single_arm_cable_overhead_extension' }, parent)).toBe(
      true,
    );
  });

  it('falls back to a normalized parent name when no id matches', () => {
    expect(
      isChildOf({ id: 'left', parentId: 'gone', parentName: 'single-arm cable overhead extension' }, parent),
    ).toBe(true);
  });

  it('rejects an unrelated row', () => {
    expect(isChildOf({ id: 'x', parentId: 'other', parentName: 'Bench Press' }, parent)).toBe(false);
  });

  it('never treats a row as its own child', () => {
    expect(isChildOf({ id: parent.id, parentId: parent.id }, parent)).toBe(false);
  });
});

describe('findChildVideoDonor', () => {
  const parent = {
    id: 'single_arm_cable_overhead_extension',
    slug: 'single_arm_cable_overhead_extension',
    name: 'Single-Arm Cable Overhead Extension',
    aliasIds: ['single_arm_cable_overhead_triceps_extension_rope'],
  };
  const left = {
    id: 'single_arm_cable_overhead_extension_left',
    parentId: 'single_arm_cable_overhead_triceps_extension_rope',
    parentName: 'Single-Arm Cable Overhead Extension',
    videoUrl: 'https://videos/left.mp4',
  };
  const right = {
    id: 'single_arm_cable_overhead_extension_right',
    parentId: 'single_arm_cable_overhead_triceps_extension_rope',
    parentName: 'Single-Arm Cable Overhead Extension',
    videoUrl: 'https://videos/right.mp4',
  };

  it('returns the lowest-id video-bearing child regardless of catalog order', () => {
    expect(findChildVideoDonor(parent, [right, left])).toBe(left);
    expect(findChildVideoDonor(parent, [left, right])).toBe(left);
  });

  it('skips children that have no video of their own', () => {
    expect(findChildVideoDonor(parent, [{ ...left, videoUrl: undefined }, right])).toBe(right);
  });

  it('returns undefined when nothing in the family has a video', () => {
    expect(findChildVideoDonor(parent, [{ ...left, videoUrl: '' }])).toBeUndefined();
  });
});
