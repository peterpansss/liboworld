/**
 * Tests for src/pages/admin/WorkoutsPage.tsx.
 *
 * Verifies:
 *   - parallel mount: fetches /workouts.json + listWorkoutOverrides + /exercises.json
 *   - merges overrides with base rows; "Edited" chip appears
 *   - filters: search debounce, cat / diff / duration / overrideOnly
 *   - opening edit modal pre-populates form; save dispatches replaceWorkoutOverride with diff
 *   - phase row add / remove / reorder
 *   - clear override calls deleteWorkoutOverride
 *   - workouts.json fetch failure surfaces page error
 *   - exercises.json fetch failure is non-fatal
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

void React;

const listWorkoutOverridesMock = vi.fn();
const replaceWorkoutOverrideMock = vi.fn();
const deleteWorkoutOverrideMock = vi.fn();

vi.mock('../../src/lib/adminApi', () => ({
  listWorkoutOverrides: () => listWorkoutOverridesMock(),
  replaceWorkoutOverride: (...a: unknown[]) => replaceWorkoutOverrideMock(...a),
  deleteWorkoutOverride: (...a: unknown[]) => deleteWorkoutOverrideMock(...a),
}));

import { WorkoutsPage } from '../../src/pages/admin/WorkoutsPage';

const baseWorkouts = [
  {
    id: 'wo-1',
    name: 'Full Body Burn',
    cat: 'Gym',
    subcat: 'HIIT',
    dur: 45,
    diff: 'intermediate',
    emoji: '🔥',
    warmup: [{ exercise: 'Jumping Jacks', sets: '1', reps: '60s' }],
    main: [{ exercise: 'Pushups', sets: '3', reps: '10' }],
    cooldown: [{ exercise: 'Stretch', sets: '1', reps: '60s' }],
  },
  {
    id: 'wo-2',
    name: 'Mobility Flow',
    cat: 'Mobility',
    subcat: 'Flow',
    dur: 15,
    diff: 'beginner',
    emoji: '🧘',
    warmup: [],
    main: [{ exercise: 'Cat Cow', sets: '1', reps: '60s' }],
    cooldown: [],
  },
];

const exercises = [{ id: 'e1', name: 'Pushups' }, { id: 'e2', name: 'Squats' }];

beforeEach(() => {
  listWorkoutOverridesMock.mockReset();
  replaceWorkoutOverrideMock.mockReset();
  deleteWorkoutOverrideMock.mockReset();
  // Stub fetch
  global.fetch = vi.fn((url: string) => {
    if (url.includes('workouts.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(baseWorkouts) });
    }
    if (url.includes('exercises.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(exercises) });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve([]) });
  }) as any;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WorkoutsPage', () => {
  it('loads + renders rows + override count', async () => {
    listWorkoutOverridesMock.mockResolvedValue([]);
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Full Body Burn')).toBeInTheDocument());
    expect(screen.getByText('Mobility Flow')).toBeInTheDocument();
    expect(screen.getByText(/2 workouts, 0 with overrides/)).toBeInTheDocument();
  });

  it('renders Edited chip for workouts with overrides + applies the patch', async () => {
    listWorkoutOverridesMock.mockResolvedValue([
      { id: 'wo-1', patch: { name: 'Renamed Burn' }, updated_at: '2025-01-01', updated_by: null },
    ]);
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Renamed Burn')).toBeInTheDocument());
    expect(screen.getByText('Edited')).toBeInTheDocument();
    expect(screen.getByText(/2 workouts, 1 with overrides/)).toBeInTheDocument();
  });

  it('shows page error when /workouts.json fetch fails', async () => {
    listWorkoutOverridesMock.mockResolvedValue([]);
    (global.fetch as any) = vi.fn(() => Promise.resolve({ ok: false, status: 500 }));
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText(/workouts.json: 500/)).toBeInTheDocument());
  });

  it('exercises.json failure is non-fatal — workouts still render', async () => {
    listWorkoutOverridesMock.mockResolvedValue([]);
    (global.fetch as any) = vi.fn((url: string) => {
      if (url.includes('workouts.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(baseWorkouts) });
      }
      return Promise.resolve({ ok: false });
    });
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Full Body Burn')).toBeInTheDocument());
  });

  it('cat filter narrows to selected category', async () => {
    listWorkoutOverridesMock.mockResolvedValue([]);
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Full Body Burn')).toBeInTheDocument());
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'Mobility' } });
    expect(screen.queryByText('Full Body Burn')).not.toBeInTheDocument();
    expect(screen.getByText('Mobility Flow')).toBeInTheDocument();
  });

  it('difficulty filter applies', async () => {
    listWorkoutOverridesMock.mockResolvedValue([]);
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Full Body Burn')).toBeInTheDocument());
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'beginner' } });
    expect(screen.queryByText('Full Body Burn')).not.toBeInTheDocument();
    expect(screen.getByText('Mobility Flow')).toBeInTheDocument();
  });

  it('duration filter (short ≤ 20 min)', async () => {
    listWorkoutOverridesMock.mockResolvedValue([]);
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Full Body Burn')).toBeInTheDocument());
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[2], { target: { value: 'short' } });
    expect(screen.queryByText('Full Body Burn')).not.toBeInTheDocument();
    expect(screen.getByText('Mobility Flow')).toBeInTheDocument();
  });

  it('"Has override" filter only shows rows with overrides', async () => {
    listWorkoutOverridesMock.mockResolvedValue([
      { id: 'wo-2', patch: { name: 'Edited Flow' }, updated_at: '2025-01-01', updated_by: null },
    ]);
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Full Body Burn')).toBeInTheDocument());
    const cb = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(cb);
    expect(screen.queryByText('Full Body Burn')).not.toBeInTheDocument();
    expect(screen.getByText('Edited Flow')).toBeInTheDocument();
  });

  it('search debounces and matches name', async () => {
    listWorkoutOverridesMock.mockResolvedValue([]);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Full Body Burn')).toBeInTheDocument());
    const search = document.querySelector('input[placeholder^="Search"]') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'mob' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(screen.queryByText('Full Body Burn')).not.toBeInTheDocument();
    expect(screen.getByText('Mobility Flow')).toBeInTheDocument();
  });

  it('opens edit modal and saves diff via replaceWorkoutOverride', async () => {
    listWorkoutOverridesMock.mockResolvedValue([]);
    replaceWorkoutOverrideMock.mockResolvedValue(undefined);
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Full Body Burn')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Full Body Burn'));
    await waitFor(() => expect(screen.getByText(/Edit · Full Body Burn/)).toBeInTheDocument());

    // Change name
    const nameInput = document.querySelectorAll('input')[5] as HTMLInputElement; // skip search/filters
    // Simpler: find by current value
    const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
    const targetNameInput = inputs.find((i) => i.value === 'Full Body Burn');
    expect(targetNameInput).toBeTruthy();
    fireEvent.change(targetNameInput!, { target: { value: 'New Name' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(replaceWorkoutOverrideMock).toHaveBeenCalledTimes(1));
    expect(replaceWorkoutOverrideMock.mock.calls[0][0]).toBe('wo-1');
    expect(replaceWorkoutOverrideMock.mock.calls[0][1]).toEqual({ name: 'New Name' });
    void nameInput;
  });

  it('save error surfaces in modal', async () => {
    listWorkoutOverridesMock.mockResolvedValue([]);
    replaceWorkoutOverrideMock.mockRejectedValue(new Error('save_failed'));
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Full Body Burn')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Full Body Burn'));
    await waitFor(() => expect(screen.getByText(/Edit · Full Body Burn/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('save_failed')).toBeInTheDocument());
  });

  it('clear override button calls deleteWorkoutOverride', async () => {
    listWorkoutOverridesMock.mockResolvedValue([
      { id: 'wo-1', patch: { name: 'Renamed' }, updated_at: '2025-01-01', updated_by: null },
    ]);
    deleteWorkoutOverrideMock.mockResolvedValue(undefined);
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Renamed')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Renamed'));
    await waitFor(() => expect(screen.getByText(/Edit · Full Body Burn/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Clear override' }));
    await waitFor(() => expect(deleteWorkoutOverrideMock).toHaveBeenCalledWith('wo-1'));
  });

  it('add row to a phase: + Add row appends an empty entry', async () => {
    listWorkoutOverridesMock.mockResolvedValue([]);
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Full Body Burn')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Full Body Burn'));
    await waitFor(() => expect(screen.getByText(/Edit · Full Body Burn/)).toBeInTheDocument());

    const addBtns = screen.getAllByRole('button', { name: /\+ Add row/ });
    expect(addBtns.length).toBe(3);
    const beforeRows = document.querySelectorAll('input[placeholder="Exercise name"]').length;
    fireEvent.click(addBtns[0]);
    const afterRows = document.querySelectorAll('input[placeholder="Exercise name"]').length;
    expect(afterRows).toBe(beforeRows + 1);
  });

  it('remove row via the ✕ icon button', async () => {
    listWorkoutOverridesMock.mockResolvedValue([]);
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Full Body Burn')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Full Body Burn'));
    await waitFor(() => expect(screen.getByText(/Edit · Full Body Burn/)).toBeInTheDocument());

    const beforeRows = document.querySelectorAll('input[placeholder="Exercise name"]').length;
    expect(beforeRows).toBe(3); // 1 warmup + 1 main + 1 cooldown
    fireEvent.click(screen.getAllByLabelText('Remove')[0]);
    expect(document.querySelectorAll('input[placeholder="Exercise name"]').length).toBe(2);
  });

  it('refresh button reloads overrides', async () => {
    listWorkoutOverridesMock.mockResolvedValue([]);
    render(<WorkoutsPage />);
    await waitFor(() => expect(screen.getByText('Full Body Burn')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(listWorkoutOverridesMock).toHaveBeenCalledTimes(2));
  });
});
