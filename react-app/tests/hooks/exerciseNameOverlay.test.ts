/**
 * Tests for overlayStaticNameTranslations, exported by src/hooks/useExercises.ts.
 *
 * Why it exists: the hook paints the bundled `/exercises.json` baseline first and
 * replaces it with the canonical Supabase rows a moment later. The two sources
 * disagree about translated names for as long as the name_<lang> columns are on
 * staging only — so without this overlay that second paint REVERTS a translated
 * card grid to English on every cold load. The overlay carries the bundle's
 * translations onto Supabase rows that have none, matched on slug (ids differ
 * between the two sources), and lets Supabase win wherever it does have one.
 */
import { describe, expect, it } from 'vitest';
import { overlayStaticNameTranslations } from '../../src/hooks/useExercises';
import { localizedExerciseName } from '../../src/utils/exerciseLocale';

const base = {
  cat: 'gym',
  bodyFocus: 'Legs',
  equipment: 'Barbell',
  machineRequired: false,
  diff: 'beginner',
  variation: '',
  emoji: '',
  setupNotes: '',
};

// Supabase keys this row by its own primary key; the bundle keys it by slug.
const supabaseRow = { ...base, id: 'gym_162', slug: 'back_squat', name: 'Back Squat' };
const staticRow = {
  ...base,
  id: 'back_squat',
  slug: 'back_squat',
  name: 'Back Squat',
  name_de: 'Kniebeuge',
};

describe('overlayStaticNameTranslations', () => {
  it('carries a bundled translation onto a Supabase row that has none', () => {
    const [row] = overlayStaticNameTranslations([supabaseRow], [staticRow]);
    expect(row.name_de).toBe('Kniebeuge');
    expect(localizedExerciseName(row, 'de')).toBe('Kniebeuge');
    // The English name and the identity of the Supabase row are untouched.
    expect(row.id).toBe('gym_162');
    expect(row.name).toBe('Back Squat');
  });

  it('matches on slug, not id', () => {
    const otherSlug = { ...staticRow, slug: 'front_squat', id: 'front_squat' };
    const [row] = overlayStaticNameTranslations([supabaseRow], [otherSlug]);
    expect(row.name_de).toBeUndefined();
  });

  it('lets the Supabase translation win once the migration lands there', () => {
    const translated = { ...supabaseRow, name_de: 'Langhantel-Kniebeuge' };
    const [row] = overlayStaticNameTranslations([translated], [staticRow]);
    expect(row.name_de).toBe('Langhantel-Kniebeuge');
  });

  it('leaves rows alone when the static baseline has no translations', () => {
    const untranslatedStatic = { ...staticRow, name_de: undefined };
    const rows = [supabaseRow];
    expect(overlayStaticNameTranslations(rows, [untranslatedStatic])).toBe(rows);
  });

  it('is a no-op when the static baseline is missing or empty', () => {
    const rows = [supabaseRow];
    expect(overlayStaticNameTranslations(rows, null)).toBe(rows);
    expect(overlayStaticNameTranslations(rows, [])).toBe(rows);
  });

  it('leaves an admin-only Supabase row on the English fallback', () => {
    // Created in admin after the last bundle regen → no donor, no translation.
    const adminOnly = { ...base, id: 'gym_900', slug: 'sled_push', name: 'Sled Push' };
    const [row] = overlayStaticNameTranslations([adminOnly], [staticRow]);
    expect(localizedExerciseName(row, 'de')).toBe('Sled Push');
  });
});
