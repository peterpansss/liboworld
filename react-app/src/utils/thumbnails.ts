import type { Exercise, Workout, WorkoutExercise } from '../data/exercises';

// Media (video + thumbnail) is hidden from the public site for equipment
// that still needs re-recording: dumbbell / barbell / kettlebell. Recorded
// exercises (any category, any other equipment) show their video; missing
// videoUrl already short-circuits below.
const HIDDEN_MEDIA_CATS = new Set<string>();
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

// Thumbnails are extracted from the processed video, so the file basename
// always matches the videoUrl basename (not necessarily the exercise id —
// e.g. id=child_s_pose vs file=childs_pose.jpg).
export function exerciseThumb(ex: Exercise | undefined | null): string | null {
  if (!ex) return null;
  if (isMediaHidden(ex.cat, ex.equipment)) return null;
  if (!ex.videoUrl) return null;
  const basename = ex.videoUrl.split('/').pop()?.replace(/\.mp4$/i, '');
  if (!basename) return null;
  return `/images/thumbnails/exercises/${basename}.jpg`;
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
  return exerciseThumb(ex);
}
