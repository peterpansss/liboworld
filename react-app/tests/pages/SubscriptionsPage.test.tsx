/**
 * Tests for src/pages/admin/SubscriptionsPage.tsx.
 *
 * The Subscriptions page exposes a single sensitive action: setSubscriptionTier.
 * It MUST go through setSubscriptionTierWithReauth so the operator is
 * re-challenged before subscription state changes.
 *
 * Mock strategy mirrors UsersPage.test.tsx / PayoutsPage.test.tsx: expose
 * BOTH the wrapped and un-wrapped names, the wrapper forwards to a
 * requireRecentAuth spy and then to the un-wrapped spy. Tests assert the
 * wrapped variant fired and that the gate ran first.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

void React;

const USER_FIXTURES = [
  {
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
  },
];

vi.mock('../../src/lib/adminApi', () => {
  const requireRecentAuthSpy = vi.fn(async () => {});
  const setSubscriptionTierSpy = vi.fn(async () => {});
  const setSubscriptionTierWithReauthSpy = vi.fn(async (...args: unknown[]) => {
    await requireRecentAuthSpy();
    return setSubscriptionTierSpy(...args);
  });

  return {
    listUsers: vi.fn(async () => USER_FIXTURES),
    // BOTH variants exposed; SubscriptionsPage imports the wrapped one as
    // `setSubscriptionTierWithReauth as setSubscriptionTier`.
    setSubscriptionTier: setSubscriptionTierSpy,
    setSubscriptionTierWithReauth: setSubscriptionTierWithReauthSpy,
    requireRecentAuth: requireRecentAuthSpy,
  };
});

import * as adminApi from '../../src/lib/adminApi';
import { SubscriptionsPage } from '../../src/pages/admin/SubscriptionsPage';

const mocked = adminApi as unknown as {
  listUsers: ReturnType<typeof vi.fn>;
  setSubscriptionTier: ReturnType<typeof vi.fn>;
  setSubscriptionTierWithReauth: ReturnType<typeof vi.fn>;
  requireRecentAuth: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  mocked.listUsers.mockClear();
  mocked.listUsers.mockImplementation(async () => USER_FIXTURES);
  mocked.setSubscriptionTier.mockClear();
  mocked.setSubscriptionTier.mockImplementation(async () => {});
  mocked.setSubscriptionTierWithReauth.mockClear();
  mocked.requireRecentAuth.mockClear();
  mocked.requireRecentAuth.mockImplementation(async () => {});
});

describe('SubscriptionsPage - list', () => {
  it('loads users and renders rows', async () => {
    render(<SubscriptionsPage />);
    await waitFor(() => expect(mocked.listUsers).toHaveBeenCalled());
    expect(await screen.findByText('Alice')).toBeInTheDocument();
  });

  it('surfaces a list error banner when listUsers throws', async () => {
    mocked.listUsers.mockRejectedValueOnce(new Error('rls denied'));
    render(<SubscriptionsPage />);
    expect(await screen.findByText(/rls denied/)).toBeInTheDocument();
  });
});

describe('SubscriptionsPage - re-auth gate on tier save', () => {
  it('save tier goes through setSubscriptionTierWithReauth (re-auth fires)', async () => {
    render(<SubscriptionsPage />);
    await waitFor(() => expect(mocked.listUsers).toHaveBeenCalled());
    await screen.findByText('Alice');

    // Per row Save button. Only one row in the fixture so getByRole works.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    await waitFor(() => expect(mocked.setSubscriptionTierWithReauth).toHaveBeenCalledTimes(1));
    expect(mocked.setSubscriptionTierWithReauth).toHaveBeenCalledWith('u_alice', 'free', null);
    expect(mocked.requireRecentAuth).toHaveBeenCalled();
    expect(mocked.setSubscriptionTier).toHaveBeenCalledTimes(1);
    // Order: requireRecentAuth before the underlying RPC.
    const reauthOrder = mocked.requireRecentAuth.mock.invocationCallOrder[0];
    const rpcOrder = mocked.setSubscriptionTier.mock.invocationCallOrder[0];
    expect(reauthOrder).toBeLessThan(rpcOrder);
  });

  it('aborts and shows the row error when the operator cancels re-auth', async () => {
    mocked.requireRecentAuth.mockRejectedValueOnce(new Error('Re-authentication cancelled.'));
    render(<SubscriptionsPage />);
    await waitFor(() => expect(mocked.listUsers).toHaveBeenCalled());
    await screen.findByText('Alice');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    await waitFor(() => expect(mocked.setSubscriptionTierWithReauth).toHaveBeenCalled());
    // The actual RPC must NOT have fired.
    expect(mocked.setSubscriptionTier).not.toHaveBeenCalled();
    // Row-level error message visible.
    expect(await screen.findByText(/Re-authentication cancelled/)).toBeInTheDocument();
  });
});
