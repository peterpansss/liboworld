/**
 * Tests for src/components/AlternativesGrid.tsx.
 *
 * Verifies: empty-state short-circuit (returns null), title interpolation,
 * thumbnail vs MuscleTile fallback, label-formatter pass-through, and
 * link href format.
 *
 * Mocks `getRecommended` (the scoring engine — covered in its own suite)
 * and `exerciseThumbSet` (the component renders a WebP+JPEG <picture> via
 * ThumbPicture) so we can deterministically control which alternatives are
 * shown and which have a thumbnail.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Exercise } from '../../src/data/exercises';
import type { ThumbnailSet } from '../../src/utils/thumbnails';

void React;

let nextRecommended: Exercise[] = [];
let nextThumb: (e: Exercise) => ThumbnailSet | null = () => null;

vi.mock('../../src/utils/exerciseAlternatives', () => ({
  getRecommended: () => nextRecommended,
}));
vi.mock('../../src/utils/thumbnails', () => ({
  exerciseThumbSet: (e: Exercise) => nextThumb(e),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Resolve `{{name}}` from defaultValue so the title interpolation is
    // exercised without loading the real locale bundles.
    t: (key: string, opts?: { defaultValue?: string; name?: string }) =>
      opts?.defaultValue
        ? opts.defaultValue.replace('{{name}}', opts.name ?? '')
        : key,
    i18n: {},
  }),
}));

import { AlternativesGrid } from '../../src/components/AlternativesGrid';

const baseEx = (over: Partial<Exercise>): Exercise => ({
  id: over.id || 'x',
  name: over.name || 'Ex',
  cat: 'gym',
  bodyFocus: 'Chest',
  equipment: 'Barbell',
  machineRequired: false,
  diff: 'beginner',
  variation: '',
  emoji: '💪',
  setupNotes: '',
  ...over,
});

const current: Exercise = baseEx({ id: 'curr', name: 'Bench Press' });

beforeEach(() => {
  nextRecommended = [];
  nextThumb = () => null;
});

describe('AlternativesGrid', () => {
  it('returns null when no alternatives are recommended', () => {
    const { container } = render(
      <MemoryRouter>
        <AlternativesGrid current={current} allExercises={[]} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the Befit-style title with the current exercise name', () => {
    nextRecommended = [baseEx({ id: 'a', name: 'Push Up' })];
    render(
      <MemoryRouter>
        <AlternativesGrid current={current} allExercises={[]} />
      </MemoryRouter>,
    );
    expect(
      screen.getByText('Alternative Exercises to replace Bench Press'),
    ).toBeInTheDocument();
  });

  it('renders one card per alternative with /exercises/<id> links', () => {
    nextRecommended = [
      baseEx({ id: 'a', name: 'Push Up' }),
      baseEx({ id: 'b', name: 'Dip' }),
    ];
    const { container } = render(
      <MemoryRouter>
        <AlternativesGrid current={current} allExercises={[]} />
      </MemoryRouter>,
    );
    const links = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/exercises/a', '/exercises/b']);
    expect(screen.getByText('Push Up')).toBeInTheDocument();
    expect(screen.getByText('Dip')).toBeInTheDocument();
  });

  it('renders a <picture> with WebP source + JPEG <img> when exerciseThumbSet returns a set', () => {
    nextRecommended = [baseEx({ id: 'a', name: 'Push Up' })];
    nextThumb = () => ({ webp: '/thumb/push-up.webp', jpeg: '/thumb/push-up.jpg' });
    const { container } = render(
      <MemoryRouter>
        <AlternativesGrid current={current} allExercises={[]} />
      </MemoryRouter>,
    );
    const img = container.querySelector('picture > img.alts__thumb');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe('/thumb/push-up.jpg');
    const source = container.querySelector('picture > source[type="image/webp"]');
    expect(source?.getAttribute('srcset')).toBe('/thumb/push-up.webp');
  });

  it('skips the <img> when exerciseThumbSet returns null', () => {
    nextRecommended = [baseEx({ id: 'a', name: 'Push Up' })];
    nextThumb = () => null;
    const { container } = render(
      <MemoryRouter>
        <AlternativesGrid current={current} allExercises={[]} />
      </MemoryRouter>,
    );
    expect(container.querySelector('img.alts__thumb')).toBeNull();
  });

  it('uses the optional equipment/difficulty label formatters', () => {
    nextRecommended = [
      baseEx({ id: 'a', name: 'Push Up', equipment: 'Bodyweight', diff: 'beginner' }),
    ];
    render(
      <MemoryRouter>
        <AlternativesGrid
          current={current}
          allExercises={[]}
          equipmentLabel={(e) => `EQ:${e}`}
          difficultyLabel={(d) => `D:${d}`}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('EQ:Bodyweight · D:beginner')).toBeInTheDocument();
  });

  it('hides display when img onError fires', () => {
    nextRecommended = [baseEx({ id: 'a', name: 'Push Up' })];
    nextThumb = () => ({ webp: null, jpeg: '/thumb/missing.jpg' });
    const { container } = render(
      <MemoryRouter>
        <AlternativesGrid current={current} allExercises={[]} />
      </MemoryRouter>,
    );
    const img = container.querySelector('img.alts__thumb') as HTMLImageElement;
    // Manually fire the error event — the handler sets display:none
    img.dispatchEvent(new Event('error'));
    expect(img.style.display).toBe('none');
  });
});
