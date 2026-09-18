/**
 * Tests for src/utils/exerciseLocale.ts — translated exercise names.
 *
 * The production shape these guard: `exercises.name_<lang>` is on staging only
 * as of 16 Sep 2026, so on production EVERY translated value is absent and the
 * whole catalog must keep rendering its English `name`. The same has to hold for
 * rows created in admin after the last bundle regen, and for the four rows whose
 * translation was seeded as an empty string rather than NULL.
 */
import { describe, expect, it } from 'vitest';
import {
  exerciseSearchNames,
  hasNameTranslation,
  localizedExerciseName,
  mergeNamePatch,
  nameTranslationLang,
  pickNameTranslations,
} from '../../src/utils/exerciseLocale';

const SQUAT = {
  name: 'Barbell Back Squat',
  name_de: 'Langhantel-Kniebeuge',
  name_es: 'Sentadilla con Barra',
  name_fr: 'Squat à la Barre',
  name_pt: 'Agachamento com Barra',
};

describe('nameTranslationLang', () => {
  it('accepts the four translated languages', () => {
    expect(nameTranslationLang('de')).toBe('de');
    expect(nameTranslationLang('es')).toBe('es');
    expect(nameTranslationLang('fr')).toBe('fr');
    expect(nameTranslationLang('pt')).toBe('pt');
  });

  it('narrows a regional tag to its base language', () => {
    expect(nameTranslationLang('de-AT')).toBe('de');
    expect(nameTranslationLang('pt-BR')).toBe('pt');
  });

  it('returns null for English and for anything unknown', () => {
    expect(nameTranslationLang('en')).toBeNull();
    expect(nameTranslationLang('en-GB')).toBeNull();
    expect(nameTranslationLang('it')).toBeNull();
    expect(nameTranslationLang('')).toBeNull();
    expect(nameTranslationLang(undefined)).toBeNull();
  });
});

describe('localizedExerciseName', () => {
  it('returns the translation for a translated language', () => {
    expect(localizedExerciseName(SQUAT, 'de')).toBe('Langhantel-Kniebeuge');
    expect(localizedExerciseName(SQUAT, 'pt-BR')).toBe('Agachamento com Barra');
  });

  it('returns English for English', () => {
    expect(localizedExerciseName(SQUAT, 'en')).toBe('Barbell Back Squat');
  });

  it('falls back to English when the row has no translations at all', () => {
    // Production today: the name_<lang> columns don't exist, so `select('*')`
    // hands back a row with only `name`.
    expect(localizedExerciseName({ name: 'Zercher Squat' }, 'de')).toBe('Zercher Squat');
  });

  it('falls back to English for an empty or null translation', () => {
    expect(localizedExerciseName({ name: 'Plank', name_de: '' }, 'de')).toBe('Plank');
    expect(localizedExerciseName({ name: 'Plank', name_de: null }, 'de')).toBe('Plank');
  });

  it('never renders blank for a missing row or a nameless row', () => {
    expect(localizedExerciseName(null, 'de')).toBe('');
    expect(localizedExerciseName(undefined, 'de')).toBe('');
    expect(localizedExerciseName({ name_de: 'Kniebeuge' }, 'en')).toBe('');
  });
});

describe('exerciseSearchNames', () => {
  it('indexes the English name first, then every translation', () => {
    expect(exerciseSearchNames(SQUAT)).toEqual([
      'Barbell Back Squat',
      'Langhantel-Kniebeuge',
      'Sentadilla con Barra',
      'Squat à la Barre',
      'Agachamento com Barra',
    ]);
  });

  it('skips empty and null translations', () => {
    expect(exerciseSearchNames({ name: 'Plank', name_de: '', name_fr: null })).toEqual(['Plank']);
  });

  it('returns nothing to match on for a nameless, untranslated row', () => {
    expect(exerciseSearchNames({})).toEqual([]);
  });
});

describe('hasNameTranslation', () => {
  it('is true only when a non-empty translation exists', () => {
    expect(hasNameTranslation(SQUAT)).toBe(true);
    expect(hasNameTranslation({ name: 'Plank' })).toBe(false);
    expect(hasNameTranslation({ name: 'Plank', name_es: '' })).toBe(false);
    expect(hasNameTranslation({ name: 'Plank', name_es: null })).toBe(false);
    expect(hasNameTranslation({ name: 'Plank', name_es: 'Plancha' })).toBe(true);
  });
});

describe('pickNameTranslations', () => {
  it('extracts only the translated-name fields', () => {
    expect(pickNameTranslations({ name: 'Plank', name_de: 'Planke' })).toEqual({
      name_de: 'Planke',
      name_es: undefined,
      name_fr: undefined,
      name_pt: undefined,
    });
  });
});

describe('mergeNamePatch', () => {
  it('shallow-merges a patch that does not touch the name', () => {
    const merged = mergeNamePatch(SQUAT, { name_de: 'Kniebeuge' });
    expect(merged.name).toBe('Barbell Back Squat');
    expect(merged.name_de).toBe('Kniebeuge');
    expect(merged.name_fr).toBe('Squat à la Barre');
  });

  it('drops stale translations when the patch renames the row', () => {
    // An admin rename that ships no new translations must not leave the OLD
    // name's German in front of the new English one.
    const merged = mergeNamePatch(SQUAT, { name: 'Barbell Front Squat' });
    expect(merged.name).toBe('Barbell Front Squat');
    expect(merged.name_de).toBeUndefined();
    expect(merged.name_pt).toBeUndefined();
    expect(localizedExerciseName(merged, 'de')).toBe('Barbell Front Squat');
  });

  it('keeps a translation the rename patch supplies itself', () => {
    const merged = mergeNamePatch(SQUAT, {
      name: 'Barbell Front Squat',
      name_de: 'Frontkniebeuge',
    });
    expect(merged.name_de).toBe('Frontkniebeuge');
    expect(merged.name_es).toBeUndefined();
  });

  it('leaves translations alone when the patch re-states the same name', () => {
    const merged = mergeNamePatch(SQUAT, { name: 'Barbell Back Squat' });
    expect(merged.name_de).toBe('Langhantel-Kniebeuge');
  });
});
