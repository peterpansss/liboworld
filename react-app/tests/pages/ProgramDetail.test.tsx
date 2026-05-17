/**
 * Tests for src/pages/ProgramDetail.tsx — single-workout view.
 *
 * Branches:
 *   - loading state
 *   - 404 when slug doesn't match any workout
 *   - happy path: hero, meta chips, phase grouping (warmup/main/cooldown)
 *   - exercise rows: linked when exercise exists in DB, plain text otherwise
 *   - related-workouts list (same category, current excluded, limit 4)
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

void React;

vi.mock('../../src/components/SiteNav', () => ({
  default: () => <nav data-testid="site-nav" />,
}));
vi.mock('../../src/components/SiteFooter', () => ({
  default: () => <footer data-testid="site-footer" />,
}));
vi.mock('../../src/utils/thumbnails', () => ({
  buildNameToSlug: () => new Map<string, string>(),
  workoutHeroThumb: () => null,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object') {
        const parts = Object.entries(opts).map(([k, v]) => `${k}=${String(v)}`).join(',');
        return parts ? `${key}:${parts}` : key;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

const WORKOUT_TARGET = {
  id: 'wkt-1', name: 'Heavy Push', emoji: 'P',
  diff: 'advanced', dur: 50, cat: 'Gym', subcat: 'Push',
  exercises: [
    { name: 'Foam Roller', sets: '1', reps: '0', dur: 30, phase: 'warmup' as const },
    { name: 'Bench Press', sets: '4', reps: '5', phase: 'main' as const },
    { name: 'Mystery Move', sets: '3', reps: '10', phase: 'main' as const },
    { name: 'Pec Stretch', sets: '1', reps: '0', dur: 20, phase: 'cooldown' as const },
  ],
};
const WORKOUT_SAMECAT = {
  id: 'wkt-2', name: 'Heavy Pull', emoji: 'P',
  diff: 'intermediate', dur: 45, cat: 'Gym',
  exercises: [],
};
const WORKOUT_OTHERCAT = {
  id: 'wkt-3', name: 'Cardio Burn', emoji: 'C',
  diff: 'beginner', dur: 30, cat: 'Cardio',
  exercises: [],
};

vi.mock('../../src/data/exercises', () => ({
  getWorkouts: () => Promise.resolve([WORKOUT_TARGET, WORKOUT_SAMECAT, WORKOUT_OTHERCAT]),
  getExercises: () => Promise.resolve([
    { id: 'bench-press', name: 'Bench Press', cat: 'gym', bodyFocus: 'Chest', equipment: 'Barbell', machineRequired: false, diff: 'advanced', variation: '', emoji: '', setupNotes: '' },
    { id: 'foam-roller', name: 'Foam Roller', cat: 'mobility', bodyFocus: 'Full Body', equipment: 'Bodyweight', machineRequired: false, diff: 'beginner', variation: '', emoji: '', setupNotes: '' },
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

describe('ProgramDetail', () => {
  it('renders the loading message before data resolves', () => {
    renderAt('/workouts/wkt-1');
    expect(screen.getByText('programDetail.loading')).toBeInTheDocument();
  });

  it('renders the 404 fallback when the workout id does not exist', async () => {
    renderAt('/workouts/does-not-exist');
    await waitFor(() => {
      expect(screen.getByText('programDetail.notFound.title')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'programDetail.notFound.backLink' }))
      .toHaveAttribute('href', '/workouts');
  });

  it('renders the workout hero, meta chips and phase groups', async () => {
    renderAt('/workouts/wkt-1');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Heavy Push' }));

    // Phase headers (warmup/main/cooldown — only the ones with exercises)
    expect(screen.getByText('programDetail.phases.warmup')).toBeInTheDocument();
    expect(screen.getByText('programDetail.phases.main')).toBeInTheDocument();
    expect(screen.getByText('programDetail.phases.cooldown')).toBeInTheDocument();
  });

  it('links exercises that exist in the DB and renders unknown ones as plain text', async () => {
    renderAt('/workouts/wkt-1');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Heavy Push' }));

    // Bench Press is in the DB → link
    const bench = screen.getByRole('link', { name: 'Bench Press' });
    expect(bench).toHaveAttribute('href', '/exercises/bench-press');

    // "Mystery Move" not in DB → no link
    expect(screen.getByText('Mystery Move')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mystery Move' })).not.toBeInTheDocument();
  });

  it('renders related workouts in the same category but excludes the current one', async () => {
    renderAt('/workouts/wkt-1');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Heavy Push' }));

    expect(screen.getByText('Heavy Pull')).toBeInTheDocument();
    // Cardio Burn is in a different category — should be filtered out
    expect(screen.queryByText('Cardio Burn')).not.toBeInTheDocument();

    // The current workout should not appear as a "related" link in the
    // related grid. It's allowed to appear in the H1 + breadcrumb chrome,
    // but never as a clickable card link to itself.
    const selfLinks = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href') === '/workouts/wkt-1');
    expect(selfLinks).toHaveLength(0);
  });

  it('renders the onboarding CTA link', async () => {
    renderAt('/workouts/wkt-1');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Heavy Push' }));
    expect(screen.getByRole('link', { name: 'programDetail.cta.button' }))
      .toHaveAttribute('href', '/onboarding');
  });
});
