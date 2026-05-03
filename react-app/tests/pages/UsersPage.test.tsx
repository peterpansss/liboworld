/**
 * Tests for src/pages/admin/UsersPage.tsx.
 *
 * The Users page exposes four sensitive actions: grantTickets, adjustPoints,
 * setSubscriptionTier, setUserAdminFlag. These MUST be invoked through the
 * *WithReauth wrappers in lib/adminApi so that requireRecentAuth() can
 * challenge the operator before the mutation hits the database.
 *
 * The mock below provides BOTH the un-wrapped and the wrapped variants. The
 * wrapped variants forward to a tiny shim that also calls a spy on
 * `requireRecentAuth`, so each test can assert:
 *   1. The wrapped variant was invoked (i.e. UsersPage imported the gated name)
 *   2. The re-auth gate spy fired before the underlying RPC ran
 *
 * If a future refactor accidentally drops the `*WithReauth as foo` rename in
 * UsersPage.tsx, every assertion in the "re-auth gate" describe block fails.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

void React;

const USER_FIXTURE = {
  id: 'u_alice',
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
  tier: 'free',
  subscription_status: null,
  subscription_expires_at: null,
  points: 100,
  tickets: 5,
  workout_count: 3,
  last_workout_at: '2024-01-15T00:00:00Z',
};

vi.mock('../../src/lib/adminApi', () => {
  const requireRecentAuthSpy = vi.fn(async () => {});
  const grantTicketsSpy = vi.fn(async () => {});
  const adjustPointsSpy = vi.fn(async () => {});
  const setSubscriptionTierSpy = vi.fn(async () => {});
  const setUserAdminFlagSpy = vi.fn(async () => {});

  const grantTicketsWithReauthSpy = vi.fn(async (...args: unknown[]) => {
    await requireRecentAuthSpy();
    return grantTicketsSpy(...args);
  });
  const adjustPointsWithReauthSpy = vi.fn(async (...args: unknown[]) => {
    await requireRecentAuthSpy();
    return adjustPointsSpy(...args);
  });
  const setSubscriptionTierWithReauthSpy = vi.fn(async (...args: unknown[]) => {
    await requireRecentAuthSpy();
    return setSubscriptionTierSpy(...args);
  });
  const setUserAdminFlagWithReauthSpy = vi.fn(async (...args: unknown[]) => {
    await requireRecentAuthSpy();
    return setUserAdminFlagSpy(...args);
  });

  return {
    listUsers: vi.fn(async () => [USER_FIXTURE]),
    fetchUserTopWorkouts: vi.fn(async () => []),
    fetchUserRecentWorkouts: vi.fn(async () => []),
    fetchUserPointsLedger: vi.fn(async () => []),
    fetchLeaderboard: vi.fn(async () => []),
    // Sensitive ops: BOTH variants exposed for the mock so the page can be
    // refactored in either direction without breaking the suite.
    grantTickets: grantTicketsSpy,
    adjustPoints: adjustPointsSpy,
    setSubscriptionTier: setSubscriptionTierSpy,
    setUserAdminFlag: setUserAdminFlagSpy,
    grantTicketsWithReauth: grantTicketsWithReauthSpy,
    adjustPointsWithReauth: adjustPointsWithReauthSpy,
    setSubscriptionTierWithReauth: setSubscriptionTierWithReauthSpy,
    setUserAdminFlagWithReauth: setUserAdminFlagWithReauthSpy,
    // Reauth machinery
    requireRecentAuth: requireRecentAuthSpy,
  };
});

import * as adminApi from '../../src/lib/adminApi';
import { UsersPage } from '../../src/pages/admin/UsersPage';

// Pull typed handles to the mocked spies, so the test bodies get autocompletion.
const mocked = adminApi as unknown as {
  listUsers: ReturnType<typeof vi.fn>;
  fetchUserTopWorkouts: ReturnType<typeof vi.fn>;
  fetchUserRecentWorkouts: ReturnType<typeof vi.fn>;
  fetchUserPointsLedger: ReturnType<typeof vi.fn>;
  fetchLeaderboard: ReturnType<typeof vi.fn>;
  grantTickets: ReturnType<typeof vi.fn>;
  adjustPoints: ReturnType<typeof vi.fn>;
  setSubscriptionTier: ReturnType<typeof vi.fn>;
  setUserAdminFlag: ReturnType<typeof vi.fn>;
  grantTicketsWithReauth: ReturnType<typeof vi.fn>;
  adjustPointsWithReauth: ReturnType<typeof vi.fn>;
  setSubscriptionTierWithReauth: ReturnType<typeof vi.fn>;
  setUserAdminFlagWithReauth: ReturnType<typeof vi.fn>;
  requireRecentAuth: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  mocked.listUsers.mockClear();
  mocked.listUsers.mockImplementation(async () => [USER_FIXTURE]);
  mocked.fetchUserTopWorkouts.mockClear();
  mocked.fetchUserRecentWorkouts.mockClear();
  mocked.fetchUserPointsLedger.mockClear();
  mocked.fetchLeaderboard.mockClear();
  mocked.grantTickets.mockClear();
  mocked.adjustPoints.mockClear();
  mocked.setSubscriptionTier.mockClear();
  mocked.setUserAdminFlag.mockClear();
  mocked.grantTicketsWithReauth.mockClear();
  mocked.adjustPointsWithReauth.mockClear();
  mocked.setSubscriptionTierWithReauth.mockClear();
  mocked.setUserAdminFlagWithReauth.mockClear();
  mocked.requireRecentAuth.mockClear();
  mocked.requireRecentAuth.mockImplementation(async () => {});
});

async function openUserModal() {
  render(<UsersPage />);
  await waitFor(() => expect(mocked.listUsers).toHaveBeenCalled());
  // Wait for the user row to appear, then click it.
  const aliceCell = await screen.findByText('Alice');
  fireEvent.click(aliceCell.closest('tr')!);
  // The modal lazily loads user details; wait for the loaders to fire so the
  // form fields are stable before the test interacts with them.
  await waitFor(() => expect(mocked.fetchUserTopWorkouts).toHaveBeenCalledWith('u_alice', 5));
}

describe('UsersPage - users tab', () => {
  it('loads and renders the users list', async () => {
    render(<UsersPage />);
    await waitFor(() => expect(mocked.listUsers).toHaveBeenCalled());
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('shows an error banner if listUsers throws', async () => {
    mocked.listUsers.mockRejectedValueOnce(new Error('rls denied'));
    render(<UsersPage />);
    expect(await screen.findByText(/rls denied/)).toBeInTheDocument();
  });
});

describe('UsersPage - leaderboard tab', () => {
  it('switches tabs and loads the leaderboard', async () => {
    render(<UsersPage />);
    await waitFor(() => expect(mocked.listUsers).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Leaderboard'));
    await waitFor(() => expect(mocked.fetchLeaderboard).toHaveBeenCalled());
  });
});

describe('UsersPage - re-auth gate on sensitive actions', () => {
  it('grant tickets goes through grantTicketsWithReauth (re-auth fires)', async () => {
    await openUserModal();
    const ticketAmountInput = screen.getByPlaceholderText('e.g. 5');
    fireEvent.change(ticketAmountInput, { target: { value: '10' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Grant'));
    });
    await waitFor(() => expect(mocked.grantTicketsWithReauth).toHaveBeenCalledTimes(1));
    expect(mocked.grantTicketsWithReauth).toHaveBeenCalledWith('u_alice', 10, undefined);
    expect(mocked.requireRecentAuth).toHaveBeenCalled();
    expect(mocked.grantTickets).toHaveBeenCalledTimes(1);
    // Verify the order of calls: requireRecentAuth before the underlying RPC.
    const reauthOrder = mocked.requireRecentAuth.mock.invocationCallOrder[0];
    const rpcOrder = mocked.grantTickets.mock.invocationCallOrder[0];
    expect(reauthOrder).toBeLessThan(rpcOrder);
  });

  it('adjust points goes through adjustPointsWithReauth (re-auth fires)', async () => {
    await openUserModal();
    const pointsAmountInput = screen.getByPlaceholderText('e.g. 100 or -50');
    fireEvent.change(pointsAmountInput, { target: { value: '50' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Adjust'));
    });
    await waitFor(() => expect(mocked.adjustPointsWithReauth).toHaveBeenCalledTimes(1));
    expect(mocked.adjustPointsWithReauth).toHaveBeenCalledWith('u_alice', 50, undefined);
    expect(mocked.requireRecentAuth).toHaveBeenCalled();
  });

  it('change tier goes through setSubscriptionTierWithReauth (re-auth fires)', async () => {
    await openUserModal();
    // The tier select inside the modal defaults to 'free' for this user; pick 'pro'.
    const tierSelect = screen.getByRole('combobox') as HTMLSelectElement;
    await act(async () => {
      fireEvent.change(tierSelect, { target: { value: 'pro' } });
    });
    await waitFor(() => expect(mocked.setSubscriptionTierWithReauth).toHaveBeenCalledTimes(1));
    expect(mocked.setSubscriptionTierWithReauth).toHaveBeenCalledWith('u_alice', 'pro');
    expect(mocked.requireRecentAuth).toHaveBeenCalled();
  });

  it('toggle admin goes through setUserAdminFlagWithReauth (re-auth fires)', async () => {
    await openUserModal();
    await act(async () => {
      fireEvent.click(screen.getByText('Grant admin'));
    });
    await waitFor(() => expect(mocked.setUserAdminFlagWithReauth).toHaveBeenCalledTimes(1));
    expect(mocked.setUserAdminFlagWithReauth).toHaveBeenCalledWith('u_alice', true);
    expect(mocked.requireRecentAuth).toHaveBeenCalled();
  });

  it('rejects the action and surfaces an error if the operator cancels re-auth', async () => {
    mocked.requireRecentAuth.mockRejectedValueOnce(new Error('Re-authentication cancelled.'));
    await openUserModal();
    const ticketAmountInput = screen.getByPlaceholderText('e.g. 5');
    fireEvent.change(ticketAmountInput, { target: { value: '10' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Grant'));
    });
    await waitFor(() => expect(mocked.grantTicketsWithReauth).toHaveBeenCalled());
    // The underlying RPC must NOT have run.
    expect(mocked.grantTickets).not.toHaveBeenCalled();
    // The page surfaces the error message.
    expect(await screen.findByText(/Re-authentication cancelled/)).toBeInTheDocument();
  });
});
