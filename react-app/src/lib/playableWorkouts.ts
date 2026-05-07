// Workout-block filter — drops blocks whose referenced exercise isn't
// playable, so a workout that references a video-less exercise doesn't break
// the player or show empty placeholders in the pre-start overview.
//
// Why this lives here, not in the workout-loading hook:
//   The workout source (data/exercises.ts → getWorkouts) and the playable
//   exercise set (hooks/useExercises) load independently. Coupling them
//   inside the loader would force one to wait on the other and leak a Set
//   into a static-data module. Consumers already pull both, so applying
//   the filter at the consumer layer keeps the data layer dumb.
//
// Lookup is by exercise NAME because the static workouts.json blocks use
// names (`exercise: "Flat Barbell Bench Press"`), not ids. A block whose
// name doesn't match any playable exercise is dropped — same as if its
// referenced exercise was removed entirely.
//
// Mirrors the filterPlayable contract in useExercises.ts and the parallel
// libo-app-v2/src/hooks/useExerciseSync.ts so web and mobile show the same
// set of blocks for any given workout.

import type { Exercise, Workout, WorkoutExercise } from '../data/exercises';
import { buildChildrenWithVideoByParent, isPlayable } from '../hooks/useExercises';

/**
 * Build a Set of names of exercises that are playable. Workout blocks are
 * matched by name (case-insensitive, trimmed) against this set.
 */
export function buildPlayableExerciseNames(exercises: readonly Exercise[]): Set<string> {
  const childrenWithVideoByParent = buildChildrenWithVideoByParent(exercises);
  const names = new Set<string>();
  for (const ex of exercises) {
    if (isPlayable(ex, childrenWithVideoByParent)) {
      names.add(ex.name.toLowerCase().trim());
    }
  }
  return names;
}

function isBlockPlayable(block: WorkoutExercise, playableNames: Set<string>): boolean {
  // Rest steps and any block without a name fall through as playable —
  // they don't reference an exercise so there's nothing to gate on.
  if (!block.name) return true;
  return playableNames.has(block.name.toLowerCase().trim());
}

/**
 * Returns a workout with unplayable blocks dropped from its `exercises` array
 * and `dur` proportionally rescaled (rounded to the nearest minute) so cards
 * and overviews don't claim a 45-min workout that's actually 38 min after the
 * filter. Original blocks are not mutated — a new Workout is returned.
 *
 * Edge cases:
 *   - Empty workout (no blocks) → returned untouched.
 *   - All blocks dropped → returned with empty array and dur=0; let the
 *     consumer decide whether to hide the card entirely.
 *   - A block whose name doesn't resolve to any exercise (typo, dropped row)
 *     is treated as unplayable and dropped — symmetric with the player
 *     behaviour that would otherwise crash on the missing video.
 */
export function filterPlayableBlocks(
  workout: Workout,
  playableNames: Set<string>,
): Workout {
  const total = workout.exercises.length;
  if (total === 0) return workout;

  const filtered = workout.exercises.filter((b) => isBlockPlayable(b, playableNames));
  if (filtered.length === total) return workout;

  // Proportional dur rescale. Per-block durations aren't always present on
  // the static catalog, so we can't sum them — scaling is the honest
  // approximation. Round to the nearest minute, floor at 0.
  const scaledDur =
    total > 0 ? Math.max(0, Math.round((workout.dur * filtered.length) / total)) : 0;

  return {
    ...workout,
    exercises: filtered,
    dur: scaledDur,
  };
}

/**
 * Convenience for list views: filter every workout against the same set in
 * one call. Workouts that end up empty are dropped — a card with zero blocks
 * is just confusing (the user clicks through to an empty overview).
 */
export function filterPlayableWorkouts(
  workouts: readonly Workout[],
  playableNames: Set<string>,
): Workout[] {
  const out: Workout[] = [];
  for (const w of workouts) {
    const filtered = filterPlayableBlocks(w, playableNames);
    if (filtered.exercises.length > 0) out.push(filtered);
  }
  return out;
}
