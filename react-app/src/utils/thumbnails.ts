import type { Exercise, Workout, WorkoutExercise } from '../data/exercises';

export function exerciseThumb(id: string): string {
  return `/images/thumbnails/exercises/${id}.jpg`;
}

export function buildNameToSlug(exercises: Exercise[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const ex of exercises) map[ex.name] = ex.id;
  return map;
}

export function workoutHeroThumb(workout: Workout, nameToSlug: Record<string, string>): string | null {
  const main = workout.exercises.find((e: WorkoutExercise) => e.phase === 'main');
  const hero = main ?? workout.exercises[0];
  if (!hero) return null;
  const slug = nameToSlug[hero.name];
  return slug ? exerciseThumb(slug) : null;
}
