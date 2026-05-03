/**
 * Tests for src/components/AlternativesGrid.tsx.
 *
 * Verifies: empty-state short-circuit (returns null), title interpolation,
 * thumbnail vs MuscleTile fallback, label-formatter pass-through, and
 * link href format.
 *
 * Mocks `getRecommended` (the scoring engine — covered in its own suite)
 * and `exerciseThumb` so we can deterministically control which
 * alternatives are shown and which have a thumbnail.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Exercise } from '../../src/data/exercises';

void React;

let nextRecommended: Exercise[] = [];
let nextThumb: (e: Exercise) => string | null = () => null;

vi.mock('../../src/utils/exerciseAlternatives', () => ({
  getRecommended: () => nextRecommended,
}));
vi.mock('../../src/utils/thumbnails', () => ({
  exerciseThumb: (e: Exercise) => nextThumb(e),
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

  it('renders an <img> when exerciseThumb returns a URL', () => {
    nextRecommended = [baseEx({ id: 'a', name: 'Push Up' })];
    nextThumb = () => '/thumb/push-up.jpg';
    const { container } = render(
      <MemoryRouter>
        <AlternativesGrid current={current} allExercises={[]} />
      </MemoryRouter>,
    );
    const img = container.querySelector('img.alts__thumb');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe('/thumb/push-up.jpg');
  });

  it('skips the <img> when exerciseThumb returns null/empty', () => {
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
    nextThumb = () => '/thumb/missing.jpg';
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
