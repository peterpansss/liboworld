/**
 * Tests for src/pages/admin/PayoutsPage.tsx.
 *
 * Verifies:
 *   - initial load with status=pending
 *   - changing status filter triggers refetch
 *   - clicking a pending row opens the actionable modal; paid row → read-only
 *   - validation: missing reference / too-short reference
 *   - successful submit calls markPayoutPaid with normalized input
 *   - markPayoutPaid error surfaces in form
 *   - listChallengePayouts error surfaces in page banner
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

void React;

const listMock = vi.fn();
const markPaidMock = vi.fn();

vi.mock('../../src/lib/adminApi', () => ({
  listChallengePayouts: (...a: unknown[]) => listMock(...a),
  markPayoutPaid: (...a: unknown[]) => markPaidMock(...a),
}));

import { PayoutsPage } from '../../src/pages/admin/PayoutsPage';

const payout = (o: Partial<any> = {}) => ({
  id: 'p-1',
  enrollment_id: 'e-1',
  cycle_id: 'c-1',
  challenge_id: 'ch-1',
  challenge_title: '30-Day Pushup',
  user_id: 'u-12345678abc',
  user_email: 'user@example.com',
  amount: 50,
  currency: 'EUR',
  status: 'pending',
  payment_method: null,
  payment_reference: null,
  payee_email: null,
  payee_iban: null,
  payee_country: null,
  cycle_start_date: '2025-04-01',
  cycle_end_date: '2025-04-30',
  created_at: new Date(Date.now() - 60 * 1000).toISOString(),
  processed_at: null,
  paid_at: null,
  failed_at: null,
  failure_reason: null,
  ...o,
});

beforeEach(() => {
  listMock.mockReset();
  markPaidMock.mockReset();
});

describe('PayoutsPage', () => {
  it('loads pending payouts on mount and renders rows', async () => {
    listMock.mockResolvedValue([payout()]);
    render(<PayoutsPage />);
    await waitFor(() => expect(screen.getByText('30-Day Pushup')).toBeInTheDocument());
    expect(listMock).toHaveBeenCalledWith('pending');
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getAllByText(/€50.00/).length).toBeGreaterThan(0);
  });

  it('shows page error banner if listChallengePayouts throws', async () => {
    listMock.mockRejectedValue(new Error('list_failed'));
    render(<PayoutsPage />);
    await waitFor(() => expect(screen.getByText('list_failed')).toBeInTheDocument());
  });

  it('changing status filter triggers refetch with new status', async () => {
    listMock.mockResolvedValue([]);
    render(<PayoutsPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'paid' } });
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
    expect(listMock).toHaveBeenLastCalledWith('paid');
  });

  it('"All" status filter calls listChallengePayouts(null)', async () => {
    listMock.mockResolvedValue([]);
    render(<PayoutsPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '' } });
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
    expect(listMock).toHaveBeenLastCalledWith(null);
  });

  it('clicking a pending row opens the actionable modal', async () => {
    listMock.mockResolvedValue([payout()]);
    render(<PayoutsPage />);
    await waitFor(() => expect(screen.getByText('30-Day Pushup')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('30-Day Pushup')[0]);
    await waitFor(() => expect(screen.getByText(/Pay out €50.00 to user@example.com/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Mark as paid/i })).toBeInTheDocument();
  });

  it('clicking a paid row opens the read-only details', async () => {
    listMock.mockResolvedValue([
      payout({ status: 'paid', paid_at: '2025-05-01T00:00:00Z', payment_method: 'wise', payment_reference: 'WISE-XYZ' }),
    ]);
    render(<PayoutsPage />);
    await waitFor(() => expect(screen.getByText('30-Day Pushup')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('30-Day Pushup')[0]);
    await waitFor(() => expect(screen.getByText(/Payout · €50.00 · user@example.com/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Mark as paid/i })).not.toBeInTheDocument();
    // Both the Modal × close and the read-only "Close" button are in the doc
    expect(screen.getAllByRole('button', { name: /Close/i }).length).toBeGreaterThan(0);
  });

  it('validation: missing reference shows error', async () => {
    listMock.mockResolvedValue([payout()]);
    render(<PayoutsPage />);
    await waitFor(() => expect(screen.getByText('30-Day Pushup')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('30-Day Pushup')[0]);
    await waitFor(() => expect(screen.getByText(/Pay out/)).toBeInTheDocument());
    document.querySelectorAll('input[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    fireEvent.click(screen.getByRole('button', { name: /Mark as paid/i }));
    await waitFor(() => expect(screen.getByText(/min 3 chars/)).toBeInTheDocument());
    expect(markPaidMock).not.toHaveBeenCalled();
  });

  it('validation: short reference (< 3 chars) shows error', async () => {
    listMock.mockResolvedValue([payout()]);
    render(<PayoutsPage />);
    await waitFor(() => expect(screen.getByText('30-Day Pushup')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('30-Day Pushup')[0]);
    await waitFor(() => expect(screen.getByText(/Pay out/)).toBeInTheDocument());
    document.querySelectorAll('input[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    const ref = document.querySelector('input[placeholder*="Wise transferId"]') as HTMLInputElement;
    fireEvent.change(ref, { target: { value: 'ab' } });
    fireEvent.click(screen.getByRole('button', { name: /Mark as paid/i }));
    await waitFor(() => expect(screen.getByText(/min 3 chars/)).toBeInTheDocument());
  });

  it('successful submit calls markPayoutPaid with normalized input', async () => {
    listMock.mockResolvedValue([payout()]);
    markPaidMock.mockResolvedValue(undefined);
    render(<PayoutsPage />);
    await waitFor(() => expect(screen.getByText('30-Day Pushup')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('30-Day Pushup')[0]);
    await waitFor(() => expect(screen.getByText(/Pay out/)).toBeInTheDocument());

    const ref = document.querySelector('input[placeholder*="Wise transferId"]') as HTMLInputElement;
    fireEvent.change(ref, { target: { value: '  WISE-ABC-123  ' } });
    const country = document.querySelector('input[placeholder="DE"]') as HTMLInputElement;
    fireEvent.change(country, { target: { value: 'de' } });
    const email = document.querySelector('input[type="email"]') as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'p@x.com' } });

    fireEvent.click(screen.getByRole('button', { name: /Mark as paid/i }));

    await waitFor(() => expect(markPaidMock).toHaveBeenCalledTimes(1));
    expect(markPaidMock.mock.calls[0][0]).toBe('p-1');
    const input = markPaidMock.mock.calls[0][1];
    expect(input.payment_method).toBe('wise');
    expect(input.payment_reference).toBe('WISE-ABC-123');
    expect(input.payee_country).toBe('DE');
    expect(input.payee_email).toBe('p@x.com');
    expect(input.payee_iban).toBeNull();
  });

  it('markPayoutPaid error surfaces in form', async () => {
    listMock.mockResolvedValue([payout()]);
    markPaidMock.mockRejectedValue(new Error('reauth_required'));
    render(<PayoutsPage />);
    await waitFor(() => expect(screen.getByText('30-Day Pushup')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('30-Day Pushup')[0]);
    await waitFor(() => expect(screen.getByText(/Pay out/)).toBeInTheDocument());

    const ref = document.querySelector('input[placeholder*="Wise transferId"]') as HTMLInputElement;
    fireEvent.change(ref, { target: { value: 'WISE-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Mark as paid/i }));

    await waitFor(() => expect(screen.getByText('reauth_required')).toBeInTheDocument());
  });

  it('Cancel inside actionable modal closes it', async () => {
    listMock.mockResolvedValue([payout()]);
    render(<PayoutsPage />);
    await waitFor(() => expect(screen.getByText('30-Day Pushup')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('30-Day Pushup')[0]);
    await waitFor(() => expect(screen.getByText(/Pay out/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText(/Pay out/)).not.toBeInTheDocument());
  });

  it('subtitle counts pending/paid and totals', async () => {
    listMock.mockResolvedValue([
      payout({ id: 'a', status: 'pending', amount: 30 }),
      payout({ id: 'b', status: 'pending', amount: 20 }),
      payout({ id: 'c', status: 'paid', amount: 100 }),
    ]);
    render(<PayoutsPage />);
    await waitFor(() => expect(screen.getByText(/2 pending · 1 paid · €50.00 owed · €100.00 paid out/)).toBeInTheDocument());
  });

  it('refresh button reloads', async () => {
    listMock.mockResolvedValue([]);
    render(<PayoutsPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  });

  it('formatAmount renders USD/GBP/UNK currencies', async () => {
    listMock.mockResolvedValue([
      payout({ id: 'a', currency: 'USD', amount: 25 }),
      payout({ id: 'b', currency: 'GBP', amount: 25 }),
      payout({ id: 'c', currency: 'JPY', amount: 25 }),
    ]);
    render(<PayoutsPage />);
    await waitFor(() => expect(screen.getByText('$25.00')).toBeInTheDocument());
    expect(screen.getByText('£25.00')).toBeInTheDocument();
    expect(screen.getByText('JPY 25.00')).toBeInTheDocument();
  });
});
