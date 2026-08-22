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
const setCycleMaxParticipantsMock = vi.fn();
const addEnrollmentMock = vi.fn();
const listUsersMock = vi.fn();

vi.mock('../../src/lib/adminApi', () => ({
  listChallengeCycles: (...a: unknown[]) => listChallengeCyclesMock(...a),
  openNextCycle: (...a: unknown[]) => openNextCycleMock(...a),
  listCycleWinners: (...a: unknown[]) => listCycleWinnersMock(...a),
  listMoneyChallenges: () => listMoneyChallengesMock(),
  setCycleMaxParticipants: (...a: unknown[]) => setCycleMaxParticipantsMock(...a),
  addEnrollment: (...a: unknown[]) => addEnrollmentMock(...a),
  listUsers: (...a: unknown[]) => listUsersMock(...a),
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
  display_seed: 0,
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

const adminUser = (o: Partial<any> = {}) => ({
  id: 'u1',
  email: 'a@x.com',
  signup_at: null,
  last_sign_in_at: null,
  name: 'Alice',
  goal: null,
  activity_level: null,
  experience: null,
  days_per_week: null,
  is_admin: false,
  profile_created_at: null,
  profile_updated_at: null,
  tier: 'free',
  subscription_status: null,
  subscription_expires_at: null,
  points: 0,
  tickets: 0,
  workout_count: 0,
  last_workout_at: null,
  ...o,
});

beforeEach(() => {
  listChallengeCyclesMock.mockReset();
  openNextCycleMock.mockReset();
  listCycleWinnersMock.mockReset();
  listMoneyChallengesMock.mockReset();
  setCycleMaxParticipantsMock.mockReset();
  addEnrollmentMock.mockReset();
  listUsersMock.mockReset();
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

  it('Slots column shows seeded display (active+seed / max+seed) with a real-cap note', async () => {
    listChallengeCyclesMock.mockResolvedValue([
      cycle({ status: 'enrollment_open', max_participants: 30, display_seed: 20, active_count: 3 }),
    ]);
    listMoneyChallengesMock.mockResolvedValue([]);
    render(<CyclesPage />);
    await waitFor(() => expect(screen.getByText('Pushup 30')).toBeInTheDocument());
    // displayActive = 3 + 20 = 23, displayTotal = 30 + 20 = 50
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('/ 50')).toBeInTheDocument();
    // real-cap note only when seed > 0
    expect(screen.getByText('pays 30')).toBeInTheDocument();
  });

  it('Slots column with seed 0 shows plain active / max (no pays note)', async () => {
    listChallengeCyclesMock.mockResolvedValue([
      cycle({ status: 'enrollment_open', max_participants: 50, display_seed: 0, active_count: 10 }),
    ]);
    listMoneyChallengesMock.mockResolvedValue([]);
    render(<CyclesPage />);
    await waitFor(() => expect(screen.getByText('Pushup 30')).toBeInTheDocument());
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('/ 50')).toBeInTheDocument();
    expect(screen.queryByText(/^pays /)).not.toBeInTheDocument();
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

  // The six 'open cycle' tests that stood here went with the control itself
  // (dfd08d0): cycles are created by enrolment now, not by hand. Kept the
  // rest of the suite, which covers filters, winners and participants.

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

  it('completed cycles show no row actions', async () => {
    listChallengeCyclesMock.mockResolvedValue([cycle({ status: 'completed' })]);
    listMoneyChallengesMock.mockResolvedValue([]);
    render(<CyclesPage />);
    await waitFor(() => expect(screen.getByText('Pushup 30')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Edit slots' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add participant' })).not.toBeInTheDocument();
  });

  // The three 'Edit slots' tests that stood here were removed with the control
  // itself (39d61be): it wrote challenge_cycles.max_participants + display_seed,
  // neither of which is read any more. 'completed cycles show no row actions'
  // above still asserts the button is gone.

  it('Add participant: search lists users, pick + submit calls addEnrollment', async () => {
    listChallengeCyclesMock.mockResolvedValue([cycle({ status: 'enrollment_open' })]);
    listMoneyChallengesMock.mockResolvedValue([]);
    listUsersMock.mockResolvedValue([adminUser()]);
    addEnrollmentMock.mockResolvedValue({
      ok: true,
      enrollment_id: 'enr-1',
      cycle_id: 'cyc-1abc999',
      user_id: 'u1',
      active_count: 11,
      status: 'enrollment_open',
    });
    render(<CyclesPage />);
    await waitFor(() => expect(screen.getByText('Pushup 30')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Add participant' }));
    await waitFor(() => expect(listUsersMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('a@x.com')).toBeInTheDocument());

    fireEvent.click(screen.getByText('a@x.com'));
    const submitBtn = Array.from(document.querySelectorAll('button[type="submit"]')).find(
      (b) => /Add participant/.test(b.textContent ?? ''),
    ) as HTMLButtonElement;
    fireEvent.click(submitBtn);

    await waitFor(() => expect(addEnrollmentMock).toHaveBeenCalledWith('cyc-1', 'u1'));
    await waitFor(() => expect(screen.getByText(/Enrolled a@x.com/)).toBeInTheDocument());
  });

  it('Add participant: cycle_full maps to a friendly error', async () => {
    listChallengeCyclesMock.mockResolvedValue([cycle({ status: 'enrollment_open' })]);
    listMoneyChallengesMock.mockResolvedValue([]);
    listUsersMock.mockResolvedValue([adminUser()]);
    addEnrollmentMock.mockRejectedValue(new Error('cycle_full'));
    render(<CyclesPage />);
    await waitFor(() => expect(screen.getByText('Pushup 30')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Add participant' }));
    await waitFor(() => expect(screen.getByText('a@x.com')).toBeInTheDocument());
    fireEvent.click(screen.getByText('a@x.com'));
    const submitBtn = Array.from(document.querySelectorAll('button[type="submit"]')).find(
      (b) => /Add participant/.test(b.textContent ?? ''),
    ) as HTMLButtonElement;
    fireEvent.click(submitBtn);
    await waitFor(() =>
      expect(screen.getByText('Cycle is full — raise the max participants first.')).toBeInTheDocument(),
    );
  });
});
