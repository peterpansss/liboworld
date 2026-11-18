/**
 * /find-your-plan: the web version of the app's plan questions (Noah,
 * 18 Nov 2026, Ladder's "Find your plan" as the reference).
 *
 * The mapping MIRRORS libo-app-v2/src/utils/onboardingPlan.ts, so the plan the
 * site shows is the plan the app builds from the same answers:
 *   - the goal picks the themed plan (Lean Burn, Mass Builder, ...),
 *   - recent training ramps the week-one days and the level down,
 *   - days + level pick the split (beginner or <= 3 days = full body,
 *     4 = upper/lower, 5+ = push/pull/legs),
 *   - every plan is 4 weeks (DEFAULT_DURATION_WEEKS = FREE_PLAN_MAX_WEEKS),
 *   - warm-up and cool-down are always on (includeWarmupCooldown: true).
 * Change the app's rules and this file has to change with them.
 *
 * Nothing is stored or sent anywhere: the answers live in the page state.
 */
import type { Workout } from './exercises';

export type PlanGoal = 'lose_weight' | 'build_muscle' | 'improve_mobility' | 'stay_active' | 'reduce_stress';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type RecentTraining = 'regular' | 'onAndOff' | 'comingBack' | 'startingFresh';
export type Location = 'gym' | 'home' | 'outdoors' | 'anywhere';
export type Split = 'full_body' | 'upper_lower' | 'push_pull_legs';

export interface PlanAnswers {
  goal: PlanGoal;
  location: Location;
  experience: Experience;
  recentTraining: RecentTraining;
  days: number; // 2..6 (6 = "6+")
  minutes: number; // upper bound of the picked range: 20 / 45 / 60 / 75
}

export const PLAN_WEEKS = 4;

const RAMP: Record<RecentTraining, { daysCap: number; levelSteps: number }> = {
  regular: { daysCap: 6, levelSteps: 0 },
  onAndOff: { daysCap: 5, levelSteps: 1 },
  comingBack: { daysCap: 4, levelSteps: 1 },
  startingFresh: { daysCap: 3, levelSteps: 2 },
};

const LEVELS: Experience[] = ['beginner', 'intermediate', 'advanced'];

export function rampedLevel(experience: Experience, recent: RecentTraining): Experience {
  return LEVELS[Math.max(0, LEVELS.indexOf(experience) - RAMP[recent].levelSteps)];
}

export function rampedDays(days: number, recent: RecentTraining): number {
  return Math.min(Math.min(6, Math.max(2, days)), RAMP[recent].daysCap);
}

export function deriveSplit(days: number, level: Experience): Split {
  if (level === 'beginner' || days <= 3) return 'full_body';
  if (days === 4) return 'upper_lower';
  return 'push_pull_legs';
}

export interface PlanResult {
  goal: PlanGoal;
  days: number;
  level: Experience;
  split: Split;
  weeks: number;
  minutes: number;
  /** True when the ramp started them on fewer days than they picked. */
  daysRamped: boolean;
}

export function buildPlan(a: PlanAnswers): PlanResult {
  const level = rampedLevel(a.experience, a.recentTraining);
  const days = rampedDays(a.days, a.recentTraining);
  return {
    goal: a.goal,
    days,
    level,
    split: deriveSplit(days, level),
    weeks: PLAN_WEEKS,
    minutes: a.minutes,
    daysRamped: days < Math.min(6, Math.max(2, a.days)),
  };
}

// ── Workouts from the web library that fit the answers ──

const MOBILITY_CATS = new Set(['Stretching', 'Morning Routine', 'Evening Routine']);

function isMobility(w: Workout): boolean {
  const sub = (w.subcat || '').toLowerCase();
  return MOBILITY_CATS.has(w.cat) || sub.includes('mobility') || sub.includes('recovery') || sub.includes('rehab');
}

function isConditioning(w: Workout): boolean {
  const sub = (w.subcat || '').toLowerCase();
  return w.cat === 'Cardio' || sub.includes('hiit') || sub.includes('cardio') || sub === 'steady-state';
}

function fitsPlace(w: Workout, loc: Location): boolean {
  if (loc === 'anywhere') return true;
  if (loc === 'gym') return w.cat === 'Gym' || w.cat === 'Cardio';
  // home + outdoors: no machines
  return w.cat === 'Home' || w.cat === 'Morning Routine' || w.cat === 'Evening Routine' || w.cat === 'Stretching';
}

/** Up to `n` workouts, best match first. Challenges (30-day programs) are app-only. */
export function matchWorkouts(workouts: readonly Workout[], a: PlanAnswers, n = 3): Workout[] {
  const level = rampedLevel(a.experience, a.recentTraining);
  const wantsMobility = a.goal === 'improve_mobility' || a.goal === 'reduce_stress';
  const score = (w: Workout): number => {
    let s = 0;
    const mob = isMobility(w);
    if (wantsMobility) s += mob ? 6 : -6;
    else if (mob) s -= 4;
    if (a.goal === 'lose_weight' && isConditioning(w)) s += 3;
    if (a.goal === 'build_muscle' && !isConditioning(w) && !mob) s += 2;
    if (fitsPlace(w, a.location)) s += 4;
    else if (!wantsMobility) s -= 8;
    const d = (w.diff || 'beginner').toLowerCase();
    const wl = d.startsWith('adv') ? 2 : d.startsWith('int') ? 1 : 0;
    s -= Math.abs(wl - LEVELS.indexOf(level)) * 2;
    s -= Math.abs((w.dur || 30) - Math.min(a.minutes, 60)) / 10;
    return s;
  };
  return workouts
    .filter((w) => w.cat !== 'Challenge')
    .map((w) => ({ w, s: score(w) }))
    .sort((x, y) => y.s - x.s || x.w.id.localeCompare(y.w.id))
    .slice(0, n)
    .map((x) => x.w);
}
