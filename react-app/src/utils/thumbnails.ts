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
export type SupportedLang = 'en' | 'de' | 'es' | 'fr' | 'pt';

const VOICE_SLUG: Record<VoicePreference, 'onyx' | 'nova'> = { male: 'onyx', female: 'nova' };

/**
 * Suffix convention used by the upload pipeline:
 *   en + onyx → '' (default, e.g. `<slug>.mp4`)
 *   en + nova → '_nova' (e.g. `<slug>_nova.mp4`)
 *   <lang> + <voice> → '_<lang>_<voice>' (e.g. `<slug>_de_onyx.mp4`)
 */
function suffixForLangVoice(lang: SupportedLang, voice: VoicePreference): string {
  const v = VOICE_SLUG[voice];
  if (lang === 'en' && v === 'onyx') return '';
  if (lang === 'en') return `_${v}`;
  return `_${lang}_${v}`;
}

/**
 * Inject the lang+voice suffix before .mp4 to pick up the matching variant
 * uploaded by the pipeline. Preserves any trailing query string (e.g.
 * cache-buster `?v=2`).
 */
function withLangVoice(url: string, lang: SupportedLang, voice: VoicePreference): string {
  const suffix = suffixForLangVoice(lang, voice);
  if (!suffix) return url;
  return url.replace(/\.mp4(\?|$)/, `${suffix}.mp4$1`);
}

export function publicVideoUrl(
  ex: Exercise,
  voice: VoicePreference = 'male',
  lang: SupportedLang = 'en',
): string | undefined {
  if (isMediaHidden(ex.cat, ex.equipment) || !ex.videoUrl) return undefined;
  return withLangVoice(ex.videoUrl, lang, voice);
}

/**
 * Alternate-angle (e.g. "_side_view") clip URL — same hidden-media rules
 * as the primary video. Returns undefined when the exercise has no alt.
 *
 * Side-view clips are language-agnostic, no voiceover — they're a visual
 * reference angle (no audio stream); the primary clip carries the voiceover.
 * Voice and lang args are kept for call-site symmetry with publicVideoUrl.
 */
export function publicVideoUrlAlt(
  ex: Exercise,
  _voice: VoicePreference = 'male',
  _lang: SupportedLang = 'en',
): string | undefined {
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

// Cache-bust suffix for thumbnail URLs. Bump this whenever we deploy a
// batch of new thumbnail JPGs whose paths might already be poisoned in
// Cloudflare's edge cache from before the file existed (the .htaccess
// asset-404 rule prevents future occurrences, but doesn't help URLs
// Cloudflare cached as index.html in earlier deploys).
const THUMB_CACHE_BUST = 'v=3';

// Thumbnails are extracted from the processed video, so the file basename
// always matches the videoUrl basename (not necessarily the exercise id —
// e.g. id=child_s_pose vs file=childs_pose.jpg).
export function exerciseThumb(ex: Exercise | undefined | null): string | null {
  if (!ex) return null;
  if (isMediaHidden(ex.cat, ex.equipment)) return null;
  if (!ex.videoUrl) return null;
  const basename = ex.videoUrl.split('?')[0].split('/').pop()?.replace(/\.mp4$/i, '');
  if (!basename) return null;
  return `/images/thumbnails/exercises/${basename}.jpg?${THUMB_CACHE_BUST}`;
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
