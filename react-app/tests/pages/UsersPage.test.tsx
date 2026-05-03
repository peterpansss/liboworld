/**
 * Tests for src/pages/admin/UsersPage.tsx.
 *
 * Verifies:
 *   - Users tab loads and renders rows; tab switch loads the leaderboard
 *   - Search input debounces and triggers a refetch with the trimmed term
 *   - Clicking a row opens the user detail modal which loads top/recent/ledger
 *   - Grant tickets / adjust points dialogs validate and call the API
 *   - Toggle admin flag flips correctly
 *   - Set tier dispatches the tier
 *   - listUsers / fetchLeaderboard errors surface in the banner
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

void React;

const listUsersMock = vi.fn();
const fetchLeaderboardMock = vi.fn();
const fetchUserTopWorkoutsMock = vi.fn();
const fetchUserRecentWorkoutsMock = vi.fn();
const fetchUserPointsLedgerMock = vi.fn();
const grantTicketsMock = vi.fn();
const adjustPointsMock = vi.fn();
const setSubscriptionTierMock = vi.fn();
const setUserAdminFlagMock = vi.fn();

vi.mock('../../src/lib/adminApi', () => ({
  listUsers: (...a: unknown[]) => listUsersMock(...a),
  fetchLeaderboard: (...a: unknown[]) => fetchLeaderboardMock(...a),
  fetchUserTopWorkouts: (...a: unknown[]) => fetchUserTopWorkoutsMock(...a),
  fetchUserRecentWorkouts: (...a: unknown[]) => fetchUserRecentWorkoutsMock(...a),
  fetchUserPointsLedger: (...a: unknown[]) => fetchUserPointsLedgerMock(...a),
  grantTickets: (...a: unknown[]) => grantTicketsMock(...a),
  adjustPoints: (...a: unknown[]) => adjustPointsMock(...a),
  setSubscriptionTier: (...a: unknown[]) => setSubscriptionTierMock(...a),
  setUserAdminFlag: (...a: unknown[]) => setUserAdminFlagMock(...a),
}));

import { UsersPage } from '../../src/pages/admin/UsersPage';

const sampleUser = (overrides: Partial<any> = {}) => ({
  id: 'user-1',
  email: 'alice@example.com',
  signup_at: '2024-01-01T00:00:00Z',
  last_sign_in_at: null,
  name: 'Alice',
  goal: null,
  activity_level: null,
  experience: null,
  days_per_week: null,
  is_admin: false,
  profile_created_at: null,
  profile_updated_at: null,
  tier: 'pro',
  subscription_status: null,
  subscription_expires_at: null,
  points: 1000,
  tickets: 5,
  workout_count: 12,
  last_workout_at: '2024-06-01T00:00:00Z',
  ...overrides,
});

beforeEach(() => {
  listUsersMock.mockReset();
  fetchLeaderboardMock.mockReset();
  fetchUserTopWorkoutsMock.mockReset();
  fetchUserRecentWorkoutsMock.mockReset();
  fetchUserPointsLedgerMock.mockReset();
  grantTicketsMock.mockReset();
  adjustPointsMock.mockReset();
  setSubscriptionTierMock.mockReset();
  setUserAdminFlagMock.mockReset();

  fetchUserTopWorkoutsMock.mockResolvedValue([]);
  fetchUserRecentWorkoutsMock.mockResolvedValue([]);
  fetchUserPointsLedgerMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('UsersPage', () => {
  it('loads users on mount and renders rows', async () => {
    listUsersMock.mockResolvedValue([sampleUser()]);
    render(<UsersPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    expect(listUsersMock).toHaveBeenCalledWith(null, 200, 0);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
  });

  it('renders error banner when listUsers fails', async () => {
    listUsersMock.mockRejectedValue(new Error('list_failed'));
    render(<UsersPage />);
    await waitFor(() => {
      expect(screen.getByText('list_failed')).toBeInTheDocument();
    });
  });

  it('search input debounces and refetches with trimmed term', async () => {
    listUsersMock.mockResolvedValue([]);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<UsersPage />);
    await waitFor(() => expect(listUsersMock).toHaveBeenCalledTimes(1));

    const search = document.querySelector('input[placeholder^="Search"]') as HTMLInputElement;
    fireEvent.change(search, { target: { value: '  bob  ' } });

    // Advance debounce timer
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => expect(listUsersMock).toHaveBeenCalledTimes(2));
    expect(listUsersMock.mock.calls[1][0]).toBe('bob');
  });

  it('switches to leaderboard tab and loads it', async () => {
    listUsersMock.mockResolvedValue([]);
    fetchLeaderboardMock.mockResolvedValue([
      { user_id: 'u1', name: 'Alice', email: 'a@x.com', points: 100, tickets: 1, workout_count: 5, total_minutes: 120, total_volume_kg: 999 },
    ]);
    render(<UsersPage />);
    await waitFor(() => expect(listUsersMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Leaderboard' }));
    await waitFor(() => expect(fetchLeaderboardMock).toHaveBeenCalledTimes(1));
    expect(fetchLeaderboardMock).toHaveBeenCalledWith(100);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('leaderboard error surfaces in banner', async () => {
    listUsersMock.mockResolvedValue([]);
    fetchLeaderboardMock.mockRejectedValue(new Error('lb_failed'));
    render(<UsersPage />);
    await waitFor(() => expect(listUsersMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Leaderboard' }));
    await waitFor(() => expect(screen.getByText('lb_failed')).toBeInTheDocument());
  });

  it('clicks a row → opens detail modal and loads details', async () => {
    listUsersMock.mockResolvedValue([sampleUser()]);
    fetchUserTopWorkoutsMock.mockResolvedValue([{ workout_name: 'Push Day', count: 7 }]);
    fetchUserRecentWorkoutsMock.mockResolvedValue([
      { id: 'l1', user_id: 'user-1', user_name: null, user_email: null, workout_id: 'w1', workout_name: 'Pull Day', duration: 600, exercise_count: 6, emoji: '🔥', date: '2024-06-01', created_at: '2024-06-01T08:00:00Z' },
    ]);
    fetchUserPointsLedgerMock.mockResolvedValue([
      { id: 'p1', user_id: 'user-1', amount: 100, reason: 'workout_completed', reference_id: null, multiplier: 1, base_amount: 100, created_at: '2024-06-01T08:00:00Z' },
    ]);
    render(<UsersPage />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Alice'));
    await waitFor(() => {
      expect(fetchUserTopWorkoutsMock).toHaveBeenCalledWith('user-1', 5);
      expect(fetchUserRecentWorkoutsMock).toHaveBeenCalledWith('user-1', 20);
      expect(fetchUserPointsLedgerMock).toHaveBeenCalledWith('user-1', 50);
    });
    await waitFor(() => {
      expect(screen.getByText('Push Day')).toBeInTheDocument();
      expect(screen.getByText(/Pull Day/)).toBeInTheDocument();
      expect(screen.getByText('workout_completed')).toBeInTheDocument();
    });
  });

  it('grant tickets validates and calls grantTickets with parsed number', async () => {
    listUsersMock.mockResolvedValue([sampleUser()]);
    grantTicketsMock.mockResolvedValue(undefined);
    render(<UsersPage />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Alice'));
    await waitFor(() => expect(fetchUserTopWorkoutsMock).toHaveBeenCalled());

    // Empty / 0 → validation error
    fireEvent.click(screen.getByRole('button', { name: 'Grant' }));
    await waitFor(() => expect(screen.getByText(/non-zero number of tickets/)).toBeInTheDocument());
    expect(grantTicketsMock).not.toHaveBeenCalled();

    const ticketsAmount = document.querySelectorAll('input[type="number"]')[0] as HTMLInputElement;
    fireEvent.change(ticketsAmount, { target: { value: '5' } });
    const noteInput = document.querySelectorAll('input[placeholder="Reason"]')[0] as HTMLInputElement;
    fireEvent.change(noteInput, { target: { value: 'thx' } });
    fireEvent.click(screen.getByRole('button', { name: 'Grant' }));

    await waitFor(() => expect(grantTicketsMock).toHaveBeenCalledWith('user-1', 5, 'thx'));
  });

  it('adjust points: validates and calls adjustPoints with note=undefined when empty', async () => {
    listUsersMock.mockResolvedValue([sampleUser()]);
    adjustPointsMock.mockResolvedValue(undefined);
    render(<UsersPage />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Alice'));
    await waitFor(() => expect(fetchUserTopWorkoutsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Adjust' }));
    await waitFor(() => expect(screen.getByText(/non-zero amount/)).toBeInTheDocument());

    const pointsAmount = document.querySelectorAll('input[type="number"]')[1] as HTMLInputElement;
    fireEvent.change(pointsAmount, { target: { value: '-50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adjust' }));

    await waitFor(() => expect(adjustPointsMock).toHaveBeenCalledWith('user-1', -50, undefined));
  });

  it('toggle admin: not-admin user → "Grant admin" calls setUserAdminFlag(true)', async () => {
    listUsersMock.mockResolvedValue([sampleUser({ is_admin: false })]);
    setUserAdminFlagMock.mockResolvedValue(undefined);
    render(<UsersPage />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Alice'));
    await waitFor(() => expect(fetchUserTopWorkoutsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Grant admin' }));
    await waitFor(() => expect(setUserAdminFlagMock).toHaveBeenCalledWith('user-1', true));
  });

  it('toggle admin: admin user → "Revoke admin" calls setUserAdminFlag(false)', async () => {
    listUsersMock.mockResolvedValue([sampleUser({ is_admin: true })]);
    setUserAdminFlagMock.mockResolvedValue(undefined);
    render(<UsersPage />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Alice'));
    await waitFor(() => expect(fetchUserTopWorkoutsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Revoke admin' }));
    await waitFor(() => expect(setUserAdminFlagMock).toHaveBeenCalledWith('user-1', false));
  });

  it('change tier select calls setSubscriptionTier with new tier', async () => {
    listUsersMock.mockResolvedValue([sampleUser({ tier: 'free' })]);
    setSubscriptionTierMock.mockResolvedValue(undefined);
    render(<UsersPage />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Alice'));
    await waitFor(() => expect(fetchUserTopWorkoutsMock).toHaveBeenCalled());

    const tierSelect = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(tierSelect, { target: { value: 'elite' } });
    await waitFor(() => expect(setSubscriptionTierMock).toHaveBeenCalledWith('user-1', 'elite'));
  });

  it('grant tickets API failure surfaces error', async () => {
    listUsersMock.mockResolvedValue([sampleUser()]);
    grantTicketsMock.mockRejectedValue(new Error('rate_limited'));
    render(<UsersPage />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Alice'));
    await waitFor(() => expect(fetchUserTopWorkoutsMock).toHaveBeenCalled());

    const ticketsAmount = document.querySelectorAll('input[type="number"]')[0] as HTMLInputElement;
    fireEvent.change(ticketsAmount, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Grant' }));
    await waitFor(() => expect(screen.getByText('rate_limited')).toBeInTheDocument());
  });

  it('top workouts shows empty state when none returned', async () => {
    listUsersMock.mockResolvedValue([sampleUser()]);
    render(<UsersPage />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Alice'));
    await waitFor(() => expect(fetchUserTopWorkoutsMock).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getAllByText('No workouts yet').length).toBeGreaterThan(0);
    });
  });
});
