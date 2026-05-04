/**
 * Tests for src/pages/admin/CyclesPage.tsx.
 *
 * Verifies:
 *   - parallel load of cycles + challenges on mount
 *   - status / challenge filters
 *   - error / success banners
 *   - opening a new cycle: validation, success, error
 *   - clicking a completed row loads winners
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

void React;

const listChallengeCyclesMock = vi.fn();
const openNextCycleMock = vi.fn();
const listCycleWinnersMock = vi.fn();
const listMoneyChallengesMock = vi.fn();

vi.mock('../../src/lib/adminApi', () => ({
  listChallengeCycles: (...a: unknown[]) => listChallengeCyclesMock(...a),
  openNextCycle: (...a: unknown[]) => openNextCycleMock(...a),
  listCycleWinners: (...a: unknown[]) => listCycleWinnersMock(...a),
  listMoneyChallenges: () => listMoneyChallengesMock(),
}));

import { CyclesPage } from '../../src/pages/admin/CyclesPage';

const cycle = (o: Partial<any> = {}) => ({
  id: 'cyc-1',
  challenge_id: 'ch-1',
  challenge_title: 'Pushup 30',
  challenge_reward_amount: 25,
  challenge_reward_currency: 'EUR',
  challenge_total_days: 30,
  challenge_min_tier: 'free',
  status: 'enrollment_open',
  enrollment_opens_at: '2025-04-01T00:00:00Z',
  start_date: '2025-04-15',
  end_date: '2025-05-15',
  max_participants: 50,
  filled_at: null,
  active_count: 10,
  completed_count: 0,
  removed_count: 0,
  payouts_pending: 0,
  payouts_paid: 0,
  total_owed: 0,
  total_paid: 0,
  created_at: '2025-04-01T00:00:00Z',
  ...o,
});

const ch = (o: Partial<any> = {}) => ({
  id: 'ch-1',
  title: 'Pushup 30',
  description: 'd',
  emoji: '💪',
  exercise_option_ids: ['pushups'],
  reps_per_day: 50,
  total_days: 30,
  reward_amount: 25,
  reward_currency: 'EUR',
  max_participants: 50,
  required_tier: 'free',
  is_active: true,
  sort_order: 0,
  starts_at: null,
  ends_at: null,
  current_active: 0,
  total_ever: 0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...o,
});

beforeEach(() => {
  listChallengeCyclesMock.mockReset();
  openNextCycleMock.mockReset();
  listCycleWinnersMock.mockReset();
  listMoneyChallengesMock.mockReset();
});

describe('CyclesPage', () => {
  it('loads cycles + challenges in parallel and renders rows', async () => {
    listChallengeCyclesMock.mockResolvedValue([cycle()]);
    listMoneyChallengesMock.mockResolvedValue([ch()]);
    render(<CyclesPage />);
    await waitFor(() => expect(screen.getAllByText('Pushup 30').length).toBeGreaterThan(0));
    expect(listChallengeCyclesMock).toHaveBeenCalledWith(null);
    expect(listMoneyChallengesMock).toHaveBeenCalled();
    expect(screen.getByText(/1 total · 1 enrollment_open · 0 running · 0 completed/)).toBeInTheDocument();
  });

  it('list cycles error surfaces', async () => {
    listChallengeCyclesMock.mockRejectedValue(new Error('cyc_failed'));
    listMoneyChallengesMock.mockResolvedValue([]);
    render(<CyclesPage />);
    await waitFor(() => expect(screen.getByText('cyc_failed')).toBeInTheDocument());
  });

  it('changing challenge filter triggers refetch with id', async () => {
    listChallengeCyclesMock.mockResolvedValue([]);
    listMoneyChallengesMock.mockResolvedValue([ch(), ch({ id: 'ch-2', title: 'Squats 14' })]);
    render(<CyclesPage />);
    await waitFor(() => expect(screen.getByText(/Squats 14/)).toBeInTheDocument());
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'ch-2' } });
    await waitFor(() => expect(listChallengeCyclesMock).toHaveBeenLastCalledWith('ch-2'));
  });

  it('status filter narrows displayed rows client-side', async () => {
    listChallengeCyclesMock.mockResolvedValue([
      cycle({ id: 'a', status: 'enrollment_open', challenge_title: 'A' }),
      cycle({ id: 'b', status: 'completed', challenge_title: 'B' }),
    ]);
    listMoneyChallengesMock.mockResolvedValue([]);
    render(<CyclesPage />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    expect(screen.getByText('B')).toBeInTheDocument();

    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'completed' } });
    expect(screen.queryByText('A')).not.toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('"+ Open new cycle" opens modal and validates challenge required', async () => {
    listChallengeCyclesMock.mockResolvedValue([]);
    listMoneyChallengesMock.mockResolvedValue([]);
    render(<CyclesPage />);
    await waitFor(() => expect(listChallengeCyclesMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '+ Open new cycle' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open cycle' })).toBeInTheDocument());
    document.querySelectorAll('input[required], select[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    // No challenges loaded → submit should fail validation
    fireEvent.click(screen.getByRole('button', { name: 'Open cycle' }));
    await waitFor(() => expect(screen.getByText('Challenge is required.')).toBeInTheDocument());
  });

  it('open cycle: max_participants <= 0 fails validation', async () => {
    listChallengeCyclesMock.mockResolvedValue([]);
    listMoneyChallengesMock.mockResolvedValue([ch()]);
    render(<CyclesPage />);
    await waitFor(() => expect(listMoneyChallengesMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '+ Open new cycle' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open cycle' })).toBeInTheDocument());
    document.querySelectorAll('input[required], select[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    document.querySelectorAll('input[min]').forEach((el) => el.removeAttribute('min'));

    const numInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(numInput, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open cycle' }));
    await waitFor(() => expect(screen.getByText('Max participants must be greater than 0.')).toBeInTheDocument());
  });

  it('successful open cycle dispatches openNextCycle and shows success banner', async () => {
    listChallengeCyclesMock.mockResolvedValue([]);
    listMoneyChallengesMock.mockResolvedValue([ch()]);
    openNextCycleMock.mockResolvedValue({ cycle_id: 'newCycle12345', promoted_from_waitlist: 7 });
    render(<CyclesPage />);
    await waitFor(() => expect(listMoneyChallengesMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '+ Open new cycle' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open cycle' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Open cycle' }));
    await waitFor(() => expect(openNextCycleMock).toHaveBeenCalledTimes(1));
    expect(openNextCycleMock.mock.calls[0][0]).toBe('ch-1');
    expect(openNextCycleMock.mock.calls[0][2]).toBe(50);
    await waitFor(() => expect(screen.getByText(/promoted from waitlist/)).toBeInTheDocument());
  });

  it('open cycle error surfaces in form', async () => {
    listChallengeCyclesMock.mockResolvedValue([]);
    listMoneyChallengesMock.mockResolvedValue([ch()]);
    openNextCycleMock.mockRejectedValue(new Error('overlap'));
    render(<CyclesPage />);
    await waitFor(() => expect(listMoneyChallengesMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '+ Open new cycle' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open cycle' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Open cycle' }));
    await waitFor(() => expect(screen.getByText('overlap')).toBeInTheDocument());
  });

  it('clicking a completed row loads winners', async () => {
    listChallengeCyclesMock.mockResolvedValue([cycle({ status: 'completed' })]);
    listMoneyChallengesMock.mockResolvedValue([]);
    listCycleWinnersMock.mockResolvedValue([
      { enrollment_id: 'e1', user_id: 'u1', user_email: 'a@x.com', tier_at_enrollment: 'free', completed_days: 30, enrolled_at: '2025-04-15', payout_id: null, payout_status: null, payout_amount: null, payout_paid_at: null },
    ]);
    render(<CyclesPage />);
    await waitFor(() => expect(screen.getByText('Pushup 30')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Pushup 30'));
    await waitFor(() => expect(listCycleWinnersMock).toHaveBeenCalledWith('cyc-1'));
    await waitFor(() => expect(screen.getByText('a@x.com')).toBeInTheDocument());
  });

  it('non-completed row click does NOT load winners', async () => {
    listChallengeCyclesMock.mockResolvedValue([cycle({ status: 'running' })]);
    listMoneyChallengesMock.mockResolvedValue([]);
    render(<CyclesPage />);
    await waitFor(() => expect(screen.getByText('Pushup 30')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Pushup 30'));
    // give it a beat
    await new Promise((r) => setTimeout(r, 50));
    expect(listCycleWinnersMock).not.toHaveBeenCalled();
  });

  it('error banner has dismiss × button', async () => {
    listChallengeCyclesMock.mockRejectedValue(new Error('boom'));
    listMoneyChallengesMock.mockResolvedValue([]);
    render(<CyclesPage />);
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Dismiss'));
    await waitFor(() => expect(screen.queryByText('boom')).not.toBeInTheDocument());
  });

  it('refresh re-loads cycles', async () => {
    listChallengeCyclesMock.mockResolvedValue([]);
    listMoneyChallengesMock.mockResolvedValue([]);
    render(<CyclesPage />);
    // Mount triggers two fetches: the initial Promise.all + the
    // challengeFilter useEffect on first render.
    await waitFor(() => expect(listChallengeCyclesMock).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    await waitFor(() => expect(listChallengeCyclesMock).toHaveBeenCalledTimes(3));
  });
});
