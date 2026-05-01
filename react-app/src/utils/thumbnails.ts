import type { Exercise, Workout, WorkoutExercise } from '../data/exercises';

// Free-weight equipment gates (Dumbbell / Barbell / Kettlebell) were a
// stopgap when those exercises had no real demos. We now ship them, so
// the gate is empty — videoUrl resolves through. The HIDDEN_MEDIA_*
// sets stay so future categories/equipment can be hidden if needed.
const HIDDEN_MEDIA_CATS = new Set<string>();
const HIDDEN_MEDIA_EQUIPMENT = new Set<string>();

export function isMediaHidden(cat?: string, equipment?: string): boolean {
  if (cat && HIDDEN_MEDIA_CATS.has(cat)) return true;
  if (equipment && HIDDEN_MEDIA_EQUIPMENT.has(equipment)) return true;
  return false;
}

export type VoicePreference = 'male' | 'female';

/**
 * Inject `_nova` before .mp4 to switch from the default male (onyx) voice
 * to the female (nova) variant uploaded by the pipeline. Preserves any
 * trailing query string (e.g. cache-buster `?v=2`).
 */
function withVoice(url: string, voice: VoicePreference): string {
  if (voice !== 'female') return url;
  return url.replace(/\.mp4(\?|$)/, '_nova.mp4$1');
}

export function publicVideoUrl(ex: Exercise, voice: VoicePreference = 'male'): string | undefined {
  if (isMediaHidden(ex.cat, ex.equipment) || !ex.videoUrl) return undefined;
  return withVoice(ex.videoUrl, voice);
}

/**
 * Alternate-angle (e.g. "_side_view") clip URL — same hidden-media rules
 * as the primary video. Returns undefined when the exercise has no alt.
 *
 * Side-view clips are visual-only (no audio stream — they're a reference
 * angle, the primary clip carries the voiceover), so the voice preference
 * doesn't apply here. Always return the base alt URL regardless of voice.
 * The `_voice` arg is kept for call-site symmetry with publicVideoUrl.
 */
export function publicVideoUrlAlt(ex: Exercise, _voice: VoicePreference = 'male'): string | undefined {
  if (isMediaHidden(ex.cat, ex.equipment) || !ex.videoUrlAlt) return undefined;
  return ex.videoUrlAlt;
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
  const basename = ex.videoUrl.split('?')[0].split('/').pop()?.replace(/\.mp4$/i, '');
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
