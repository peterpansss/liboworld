/**
 * Tests for src/pages/admin/AdminGuard.tsx.
 *
 * Verifies the four-state machine:
 *   - loading → "Loading…"
 *   - unauthenticated → renders AdminLogin (no children)
 *   - authenticated-not-admin → renders AdminLogin with deniedReason
 *   - admin → renders children
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

void React;

let nextSession: any = null;
let nextIsAdmin = false;
let authChangeCb: ((event: string, session: any) => void) | null = null;

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: nextSession } }),
      onAuthStateChange: (cb: any) => {
        authChangeCb = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  },
}));

vi.mock('../../src/lib/adminApi', () => ({
  getCurrentUserIsAdmin: () => Promise.resolve(nextIsAdmin),
}));

// Stub out AdminLogin so we can detect it without rendering its heavy form.
vi.mock('../../src/pages/admin/AdminLogin', () => ({
  AdminLogin: ({ deniedReason }: { deniedReason?: string | null }) => (
    <div data-testid="admin-login">
      AdminLogin{deniedReason ? `:${deniedReason}` : ''}
    </div>
  ),
}));

import { AdminGuard } from '../../src/pages/admin/AdminGuard';

beforeEach(() => {
  nextSession = null;
  nextIsAdmin = false;
  authChangeCb = null;
});

describe('AdminGuard', () => {
  it('shows Loading… initially', () => {
    render(<AdminGuard><div>protected</div></AdminGuard>);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it('renders AdminLogin when there is no session', async () => {
    nextSession = null;
    render(<AdminGuard><div>protected</div></AdminGuard>);
    await waitFor(() => {
      expect(screen.getByTestId('admin-login')).toBeInTheDocument();
    });
    expect(screen.queryByText('protected')).not.toBeInTheDocument();
  });

  it('renders AdminLogin with deniedReason when authenticated but not admin', async () => {
    nextSession = { user: { id: 'u1' } };
    nextIsAdmin = false;
    render(<AdminGuard><div>protected</div></AdminGuard>);
    await waitFor(() => {
      expect(screen.getByText(/Not an admin account/)).toBeInTheDocument();
    });
  });

  it('renders children when the user is an admin', async () => {
    nextSession = { user: { id: 'u_admin' } };
    nextIsAdmin = true;
    render(<AdminGuard><div data-testid="protected">protected</div></AdminGuard>);
    await waitFor(() => {
      expect(screen.getByTestId('protected')).toBeInTheDocument();
    });
  });

  it('re-runs the admin check on auth state change', async () => {
    nextSession = null;
    render(<AdminGuard><div data-testid="protected">protected</div></AdminGuard>);
    await waitFor(() => {
      expect(screen.getByTestId('admin-login')).toBeInTheDocument();
    });

    nextSession = { user: { id: 'u_admin' } };
    nextIsAdmin = true;
    authChangeCb?.('SIGNED_IN', { user: { id: 'u_admin' } });

    await waitFor(() => {
      expect(screen.getByTestId('protected')).toBeInTheDocument();
    });
  });
});
