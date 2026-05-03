/**
 * Tests for src/pages/admin/AdminLayout.tsx (Shell + nav + sign-out).
 *
 * The Shell component is gated by AdminGuard, but we mock AdminGuard to
 * always render its children so we can test the surrounding layout in
 * isolation. We also stub the lazy-loaded admin pages to lightweight
 * placeholders to keep the suite fast.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

void React;

const navigateMock = vi.fn();
const signOutAdminMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../src/lib/adminApi', () => ({
  signOutAdmin: () => signOutAdminMock(),
}));

vi.mock('../../src/pages/admin/AdminGuard', () => ({
  AdminGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Replace the lazy-loaded pages with cheap placeholders so we don't need to
// mock everything they import.
vi.mock('../../src/pages/admin/DashboardPage', () => ({
  DashboardPage: () => <div data-testid="dash">DashboardPlaceholder</div>,
}));
vi.mock('../../src/pages/admin/GiveawaysPage', () => ({ GiveawaysPage: () => <div /> }));
vi.mock('../../src/pages/admin/GiveawayTemplatesPage', () => ({ GiveawayTemplatesPage: () => <div /> }));
vi.mock('../../src/pages/admin/ReferralCodesPage', () => ({ ReferralCodesPage: () => <div /> }));
vi.mock('../../src/pages/admin/UsersPage', () => ({ UsersPage: () => <div /> }));
vi.mock('../../src/pages/admin/ActivityPage', () => ({ ActivityPage: () => <div /> }));
vi.mock('../../src/pages/admin/SubscriptionsPage', () => ({ SubscriptionsPage: () => <div /> }));
vi.mock('../../src/pages/admin/ExercisesPage', () => ({ ExercisesPage: () => <div /> }));
vi.mock('../../src/pages/admin/WorkoutsPage', () => ({ WorkoutsPage: () => <div /> }));
vi.mock('../../src/pages/admin/ChallengesPage', () => ({ ChallengesPage: () => <div /> }));
vi.mock('../../src/pages/admin/CyclesPage', () => ({ CyclesPage: () => <div /> }));
vi.mock('../../src/pages/admin/PayoutsPage', () => ({ PayoutsPage: () => <div /> }));

import AdminLayout from '../../src/pages/admin/AdminLayout';

beforeEach(() => {
  navigateMock.mockReset();
  signOutAdminMock.mockReset();
});

describe('AdminLayout', () => {
  it('renders the sidebar nav links', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AdminLayout />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId('dash')).toBeInTheDocument();
    });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Exercises')).toBeInTheDocument();
    expect(screen.getByText('Workouts')).toBeInTheDocument();
    expect(screen.getByText('Challenges')).toBeInTheDocument();
    expect(screen.getByText('Cycles')).toBeInTheDocument();
    expect(screen.getByText('Payouts')).toBeInTheDocument();
    expect(screen.getByText('Giveaways')).toBeInTheDocument();
    expect(screen.getByText('Giveaway Templates')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Referral Codes')).toBeInTheDocument();
  });

  it('sets document.title and noindex meta on mount', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AdminLayout />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(document.title).toBe('Libo Admin');
    });
    const meta = document.querySelector('meta[name="robots"]');
    expect(meta?.getAttribute('content')).toBe('noindex,nofollow,noarchive,nosnippet');
  });

  it('Sign out calls signOutAdmin then navigates to /admin', async () => {
    signOutAdminMock.mockResolvedValue(undefined);
    render(
      <MemoryRouter initialEntries={['/']}>
        <AdminLayout />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Sign out'));
    await waitFor(() => {
      expect(signOutAdminMock).toHaveBeenCalledTimes(1);
    });
    expect(navigateMock).toHaveBeenCalledWith('/admin');
  });

  it('cleans up document.title and noindex meta on unmount', async () => {
    const prevTitle = document.title;
    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <AdminLayout />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(document.title).toBe('Libo Admin');
    });
    unmount();
    expect(document.title).toBe(prevTitle);
    // robots meta gets removed because nothing pre-existed in jsdom
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });
});
