/**
 * Tests for src/pages/admin/GiveawaysPage.tsx.
 *
 * Verifies:
 *   - loads list on mount and renders rows + featured badge
 *   - error state surfaces
 *   - clicking a row opens edit modal; create modal opens via "+ New giveaway"
 *   - validation: missing title / prize / dates
 *   - successful create calls createGiveaway with normalized input
 *   - successful edit calls updateGiveaway
 *   - delete button confirms and calls deleteGiveaway
 *   - draw winners confirms and calls drawGiveawayWinners + reloads winners
 *   - upload image flow calls uploadGiveawayImage and updates form.image_url
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

void React;

const listGiveawaysMock = vi.fn();
const createGiveawayMock = vi.fn();
const updateGiveawayMock = vi.fn();
const deleteGiveawayMock = vi.fn();
const drawGiveawayWinnersMock = vi.fn();
const uploadGiveawayImageMock = vi.fn();
const listGiveawayWinnersMock = vi.fn();

vi.mock('../../src/lib/adminApi', () => ({
  listGiveaways: () => listGiveawaysMock(),
  createGiveaway: (...a: unknown[]) => createGiveawayMock(...a),
  updateGiveaway: (...a: unknown[]) => updateGiveawayMock(...a),
  // The page imports the *WithReauth wrappers under the original names;
  // tests assert that the wrapper is invoked. We don't need to exercise
  // the re-auth modal here — it's covered separately in adminApi tests.
  deleteGiveawayWithReauth: (...a: unknown[]) => deleteGiveawayMock(...a),
  drawGiveawayWinnersWithReauth: (...a: unknown[]) => drawGiveawayWinnersMock(...a),
  uploadGiveawayImage: (...a: unknown[]) => uploadGiveawayImageMock(...a),
  listGiveawayWinners: (...a: unknown[]) => listGiveawayWinnersMock(...a),
}));

import { GiveawaysPage } from '../../src/pages/admin/GiveawaysPage';

const sample = (o: Partial<any> = {}) => ({
  id: 'gw-1',
  title: 'April Whey Drop',
  description: 'Win whey',
  prize_description: '1kg Whey',
  image_url: null,
  type: 'common',
  category: 'win',
  status: 'upcoming',
  tickets_per_entry: 1,
  max_entries_per_user: null,
  winner_count: 1,
  starts_at: '2025-04-01T00:00:00Z',
  ends_at: '2025-04-30T00:00:00Z',
  drawn_at: null,
  featured: false,
  created_at: '2025-01-01T00:00:00Z',
  entry_count: 0,
  ...o,
});

beforeEach(() => {
  listGiveawaysMock.mockReset();
  createGiveawayMock.mockReset();
  updateGiveawayMock.mockReset();
  deleteGiveawayMock.mockReset();
  drawGiveawayWinnersMock.mockReset();
  uploadGiveawayImageMock.mockReset();
  listGiveawayWinnersMock.mockReset();
});

describe('GiveawaysPage', () => {
  it('loads and renders rows; featured badge appears', async () => {
    listGiveawaysMock.mockResolvedValue([
      sample({ featured: true }),
      sample({ id: 'gw-2', title: 'May Drop', featured: false }),
    ]);
    render(<GiveawaysPage />);
    await waitFor(() => expect(screen.getByText('April Whey Drop')).toBeInTheDocument());
    expect(screen.getByText('May Drop')).toBeInTheDocument();
    expect(screen.getByText(/Featured/i)).toBeInTheDocument();
  });

  it('shows list error banner', async () => {
    listGiveawaysMock.mockRejectedValue(new Error('list_failed'));
    render(<GiveawaysPage />);
    await waitFor(() => expect(screen.getByText('list_failed')).toBeInTheDocument());
  });

  it('"+ New giveaway" opens the create modal', async () => {
    listGiveawaysMock.mockResolvedValue([]);
    render(<GiveawaysPage />);
    await waitFor(() => expect(listGiveawaysMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New giveaway/i }));
    await waitFor(() => expect(screen.getByText('New giveaway')).toBeInTheDocument());
  });

  it('clicking a row opens the edit modal with row data', async () => {
    listGiveawaysMock.mockResolvedValue([sample()]);
    render(<GiveawaysPage />);
    await waitFor(() => expect(screen.getByText('April Whey Drop')).toBeInTheDocument());
    fireEvent.click(screen.getByText('April Whey Drop'));
    await waitFor(() => expect(screen.getByText('Edit giveaway')).toBeInTheDocument());
    // form populated
    expect((document.querySelector('input[placeholder="e.g. April Protein Powder Drop"]') as HTMLInputElement).value).toBe('April Whey Drop');
  });

  it('completed giveaway loads winners list when opened', async () => {
    listGiveawaysMock.mockResolvedValue([sample({ status: 'completed' })]);
    listGiveawayWinnersMock.mockResolvedValue([{ user_id: 'u1' }]);
    render(<GiveawaysPage />);
    await waitFor(() => expect(screen.getByText('April Whey Drop')).toBeInTheDocument());
    fireEvent.click(screen.getByText('April Whey Drop'));
    await waitFor(() => expect(listGiveawayWinnersMock).toHaveBeenCalledWith('gw-1'));
    await waitFor(() => expect(screen.getByText(/Winners \(1\)/)).toBeInTheDocument());
  });

  it('validation: title missing → form error', async () => {
    listGiveawaysMock.mockResolvedValue([]);
    render(<GiveawaysPage />);
    await waitFor(() => expect(listGiveawaysMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New giveaway/i }));
    await waitFor(() => expect(screen.getByText('New giveaway')).toBeInTheDocument());
    // Bypass HTML5 required
    document.querySelectorAll('input[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    fireEvent.click(screen.getByRole('button', { name: /Create giveaway/i }));
    await waitFor(() => expect(screen.getByText('Title is required.')).toBeInTheDocument());
  });

  it('validation: prize description missing → form error', async () => {
    listGiveawaysMock.mockResolvedValue([]);
    render(<GiveawaysPage />);
    await waitFor(() => expect(listGiveawaysMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New giveaway/i }));
    await waitFor(() => expect(screen.getByText('New giveaway')).toBeInTheDocument());
    document.querySelectorAll('input[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    const titleInput = document.querySelector('input[placeholder="e.g. April Protein Powder Drop"]') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'My Giveaway' } });
    fireEvent.click(screen.getByRole('button', { name: /Create giveaway/i }));
    await waitFor(() => expect(screen.getByText('Prize description is required.')).toBeInTheDocument());
  });

  it('validation: missing dates → form error', async () => {
    listGiveawaysMock.mockResolvedValue([]);
    render(<GiveawaysPage />);
    await waitFor(() => expect(listGiveawaysMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New giveaway/i }));
    await waitFor(() => expect(screen.getByText('New giveaway')).toBeInTheDocument());
    document.querySelectorAll('input[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    fireEvent.change(document.querySelector('input[placeholder="e.g. April Protein Powder Drop"]') as HTMLInputElement, { target: { value: 'X' } });
    fireEvent.change(document.querySelector('input[placeholder="e.g. 1kg tub of Whey Protein"]') as HTMLInputElement, { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: /Create giveaway/i }));
    await waitFor(() => expect(screen.getByText('Start and end dates are required.')).toBeInTheDocument());
  });

  it('successful create calls createGiveaway with normalized input', async () => {
    listGiveawaysMock.mockResolvedValue([]);
    createGiveawayMock.mockResolvedValue({ id: 'new' });
    render(<GiveawaysPage />);
    await waitFor(() => expect(listGiveawaysMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New giveaway/i }));
    await waitFor(() => expect(screen.getByText('New giveaway')).toBeInTheDocument());

    fireEvent.change(document.querySelector('input[placeholder="e.g. April Protein Powder Drop"]') as HTMLInputElement, { target: { value: '  My Giveaway  ' } });
    fireEvent.change(document.querySelector('input[placeholder="e.g. 1kg tub of Whey Protein"]') as HTMLInputElement, { target: { value: 'Big Prize' } });
    const dts = document.querySelectorAll('input[type="datetime-local"]');
    fireEvent.change(dts[0], { target: { value: '2025-04-01T08:00' } });
    fireEvent.change(dts[1], { target: { value: '2025-04-30T20:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Create giveaway/i }));

    await waitFor(() => expect(createGiveawayMock).toHaveBeenCalledTimes(1));
    const input = createGiveawayMock.mock.calls[0][0];
    expect(input.title).toBe('My Giveaway');
    expect(input.prize_description).toBe('Big Prize');
    expect(input.tickets_per_entry).toBe(1);
    expect(input.winner_count).toBe(1);
    expect(input.max_entries_per_user).toBeNull();
    expect(input.starts_at).not.toBe('');
    expect(input.featured).toBe(false);
    // refresh after create
    expect(listGiveawaysMock).toHaveBeenCalledTimes(2);
  });

  it('successful edit calls updateGiveaway with id + patch', async () => {
    listGiveawaysMock.mockResolvedValue([sample()]);
    updateGiveawayMock.mockResolvedValue({ id: 'gw-1' });
    render(<GiveawaysPage />);
    await waitFor(() => expect(screen.getByText('April Whey Drop')).toBeInTheDocument());
    fireEvent.click(screen.getByText('April Whey Drop'));
    await waitFor(() => expect(screen.getByText('Edit giveaway')).toBeInTheDocument());

    const titleInput = document.querySelector('input[placeholder="e.g. April Protein Powder Drop"]') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'April Whey Drop V2' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() => expect(updateGiveawayMock).toHaveBeenCalledWith('gw-1', expect.objectContaining({
      title: 'April Whey Drop V2',
    })));
  });

  it('delete button confirms and calls deleteGiveaway', async () => {
    listGiveawaysMock.mockResolvedValue([sample()]);
    deleteGiveawayMock.mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GiveawaysPage />);
    await waitFor(() => expect(screen.getByText('April Whey Drop')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/Delete April Whey Drop/));
    await waitFor(() => expect(deleteGiveawayMock).toHaveBeenCalledWith('gw-1'));
    confirmSpy.mockRestore();
  });

  it('delete is a no-op when user cancels confirm', async () => {
    listGiveawaysMock.mockResolvedValue([sample()]);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<GiveawaysPage />);
    await waitFor(() => expect(screen.getByText('April Whey Drop')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/Delete April Whey Drop/));
    expect(deleteGiveawayMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('draw winners confirms and calls drawGiveawayWinners then reloads winners', async () => {
    listGiveawaysMock.mockResolvedValue([sample({ status: 'active' })]);
    drawGiveawayWinnersMock.mockResolvedValue(3);
    listGiveawayWinnersMock.mockResolvedValue([{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }]);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GiveawaysPage />);
    await waitFor(() => expect(screen.getByText('April Whey Drop')).toBeInTheDocument());
    fireEvent.click(screen.getByText('April Whey Drop'));
    await waitFor(() => expect(screen.getByText('Edit giveaway')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Draw winners/i }));
    await waitFor(() => expect(drawGiveawayWinnersMock).toHaveBeenCalledWith('gw-1'));
    await waitFor(() => expect(screen.getByText(/Drew 3 winners/)).toBeInTheDocument());
    confirmSpy.mockRestore();
  });

  it('upload image: handleUpload sets image_url from uploadGiveawayImage', async () => {
    listGiveawaysMock.mockResolvedValue([]);
    uploadGiveawayImageMock.mockResolvedValue('https://cdn.libo/img.jpg');
    render(<GiveawaysPage />);
    await waitFor(() => expect(listGiveawaysMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New giveaway/i }));
    await waitFor(() => expect(screen.getByText('New giveaway')).toBeInTheDocument());

    const file = new File(['xx'], 'img.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    await waitFor(() => expect(uploadGiveawayImageMock).toHaveBeenCalledWith(file));
    await waitFor(() => {
      const url = (document.querySelector('input[placeholder="https://…"]') as HTMLInputElement).value;
      expect(url).toBe('https://cdn.libo/img.jpg');
    });
  });

  it('upload image error surfaces in form error banner', async () => {
    listGiveawaysMock.mockResolvedValue([]);
    uploadGiveawayImageMock.mockRejectedValue(new Error('too_big'));
    render(<GiveawaysPage />);
    await waitFor(() => expect(listGiveawaysMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New giveaway/i }));
    await waitFor(() => expect(screen.getByText('New giveaway')).toBeInTheDocument());

    const file = new File(['xx'], 'img.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    await waitFor(() => expect(screen.getByText('too_big')).toBeInTheDocument());
  });

  it('save error surfaces in form error banner', async () => {
    listGiveawaysMock.mockResolvedValue([sample()]);
    updateGiveawayMock.mockRejectedValue(new Error('save_failed'));
    render(<GiveawaysPage />);
    await waitFor(() => expect(screen.getByText('April Whey Drop')).toBeInTheDocument());
    fireEvent.click(screen.getByText('April Whey Drop'));
    await waitFor(() => expect(screen.getByText('Edit giveaway')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));
    await waitFor(() => expect(screen.getByText('save_failed')).toBeInTheDocument());
  });
});
