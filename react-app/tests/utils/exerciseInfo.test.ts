/**
 * Coverage for src/utils/exerciseInfo.ts.
 *
 * The module is heuristic-only (no IO), so we exercise:
 *  - direct map hits (each of the 13 muscle groups)
 *  - fuzzy hits (substring match in either direction)
 *  - dedupe across multiple bodyFocus parts
 *  - the unknown-bodyFocus passthrough fallback
 *  - every name-based branch in getInstructions / getCommonMistakes
 *  - every flag in getTips (Barbell + advanced + single-leg + ' — left' marker + stretch)
 */
import { describe, expect, it } from 'vitest';
import {
  getMuscleGroups,
  getPrimaryMuscleGroup,
  MUSCLE_GROUP_KEYS,
  getInstructions,
  getTips,
  getCommonMistakes,
} from '../../src/utils/exerciseInfo';

describe('getMuscleGroups', () => {
  it('returns the mapped groups for an exact key', () => {
    const groups = getMuscleGroups('Chest');
    expect(groups).toEqual([
      { name: 'Chest', intensity: 'primary' },
      { name: 'Front Delts', intensity: 'secondary' },
      { name: 'Triceps', intensity: 'secondary' },
    ]);
  });

  it('splits compound bodyFocus on / & , and dedupes muscles', () => {
    const groups = getMuscleGroups('Chest/Triceps');
    // Chest contributes Chest + Front Delts + Triceps; Triceps would re-add Triceps + Chest, both deduped.
    expect(groups.map((g) => g.name)).toEqual(['Chest', 'Front Delts', 'Triceps']);
  });

  it('handles all three separators (/ , &) and ignores empty parts', () => {
    const groups = getMuscleGroups('Chest, Back & Shoulders/');
    const names = groups.map((g) => g.name);
    expect(names).toContain('Chest');
    expect(names).toContain('Lats');
    expect(names).toContain('Front Delts');
    expect(names).toContain('Side Delts');
  });

  it('falls back to fuzzy substring match when key not exact', () => {
    // 'chest day' contains 'Chest' (case-insensitive)
    const groups = getMuscleGroups('chest day');
    expect(groups[0]).toEqual({ name: 'Chest', intensity: 'primary' });
  });

  it('matches when the key is a substring of the input', () => {
    // 'Pec' is shorter than 'Chest' so the OTHER direction tested:
    // pick a part where map-key contains the input. e.g. input 'Quad' matches 'Quads'.
    const groups = getMuscleGroups('Quad');
    expect(groups.map((g) => g.name)).toContain('Quads');
  });

  it('treats unknown parts as primary muscle of their own', () => {
    const groups = getMuscleGroups('Neck');
    expect(groups).toEqual([{ name: 'Neck', intensity: 'primary' }]);
  });

  it('returns [] for empty bodyFocus', () => {
    expect(getMuscleGroups('')).toEqual([]);
  });

  it('covers every defined map key', () => {
    for (const key of MUSCLE_GROUP_KEYS) {
      const groups = getMuscleGroups(key);
      expect(groups.length).toBeGreaterThan(0);
      expect(groups.some((g) => g.intensity === 'primary')).toBe(true);
    }
  });
});

describe('getPrimaryMuscleGroup', () => {
  it('returns the first mapped key for compound input', () => {
    expect(getPrimaryMuscleGroup('Chest/Triceps')).toBe('Chest');
  });

  it('returns the matched key on fuzzy match', () => {
    expect(getPrimaryMuscleGroup('back exercises')).toBe('Back');
  });

  it('returns the bodyFocus itself when no parts match', () => {
    // Single unknown token => returns it back
    expect(getPrimaryMuscleGroup('Neck')).toBe('Neck');
  });

  it('returns the original bodyFocus when no parts (empty input)', () => {
    expect(getPrimaryMuscleGroup('')).toBe('');
  });
});

describe('MUSCLE_GROUP_KEYS', () => {
  it('exposes every key in the underlying map', () => {
    expect(MUSCLE_GROUP_KEYS).toContain('Chest');
    expect(MUSCLE_GROUP_KEYS).toContain('Full Body');
    expect(MUSCLE_GROUP_KEYS.length).toBeGreaterThanOrEqual(13);
  });
});

describe('getInstructions', () => {
  const base = { equipment: 'Barbell', bodyFocus: 'Chest' };

  it('parses setupNotes into sentences and re-adds trailing period', () => {
    const out = getInstructions({
      ...base,
      name: 'Some Movement',
      setupNotes:
        'Set up the bench at 30 degrees. Grip the bar shoulder-width apart. Keep feet flat.',
    });
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out[0].endsWith('.')).toBe(true);
    expect(out[0]).toMatch(/Set up the bench/);
  });

  it('skips short fragments (<= 5 chars)', () => {
    const out = getInstructions({
      ...base,
      name: 'Bench Press',
      setupNotes: 'Hi. ', // too short -> falls into press fallback
    });
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out[0]).toMatch(/Brace your core/);
  });

  it('falls back to press/push template', () => {
    const out = getInstructions({ ...base, name: 'Push-Up', setupNotes: '' });
    expect(out[0]).toMatch(/Brace your core/);
    expect(out[2]).toMatch(/Fully extend/);
  });

  it('falls back to row/pull template', () => {
    const out = getInstructions({ ...base, name: 'Bent Row', setupNotes: '' });
    expect(out[0]).toMatch(/retracting your shoulder blades/);
  });

  it('falls back to squat/lunge template', () => {
    const out = getInstructions({ ...base, name: 'Lunge', setupNotes: '' });
    expect(out[0]).toMatch(/chest up and core braced/);
  });

  it('falls back to curl template', () => {
    const out = getInstructions({ ...base, name: 'Hammer Curl', setupNotes: '' });
    expect(out[0]).toMatch(/elbows pinned to your sides/);
  });

  it('falls back to stretch/foam-roll/lacrosse template', () => {
    const out = getInstructions({ ...base, name: 'Lacrosse Ball Trap Release', setupNotes: '' });
    expect(out[0]).toMatch(/Move into the stretch slowly/);
  });

  it('falls back to plank/hold template', () => {
    const out = getInstructions({ ...base, name: 'Side Plank', setupNotes: '' });
    expect(out[0]).toMatch(/Engage your core/);
  });

  it('falls back to deadlift / hip-thrust template', () => {
    const out = getInstructions({ ...base, name: 'Romanian Deadlift', setupNotes: '' });
    expect(out[0]).toMatch(/Hinge at the hips/);
  });

  it('uses the generic fallback for unknown movements', () => {
    const out = getInstructions({ ...base, name: 'Mystery Drill', setupNotes: '' });
    expect(out[0]).toBe('Perform the movement with controlled tempo.');
  });

  it('does NOT add fallback steps when setupNotes already supplies >= 3 sentences', () => {
    const out = getInstructions({
      ...base,
      name: 'Push-Up', // would normally trigger press fallback
      setupNotes: 'Step one is here. Step two is here. Step three is here. Step four is here.',
    });
    expect(out.length).toBe(4);
    expect(out.every((s) => /step/i.test(s))).toBe(true);
    // Crucially, no canned "Brace your core" line
    expect(out.some((s) => /Brace your core/.test(s))).toBe(false);
  });
});

describe('getTips', () => {
  it('adds the barbell tip', () => {
    const tips = getTips({ name: 'Bench', equipment: 'Barbell', diff: 'beginner' });
    expect(tips).toContain('Start with lighter weight to perfect your form before loading up.');
  });

  it('adds the advanced tip', () => {
    const tips = getTips({ name: 'Pistol Squat', equipment: 'Bodyweight', diff: 'advanced' });
    expect(tips.some((t) => t.includes('advanced movement'))).toBe(true);
  });

  it('adds the single-leg / one-arm tip (hyphen form)', () => {
    const tips = getTips({ name: 'Single-Leg RDL', equipment: 'Dumbbell', diff: 'beginner' });
    expect(tips.some((t) => t.includes('weaker side first'))).toBe(true);
  });

  it('adds the single-leg / one-arm tip (space form)', () => {
    const tips = getTips({ name: 'single leg press', equipment: 'Machine', diff: 'beginner' });
    expect(tips.some((t) => t.includes('weaker side first'))).toBe(true);
  });

  it('adds the one-arm form tip', () => {
    const tips = getTips({ name: 'One-Arm Row', equipment: 'Dumbbell', diff: 'beginner' });
    expect(tips.some((t) => t.includes('weaker side first'))).toBe(true);
  });

  it('adds the unilateral em-dash tip (left)', () => {
    const tips = getTips({ name: 'Lunge — Left', equipment: 'Bodyweight', diff: 'beginner' });
    expect(tips.some((t) => t.includes('Perform equal reps'))).toBe(true);
  });

  it('adds the unilateral em-dash tip (right)', () => {
    const tips = getTips({ name: 'Lunge — Right', equipment: 'Bodyweight', diff: 'beginner' });
    expect(tips.some((t) => t.includes('Perform equal reps'))).toBe(true);
  });

  it('adds the no-bounce stretch tip', () => {
    const tips = getTips({ name: 'Hip Flexor Stretch', equipment: 'Bodyweight', diff: 'beginner' });
    expect(tips.some((t) => t.includes('Never bounce'))).toBe(true);
  });

  it('returns [] when no flags trigger', () => {
    const tips = getTips({ name: 'Plain Crunch', equipment: 'Bodyweight', diff: 'beginner' });
    expect(tips).toEqual([]);
  });
});

describe('getCommonMistakes', () => {
  it('returns squat/lunge mistakes', () => {
    const out = getCommonMistakes({ name: 'Front Squat', bodyFocus: 'Legs' });
    expect(out.some((m) => m.includes('knees collapse'))).toBe(true);
  });

  it('returns press/push mistakes', () => {
    const out = getCommonMistakes({ name: 'Overhead Press', bodyFocus: 'Shoulders' });
    expect(out.some((m) => m.includes('Flaring the elbows'))).toBe(true);
  });

  it('returns row/pull mistakes', () => {
    const out = getCommonMistakes({ name: 'Pull-Up', bodyFocus: 'Back' });
    expect(out.some((m) => m.includes('momentum to swing'))).toBe(true);
  });

  it('returns deadlift / hip-thrust mistakes', () => {
    const out = getCommonMistakes({ name: 'Hip Thrust', bodyFocus: 'Glutes' });
    expect(out.some((m) => m.includes('Rounding the lower back'))).toBe(true);
  });

  it('returns curl mistakes', () => {
    const out = getCommonMistakes({ name: 'Bicep Curl', bodyFocus: 'Biceps' });
    expect(out.some((m) => m.includes('Swinging the weight'))).toBe(true);
  });

  it('returns plank/hold mistakes', () => {
    const out = getCommonMistakes({ name: 'Plank', bodyFocus: 'Core' });
    expect(out.some((m) => m.includes('hips sag'))).toBe(true);
  });

  it('returns stretch mistakes', () => {
    const out = getCommonMistakes({ name: 'Pigeon Stretch', bodyFocus: 'Glutes' });
    expect(out.some((m) => m.includes('Bouncing into the stretch'))).toBe(true);
  });

  it('returns [] for unknown movement types', () => {
    expect(getCommonMistakes({ name: 'Dance Move', bodyFocus: 'Full Body' })).toEqual([]);
  });
});
