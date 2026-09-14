/**
 * Tests for src/pages/ProgramLibrary.tsx — public workout/program index.
 *
 * Behaviour to cover:
 *   - loading state then grid renders after async getWorkouts/getExercises
 *   - ?q= from the URL filters by free text (the on-page search input was
 *     removed in 551958b; the param is still honoured)
 *   - category chip writes ?cat= to URL params
 *   - zero matches falls back to the full catalog with a preview banner
 *     (the empty state was replaced in b493a16)
 *   - 404-not-found is the responsibility of ProgramDetail, not this index
 *
 * The data layer is mocked so we get deterministic counts.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

void React;

vi.mock('../../src/components/SiteNav', () => ({
  default: () => <nav data-testid="site-nav" />,
}));
vi.mock('../../src/components/SiteFooter', () => ({
  default: () => <footer data-testid="site-footer" />,
}));
vi.mock('../../src/components/EmojiIcon', () => ({
  EmojiIcon: ({ emoji }: { emoji?: string }) => <span data-testid="emoji">{emoji ?? ''}</span>,
}));
vi.mock('../../src/utils/icons', () => ({
  Hourglass: () => null,
  Dumbbell: () => null,
  ICON_STROKE: 1.6,
}));
vi.mock('../../src/utils/thumbnails', () => ({
  buildNameToSlug: () => ({}),
  workoutHeroThumbSet: () => null,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object' && 'count' in opts) {
        return `${key}:${(opts as { count: number }).count}`;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

const W1 = {
  id: 'w-gym-a', name: 'Gym Push Workout', emoji: 'A',
  diff: 'beginner', dur: 30, cat: 'Gym', subcat: 'Push',
  exercises: [{ name: 'Bench', sets: '3', reps: '8' }],
};
const W2 = {
  id: 'w-gym-b', name: 'Gym Pull Workout', emoji: 'B',
  diff: 'intermediate', dur: 45, cat: 'Gym', subcat: 'Pull',
  exercises: [{ name: 'Row', sets: '3', reps: '8' }],
};
const W3 = {
  id: 'w-home-a', name: 'Home HIIT', emoji: 'C',
  diff: 'advanced', dur: 20, cat: 'Home',
  exercises: [{ name: 'Burpee', sets: '3', reps: '10' }],
};
const W4 = {
  id: 'w-stretch', name: 'Morning Stretch', emoji: 'D',
  diff: 'beginner', dur: 10, cat: 'Stretching',
  exercises: [{ name: 'Cobra', sets: '1', reps: '10' }],
};

// Every block must reference a playable (video-backed) exercise, otherwise
// filterPlayableWorkouts drops the workout from the list.
const playable = (id: string, name: string) => ({
  id, name, cat: 'gym', bodyFocus: 'Chest', equipment: 'Barbell', machineRequired: false,
  diff: 'beginner', variation: '', emoji: '', setupNotes: '', videoUrl: `/v/${id}.mp4`,
});

vi.mock('../../src/data/exercises', () => ({
  getWorkouts: () => Promise.resolve([W1, W2, W3, W4]),
  getExercises: () => Promise.resolve([
    playable('bench', 'Bench'),
    playable('row', 'Row'),
    playable('burpee', 'Burpee'),
    playable('cobra', 'Cobra'),
  ]),
}));

import ProgramLibrary from '../../src/pages/ProgramLibrary';

function renderAt(search = '') {
  return render(
    <MemoryRouter initialEntries={['/workouts' + search]}>
      <ProgramLibrary />
    </MemoryRouter>,
  );
}

describe('ProgramLibrary', () => {
  it('renders the loading state immediately, then the grid after data resolves', async () => {
    renderAt();
    expect(screen.getByText('programLibrary.loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Gym Push Workout')).toBeInTheDocument();
    });
    expect(screen.getByText('Gym Pull Workout')).toBeInTheDocument();
    expect(screen.getByText('Home HIIT')).toBeInTheDocument();
    expect(screen.getByText('Morning Stretch')).toBeInTheDocument();
  });

  it('marks the "All" category chip active by default', async () => {
    renderAt();
    await waitFor(() => screen.getByText('Gym Push Workout'));
    expect(screen.getByRole('button', { name: 'programLibrary.filters.catAll' }))
      .toHaveAttribute('aria-pressed', 'true');
  });

  it('filters by category when a chip is clicked', async () => {
    const user = userEvent.setup();
    renderAt();
    await waitFor(() => screen.getByText('Gym Push Workout'));

    await user.click(screen.getByRole('button', { name: 'programLibrary.categories.gym' }));

    expect(screen.getByText('Gym Push Workout')).toBeInTheDocument();
    expect(screen.queryByText('Home HIIT')).not.toBeInTheDocument();
    expect(screen.queryByText('Morning Stretch')).not.toBeInTheDocument();
  });

  it('respects ?cat= from the URL on first render', async () => {
    renderAt('?cat=Home');
    await waitFor(() => screen.getByText('Home HIIT'));
    expect(screen.queryByText('Gym Push Workout')).not.toBeInTheDocument();
  });

  it('filters by free-text ?q= across name and subcategory', async () => {
    renderAt('?q=pull');
    await waitFor(() => screen.getByText('Gym Pull Workout'));
    expect(screen.queryByText('Gym Push Workout')).not.toBeInTheDocument();
    expect(screen.queryByText('Home HIIT')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('falls back to the full catalog with a preview banner when filters match nothing', async () => {
    renderAt('?q=nonsense-query');
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('programLibrary.previewFallback');
    });
    expect(screen.getByText('Gym Push Workout')).toBeInTheDocument();
    expect(screen.getByText('Morning Stretch')).toBeInTheDocument();
  });

  it('links each card to /workouts/:id', async () => {
    renderAt();
    await waitFor(() => screen.getByText('Gym Push Workout'));
    expect(screen.getByRole('link', { name: /Gym Push Workout/ }))
      .toHaveAttribute('href', '/workouts/w-gym-a');
  });

  it('updates document.title to include the active goal', async () => {
    renderAt('?goal=Strength');
    await waitFor(() =>
      expect(document.title).toBe('programLibrary.goals.strength programLibrary.documentTitle | Libo'),
    );
  });
});
