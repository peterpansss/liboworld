/**
 * Tests for src/pages/admin/ChallengesPage.tsx.
 *
 * Verifies:
 *   - load + render rows + active count
 *   - error banner on load failure
 *   - validation: id, title/description, exercises selected, reps/days > 0
 *   - successful create / edit dispatch normalised input
 *   - delete: confirms (different prompt for total_ever > 0); cancel = no-op
 *   - exercise option toggle adds/removes
 *   - refresh re-fetches
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

vi.mock('../../src/lib/adminApi', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/adminApi')>('../../src/lib/adminApi');
  return {
    EXERCISE_OPTION_CATALOG: actual.EXERCISE_OPTION_CATALOG,
    listMoneyChallenges: () => listMock(),
    createMoneyChallenge: (...a: unknown[]) => createMock(...a),
    updateMoneyChallenge: (...a: unknown[]) => updateMock(...a),
    // Page imports the *WithReauth wrapper under the original name.
    deleteMoneyChallengeWithReauth: (...a: unknown[]) => deleteMock(...a),
  };
});

import { ChallengesPage } from '../../src/pages/admin/ChallengesPage';

/** Find the input/textarea/select rendered immediately after a Field label. */
function fieldInput(labelText: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const labels = Array.from(document.querySelectorAll('label')) as HTMLLabelElement[];
  const label = labels.find((l) => l.textContent?.trim() === labelText);
  if (!label) throw new Error(`Field label not found: ${labelText}`);
  // Field renders <label>Text</label> then the children div containing the input.
  let next: ChildNode | null = label.nextSibling;
  while (next && next.nodeType !== 1) next = next.nextSibling;
  // The input is either the very next sibling (TextInput) or inside it.
  const direct = next as HTMLElement | null;
  if (!direct) throw new Error(`No element after label: ${labelText}`);
  if (direct.tagName === 'INPUT' || direct.tagName === 'TEXTAREA' || direct.tagName === 'SELECT') {
    return direct as any;
  }
  const inner = direct.querySelector('input, textarea, select') as HTMLInputElement | null;
  if (!inner) throw new Error(`No input found after label: ${labelText}`);
  return inner;
}

const mc = (o: Partial<any> = {}) => ({
  id: 'pushup_50_30d_v1',
  title: '50 pushups, 30 days',
  description: 'Do 50 pushups every day for 30 days',
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
  current_active: 5,
  total_ever: 10,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...o,
});

beforeEach(() => {
  listMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

describe('ChallengesPage', () => {
  it('loads + renders rows + active count', async () => {
    listMock.mockResolvedValue([mc(), mc({ id: 'b', title: 'B', is_active: false })]);
    render(<ChallengesPage />);
    await waitFor(() => expect(screen.getByText('50 pushups, 30 days')).toBeInTheDocument());
    expect(screen.getByText(/2 total · 1 active/)).toBeInTheDocument();
  });

  it('error banner on load failure', async () => {
    listMock.mockRejectedValue(new Error('lst_fail'));
    render(<ChallengesPage />);
    await waitFor(() => expect(screen.getByText('lst_fail')).toBeInTheDocument());
  });

  it('opens create modal via "+ New challenge"', async () => {
    listMock.mockResolvedValue([]);
    render(<ChallengesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New challenge/ }));
    await waitFor(() => expect(screen.getByText('New challenge')).toBeInTheDocument());
  });

  it('validation: missing id', async () => {
    listMock.mockResolvedValue([]);
    render(<ChallengesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New challenge/ }));
    await waitFor(() => expect(screen.getByText('New challenge')).toBeInTheDocument());
    document.querySelectorAll('input[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    fireEvent.click(screen.getByRole('button', { name: /Create challenge/ }));
    await waitFor(() => expect(screen.getByText(/ID is required/)).toBeInTheDocument());
  });

  it('validation: missing title/description', async () => {
    listMock.mockResolvedValue([]);
    render(<ChallengesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New challenge/ }));
    await waitFor(() => expect(screen.getByText('New challenge')).toBeInTheDocument());
    document.querySelectorAll('input[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    fireEvent.change(document.querySelector('input[placeholder="pushup_50_30d_v1"]') as HTMLInputElement, { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /Create challenge/ }));
    await waitFor(() => expect(screen.getByText('Title and description are required.')).toBeInTheDocument());
  });

  it('validation: no exercises selected', async () => {
    listMock.mockResolvedValue([]);
    render(<ChallengesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New challenge/ }));
    await waitFor(() => expect(screen.getByText('New challenge')).toBeInTheDocument());
    document.querySelectorAll('input[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    fireEvent.change(fieldInput('ID (lowercase, unique)'), { target: { value: 'x' } });
    fireEvent.change(fieldInput('Title'), { target: { value: 'My' } });
    fireEvent.change(fieldInput('Description'), { target: { value: 'My desc' } });
    // Uncheck all exercise checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      const c = cb as HTMLInputElement;
      if (c.checked) fireEvent.click(c);
    });
    fireEvent.click(screen.getByRole('button', { name: /Create challenge/ }));
    await waitFor(() => expect(screen.getByText('Select at least one exercise option.')).toBeInTheDocument());
  });

  it('validation: reps/days <= 0', async () => {
    listMock.mockResolvedValue([]);
    render(<ChallengesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New challenge/ }));
    await waitFor(() => expect(screen.getByText('New challenge')).toBeInTheDocument());
    document.querySelectorAll('input[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    fireEvent.change(fieldInput('ID (lowercase, unique)'), { target: { value: 'x' } });
    fireEvent.change(fieldInput('Title'), { target: { value: 'My' } });
    fireEvent.change(fieldInput('Description'), { target: { value: 'D' } });
    fireEvent.click(screen.getByRole('button', { name: /Create challenge/ }));
    await waitFor(() => expect(screen.getByText('Reps per day and total days must be > 0.')).toBeInTheDocument());
  });

  it('successful create dispatches createMoneyChallenge', async () => {
    listMock.mockResolvedValue([]);
    createMock.mockResolvedValue(undefined);
    render(<ChallengesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New challenge/ }));
    await waitFor(() => expect(screen.getByText('New challenge')).toBeInTheDocument());
    fireEvent.change(fieldInput('ID (lowercase, unique)'), { target: { value: 'newid' } });
    fireEvent.change(fieldInput('Title'), { target: { value: 'My Title' } });
    fireEvent.change(fieldInput('Description'), { target: { value: 'My desc' } });
    fireEvent.change(fieldInput('Reps / day'), { target: { value: '50' } });
    fireEvent.change(fieldInput('Total days'), { target: { value: '30' } });
    fireEvent.change(fieldInput('Reward amount'), { target: { value: '25' } });

    fireEvent.click(screen.getByRole('button', { name: /Create challenge/ }));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    const input = createMock.mock.calls[0][0];
    expect(input.id).toBe('newid');
    expect(input.title).toBe('My Title');
    expect(input.reps_per_day).toBe(50);
    expect(input.total_days).toBe(30);
    expect(input.reward_amount).toBe(25);
    expect(input.reward_currency).toBe('EUR');
    expect(input.max_participants).toBeNull();
  });

  it('successful edit dispatches updateMoneyChallenge', async () => {
    listMock.mockResolvedValue([mc()]);
    updateMock.mockResolvedValue(undefined);
    render(<ChallengesPage />);
    await waitFor(() => expect(screen.getByText('50 pushups, 30 days')).toBeInTheDocument());
    fireEvent.click(screen.getByText('50 pushups, 30 days'));
    await waitFor(() => expect(screen.getByText(/Edit:/)).toBeInTheDocument());

    fireEvent.change(fieldInput('Title'), { target: { value: 'Renamed' } });

    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock.mock.calls[0][0]).toBe('pushup_50_30d_v1');
    expect(updateMock.mock.calls[0][1].title).toBe('Renamed');
  });

  it('save error surfaces in form', async () => {
    listMock.mockResolvedValue([mc()]);
    updateMock.mockRejectedValue(new Error('save_failed'));
    render(<ChallengesPage />);
    await waitFor(() => expect(screen.getByText('50 pushups, 30 days')).toBeInTheDocument());
    fireEvent.click(screen.getByText('50 pushups, 30 days'));
    await waitFor(() => expect(screen.getByText(/Edit:/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));
    await waitFor(() => expect(screen.getByText('save_failed')).toBeInTheDocument());
  });

  it('delete with total_ever > 0 shows the FK warning prompt', async () => {
    listMock.mockResolvedValue([mc({ total_ever: 5 })]);
    deleteMock.mockResolvedValue(undefined);
    const c = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ChallengesPage />);
    await waitFor(() => expect(screen.getByText('50 pushups, 30 days')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Delete'));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('pushup_50_30d_v1'));
    expect(c.mock.calls[0][0]).toMatch(/historical enrollment/);
    c.mockRestore();
  });

  it('delete with total_ever === 0 shows simple confirm prompt', async () => {
    listMock.mockResolvedValue([mc({ total_ever: 0 })]);
    deleteMock.mockResolvedValue(undefined);
    const c = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ChallengesPage />);
    await waitFor(() => expect(screen.getByText('50 pushups, 30 days')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Delete'));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('pushup_50_30d_v1'));
    expect(c.mock.calls[0][0]).toMatch(/Delete "/);
    c.mockRestore();
  });

  it('delete cancel = no-op', async () => {
    listMock.mockResolvedValue([mc({ total_ever: 0 })]);
    const c = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ChallengesPage />);
    await waitFor(() => expect(screen.getByText('50 pushups, 30 days')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Delete'));
    expect(deleteMock).not.toHaveBeenCalled();
    c.mockRestore();
  });

  it('delete error surfaces in page banner', async () => {
    listMock.mockResolvedValue([mc({ total_ever: 0 })]);
    deleteMock.mockRejectedValue(new Error('fk_violation'));
    const c = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ChallengesPage />);
    await waitFor(() => expect(screen.getByText('50 pushups, 30 days')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Delete'));
    await waitFor(() => expect(screen.getByText('fk_violation')).toBeInTheDocument());
    c.mockRestore();
  });

  it('Refresh button reloads', async () => {
    listMock.mockResolvedValue([]);
    render(<ChallengesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  });
});
