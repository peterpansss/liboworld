/**
 * Exercise names lose their em dashes (owner decision, 25 Nov 2026):
 *   "Bulgarian Split Squat — Barbell — Left Leg" -> "Bulgarian Split Squat: Barbell, Left Leg"
 *
 * On the web the bundled public/exercises.json wins over Supabase on a slug
 * match, so for a while the library says "A — B" while live workout blocks
 * say "A: B" (or the reverse). Every name join must treat them as one name.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Exercise, Workout } from '../../src/data/exercises';
import {
  SIDE_SUFFIX_RE,
  bilateralChildName,
  exerciseNameKey,
  exerciseNameSpellings,
  legacyExerciseName,
  modernExerciseName,
  parentNameOf,
  sideOf,
} from '../../src/utils/exerciseNameFormat';
import { buildPlayableExerciseNames, filterPlayableBlocks } from '../../src/lib/playableWorkouts';
import { buildNameToSlug, workoutHeroThumb } from '../../src/utils/thumbnails';
import { normalizeExerciseName, isChildOf } from '../../src/utils/exerciseFamily';
import { getTips } from '../../src/utils/exerciseInfo';

function ex(o: Partial<Exercise>): Exercise {
  return {
    id: o.id ?? 'x',
    name: o.name ?? 'X',
    cat: o.cat ?? 'gym',
    equipment: o.equipment ?? 'Barbell',
    bodyFocus: o.bodyFocus ?? 'Legs',
    machineRequired: false,
    diff: o.diff ?? 'beginner',
    variation: '',
    emoji: '',
    videoUrl: o.videoUrl,
    thumbnailUrl: o.thumbnailUrl,
    setupNotes: '',
    parentId: o.parentId,
    parentName: o.parentName,
  } as Exercise;
}

function workout(names: string[]): Workout {
  return {
    id: 'wk_test',
    name: 'Test',
    cat: 'gym',
    subcat: '',
    dur: 30,
    diff: 'beginner',
    emoji: '',
    exercises: names.map((name) => ({ name, sets: '3', reps: '10' })),
  } as unknown as Workout;
}

describe('format', () => {
  it('renames by the agreed rules', () => {
    expect(modernExerciseName('Bulgarian Split Squat — Barbell — Back Rack — Paused — Right Leg')).toBe(
      'Bulgarian Split Squat: Barbell, Back Rack, Paused, Right Leg',
    );
    expect(modernExerciseName('Cable Glute Kickback — Right Leg')).toBe('Cable Glute Kickback: Right Leg');
    expect(modernExerciseName('Fente bulgare — Jambe gauche', ' : ')).toBe('Fente bulgare : Jambe gauche');
    expect(modernExerciseName('Push-Up (Standard)')).toBe('Push-Up (Standard)');
  });

  it('parses the side in both spellings', () => {
    for (const n of ['Lunge — Left Leg', 'Lunge: Left Leg', 'Lunge: Barbell, Left Leg']) {
      expect(sideOf(n)).toBe('L');
      expect(SIDE_SUFFIX_RE.test(n)).toBe(true);
    }
    expect(parentNameOf('Lunge: Barbell, Right Leg')).toBe('Lunge: Barbell');
    expect(sideOf('Left-Hand Bias Row')).toBe(null);
  });

  it('admin child names never carry an em dash', () => {
    expect(bilateralChildName('Cable Glute Kickback', 'Right', 'Leg')).toBe('Cable Glute Kickback: Right Leg');
    expect(bilateralChildName('Donkey Kick: Cable/Machine', 'Left')).toBe('Donkey Kick: Cable/Machine, Left');
    expect(bilateralChildName('Donkey Kick — Cable/Machine', 'Left')).toBe('Donkey Kick: Cable/Machine, Left');
  });

  it('spellings round-trip', () => {
    expect(legacyExerciseName('Lunge: Barbell, Left Leg')).toBe('Lunge — Barbell — Left Leg');
    expect(exerciseNameSpellings('Lunge: Left Leg')).toEqual(['Lunge: Left Leg', 'Lunge — Left Leg']);
    expect(exerciseNameKey('Lunge — Barbell — Left Leg')).toBe(exerciseNameKey('lunge: barbell, left leg'));
  });

  it('the bundled library renames losslessly and without key collisions', () => {
    const path = join(__dirname, '../../public/exercises.json');
    let rows: { name: string }[] = [];
    try {
      rows = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      return; // bundle not present in this checkout
    }
    const keys = new Set<string>();
    for (const r of rows) {
      const n = modernExerciseName(r.name);
      expect(n.includes('—')).toBe(false);
      expect(legacyExerciseName(n)).toBe(r.name);
      expect(exerciseNameKey(n)).toBe(exerciseNameKey(r.name));
      expect(sideOf(n)).toBe(sideOf(r.name));
      keys.add(exerciseNameKey(n));
    }
    // ids can repeat a name (aliases) but keys must not merge two names
    expect(keys.size).toBe(new Set(rows.map((r) => r.name)).size);
  });
});

describe('joins accept both spellings', () => {
  const OLD = 'Reverse Lunge — Bodyweight — Left Leg';
  const NEW = 'Reverse Lunge: Bodyweight, Left Leg';

  it('playable filter keeps the block whichever side is renamed', () => {
    for (const [lib, block] of [[OLD, NEW], [NEW, OLD]]) {
      const names = buildPlayableExerciseNames([ex({ id: 'a', name: lib, videoUrl: 'https://v/a.mp4' })]);
      expect(filterPlayableBlocks(workout([block]), names).exercises).toHaveLength(1);
    }
  });

  it('thumbnail name map resolves either spelling', () => {
    for (const [lib, block] of [[OLD, NEW], [NEW, OLD]]) {
      const lib1 = [ex({ id: 'a', name: lib, videoUrl: 'https://v/a.mp4', thumbnailUrl: 'https://t/a.jpg' })];
      expect(workoutHeroThumb(workout([block]), buildNameToSlug(lib1), lib1)).not.toBeNull();
    }
  });

  it('family name fallback links a renamed parent to an old-spelling child', () => {
    expect(normalizeExerciseName('Donkey Kick — Cable/Machine')).toBe(normalizeExerciseName('Donkey Kick: Cable/Machine'));
    expect(normalizeExerciseName('Dumbbell Row - Standard ')).toBe(normalizeExerciseName('Dumbbell Row — Standard'));
    const parent = { id: 'p', name: 'Donkey Kick: Cable/Machine' };
    const child = { id: 'c', name: 'Donkey Kick: Cable/Machine, Left', parentName: 'Donkey Kick — Cable/Machine' };
    expect(isChildOf(child, parent)).toBe(true);
  });

  it('the "sided" tip shows for the new spelling too', () => {
    const base = { equipment: 'Bodyweight', diff: 'beginner' };
    const withSide = getTips({ ...base, name: 'Lunge: Left Leg' });
    const without = getTips({ ...base, name: 'Lunge' });
    expect(withSide.length).toBe(without.length + 1);
    expect(getTips({ ...base, name: 'Lunge — Left' })).toEqual(withSide);
  });
});
