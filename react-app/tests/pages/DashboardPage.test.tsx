/**
 * Tests for src/pages/admin/DashboardPage.tsx.
 *
 * Verifies:
 *   - initial loading state shows em-dash placeholders + Loading… subtitle
 *   - successful KPI fetch renders all 8 tiles with formatted numbers
 *   - error state renders error banner and keeps tiles as em-dashes
 *   - Refresh button calls fetchDashboardKpis again
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

void React;

const fetchKpisMock = vi.fn();

vi.mock('../../src/lib/adminApi', () => ({
  fetchDashboardKpis: () => fetchKpisMock(),
}));

import { DashboardPage } from '../../src/pages/admin/DashboardPage';

const fakeKpis = {
  total_users: 1234,
  workouts_today: 56,
  workouts_7d: 789,
  active_giveaways: 3,
  tickets_issued_7d: 4321,
  points_awarded_7d: 9876,
  pro_subscribers: 42,
  workouts_30d: 2500,
};

beforeEach(() => {
  fetchKpisMock.mockReset();
});

describe('DashboardPage', () => {
  it('shows em-dash placeholders and Loading… while fetching', async () => {
    let resolve!: (v: typeof fakeKpis) => void;
    fetchKpisMock.mockReturnValue(new Promise<typeof fakeKpis>((r) => { resolve = r; }));
    render(<DashboardPage />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    resolve(fakeKpis);
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });
  });

  it('renders all 8 KPI tiles with formatted numbers on success', async () => {
    fetchKpisMock.mockResolvedValue(fakeKpis);
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });
    expect(screen.getByText('Total users')).toBeInTheDocument();
    expect(screen.getByText('Workouts today')).toBeInTheDocument();
    expect(screen.getByText('56')).toBeInTheDocument();
    expect(screen.getByText('789')).toBeInTheDocument();
    expect(screen.getByText('Active giveaways')).toBeInTheDocument();
    expect(screen.getByText('4,321')).toBeInTheDocument();
    expect(screen.getByText('9,876')).toBeInTheDocument();
    expect(screen.getByText('Pro subscribers')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('2,500')).toBeInTheDocument();
    // Last updated should show
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  it('shows the error banner when fetch fails', async () => {
    fetchKpisMock.mockRejectedValue(new Error('boom'));
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('boom')).toBeInTheDocument();
    });
    // Tiles still render but as em-dashes
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('Refresh button re-fetches KPIs', async () => {
    fetchKpisMock.mockResolvedValue(fakeKpis);
    render(<DashboardPage />);
    await waitFor(() => {
      expect(fetchKpisMock).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
    await waitFor(() => {
      expect(fetchKpisMock).toHaveBeenCalledTimes(2);
    });
  });
});
