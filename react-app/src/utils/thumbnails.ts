import type { Exercise, Workout, WorkoutExercise } from '../data/exercises';

// Categories whose media is hidden from the public site (videos/thumbnails
// pulled until re-recorded). Keep this in one place so every render path
// respects it uniformly.
const HIDDEN_MEDIA_CATS = new Set(['gym']);

export function isMediaHidden(cat: string | undefined): boolean {
  return !!cat && HIDDEN_MEDIA_CATS.has(cat);
}

export function publicVideoUrl(ex: Exercise): string | undefined {
  return isMediaHidden(ex.cat) ? undefined : ex.videoUrl;
}

export function exerciseThumb(id: string, cat?: string): string | null {
  if (isMediaHidden(cat)) return null;
  return `/images/thumbnails/exercises/${id}.jpg`;
}

export function buildNameToSlug(exercises: Exercise[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const ex of exercises) map[ex.name] = ex.id;
  return map;
}

export function workoutHeroThumb(
  workout: Workout,
  nameToSlug: Record<string, string>,
  exercises?: Exercise[]
): string | null {
  const main = workout.exercises.find((e: WorkoutExercise) => e.phase === 'main');
  const hero = main ?? workout.exercises[0];
  if (!hero) return null;
  const slug = nameToSlug[hero.name];
  if (!slug) return null;
  const cat = exercises?.find(e => e.id === slug)?.cat;
  return exerciseThumb(slug, cat);
}
