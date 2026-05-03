/**
 * Tests for src/pages/admin/SubscriptionsPage.tsx.
 *
 * Verifies:
 *   - loads users + populates rows that have a tier
 *   - falls back to all rows when none have a tier set
 *   - changing the tier select + clicking Save calls setSubscriptionTier
 *   - Refresh re-calls listUsers
 *   - listUsers error surfaces
 *   - setSubscriptionTier error surfaces in row
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

void React;

const listUsersMock = vi.fn();
const setSubscriptionTierMock = vi.fn();

vi.mock('../../src/lib/adminApi', () => ({
  listUsers: (...a: unknown[]) => listUsersMock(...a),
  setSubscriptionTier: (...a: unknown[]) => setSubscriptionTierMock(...a),
}));

import { SubscriptionsPage } from '../../src/pages/admin/SubscriptionsPage';

const baseUser = {
  id: 'u1',
  email: 'alice@example.com',
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
  tier: 'pro' as const,
  subscription_status: 'active',
  subscription_expires_at: '2030-01-15T00:00:00Z',
  points: 0,
  tickets: 0,
  workout_count: 0,
  last_workout_at: null,
};

beforeEach(() => {
  listUsersMock.mockReset();
  setSubscriptionTierMock.mockReset();
});

describe('SubscriptionsPage', () => {
  it('renders only rows with a tier when at least one has one', async () => {
    listUsersMock.mockResolvedValue([
      baseUser,
      { ...baseUser, id: 'u2', name: 'Bob', email: 'bob@example.com', tier: null, subscription_expires_at: null },
    ]);
    render(<SubscriptionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('falls back to showing all users when none have a tier', async () => {
    listUsersMock.mockResolvedValue([
      { ...baseUser, id: 'u3', name: 'Carla', email: 'c@x.com', tier: null, subscription_expires_at: null },
      { ...baseUser, id: 'u4', name: 'Dan', email: 'd@x.com', tier: null, subscription_expires_at: null },
    ]);
    render(<SubscriptionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Carla')).toBeInTheDocument();
    });
    expect(screen.getByText('Dan')).toBeInTheDocument();
  });

  it('shows error banner if listUsers throws', async () => {
    listUsersMock.mockRejectedValue(new Error('list_failed'));
    render(<SubscriptionsPage />);
    await waitFor(() => {
      expect(screen.getByText('list_failed')).toBeInTheDocument();
    });
  });

  it('Save calls setSubscriptionTier with the chosen tier and reloads', async () => {
    listUsersMock.mockResolvedValue([baseUser]);
    setSubscriptionTierMock.mockResolvedValue(undefined);
    render(<SubscriptionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'elite' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(setSubscriptionTierMock).toHaveBeenCalledTimes(1);
    });
    expect(setSubscriptionTierMock.mock.calls[0][0]).toBe('u1');
    expect(setSubscriptionTierMock.mock.calls[0][1]).toBe('elite');
    // success message
    await waitFor(() => {
      expect(listUsersMock).toHaveBeenCalledTimes(2);
    });
  });

  it('shows row error when setSubscriptionTier rejects', async () => {
    listUsersMock.mockResolvedValue([baseUser]);
    setSubscriptionTierMock.mockRejectedValue(new Error('save_failed'));
    render(<SubscriptionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.getByText('save_failed')).toBeInTheDocument();
    });
  });

  it('Refresh button re-loads users', async () => {
    listUsersMock.mockResolvedValue([baseUser]);
    render(<SubscriptionsPage />);
    await waitFor(() => {
      expect(listUsersMock).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    await waitFor(() => {
      expect(listUsersMock).toHaveBeenCalledTimes(2);
    });
  });

  it('renders "never" for users without an expiration date', async () => {
    listUsersMock.mockResolvedValue([
      { ...baseUser, id: 'u5', name: 'Eli', tier: 'free' as const, subscription_expires_at: null },
    ]);
    render(<SubscriptionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Eli')).toBeInTheDocument();
    });
    expect(screen.getByText('never')).toBeInTheDocument();
  });

  it('handles invalid expiration ISO gracefully', async () => {
    listUsersMock.mockResolvedValue([
      { ...baseUser, id: 'u6', name: 'Faye', tier: 'free' as const, subscription_expires_at: 'not-a-date' },
    ]);
    render(<SubscriptionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Faye')).toBeInTheDocument();
    });
    expect(screen.getByText('never')).toBeInTheDocument();
  });

  it('updating expiration datetime is reflected in setSubscriptionTier call', async () => {
    listUsersMock.mockResolvedValue([baseUser]);
    setSubscriptionTierMock.mockResolvedValue(undefined);
    render(<SubscriptionsPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    const dt = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(dt, { target: { value: '2030-06-15T12:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(setSubscriptionTierMock).toHaveBeenCalled();
    });
    const expiresIso = setSubscriptionTierMock.mock.calls[0][2];
    expect(expiresIso).not.toBeNull();
    expect(typeof expiresIso).toBe('string');
  });
});
