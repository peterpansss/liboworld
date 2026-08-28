/**
 * Tests for src/pages/admin/ExercisesPage.tsx.
 *
 * Verifies:
 *   - parallel mount fetch (exercises.json + listExerciseOverrides)
 *   - filters: search debounce, body-focus / equipment / env / diff / has-override
 *   - opens edit modal pre-populated with merged values
 *   - save dispatches replaceExerciseOverride with diff
 *   - "No changes" path
 *   - clear override calls deleteExerciseOverride
 *   - video / thumbnail upload flows
 *   - exercises.json fetch failure surfaces page error
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

void React;

const listExerciseOverridesMock = vi.fn();
const replaceExerciseOverrideMock = vi.fn();
const deleteExerciseOverrideMock = vi.fn();
const uploadExerciseVideoMock = vi.fn();
const uploadExerciseThumbnailMock = vi.fn();

vi.mock('../../src/lib/adminApi', () => ({
  listExerciseOverrides: () => listExerciseOverridesMock(),
  replaceExerciseOverride: (...a: unknown[]) => replaceExerciseOverrideMock(...a),
  // Page imports the *WithReauth wrapper under the original name.
  deleteExerciseOverrideWithReauth: (...a: unknown[]) => deleteExerciseOverrideMock(...a),
  uploadExerciseVideo: (...a: unknown[]) => uploadExerciseVideoMock(...a),
  uploadExerciseThumbnail: (...a: unknown[]) => uploadExerciseThumbnailMock(...a),
  // The page grew to call these on mount / in edit flows after this mock was
  // first written. Benign stubs keep the module mock complete (vitest throws on
  // any imported-but-unmocked export). listExercises drives refreshCanonical.
  listExercises: () => Promise.resolve([]),
  createExercise: (...a: unknown[]) => Promise.resolve({ id: 'ex_new', ...(a as object) }),
  deleteExerciseWithReauth: () => Promise.resolve(),
  updateExercise: () => Promise.resolve(),
  uploadExerciseVideoRaw: () => Promise.resolve({ ok: true }),
  createMediaJob: () => Promise.resolve({ id: 'job_1' }),
}));

import { ExercisesPage } from '../../src/pages/admin/ExercisesPage';

const exercises = [
  {
    id: 'pushup',
    name: 'Pushups',
    bodyFocus: 'Chest',
    equipment: 'None',
    environment: 'Home',
    diff: 'beginner',
    emoji: '💪',
    setupNotes: 'Place hands shoulder-width apart',
  },
  {
    id: 'squat',
    name: 'Squats',
    bodyFocus: 'Legs',
    equipment: 'None',
    environment: 'Home',
    diff: 'intermediate',
    emoji: '🦵',
  },
  {
    id: 'bench',
    name: 'Bench Press',
    bodyFocus: 'Chest',
    equipment: 'Barbell',
    environment: 'Gym',
    diff: 'advanced',
    emoji: '🏋️',
    machineRequired: true,
  },
];

beforeEach(() => {
  listExerciseOverridesMock.mockReset();
  replaceExerciseOverrideMock.mockReset();
  deleteExerciseOverrideMock.mockReset();
  uploadExerciseVideoMock.mockReset();
  uploadExerciseThumbnailMock.mockReset();
  global.fetch = vi.fn((url: string) => {
    if (url.includes('exercises.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(exercises) });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve([]) });
  }) as any;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ExercisesPage', () => {
  it('loads + renders rows + override count', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    expect(screen.getByText('Squats')).toBeInTheDocument();
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText(/3 exercises .* 0 with overrides/)).toBeInTheDocument();
  });

  it('exercise.json fetch failure surfaces page error', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    (global.fetch as any) = vi.fn(() => Promise.resolve({ ok: false, status: 503 }));
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText(/Failed to load exercises.json \(503\)/)).toBeInTheDocument());
  });

  it('renders Edited chip + applies override patch', async () => {
    listExerciseOverridesMock.mockResolvedValue([
      { id: 'pushup', patch: { name: 'Tricep Pushups' }, updated_at: '2025-01-01', updated_by: null },
    ]);
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Tricep Pushups')).toBeInTheDocument());
    expect(screen.getByText('Edited')).toBeInTheDocument();
    expect(screen.getByText(/3 exercises .* 1 with overrides/)).toBeInTheDocument();
  });

  it('filters by body focus', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'Legs' } });
    expect(screen.getByText('Squats')).toBeInTheDocument();
    expect(screen.queryByText('Pushups')).not.toBeInTheDocument();
  });

  it('filters by equipment', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'Barbell' } });
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.queryByText('Pushups')).not.toBeInTheDocument();
  });

  it('filters by environment', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[2], { target: { value: 'Gym' } });
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.queryByText('Pushups')).not.toBeInTheDocument();
  });

  it('filters by difficulty', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[3], { target: { value: 'advanced' } });
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.queryByText('Pushups')).not.toBeInTheDocument();
  });

  it('"Has override" filter shows only overridden rows', async () => {
    listExerciseOverridesMock.mockResolvedValue([
      { id: 'squat', patch: { name: 'Goblet Squats' }, updated_at: '2025-01-01', updated_by: null },
    ]);
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    const cb = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(cb);
    expect(screen.queryByText('Pushups')).not.toBeInTheDocument();
    expect(screen.getByText('Goblet Squats')).toBeInTheDocument();
  });

  it('search debounces and filters', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    const search = document.querySelector('input[placeholder^="Search"]') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'bench' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(screen.queryByText('Pushups')).not.toBeInTheDocument();
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
  });

  it('opens edit modal pre-populated and saves diff', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    replaceExerciseOverrideMock.mockResolvedValue(undefined);
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Pushups'));
    await waitFor(() => expect(screen.getByText('Edit · Pushups')).toBeInTheDocument());

    // Find the name input: it should have value 'Pushups'
    const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
    const nameInput = inputs.find((i) => i.value === 'Pushups');
    expect(nameInput).toBeTruthy();
    fireEvent.change(nameInput!, { target: { value: 'Pushups V2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(replaceExerciseOverrideMock).toHaveBeenCalledTimes(1));
    expect(replaceExerciseOverrideMock.mock.calls[0][0]).toBe('pushup');
    expect(replaceExerciseOverrideMock.mock.calls[0][1]).toEqual({ name: 'Pushups V2' });
  });

  it('save with no changes and no existing override → "No changes" error', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Pushups'));
    await waitFor(() => expect(screen.getByText('Edit · Pushups')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    // The page shows "No changes" both in the diff status AND in the modalErr alert.
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No changes'));
    expect(replaceExerciseOverrideMock).not.toHaveBeenCalled();
  });

  it('save error surfaces in modal', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    replaceExerciseOverrideMock.mockRejectedValue(new Error('save_failed'));
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Pushups'));
    await waitFor(() => expect(screen.getByText('Edit · Pushups')).toBeInTheDocument());

    const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
    const nameInput = inputs.find((i) => i.value === 'Pushups');
    fireEvent.change(nameInput!, { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('save_failed')).toBeInTheDocument());
  });

  it('clear override button calls deleteExerciseOverride', async () => {
    listExerciseOverridesMock.mockResolvedValue([
      { id: 'pushup', patch: { name: 'Override Name' }, updated_at: '2025-01-01', updated_by: null },
    ]);
    deleteExerciseOverrideMock.mockResolvedValue(undefined);
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Override Name')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Override Name'));
    await waitFor(() => expect(screen.getByText('Edit · Pushups')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Clear override' }));
    await waitFor(() => expect(deleteExerciseOverrideMock).toHaveBeenCalledWith('pushup'));
  });

  it('video upload sets the videoUrl field', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    uploadExerciseVideoMock.mockResolvedValue('https://cdn/video.mp4');
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Pushups'));
    await waitFor(() => expect(screen.getByText('Edit · Pushups')).toBeInTheDocument());

    const videoInputs = document.querySelectorAll('input[type="file"][accept="video/*"]');
    expect(videoInputs.length).toBeGreaterThanOrEqual(1);
    const primaryVideoInput = videoInputs[0] as HTMLInputElement;
    const f = new File(['x'], 'v.mp4', { type: 'video/mp4' });
    Object.defineProperty(primaryVideoInput, 'files', { value: [f] });
    fireEvent.change(primaryVideoInput);

    await waitFor(() => expect(uploadExerciseVideoMock).toHaveBeenCalledWith(f));
    await waitFor(() => {
      const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
      const vUrl = inputs.find((i) => i.value === 'https://cdn/video.mp4');
      expect(vUrl).toBeTruthy();
    });
  });

  it('thumbnail upload sets the thumbnailUrl field', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    uploadExerciseThumbnailMock.mockResolvedValue('https://cdn/thumb.jpg');
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Pushups'));
    await waitFor(() => expect(screen.getByText('Edit · Pushups')).toBeInTheDocument());

    // The modal now has multiple video inputs; the thumbnail is the only
    // image/* one, so select it by accept type rather than a brittle index.
    const thumbInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
    expect(thumbInput).toBeTruthy();
    const f = new File(['x'], 't.jpg', { type: 'image/jpeg' });
    Object.defineProperty(thumbInput, 'files', { value: [f] });
    fireEvent.change(thumbInput);

    await waitFor(() => expect(uploadExerciseThumbnailMock).toHaveBeenCalledWith(f));
  });

  it('upload error surfaces in modal', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    uploadExerciseVideoMock.mockRejectedValue(new Error('upload_failed'));
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Pushups'));
    await waitFor(() => expect(screen.getByText('Edit · Pushups')).toBeInTheDocument());

    const primaryVideoInput = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
    Object.defineProperty(primaryVideoInput, 'files', { value: [new File(['x'], 'v.mp4', { type: 'video/mp4' })] });
    fireEvent.change(primaryVideoInput);
    await waitFor(() => expect(screen.getByText('upload_failed')).toBeInTheDocument());
  });

  it('refresh button reloads overrides', async () => {
    listExerciseOverridesMock.mockResolvedValue([]);
    render(<ExercisesPage />);
    await waitFor(() => expect(screen.getByText('Pushups')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(listExerciseOverridesMock).toHaveBeenCalledTimes(2));
  });
});
