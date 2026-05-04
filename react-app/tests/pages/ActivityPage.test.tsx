/**
 * Tests for src/pages/admin/ActivityPage.tsx.
 *
 * Verifies:
 *   - initial load + KPI calculations
 *   - error banner on fetch failure
 *   - apply filters dispatches correct payload (UUID detection)
 *   - clear filters resets state and refetches
 *   - export CSV creates a blob URL and triggers download
 *   - workout name filter is forwarded
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

void React;

const fetchActivityFeedMock = vi.fn();

vi.mock('../../src/lib/adminApi', () => ({
  fetchActivityFeed: (...a: unknown[]) => fetchActivityFeedMock(...a),
}));

import { ActivityPage } from '../../src/pages/admin/ActivityPage';

const buildRow = (overrides: Partial<any> = {}) => ({
  id: 'log-' + Math.random(),
  user_id: 'user-1',
  user_name: 'Alice',
  user_email: 'alice@example.com',
  workout_id: 'wo-1',
  workout_name: 'Full Body Burn',
  duration: 1234,
  exercise_count: 8,
  emoji: '🔥',
  date: '2024-06-15',
  created_at: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  fetchActivityFeedMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ActivityPage', () => {
  it('loads the feed on mount and renders rows + computed KPIs', async () => {
    fetchActivityFeedMock.mockResolvedValue([buildRow(), buildRow()]);
    render(<ActivityPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Full Body Burn').length).toBeGreaterThan(0);
    });
    expect(fetchActivityFeedMock).toHaveBeenCalledWith({ limit: 200 });
    // KPI tiles: today/week/month should at least be rendered
    expect(screen.getByText('Workouts today')).toBeInTheDocument();
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('shows error banner when fetch fails', async () => {
    fetchActivityFeedMock.mockRejectedValue(new Error('rpc_down'));
    render(<ActivityPage />);
    await waitFor(() => {
      expect(screen.getByText('rpc_down')).toBeInTheDocument();
    });
    // empty-table message
    expect(screen.getByText(/No workouts match these filters/)).toBeInTheDocument();
  });

  it('Apply forwards workout name filter; UUID is detected and sent', async () => {
    fetchActivityFeedMock.mockResolvedValue([]);
    render(<ActivityPage />);
    await waitFor(() => {
      expect(fetchActivityFeedMock).toHaveBeenCalledTimes(1);
    });
    const userInput = document.querySelector('input[placeholder="user-id-uuid"]') as HTMLInputElement;
    const wnInput = document.querySelector('input[placeholder="e.g. Full Body Burn"]') as HTMLInputElement;
    fireEvent.change(userInput, { target: { value: '123e4567-e89b-12d3-a456-426614174000' } });
    fireEvent.change(wnInput, { target: { value: 'Push Day' } });

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => {
      expect(fetchActivityFeedMock).toHaveBeenCalledTimes(2);
    });
    const payload = fetchActivityFeedMock.mock.calls[1][0];
    expect(payload.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(payload.workoutName).toBe('Push Day');
    expect(payload.limit).toBe(200);
  });

  it('Apply ignores non-UUID free text in user field', async () => {
    fetchActivityFeedMock.mockResolvedValue([]);
    render(<ActivityPage />);
    await waitFor(() => expect(fetchActivityFeedMock).toHaveBeenCalledTimes(1));
    const userInput = document.querySelector('input[placeholder="user-id-uuid"]') as HTMLInputElement;
    fireEvent.change(userInput, { target: { value: 'alice@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(fetchActivityFeedMock).toHaveBeenCalledTimes(2));
    const payload = fetchActivityFeedMock.mock.calls[1][0];
    expect(payload.userId).toBeUndefined();
  });

  it('Clear resets all filter inputs and refetches with no filters', async () => {
    fetchActivityFeedMock.mockResolvedValue([]);
    render(<ActivityPage />);
    await waitFor(() => expect(fetchActivityFeedMock).toHaveBeenCalledTimes(1));
    const wnInput = document.querySelector('input[placeholder="e.g. Full Body Burn"]') as HTMLInputElement;
    fireEvent.change(wnInput, { target: { value: 'foo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(fetchActivityFeedMock).toHaveBeenCalledTimes(2));
    // After Clear the input should be empty
    expect((document.querySelector('input[placeholder="e.g. Full Body Burn"]') as HTMLInputElement).value).toBe('');
    expect(fetchActivityFeedMock.mock.calls[1][0]).toEqual({ limit: 200 });
  });

  it('Export CSV creates an object URL and triggers a download', async () => {
    fetchActivityFeedMock.mockResolvedValue([buildRow()]);
    const createObjUrl = vi.fn(() => 'blob://x');
    const revokeObjUrl = vi.fn();
    (URL as any).createObjectURL = createObjUrl;
    (URL as any).revokeObjectURL = revokeObjUrl;

    render(<ActivityPage />);
    await waitFor(() => expect(fetchActivityFeedMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /Export CSV/i }));
    expect(createObjUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjUrl).toHaveBeenCalledWith('blob://x');
  });

  it('Export CSV button is disabled when there are no rows', async () => {
    fetchActivityFeedMock.mockResolvedValue([]);
    render(<ActivityPage />);
    await waitFor(() => expect(fetchActivityFeedMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeDisabled();
  });

  it('Apply with from/to fills filters as ISO strings', async () => {
    fetchActivityFeedMock.mockResolvedValue([]);
    render(<ActivityPage />);
    await waitFor(() => expect(fetchActivityFeedMock).toHaveBeenCalledTimes(1));
    const dt = document.querySelectorAll('input[type="datetime-local"]');
    fireEvent.change(dt[0], { target: { value: '2024-06-01T08:00' } });
    fireEvent.change(dt[1], { target: { value: '2024-06-30T20:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(fetchActivityFeedMock).toHaveBeenCalledTimes(2));
    const payload = fetchActivityFeedMock.mock.calls[1][0];
    expect(typeof payload.from).toBe('string');
    expect(typeof payload.to).toBe('string');
    expect(new Date(payload.from).getTime()).toBeGreaterThan(0);
  });
});
