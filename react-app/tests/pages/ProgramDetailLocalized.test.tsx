/**
 * Tests for src/pages/ProgramDetail.tsx rendered in German — the guided-workout
 * name and the exercise names inside its phase lists.
 *
 * Separate file because the react-i18next mock's `i18n.language` is fixed per
 * module registry, and ProgramDetail.test.tsx pins it to 'en'.
 *
 * Workout blocks store only the canonical English exercise name (it is the join
 * key for the slug link, the equipment lookup and the playability filter), so a
 * block's printed name has to come from the exercise row it resolves to — the
 * web counterpart of mobile's `useBlockName`.
 *
 * The "block resolves to no exercise" branch isn't exercised here: it can't be
 * reached on this page, because `filterPlayableBlocks` matches blocks to
 * exercises by the same trimmed, lower-cased name and drops the ones that miss
 * before they ever render. The fallback in `blockDisplayName` stays as a
 * belt-and-braces guard against that pairing drifting apart.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

void React;

vi.mock('../../src/components/SiteNav', () => ({ default: () => <nav /> }));
vi.mock('../../src/components/SiteFooter', () => ({ default: () => <footer /> }));
vi.mock('../../src/utils/thumbnails', () => ({
  buildNameToSlug: () => ({}),
  workoutHeroThumbSet: () => null,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'de' },
  }),
}));

const WORKOUT = {
  id: 'wkt-1',
  name: 'Heavy Push',
  name_de: 'Schweres Drücken',
  emoji: 'P',
  diff: 'advanced',
  dur: 50,
  cat: 'Gym',
  subcat: 'Push',
  exercises: [
    { name: 'Bench Press', sets: '4', reps: '5', phase: 'main' as const },
    { name: 'Sled Push', sets: '3', reps: '10', phase: 'main' as const },
  ],
};

// No name_de on this one: an untranslated workout keeps its English title.
const WORKOUT_UNTRANSLATED = {
  ...WORKOUT,
  id: 'wkt-2',
  name: 'Heavy Pull',
  name_de: undefined,
  exercises: [{ name: 'Bench Press', sets: '3', reps: '8', phase: 'main' as const }],
};

const exBase = {
  cat: 'gym',
  bodyFocus: 'Chest',
  machineRequired: false,
  diff: 'advanced',
  variation: '',
  emoji: '',
  setupNotes: '',
};

vi.mock('../../src/data/exercises', () => ({
  getWorkouts: () => Promise.resolve([WORKOUT, WORKOUT_UNTRANSLATED]),
  getExercises: () =>
    Promise.resolve([
      {
        ...exBase,
        id: 'bench-press',
        slug: 'bench-press',
        name: 'Bench Press',
        name_de: 'Bankdrücken',
        equipment: 'Barbell',
        videoUrl: '/v/bench_press.mp4',
      },
      {
        ...exBase,
        id: 'sled-push',
        slug: 'sled-push',
        name: 'Sled Push',
        equipment: 'Sled',
        videoUrl: '/v/sled_push.mp4',
      },
    ]),
}));

import ProgramDetail from '../../src/pages/ProgramDetail';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/workouts/:id" element={<ProgramDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProgramDetail in German', () => {
  it('uses the translated workout name for the H1 and breadcrumb', async () => {
    renderAt('/workouts/wkt-1');
    await waitFor(() => screen.getByRole('heading', { level: 1 }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Schweres Drücken');
    expect(screen.getByLabelText('programDetail.breadcrumbAria')).toHaveTextContent(
      'Schweres Drücken',
    );
  });

  it('falls back to the English workout name when untranslated', async () => {
    renderAt('/workouts/wkt-2');
    await waitFor(() => screen.getByRole('heading', { level: 1 }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heavy Pull');
  });

  it('prints each block under the translated name of the exercise it resolves to', async () => {
    renderAt('/workouts/wkt-1');
    await waitFor(() => screen.getByRole('heading', { level: 1 }));
    expect(screen.getByRole('link', { name: 'Bankdrücken' })).toBeInTheDocument();
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument();
  });

  it('keeps the link on the English slug', async () => {
    renderAt('/workouts/wkt-1');
    await waitFor(() => screen.getByRole('heading', { level: 1 }));
    expect(screen.getByRole('link', { name: 'Bankdrücken' })).toHaveAttribute(
      'href',
      '/exercises/bench-press',
    );
  });

  it('falls back to English for a block whose exercise has no translation', async () => {
    renderAt('/workouts/wkt-1');
    await waitFor(() => screen.getByRole('heading', { level: 1 }));
    expect(screen.getByRole('link', { name: 'Sled Push' })).toBeInTheDocument();
  });

});
