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
 * Alternate-angle (e.g. "_side_view") clip URL.
 *
 * Mirrors `publicVideoUrl`'s lang/voice suffixing — per-(lang, voice) side-view
 * variants are produced by `Brand-Management/Exercises/voiceovers/add-sideview-voiceover.sh`
 * and uploaded to R2 alongside the canonical (`{slug}_side_view_<lang>_<voice>.mp4`).
 *
 * Safety net: callers must wire an `onError` on the <video> that falls back
 * to the bare `videoUrlAlt` — exercises whose TTS mp3 is missing for a given
 * (lang, voice) won't have a matching side-view variant uploaded, and the
 * 404 would otherwise leave a black PiP for users on that preference.
 */
export function publicVideoUrlAlt(
  ex: Exercise,
  voice: VoicePreference = 'male',
  lang: SupportedLang = 'en',
): string | undefined {
  if (isMediaHidden(ex.cat, ex.equipment) || !ex.videoUrlAlt) return undefined;
  return withLangVoice(ex.videoUrlAlt, lang, voice);
}

/**
 * Bare (en+onyx) alt URL for the onError fallback path. Strips any
 * `_<lang>_<voice>` or `_<voice>` suffix that publicVideoUrlAlt may have
 * appended before the `.mp4` so the video element can retry against the
 * canonical that's guaranteed to exist on R2.
 */
export function publicVideoUrlAltBase(ex: Exercise): string | undefined {
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
// Cloudflare cached as index.html in earlier deploys). v=4 marks the
// 1440x1080 WebP+JPEG quality regen.
const THUMB_CACHE_BUST = 'v=5';

/**
 * Two-variant thumbnail set for <picture> rendering: WebP primary (~97% of
 * browsers) + JPEG fallback for legacy. Both at 1440x1080 — modern browsers
 * downsample for non-retina viewports without visible quality loss, so we
 * skip 1x density variants to keep the on-disk asset count down.
 */
export interface ThumbnailSet {
  /**
   * Null for admin-uploaded Supabase Storage thumbnails. Only the bundled
   * `/images/thumbnails/` pipeline produces a .webp alongside the .jpg —
   * deriving a .webp URL for any other origin would 400, and Chrome doesn't
   * gracefully fall through to the <img> when a <source srcSet> returns
   * 400/404, so the card silently goes blank.
   */
  webp: string | null;
  jpeg: string;
}

function deriveVariants(canonicalJpeg: string): ThumbnailSet {
  const [pathPart, queryPart] = canonicalJpeg.split('?');
  const q = queryPart ? `?${queryPart}` : '';
  const base = pathPart.replace(/\.jpg$/i, '');
  const hasWebp = pathPart.startsWith('/images/thumbnails/');
  return {
    jpeg: `${base}.jpg${q}`,
    webp: hasWebp ? `${base}.webp${q}` : null,
  };
}

// Thumbnails are extracted from the processed video, so the file basename
// always matches the videoUrl basename (not necessarily the exercise id —
// e.g. id=child_s_pose vs file=childs_pose.jpg).
//
// `thumbnailUrl` (set by media-worker for admin-uploaded rows) takes precedence
// over the bundled-static path: legacy rows have it null and stay on the
// SEO-friendly /images path; admin-only rows render directly from Supabase
// Storage so they don't require a sync_landing_thumbnails + redeploy first.
export function exerciseThumb(ex: Exercise | undefined | null): string | null {
  if (!ex) return null;
  if (isMediaHidden(ex.cat, ex.equipment)) return null;
  if (ex.thumbnailUrl) return ex.thumbnailUrl;
  if (!ex.videoUrl) return null;
  const basename = ex.videoUrl.split('?')[0].split('/').pop()?.replace(/\.mp4$/i, '');
  if (!basename) return null;
  return `/images/thumbnails/exercises/${basename}.jpg?${THUMB_CACHE_BUST}`;
}

export function exerciseThumbSet(ex: Exercise | undefined | null): ThumbnailSet | null {
  const canonical = exerciseThumb(ex);
  return canonical ? deriveVariants(canonical) : null;
}

export function buildNameToSlug(exercises: Exercise[]): Record<string, string> {
  // When two exercises share a display name (e.g. an orphan duplicate canonical
  // alongside the real one), prefer the row that actually has a videoUrl —
  // otherwise workout cards whose hero resolves via this map can land on the
  // empty-canonical id and end up with no thumbnail.
  const map: Record<string, string> = {};
  const haveVideo: Record<string, boolean> = {};
  for (const ex of exercises) {
    const hasVideo = !!ex.videoUrl;
    if (!(ex.name in map) || (hasVideo && !haveVideo[ex.name])) {
      map[ex.name] = ex.id;
      haveVideo[ex.name] = hasVideo;
    }
  }
  return map;
}

function workoutHeroExercise(
  workout: Workout,
  nameToSlug: Record<string, string>,
  exercises?: Exercise[]
): Exercise | undefined {
  const main = workout.exercises.find((e: WorkoutExercise) => e.phase === 'main');
  const hero = main ?? workout.exercises[0];
  if (!hero) return undefined;
  const slug = nameToSlug[hero.name];
  if (!slug) return undefined;
  const ex = exercises?.find(e => e.id === slug);
  if (!ex) return undefined;
  if (exerciseThumb(ex)) return ex;
  // Parent canonical with no own video — fall back to a child variant's
  // thumbnail (the same pattern ExerciseLibrary uses for grid cards).
  if (exercises) {
    const childWithVideo = exercises.find(e =>
      (e.parentId === ex.id || (e.parentName && e.parentName === ex.name))
      && e.videoUrl
    );
    if (childWithVideo) return childWithVideo;
  }
  return ex;
}

export function workoutHeroThumb(
  workout: Workout,
  nameToSlug: Record<string, string>,
  exercises?: Exercise[]
): string | null {
  const ex = workoutHeroExercise(workout, nameToSlug, exercises);
  return exerciseThumb(ex);
}

export function workoutHeroThumbSet(
  workout: Workout,
  nameToSlug: Record<string, string>,
  exercises?: Exercise[]
): ThumbnailSet | null {
  const ex = workoutHeroExercise(workout, nameToSlug, exercises);
  return exerciseThumbSet(ex);
}
