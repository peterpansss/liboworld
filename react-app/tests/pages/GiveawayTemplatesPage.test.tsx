/**
 * Tests for src/pages/admin/GiveawayTemplatesPage.tsx.
 *
 * Verifies:
 *   - loads + renders rows with day labels
 *   - error state surfaces
 *   - delete confirms + calls deleteGiveawayTemplate
 *   - active toggle calls updateGiveawayTemplate({active: !active})
 *   - validation: title / prize / draw_time required
 *   - create + edit dispatch normalised input
 *   - prize/header upload handlers update the right slot
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
const uploadMock = vi.fn();

vi.mock('../../src/lib/adminApi', () => ({
  listGiveawayTemplates: () => listMock(),
  createGiveawayTemplate: (...a: unknown[]) => createMock(...a),
  updateGiveawayTemplate: (...a: unknown[]) => updateMock(...a),
  // Page imports the *WithReauth wrapper under the original name.
  deleteGiveawayTemplateWithReauth: (...a: unknown[]) => deleteMock(...a),
  uploadGiveawayImage: (...a: unknown[]) => uploadMock(...a),
}));

import { GiveawayTemplatesPage } from '../../src/pages/admin/GiveawayTemplatesPage';

const tpl = (o: Partial<any> = {}) => ({
  id: 't-1',
  title: 'Weekly Whey',
  subtitle: 'Mondays',
  prize_description: '1kg whey',
  prize_image_url: null,
  image_url: null,
  type: 'common',
  day_of_week: 1,
  draw_time_utc: '18:00:00',
  duration_days: 7,
  tickets_per_entry: 1,
  max_entries_per_user: null,
  winner_count: 1,
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
  uploadMock.mockReset();
});

describe('GiveawayTemplatesPage', () => {
  it('loads + renders rows with day label and time', async () => {
    listMock.mockResolvedValue([tpl()]);
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(screen.getByText('Weekly Whey')).toBeInTheDocument());
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('18:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
  });

  it('list error banner surfaces', async () => {
    listMock.mockRejectedValue(new Error('lst_fail'));
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(screen.getByText('lst_fail')).toBeInTheDocument());
  });

  it('delete confirms and calls deleteGiveawayTemplate', async () => {
    listMock.mockResolvedValue([tpl()]);
    deleteMock.mockResolvedValue(undefined);
    const c = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(screen.getByText('Weekly Whey')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/Delete Weekly Whey/));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('t-1'));
    c.mockRestore();
  });

  it('active toggle calls updateGiveawayTemplate({active: !active})', async () => {
    listMock.mockResolvedValue([tpl({ active: true })]);
    updateMock.mockResolvedValue({});
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(screen.getByText('Weekly Whey')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Active' }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith('t-1', { active: false }));
  });

  it('toggle error surfaces in list error banner', async () => {
    listMock.mockResolvedValue([tpl({ active: true })]);
    updateMock.mockRejectedValue(new Error('toggle_failed'));
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(screen.getByText('Weekly Whey')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Active' }));
    await waitFor(() => expect(screen.getByText('toggle_failed')).toBeInTheDocument());
  });

  it('clicking row opens edit modal with existing values', async () => {
    listMock.mockResolvedValue([tpl()]);
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(screen.getByText('Weekly Whey')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Weekly Whey'));
    await waitFor(() => expect(screen.getByText('Edit template')).toBeInTheDocument());
  });

  it('validation: title required', async () => {
    listMock.mockResolvedValue([]);
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New template/ }));
    await waitFor(() => expect(screen.getByText('New template')).toBeInTheDocument());
    document.querySelectorAll('input[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    fireEvent.click(screen.getByRole('button', { name: /Create template/ }));
    await waitFor(() => expect(screen.getByText('Title is required.')).toBeInTheDocument());
  });

  it('validation: prize description required', async () => {
    listMock.mockResolvedValue([]);
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New template/ }));
    await waitFor(() => expect(screen.getByText('New template')).toBeInTheDocument());
    document.querySelectorAll('input[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    fireEvent.change(document.querySelector('input[placeholder="e.g. Weekly Whey Drop"]') as HTMLInputElement, { target: { value: 'My Tpl' } });
    fireEvent.click(screen.getByRole('button', { name: /Create template/ }));
    await waitFor(() => expect(screen.getByText('Prize description is required.')).toBeInTheDocument());
  });

  it('validation: draw_time required', async () => {
    listMock.mockResolvedValue([]);
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New template/ }));
    await waitFor(() => expect(screen.getByText('New template')).toBeInTheDocument());
    document.querySelectorAll('input[required], textarea[required]').forEach((el) => el.removeAttribute('required'));
    fireEvent.change(document.querySelector('input[placeholder="e.g. Weekly Whey Drop"]') as HTMLInputElement, { target: { value: 'My Tpl' } });
    fireEvent.change(document.querySelector('input[placeholder="e.g. 1kg tub of Whey Protein"]') as HTMLInputElement, { target: { value: 'Big' } });
    const time = document.querySelector('input[type="time"]') as HTMLInputElement;
    fireEvent.change(time, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Create template/ }));
    await waitFor(() => expect(screen.getByText('Draw time is required.')).toBeInTheDocument());
  });

  it('successful create dispatches normalized input with HH:MM:SS time', async () => {
    listMock.mockResolvedValue([]);
    createMock.mockResolvedValue({ id: 't-new' });
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New template/ }));
    await waitFor(() => expect(screen.getByText('New template')).toBeInTheDocument());
    fireEvent.change(document.querySelector('input[placeholder="e.g. Weekly Whey Drop"]') as HTMLInputElement, { target: { value: 'My Tpl' } });
    fireEvent.change(document.querySelector('input[placeholder="e.g. 1kg tub of Whey Protein"]') as HTMLInputElement, { target: { value: 'Big Prize' } });
    fireEvent.click(screen.getByRole('button', { name: /Create template/ }));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    const input = createMock.mock.calls[0][0];
    expect(input.title).toBe('My Tpl');
    expect(input.prize_description).toBe('Big Prize');
    expect(input.draw_time_utc).toBe('18:00:00');
    expect(input.day_of_week).toBe(1);
    expect(input.tickets_per_entry).toBe(1);
    expect(input.duration_days).toBe(7);
    expect(input.active).toBe(true);
  });

  it('successful edit dispatches updateGiveawayTemplate with id + patch', async () => {
    listMock.mockResolvedValue([tpl()]);
    updateMock.mockResolvedValue({});
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(screen.getByText('Weekly Whey')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Weekly Whey'));
    await waitFor(() => expect(screen.getByText('Edit template')).toBeInTheDocument());

    fireEvent.change(document.querySelector('input[placeholder="e.g. Weekly Whey Drop"]') as HTMLInputElement, { target: { value: 'Weekly Whey V2' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith('t-1', expect.objectContaining({ title: 'Weekly Whey V2' })));
  });

  it('prize image upload sets prize_image_url; header upload sets image_url', async () => {
    listMock.mockResolvedValue([]);
    uploadMock.mockResolvedValueOnce('https://cdn/prize.jpg').mockResolvedValueOnce('https://cdn/header.jpg');
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New template/ }));
    await waitFor(() => expect(screen.getByText('New template')).toBeInTheDocument());

    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBe(2);

    const f1 = new File(['x'], 'p.png', { type: 'image/png' });
    Object.defineProperty(fileInputs[0], 'files', { value: [f1] });
    fireEvent.change(fileInputs[0]);
    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1));

    const f2 = new File(['x'], 'h.png', { type: 'image/png' });
    Object.defineProperty(fileInputs[1], 'files', { value: [f2] });
    fireEvent.change(fileInputs[1]);
    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(2));

    // Both URL inputs populated
    const urlInputs = document.querySelectorAll('input[placeholder="https://…"]') as NodeListOf<HTMLInputElement>;
    expect(urlInputs[0].value).toBe('https://cdn/prize.jpg');
    expect(urlInputs[1].value).toBe('https://cdn/header.jpg');
  });

  it('upload error surfaces in form error', async () => {
    listMock.mockResolvedValue([]);
    uploadMock.mockRejectedValue(new Error('too_big'));
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /New template/ }));
    await waitFor(() => expect(screen.getByText('New template')).toBeInTheDocument());
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [new File(['x'], 'p.png', { type: 'image/png' })] });
    fireEvent.change(fileInput);
    await waitFor(() => expect(screen.getByText('too_big')).toBeInTheDocument());
  });

  it('save error surfaces in form error banner', async () => {
    listMock.mockResolvedValue([tpl()]);
    updateMock.mockRejectedValue(new Error('save_failed'));
    render(<GiveawayTemplatesPage />);
    await waitFor(() => expect(screen.getByText('Weekly Whey')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Weekly Whey'));
    await waitFor(() => expect(screen.getByText('Edit template')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));
    await waitFor(() => expect(screen.getByText('save_failed')).toBeInTheDocument());
  });
});
