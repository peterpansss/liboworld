/**
 * Locale resolver for translated exercise names — the exercise counterpart of
 * `localizedWorkoutName` (utils/workoutLocale.ts) and the web mirror of
 * `localizedExerciseField` in libo-app-v2/src/utils/exerciseLocale.ts.
 *
 * Rows carry the canonical English `name` plus optional `name_<lang>`
 * (`exercises.name_de` … — supabase-migration-exercise-name-translations.sql,
 * and the same keys in the bundled `public/exercises.json`). Falls back to
 * English when the translation is missing, null or empty, so admin-created
 * rows, a bundle that predates the columns, and a database that predates the
 * migration all render exactly as before.
 *
 * Use at every user-facing PRINT of an exercise name. Never for joins: block
 * → exercise lookups, `buildNameToSlug`, playability sets, bilateral parent
 * matching and URLs all key off the English `name`.
 *
 * Deliberately dependency-free (no `data/exercises.ts`, no i18n import) so the
 * self-contained `hooks/useExercises.ts` can use it without pulling on the
 * lazy-loaded data module.
 */

export const NAME_TRANSLATION_LANGS = ['de', 'es', 'fr', 'pt'] as const;
export type NameTranslationLang = (typeof NAME_TRANSLATION_LANGS)[number];

/** Translated display names; absent/null/'' = not translated → English. */
export type ExerciseNameTranslations = {
  name_de?: string | null;
  name_es?: string | null;
  name_fr?: string | null;
  name_pt?: string | null;
};

type NamedRow = { name?: string } & ExerciseNameTranslations;

/**
 * Narrow an i18next language tag to a language we hold name columns for.
 * `'de-AT'` → `'de'`; `'en'`, `'en-GB'` and anything unknown → null (English).
 */
export function nameTranslationLang(
  lang: string | null | undefined,
): NameTranslationLang | null {
  const code = (lang || 'en').split('-')[0].toLowerCase();
  return (NAME_TRANSLATION_LANGS as readonly string[]).includes(code)
    ? (code as NameTranslationLang)
    : null;
}

/** Display name for the given i18n language, English fallback. */
export function localizedExerciseName(
  ex: NamedRow | null | undefined,
  lang: string,
): string {
  if (!ex) return '';
  const code = nameTranslationLang(lang);
  if (code) {
    const translated = ex[`name_${code}`];
    if (typeof translated === 'string' && translated.length > 0) return translated;
  }
  return ex.name ?? '';
}

/**
 * Every name a row should be findable under: canonical English first, then each
 * translation it has. Search matches against all of them, so a German visitor
 * typing "Kniebeuge" finds the same row an English visitor finds as "Squat" —
 * and a translated name never *replaces* the English one in the index.
 */
export function exerciseSearchNames(ex: NamedRow): string[] {
  const out: string[] = [];
  if (ex.name) out.push(ex.name);
  for (const lang of NAME_TRANSLATION_LANGS) {
    const v = ex[`name_${lang}`];
    if (typeof v === 'string' && v.length > 0) out.push(v);
  }
  return out;
}

/** True when the row carries at least one translated name. */
export function hasNameTranslation(ex: NamedRow): boolean {
  return NAME_TRANSLATION_LANGS.some((lang) => {
    const v = ex[`name_${lang}`];
    return typeof v === 'string' && v.length > 0;
  });
}

/** Just the translated-name fields, for overlaying onto another copy of the row. */
export function pickNameTranslations(ex: NamedRow): ExerciseNameTranslations {
  return {
    name_de: ex.name_de,
    name_es: ex.name_es,
    name_fr: ex.name_fr,
    name_pt: ex.name_pt,
  };
}

/**
 * Shallow-merge an admin `*_overrides` patch over a row. A patch that renames
 * the row without supplying translations must not leave the OLD name's
 * translations standing in front of the new English one, so drop them.
 * Mirrors `mergeWorkoutPatch` in libo-app-v2/src/utils/workoutLocale.ts.
 */
export function mergeNamePatch<T extends NamedRow>(base: T, patch: Partial<T>): T {
  const merged = { ...base, ...patch };
  if (typeof patch.name === 'string' && patch.name !== base.name) {
    for (const lang of NAME_TRANSLATION_LANGS) {
      const key = `name_${lang}` as const;
      if (!(key in patch)) delete merged[key];
    }
  }
  return merged;
}
