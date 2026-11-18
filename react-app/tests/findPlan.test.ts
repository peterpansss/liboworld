import { describe, expect, it } from 'vitest';
import { buildPlan, deriveSplit, matchWorkouts, rampedDays, rampedLevel, type PlanAnswers } from '../src/data/findPlan';
import type { Workout } from '../src/data/exercises';

// Pins the web quiz to libo-app-v2/src/utils/onboardingPlan.ts.
describe('findPlan mirrors the app plan builder', () => {
  it('splits like deriveSplit in the app', () => {
    expect(deriveSplit(3, 'advanced')).toBe('full_body');
    expect(deriveSplit(5, 'beginner')).toBe('full_body');
    expect(deriveSplit(4, 'intermediate')).toBe('upper_lower');
    expect(deriveSplit(5, 'intermediate')).toBe('push_pull_legs');
  });

  it('ramps days and level by recent training', () => {
    expect(rampedDays(6, 'regular')).toBe(6);
    expect(rampedDays(6, 'onAndOff')).toBe(5);
    expect(rampedDays(5, 'comingBack')).toBe(4);
    expect(rampedDays(5, 'startingFresh')).toBe(3);
    expect(rampedLevel('advanced', 'startingFresh')).toBe('beginner');
    expect(rampedLevel('advanced', 'comingBack')).toBe('intermediate');
  });

  it('builds a 4-week plan and flags a ramp', () => {
    const a: PlanAnswers = { goal: 'build_muscle', location: 'gym', experience: 'intermediate', recentTraining: 'comingBack', days: 5, minutes: 60 };
    expect(buildPlan(a)).toEqual({ goal: 'build_muscle', days: 4, level: 'beginner', split: 'full_body', weeks: 4, minutes: 60, daysRamped: true });
  });

  it('matches mobility goals to stretching and keeps challenges out', () => {
    const w = (id: string, cat: string, subcat = ''): Workout =>
      ({ id, name: id, emoji: '', diff: 'beginner', dur: 20, cat, subcat, exercises: [] }) as Workout;
    const pool = [w('a', 'Gym', 'Chest'), w('b', 'Stretching', 'Mobility'), w('c', 'Challenge', '30-Day Program'), w('d', 'Evening Routine', 'Before Sleep')];
    const a: PlanAnswers = { goal: 'improve_mobility', location: 'gym', experience: 'beginner', recentTraining: 'regular', days: 3, minutes: 20 };
    const ids = matchWorkouts(pool, a).map((x) => x.id);
    expect(ids.slice(0, 2).sort()).toEqual(['b', 'd']);
    expect(ids).not.toContain('c');
  });
});
