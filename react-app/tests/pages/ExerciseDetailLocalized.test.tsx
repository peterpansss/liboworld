/**
 * Tests for src/pages/ExerciseDetail.tsx rendered in German — the localized
 * name in the H1, the breadcrumb and the SEO title/description.
 *
 * Separate file because the react-i18next mock's `i18n.language` is fixed per
 * module registry, and ExerciseDetail.test.tsx pins it to 'en'. SeoHead is
 * stubbed to a DOM node here (it renders null there) so the <title> string this
 * page computes is assertable.
 *
 * The canonical URL and the JSON-LD graph stay keyed to the English name on
 * purpose: one URL serves all five languages, so the structured data has to
 * match the prerendered stub (scripts/prerender-meta.mjs) and the sitemap.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

void React;

vi.mock('../../src/components/SiteNav', () => ({ default: () => <nav /> }));
vi.mock('../../src/components/SiteFooter', () => ({ default: () => <footer /> }));
vi.mock('../../src/components/SeoHead', () => ({
  SeoHead: ({ title, description, canonical }: {
    title: string;
    description?: string;
    canonical?: string;
  }) => (
    <div
      data-testid="seo"
      data-title={title}
      data-description={description}
      data-canonical={canonical}
    />
  ),
}));
vi.mock('../../src/components/MuscleTile', () => ({ MuscleTile: () => null }));
vi.mock('../../src/components/MuscleGroupStrip', () => ({ MuscleGroupStrip: () => null }));
vi.mock('../../src/components/AnatomyDiagram', () => ({ AnatomyDiagram: () => null }));
vi.mock('../../src/components/AlternativesGrid', () => ({ AlternativesGrid: () => null }));
vi.mock('../../src/components/RelatedArticles', () => ({ RelatedArticles: () => null }));
vi.mock('../../src/utils/icons', () => ({
  Target: () => null,
  Dumbbell: () => null,
  Zap: () => null,
  Volume2: () => null,
  VolumeX: () => null,
  Maximize2: () => null,
  Minimize2: () => null,
  ICON_STROKE: 1.6,
}));
vi.mock('../../src/utils/thumbnails', () => ({
  exerciseThumb: () => '/thumb.jpg',
  publicVideoUrl: () => 'https://video/main.mp4',
  publicVideoUrlAlt: () => undefined,
  publicVideoUrlAltBase: () => undefined,
}));
vi.mock('../../src/utils/exerciseInfo', () => ({
  getInstructions: () => ['Step one'],
  getTips: () => ['Tip'],
  getCommonMistakes: () => ['Mistake'],
  getPrimaryMuscleGroup: (bf: string) => bf,
}));
vi.mock('../../src/utils/schema', () => ({
  buildExerciseGraph: () => ({}),
  exerciseCanonicalUrl: (ex: { slug?: string }) => `https://liboworld.com/exercises/${ex.slug}`,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Real German values for the two keys this assertion depends on; every other
    // key falls through as its own name, matching the sibling test files.
    t: (key: string) =>
      key === 'exerciseDetail.howToPerformTitle' ? 'Ausführung' : key,
    i18n: { language: 'de' },
  }),
}));

const base = {
  cat: 'gym',
  primaryCat: 'Strength',
  bodyFocus: 'Chest',
  equipment: 'Barbell',
  environment: 'Gym',
  machineRequired: false,
  diff: 'beginner',
  variation: '',
  emoji: '',
  videoUrl: 'main.mp4',
};

const TRANSLATED = {
  ...base,
  id: 'bench-press',
  slug: 'bench-press',
  name: 'Bench Press',
  name_de: 'Bankdrücken',
  // setupNotes arrives already localized via the /exercises.<lang>.json overlay
  // that getExercises() applies, so the meta description needs no name at all.
  setupNotes: 'Auf die Bank legen, Füße aufsetzen, Schulterblätter zusammenziehen.',
};

const UNTRANSLATED = {
  ...base,
  id: 'sled-push',
  slug: 'sled-push',
  name: 'Sled Push',
  setupNotes: '',
};

vi.mock('../../src/data/exercises', () => ({
  getExercises: () => Promise.resolve([TRANSLATED, UNTRANSLATED]),
  loadExerciseContent: () => Promise.resolve({}),
}));

import ExerciseDetail from '../../src/pages/ExerciseDetail';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/exercises/:slug" element={<ExerciseDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  if (!HTMLMediaElement.prototype.play) {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  } else {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  }
  if (!HTMLMediaElement.prototype.load) {
    HTMLMediaElement.prototype.load = vi.fn();
  } else {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  }
  window.localStorage.clear();
});

describe('ExerciseDetail in German', () => {
  it('uses the translated name for the H1 and the breadcrumb', async () => {
    renderAt('/exercises/bench-press');
    await waitFor(() => screen.getByRole('heading', { level: 1 }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bankdrücken');
    const crumb = screen.getByLabelText('exerciseDetail.breadcrumbLabel');
    expect(crumb).toHaveTextContent('Bankdrücken');
    expect(crumb).not.toHaveTextContent('Bench Press');
  });

  it('uses the translated name in the SEO title', async () => {
    renderAt('/exercises/bench-press');
    await waitFor(() => screen.getByTestId('seo'));
    expect(screen.getByTestId('seo')).toHaveAttribute(
      'data-title',
      'Bankdrücken — Ausführung | Libo',
    );
  });

  it('leaves the canonical URL on the English slug', async () => {
    renderAt('/exercises/bench-press');
    await waitFor(() => screen.getByTestId('seo'));
    expect(screen.getByTestId('seo')).toHaveAttribute(
      'data-canonical',
      'https://liboworld.com/exercises/bench-press',
    );
  });

  it('falls back to the English name everywhere for an untranslated row', async () => {
    renderAt('/exercises/sled-push');
    await waitFor(() => screen.getByRole('heading', { level: 1 }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sled Push');
    const seo = screen.getByTestId('seo');
    expect(seo).toHaveAttribute('data-title', 'Sled Push — Ausführung | Libo');
    // Empty setupNotes → the generated description, which still names the row.
    expect(seo.getAttribute('data-description')).toContain('Sled Push');
  });
});
