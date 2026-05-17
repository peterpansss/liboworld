/**
 * Tests for src/pages/admin/ReferralCodesPage.tsx.
 *
 * Verifies:
 *   - load + render rows
 *   - validation: code regex (3-20 alnum), boost multiplier 1-10, boost_days 0-90
 *   - create / edit dispatch normalised input
 *   - delete (with confirm) calls deleteReferralCode
 *   - active toggle calls updateReferralCode({active: !active})
 *   - apply filters dispatches refresh with payload (search/type/active)
 *   - conversions panel loads when editing existing row
 *   - user picker opens, searches, and selects
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

void React;

const listMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const listConversionsMock = vi.fn();
const listUsersMock = vi.fn();

vi.mock('../../src/lib/adminApi', () => ({
  listReferralCodes: (...a: unknown[]) => listMock(...a),
  createReferralCode: (...a: unknown[]) => createMock(...a),
  updateReferralCode: (...a: unknown[]) => updateMock(...a),
  // Page imports the *WithReauth wrapper under the original name.
  deleteReferralCodeWithReauth: (...a: unknown[]) => deleteMock(...a),
  listConversionsForCode: (...a: unknown[]) => listConversionsMock(...a),
  listUsers: (...a: unknown[]) => listUsersMock(...a),
}));

import { ReferralCodesPage } from '../../src/pages/admin/ReferralCodesPage';

/** Find the input rendered immediately after a Field label. */
function fieldInput(labelText: string): HTMLInputElement | HTMLSelectElement {
  const labels = Array.from(document.querySelectorAll('label')) as HTMLLabelElement[];
  const label = labels.find((l) => l.textContent?.trim() === labelText);
  if (!label) throw new Error(`Field label not found: ${labelText}`);
  let next: ChildNode | null = label.nextSibling;
  while (next && next.nodeType !== 1) next = next.nextSibling;
  const direct = next as HTMLElement | null;
  if (!direct) throw new Error(`No element after label: ${labelText}`);
  if (direct.tagName === 'INPUT' || direct.tagName === 'SELECT') return direct as any;
  const inner = direct.querySelector('input, select') as any;
  if (!inner) throw new Error(`No input found after label: ${labelText}`);
  return inner;
}

const code = (o: Partial<any> = {}) => ({
  id: 'rc-1',
  code: 'WELCOME100',
  owner_user_id: null,
  code_type: 'user',
  bonus_points_referee: 100,
  bonus_points_referrer: 100,
  boost_multiplier: 1,
  boost_days: 0,
  max_uses: null,
  uses_count: 5,
  expires_at: null,
  active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...o,
});

beforeEach(() => {
  listMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
  listConversionsMock.mockReset();
  listUsersMock.mockReset();
  listConversionsMock.mockResolvedValue([]);
});

describe('ReferralCodesPage', () => {
  it('loads + renders rows', async () => {
    listMock.mockResolvedValue([code()]);
    render(<ReferralCodesPage />);
    await waitFor(() => expect(screen.getByText('WELCOME100')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
  });

  it('list error surfaces', async () => {
    listMock.mockRejectedValue(new Error('list_failed'));
    render(<ReferralCodesPage />);
    await waitFor(() => expect(screen.getByText('list_failed')).toBeInTheDocument());
  });

  it('apply filters dispatches refresh with payload', async () => {
    listMock.mockResolvedValue([]);
    render(<ReferralCodesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));

    const search = document.querySelector('input[placeholder="e.g. WELCOME100"]') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'WELCOME' } });
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'creator' } });
    fireEvent.change(selects[1], { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply filters/ }));

    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
    expect(listMock.mock.calls[1][0]).toEqual({ search: 'WELCOME', codeType: 'creator', active: true });
  });

  it('Enter key in search input applies filters', async () => {
    listMock.mockResolvedValue([]);
    render(<ReferralCodesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    const search = document.querySelector('input[placeholder="e.g. WELCOME100"]') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'X' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  });

  it('"+ New code" opens create modal', async () => {
    listMock.mockResolvedValue([]);
    render(<ReferralCodesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New code/ }));
    await waitFor(() => expect(screen.getByText('New referral code')).toBeInTheDocument());
  });

  it('validation: invalid code (under 3 chars) rejects', async () => {
    listMock.mockResolvedValue([]);
    render(<ReferralCodesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New code/ }));
    await waitFor(() => expect(screen.getByText('New referral code')).toBeInTheDocument());

    document.querySelectorAll('input[required]').forEach((el) => el.removeAttribute('required'));
    const codeInput = document.querySelector('input[placeholder="e.g. WELCOME100"]') as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: 'AB' } });
    fireEvent.click(screen.getByRole('button', { name: /Create code/ }));
    await waitFor(() => expect(screen.getByText('Code must be 3–20 alphanumeric characters.')).toBeInTheDocument());
  });

  it('validation: boost multiplier > 10 rejects', async () => {
    listMock.mockResolvedValue([]);
    render(<ReferralCodesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New code/ }));
    await waitFor(() => expect(screen.getByText('New referral code')).toBeInTheDocument());

    document.querySelectorAll('input[required], input[min], input[max]').forEach((el) => {
      el.removeAttribute('required');
      el.removeAttribute('min');
      el.removeAttribute('max');
    });
    fireEvent.change(fieldInput('Code'), { target: { value: 'WELCOME' } });
    fireEvent.change(fieldInput('Boost multiplier'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Create code/ }));
    await waitFor(() => expect(screen.getByText('Boost multiplier must be between 1.0 and 10.0.')).toBeInTheDocument());
  });

  it('validation: boost_days > 90 rejects', async () => {
    listMock.mockResolvedValue([]);
    render(<ReferralCodesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New code/ }));
    await waitFor(() => expect(screen.getByText('New referral code')).toBeInTheDocument());

    document.querySelectorAll('input[required], input[min], input[max]').forEach((el) => {
      el.removeAttribute('required');
      el.removeAttribute('min');
      el.removeAttribute('max');
    });
    fireEvent.change(fieldInput('Code'), { target: { value: 'WELCOME' } });
    fireEvent.change(fieldInput('Boost days'), { target: { value: '180' } });
    fireEvent.click(screen.getByRole('button', { name: /Create code/ }));
    await waitFor(() => expect(screen.getByText('Boost days must be between 0 and 90.')).toBeInTheDocument());
  });

  it('successful create dispatches createReferralCode with normalized input', async () => {
    listMock.mockResolvedValue([]);
    createMock.mockResolvedValue({ id: 'new' });
    render(<ReferralCodesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New code/ }));
    await waitFor(() => expect(screen.getByText('New referral code')).toBeInTheDocument());
    document.querySelectorAll('input').forEach((el) => {
      el.removeAttribute('required');
      el.removeAttribute('min');
      el.removeAttribute('max');
    });

    fireEvent.change(fieldInput('Code'), { target: { value: 'WELCOME100' } });

    fireEvent.click(screen.getByRole('button', { name: /Create code/ }));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    const input = createMock.mock.calls[0][0];
    expect(input.code).toBe('WELCOME100');
    expect(input.code_type).toBe('user');
    expect(input.owner_user_id).toBeNull();
    expect(input.boost_multiplier).toBe(1);
    expect(input.boost_days).toBe(0);
    expect(input.active).toBe(true);
  });

  it('opens edit modal with row data + loads conversions', async () => {
    listMock.mockResolvedValue([code()]);
    listConversionsMock.mockResolvedValue([
      { id: 'c1', code: 'WELCOME100', referrer_user_id: 'u1', referee_user_id: 'u2', bonus_points_referrer: 100, bonus_points_referee: 100, boost_multiplier_applied: 1, boost_days_applied: 0, converted_at: '2025-01-15T00:00:00Z' },
    ]);
    render(<ReferralCodesPage />);
    await waitFor(() => expect(screen.getByText('WELCOME100')).toBeInTheDocument());
    fireEvent.click(screen.getByText('WELCOME100'));
    await waitFor(() => expect(screen.getByText('Edit referral code')).toBeInTheDocument());
    await waitFor(() => expect(listConversionsMock).toHaveBeenCalledWith('WELCOME100'));
    await waitFor(() => expect(screen.getByText(/1 total/)).toBeInTheDocument());
  });

  it('successful edit dispatches updateReferralCode', async () => {
    listMock.mockResolvedValue([code()]);
    updateMock.mockResolvedValue({});
    render(<ReferralCodesPage />);
    await waitFor(() => expect(screen.getByText('WELCOME100')).toBeInTheDocument());
    fireEvent.click(screen.getByText('WELCOME100'));
    await waitFor(() => expect(screen.getByText('Edit referral code')).toBeInTheDocument());

    const numInputs = document.querySelectorAll('input[type="number"]');
    fireEvent.change(numInputs[0], { target: { value: '500' } }); // bonus_points_referee

    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock.mock.calls[0][0]).toBe('rc-1');
    expect(updateMock.mock.calls[0][1].bonus_points_referee).toBe(500);
  });

  it('delete confirms + calls deleteReferralCode', async () => {
    listMock.mockResolvedValue([code()]);
    deleteMock.mockResolvedValue(undefined);
    const c = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ReferralCodesPage />);
    await waitFor(() => expect(screen.getByText('WELCOME100')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/Delete WELCOME100/));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('rc-1'));
    c.mockRestore();
  });

  it('delete cancel = no-op', async () => {
    listMock.mockResolvedValue([code()]);
    const c = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ReferralCodesPage />);
    await waitFor(() => expect(screen.getByText('WELCOME100')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/Delete WELCOME100/));
    expect(deleteMock).not.toHaveBeenCalled();
    c.mockRestore();
  });

  it('active toggle calls updateReferralCode', async () => {
    listMock.mockResolvedValue([code({ active: true })]);
    updateMock.mockResolvedValue({});
    render(<ReferralCodesPage />);
    await waitFor(() => expect(screen.getByText('WELCOME100')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Active' }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith('rc-1', { active: false }));
  });

  it('user picker: opens, searches, and selecting calls onSelect', async () => {
    listMock.mockResolvedValue([]);
    listUsersMock.mockResolvedValue([
      { id: 'u-12345678abc', email: 'alice@x.com', name: 'Alice', tier: 'pro', signup_at: null, last_sign_in_at: null, goal: null, activity_level: null, experience: null, days_per_week: null, is_admin: false, profile_created_at: null, profile_updated_at: null, subscription_status: null, subscription_expires_at: null, points: 0, tickets: 0, workout_count: 0, last_workout_at: null },
    ]);
    render(<ReferralCodesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New code/ }));
    await waitFor(() => expect(screen.getByText('New referral code')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Assign to user/ }));
    await waitFor(() => expect(listUsersMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Alice'));
    // After select, the picker switches to "selected" view with the name visible
    await waitFor(() => expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument());
  });

  it('save error surfaces in form banner', async () => {
    listMock.mockResolvedValue([code()]);
    updateMock.mockRejectedValue(new Error('save_failed'));
    render(<ReferralCodesPage />);
    await waitFor(() => expect(screen.getByText('WELCOME100')).toBeInTheDocument());
    fireEvent.click(screen.getByText('WELCOME100'));
    await waitFor(() => expect(screen.getByText('Edit referral code')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));
    await waitFor(() => expect(screen.getByText('save_failed')).toBeInTheDocument());
  });

  it('toggle active error surfaces in page banner', async () => {
    listMock.mockResolvedValue([code({ active: true })]);
    updateMock.mockRejectedValue(new Error('toggle_failed'));
    render(<ReferralCodesPage />);
    await waitFor(() => expect(screen.getByText('WELCOME100')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Active' }));
    await waitFor(() => expect(screen.getByText('toggle_failed')).toBeInTheDocument());
  });
});
