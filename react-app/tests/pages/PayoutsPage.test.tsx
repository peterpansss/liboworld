/**
 * Tests for src/pages/admin/PayoutsPage.tsx.
 *
 * The Payouts page exposes a single sensitive action: markPayoutPaid. It
 * MUST be invoked through markPayoutPaidWithReauth so that the operator is
 * re-challenged before money moves.
 *
 * Mock strategy mirrors UsersPage.test.tsx: expose BOTH the wrapped and
 * un-wrapped names, have the wrapper forward to a requireRecentAuth spy and
 * then to the un-wrapped spy. Tests assert the wrapped variant fired and
 * the gate ran first.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

void React;

const PAYOUT_FIXTURE = {
  id: 'p_1',
  enrollment_id: 'enr_1',
  cycle_id: 'cyc_1',
  challenge_id: 'ch_1',
  challenge_title: 'June 2025 Challenge',
  user_id: 'u_alice',
  user_email: 'alice@example.com',
  amount: 100,
  currency: 'EUR',
  status: 'pending' as const,
  payment_method: null,
  payment_reference: null,
  payee_email: null,
  payee_iban: null,
  payee_country: null,
  cycle_start_date: '2025-06-01',
  cycle_end_date: '2025-06-30',
  created_at: '2025-07-01T00:00:00Z',
  processed_at: null,
  paid_at: null,
  failed_at: null,
  failure_reason: null,
};

vi.mock('../../src/lib/adminApi', () => {
  const requireRecentAuthSpy = vi.fn(async () => {});
  const markPayoutPaidSpy = vi.fn(async () => {});
  const markPayoutPaidWithReauthSpy = vi.fn(async (...args: unknown[]) => {
    await requireRecentAuthSpy();
    return markPayoutPaidSpy(...args);
  });

  return {
    listChallengePayouts: vi.fn(async () => [PAYOUT_FIXTURE]),
    // BOTH variants exposed; the page imports the wrapped one via
    // `markPayoutPaidWithReauth as markPayoutPaid`. Existing call sites
    // continue to read like `markPayoutPaid(...)` but actually invoke the
    // gated wrapper.
    markPayoutPaid: markPayoutPaidSpy,
    markPayoutPaidWithReauth: markPayoutPaidWithReauthSpy,
    requireRecentAuth: requireRecentAuthSpy,
  };
});

import * as adminApi from '../../src/lib/adminApi';
import { PayoutsPage } from '../../src/pages/admin/PayoutsPage';

const mocked = adminApi as unknown as {
  listChallengePayouts: ReturnType<typeof vi.fn>;
  markPayoutPaid: ReturnType<typeof vi.fn>;
  markPayoutPaidWithReauth: ReturnType<typeof vi.fn>;
  requireRecentAuth: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  mocked.listChallengePayouts.mockClear();
  mocked.listChallengePayouts.mockImplementation(async () => [PAYOUT_FIXTURE]);
  mocked.markPayoutPaid.mockClear();
  mocked.markPayoutPaid.mockImplementation(async () => {});
  mocked.markPayoutPaidWithReauth.mockClear();
  mocked.requireRecentAuth.mockClear();
  mocked.requireRecentAuth.mockImplementation(async () => {});
});

async function openPayoutModal() {
  render(<PayoutsPage />);
  await waitFor(() => expect(mocked.listChallengePayouts).toHaveBeenCalled());
  // The challenge title is the easiest unique string to find the row by.
  const titleCell = await screen.findByText('June 2025 Challenge');
  fireEvent.click(titleCell.closest('tr')!);
  // Wait for the form to mount (the "Mark as paid" submit button).
  await screen.findByText('Mark as paid');
}

async function fillAndSubmitForm() {
  const referenceInput = screen.getByPlaceholderText(/Wise transferId/);
  fireEvent.change(referenceInput, { target: { value: 'TX-12345' } });
  await act(async () => {
    fireEvent.click(screen.getByText('Mark as paid'));
  });
}

describe('PayoutsPage - list', () => {
  it('loads payouts and renders the row', async () => {
    render(<PayoutsPage />);
    await waitFor(() => expect(mocked.listChallengePayouts).toHaveBeenCalled());
    expect(await screen.findByText('June 2025 Challenge')).toBeInTheDocument();
  });

  it('shows an error banner when listChallengePayouts throws', async () => {
    mocked.listChallengePayouts.mockRejectedValueOnce(new Error('rpc denied'));
    render(<PayoutsPage />);
    expect(await screen.findByText(/rpc denied/)).toBeInTheDocument();
  });
});

describe('PayoutsPage - re-auth gate on mark-as-paid', () => {
  it('mark as paid goes through markPayoutPaidWithReauth (re-auth fires)', async () => {
    await openPayoutModal();
    await fillAndSubmitForm();

    await waitFor(() => expect(mocked.markPayoutPaidWithReauth).toHaveBeenCalledTimes(1));
    expect(mocked.markPayoutPaidWithReauth).toHaveBeenCalledWith(
      'p_1',
      expect.objectContaining({
        payment_method: 'wise',
        payment_reference: 'TX-12345',
      }),
    );
    expect(mocked.requireRecentAuth).toHaveBeenCalled();
    expect(mocked.markPayoutPaid).toHaveBeenCalledTimes(1);
    // Order: requireRecentAuth before the underlying RPC.
    const reauthOrder = mocked.requireRecentAuth.mock.invocationCallOrder[0];
    const rpcOrder = mocked.markPayoutPaid.mock.invocationCallOrder[0];
    expect(reauthOrder).toBeLessThan(rpcOrder);
  });

  it('aborts and surfaces an error when the operator cancels re-auth', async () => {
    mocked.requireRecentAuth.mockRejectedValueOnce(new Error('Re-authentication cancelled.'));
    await openPayoutModal();
    await fillAndSubmitForm();

    await waitFor(() => expect(mocked.markPayoutPaidWithReauth).toHaveBeenCalled());
    // The actual RPC must NOT have run.
    expect(mocked.markPayoutPaid).not.toHaveBeenCalled();
    // The form surfaces the error message.
    expect(await screen.findByText(/Re-authentication cancelled/)).toBeInTheDocument();
  });
});
