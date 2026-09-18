/**
 * Tests for src/pages/ExerciseLibrary.tsx rendered in German.
 *
 * Separate file because the react-i18next mock's `i18n.language` is fixed per
 * module registry, and ExerciseLibrary.test.tsx pins it to 'en'.
 *
 * Covers the state production is actually in: the name_<lang> columns are on
 * staging only, so most rows have no translation and must keep rendering their
 * English name — never blank, never an i18n key.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ExerciseDisplay } from '../../src/hooks/useExercises';

void React;

vi.mock('../../src/components/SiteNav', () => ({
  default: () => <nav data-testid="site-nav" />,
}));
vi.mock('../../src/components/SiteFooter', () => ({
  default: () => <footer data-testid="site-footer" />,
}));
vi.mock('../../src/components/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('../../src/components/MuscleTile', () => ({ MuscleTile: () => null }));
vi.mock('../../src/components/MuscleGroupStrip', () => ({ MuscleGroupStrip: () => null }));
vi.mock('../../src/components/ActiveFilters', () => ({ ActiveFilters: () => null }));
vi.mock('../../src/utils/icons', () => ({ Search: () => null, ICON_STROKE: 1.6 }));
vi.mock('../../src/utils/thumbnails', () => ({
  exerciseThumbSet: () => null,
  isMediaHidden: () => false,
}));
vi.mock('../../src/utils/schema', () => ({
  libraryCanonicalUrl: (qs?: string) => `/exercises${qs ? '?' + qs : ''}`,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object' && 'count' in opts) {
        return `${key}:${(opts as { count: number }).count}`;
      }
      return key;
    },
    i18n: { language: 'de' },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

const base = {
  cat: 'gym',
  bodyFocus: 'Legs',
  equipment: 'Barbell',
  environment: 'Gym',
  machineRequired: false,
  diff: 'beginner',
  variation: '',
  emoji: '',
  setupNotes: '',
};

const EXERCISES: ExerciseDisplay[] = [
  { ...base, id: 'back_squat', slug: 'back_squat', name: 'Back Squat', name_de: 'Kniebeuge' },
  // No translation at all — the production shape today.
  { ...base, id: 'sled_push', slug: 'sled_push', name: 'Sled Push' },
  // Seeded as an empty string rather than NULL.
  { ...base, id: 'plank', slug: 'plank', name: 'Plank', name_de: '' },
  // Translated for other languages but not this one.
  { ...base, id: 'lunge', slug: 'lunge', name: 'Lunge', name_es: 'Zancada' },
];

vi.mock('../../src/hooks/useExercises', async () => {
  const { useEffect, useState } = await import('react');
  return {
    useExercises: () => {
      const [loaded, setLoaded] = useState(false);
      useEffect(() => {
        const id = setTimeout(() => setLoaded(true), 0);
        return () => clearTimeout(id);
      }, []);
      return { exercises: loaded ? EXERCISES : [], loading: !loaded, error: null };
    },
  };
});

import ExerciseLibrary from '../../src/pages/ExerciseLibrary';

function renderAt(search = '') {
  return render(
    <MemoryRouter initialEntries={['/exercises' + search]}>
      <ExerciseLibrary />
    </MemoryRouter>,
  );
}

describe('ExerciseLibrary in German', () => {
  it('prints the translated name when the row has one', async () => {
    renderAt();
    await waitFor(() => screen.getByText('Kniebeuge'));
    expect(screen.queryByText('Back Squat')).not.toBeInTheDocument();
  });

  it('falls back to English for an untranslated row', async () => {
    renderAt();
    await waitFor(() => screen.getByText('Kniebeuge'));
    // No blank cards and no half-translated grid while production has no data.
    expect(screen.getByText('Sled Push')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.getByText('Lunge')).toBeInTheDocument();
  });

  it('finds a row by its German name', async () => {
    renderAt('?q=Kniebeuge');
    await waitFor(() => screen.getByText('Kniebeuge'));
    expect(screen.queryByText('Sled Push')).not.toBeInTheDocument();
  });

  it('still finds a row by its English name in German', async () => {
    // Gym names travel untranslated, and the catalog's slugs are English.
    renderAt('?q=Back Squat');
    await waitFor(() => screen.getByText('Kniebeuge'));
    expect(screen.queryByText('Lunge')).not.toBeInTheDocument();
  });
});
