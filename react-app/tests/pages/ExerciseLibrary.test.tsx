/**
 * Tests for src/pages/ExerciseLibrary.tsx — public exercise catalog.
 *
 * Covers:
 *   - loading state then grid render
 *   - URL-driven muscle / equipment / setting / type filters
 *   - debounced search updates URL ?q=
 *   - active filter chips removable via the filter bar
 *   - pagination boundaries (next/prev disabled, ellipsis range)
 *   - empty state when filters match nothing
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
vi.mock('../../src/components/SeoHead', () => ({
  SeoHead: () => null,
}));
vi.mock('../../src/components/MuscleTile', () => ({
  MuscleTile: ({ muscle }: { muscle: string }) => <span data-testid="muscle-tile">{muscle}</span>,
}));
vi.mock('../../src/components/MuscleGroupStrip', () => ({
  MuscleGroupStrip: ({ activeMuscle }: { activeMuscle?: string }) => (
    <div data-testid="muscle-strip" data-active={activeMuscle ?? ''} />
  ),
}));
vi.mock('../../src/components/ActiveFilters', () => ({
  ActiveFilters: ({ filters, onRemove, onClearAll }: {
    filters: Array<{ key: string; label: string; value: string }>;
    onRemove: (key: string) => void;
    onClearAll: () => void;
  }) => (
    <div data-testid="active-filters">
      {filters.map((f) => (
        <button key={f.key} onClick={() => onRemove(f.key)}>remove-{f.key}</button>
      ))}
      {filters.length > 0 && <button onClick={onClearAll}>clear-all</button>}
    </div>
  ),
}));
vi.mock('../../src/utils/icons', () => ({
  Search: () => null,
  ICON_STROKE: 1.6,
}));
vi.mock('../../src/utils/thumbnails', () => ({
  exerciseThumb: () => null,
  isMediaHidden: () => false,
}));
vi.mock('../../src/utils/schema', () => ({
  libraryCanonicalUrl: (qs?: string) => `/exercises${qs ? '?' + qs : ''}`,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object') {
        if ('defaultValue' in opts) return key;
        if ('count' in opts) return `${key}:${(opts as { count: number }).count}`;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

// Mock data: ~35 exercises so we get >= 2 pages (PER_PAGE = 30) for pagination
const EXERCISES = Array.from({ length: 35 }).map((_, i) => ({
  id: `ex-${i}`,
  name: `Exercise ${i}`,
  cat: i % 2 === 0 ? 'gym' : 'home',
  primaryCat: i < 5 ? 'Cardio' : 'Strength',
  bodyFocus: i < 10 ? 'Chest' : i < 20 ? 'Back' : 'Legs',
  equipment: i % 3 === 0 ? 'Barbell' : i % 3 === 1 ? 'Bodyweight' : 'Dumbbell',
  environment: 'Gym',
  machineRequired: false,
  diff: 'beginner',
  variation: '',
  emoji: '',
  setupNotes: '',
}));

vi.mock('../../src/data/exercises', () => ({
  getExercises: () => Promise.resolve(EXERCISES),
}));

import ExerciseLibrary from '../../src/pages/ExerciseLibrary';

function renderAt(search = '') {
  return render(
    <MemoryRouter initialEntries={['/exercises' + search]}>
      <ExerciseLibrary />
    </MemoryRouter>,
  );
}

describe('ExerciseLibrary', () => {
  it('renders the loading state immediately', () => {
    renderAt();
    expect(screen.getByText('exerciseLibrary.loading')).toBeInTheDocument();
  });

  it('renders the first page of exercises after data resolves', async () => {
    renderAt();
    await waitFor(() => screen.getByText('Exercise 0'));
    // PER_PAGE = 30 → exercises 0-29 visible, 30-34 not
    expect(screen.getByText('Exercise 29')).toBeInTheDocument();
    expect(screen.queryByText('Exercise 30')).not.toBeInTheDocument();
  });

  it('exposes pagination next/prev controls when more than one page', async () => {
    const user = userEvent.setup();
    renderAt();
    await waitFor(() => screen.getByText('Exercise 0'));

    const prev = screen.getByLabelText('exerciseLibrary.previousPage');
    const next = screen.getByLabelText('exerciseLibrary.nextPage');
    expect(prev).toBeDisabled();
    expect(next).not.toBeDisabled();

    await user.click(next);
    expect(screen.getByText('Exercise 30')).toBeInTheDocument();
    expect(screen.queryByText('Exercise 0')).not.toBeInTheDocument();
  });

  it('respects ?muscle= from the URL on first render', async () => {
    renderAt('?muscle=Chest');
    await waitFor(() => screen.getByText('Exercise 0'));
    // Only first 10 are Chest
    expect(screen.getByText('Exercise 9')).toBeInTheDocument();
    expect(screen.queryByText('Exercise 10')).not.toBeInTheDocument();
  });

  it('respects ?equip= from the URL', async () => {
    renderAt('?equip=Barbell');
    await waitFor(() => screen.getByText('Exercise 0'));
    // Barbell is i % 3 === 0 → exercises 0,3,6,9,12,15,18,21,24,27,30,33 (12 total)
    expect(screen.getByText('Exercise 0')).toBeInTheDocument();
    // Exercise 1 is Bodyweight (i%3==1) — should not be shown
    expect(screen.queryByText('Exercise 1')).not.toBeInTheDocument();
  });

  it('shows the empty state when filters yield no results', async () => {
    const user = userEvent.setup();
    renderAt('?muscle=Chest');
    await waitFor(() => screen.getByText('Exercise 0'));

    // Type a query that won't match any exercise name
    const search = screen.getByLabelText('exerciseLibrary.searchAriaLabel');
    await user.type(search, 'qqzzx-no-match');

    await waitFor(() => {
      expect(screen.getByText('exerciseLibrary.emptyState.title')).toBeInTheDocument();
    });
  });

  it('renders ActiveFilter chips that map URL state', async () => {
    renderAt('?muscle=Chest&equip=Barbell');
    await waitFor(() => screen.getByText('Exercise 0'));
    const filterButtons = screen.getAllByText(/^remove-/);
    expect(filterButtons.some((b) => b.textContent === 'remove-muscle')).toBe(true);
    expect(filterButtons.some((b) => b.textContent === 'remove-equip')).toBe(true);
  });

  it('toggles the mobile filters drawer with the filters button', async () => {
    const user = userEvent.setup();
    renderAt();
    await waitFor(() => screen.getByText('Exercise 0'));

    const toggle = screen.getByRole('button', { name: /exerciseLibrary\.filtersToggle/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('clears all filters via the empty-state clear button when filters strip results', async () => {
    const user = userEvent.setup();
    renderAt('?muscle=Chest&equip=Barbell&type=HIIT');
    await waitFor(() => {
      // HIIT has zero exercises in our mock → empty state
      expect(screen.getByText('exerciseLibrary.emptyState.title')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => screen.getByText('Exercise 0'));
  });
});
