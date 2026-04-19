import type { Exercise, Workout, WorkoutExercise } from '../data/exercises';

// Media (video + thumbnail) is hidden from the public site for content that
// still needs re-recording: gym-category exercises and anything using
// dumbbell / barbell / kettlebell. Keep this in one place so every render
// path respects it uniformly.
const HIDDEN_MEDIA_CATS = new Set(['gym']);
const HIDDEN_MEDIA_EQUIPMENT = new Set(['Dumbbell', 'Barbell', 'Kettlebell']);

export function isMediaHidden(cat?: string, equipment?: string): boolean {
  if (cat && HIDDEN_MEDIA_CATS.has(cat)) return true;
  if (equipment && HIDDEN_MEDIA_EQUIPMENT.has(equipment)) return true;
  return false;
}

export function publicVideoUrl(ex: Exercise): string | undefined {
  return isMediaHidden(ex.cat, ex.equipment) ? undefined : ex.videoUrl;
}

export function publicAnimationUrl(ex: Exercise): string | undefined {
  return ex.animationUrl || undefined;
}

export function exerciseSupportsAnimation(ex: Exercise): boolean {
  if (!ex.animationUrl) return false;
  if (ex.equipment === 'Bodyweight') return false;
  return true;
}

// L/R variants share the parent's thumbnail file (same video, same still).
export function exerciseThumb(
  id: string,
  cat?: string,
  equipment?: string,
  parentId?: string
): string | null {
  if (isMediaHidden(cat, equipment)) return null;
  const thumbId = parentId || id;
  return `/images/thumbnails/exercises/${thumbId}.jpg`;
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
  const ex = exercises?.find(e => e.id === slug);
  return exerciseThumb(slug, ex?.cat, ex?.equipment, ex?.parentId);
}
