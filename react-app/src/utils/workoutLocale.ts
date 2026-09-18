import type { WorkoutNameTranslations } from '../data/exercises';

/**
 * Display name for a workout in the given i18n language, English fallback.
 * Mirrors `localizedWorkoutName` in libo-app-v2/src/utils/workoutLocale.ts.
 * Print-only: search keys, URLs and exercise joins keep the English `name`.
 *
 * Kept out of data/exercises.ts so pages that mock that module still get the
 * real resolver.
 */
export function localizedWorkoutName(
  w: { name: string } & WorkoutNameTranslations,
  lang: string,
): string {
  const code = (lang || 'en').split('-')[0];
  if (code === 'de' || code === 'es' || code === 'fr' || code === 'pt') {
    const v = w[`name_${code}`];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return w.name;
}
