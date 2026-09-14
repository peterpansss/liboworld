/**
 * Tests for src/pages/admin/AdminGuard.tsx.
 *
 * Verifies the four-state machine:
 *   - loading → "Loading…"
 *   - unauthenticated → renders AdminLogin (no children)
 *   - authenticated-not-admin → renders AdminLogin with deniedReason
 *   - admin → renders children
 *
 * Plus the MFA hard-redirect: when getAdminMfaStatus returns must_enrol:true
 * the user is redirected to /admin/mfa (and is NOT redirected when already
 * sitting on that route — i.e. no infinite loop).
 *
 * And the AAL2 gate (LIBO-02): admin content only renders once the session is
 * aal2 (or aal1 with no verified factor — the enrol case). An aal1 session with
 * a verified factor, or an AAL read error, is held on the step-up screen.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { AdminMfaStatus, SessionAalInfo } from '../../src/lib/adminApi';

void React;

type FakeSession = { user: { id: string } } | null;

let nextSession: FakeSession = null;
let nextIsAdmin = false;
let nextMfaStatus: AdminMfaStatus = { is_admin: true, mfa_enrolled: true, must_enrol: false };
let nextMfaShouldThrow = false;
let nextAal: SessionAalInfo = { level: 'aal2', hasVerifiedFactor: true, error: false };
const stepUpMock = vi.fn(() => new Promise<boolean>(() => {}));
let authChangeCb: ((event: string, session: FakeSession) => void) | null = null;

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: nextSession } }),
      onAuthStateChange: (cb: (event: string, session: FakeSession) => void) => {
        authChangeCb = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  },
}));

// AdminGuard now does TWO checks AND-combined: profiles.is_admin via SELECT
// (getCurrentUserIsAdmin) AND the is_caller_admin() RPC (isCallerAdminViaRpc).
// The mock returns the same `nextIsAdmin` value for both, simulating a
// consistent backend; the AdminGuard logic correctly fails the gate when
// either disagrees.
vi.mock('../../src/lib/adminApi', () => ({
  getCurrentUserIsAdmin: () => Promise.resolve(nextIsAdmin),
  isCallerAdminViaRpc: () => Promise.resolve(nextIsAdmin),
  getAdminMfaStatus: () =>
    nextMfaShouldThrow
      ? Promise.reject(new Error('RPC missing'))
      : Promise.resolve(nextMfaStatus),
  getSessionAal: () => Promise.resolve(nextAal),
  stepUpAdminSessionToAal2: () => stepUpMock(),
  signOutAdmin: () => Promise.resolve(),
}));

// ReauthModal is mounted inside the admin tree and listens for re-auth
// prompts from sensitive RPC wrappers. For these guard tests we don't
// exercise it, so render a no-op stub.
vi.mock('../../src/components/admin/ReauthModal', () => ({
  ReauthModal: () => null,
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

// Small helper: render the guard inside a MemoryRouter so useLocation /
// <Navigate> work. A second <Route path="/admin/mfa"> renders a sentinel so
// we can assert the redirect target without standing up the real MfaPage.
function renderGuard(children: React.ReactNode, initialPath = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/admin/mfa"
          element={
            <AdminGuard>
              <LocationProbe testId="mfa-route-target" />
            </AdminGuard>
          }
        />
        <Route path="/admin/*" element={<AdminGuard>{children}</AdminGuard>} />
      </Routes>
    </MemoryRouter>,
  );
}

function LocationProbe({ testId }: { testId: string }) {
  const { pathname } = useLocation();
  return <div data-testid={testId}>{pathname}</div>;
}

beforeEach(() => {
  nextSession = null;
  nextIsAdmin = false;
  nextMfaStatus = { is_admin: true, mfa_enrolled: true, must_enrol: false };
  nextMfaShouldThrow = false;
  nextAal = { level: 'aal2', hasVerifiedFactor: true, error: false };
  stepUpMock.mockClear();
  authChangeCb = null;
});

describe('AdminGuard', () => {
  it('shows Loading… initially', () => {
    renderGuard(<div>protected</div>);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it('renders AdminLogin when there is no session', async () => {
    nextSession = null;
    renderGuard(<div>protected</div>);
    await waitFor(() => {
      expect(screen.getByTestId('admin-login')).toBeInTheDocument();
    });
    expect(screen.queryByText('protected')).not.toBeInTheDocument();
  });

  it('renders AdminLogin with deniedReason when authenticated but not admin', async () => {
    nextSession = { user: { id: 'u1' } };
    nextIsAdmin = false;
    renderGuard(<div>protected</div>);
    await waitFor(() => {
      expect(screen.getByText(/Not an admin account/)).toBeInTheDocument();
    });
  });

  it('renders children when the user is an admin', async () => {
    nextSession = { user: { id: 'u_admin' } };
    nextIsAdmin = true;
    renderGuard(<div data-testid="protected">protected</div>);
    await waitFor(() => {
      expect(screen.getByTestId('protected')).toBeInTheDocument();
    });
  });

  it('re-runs the admin check on auth state change', async () => {
    nextSession = null;
    renderGuard(<div data-testid="protected">protected</div>);
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

  it('redirects admin to /admin/mfa when must_enrol is true', async () => {
    nextSession = { user: { id: 'u_admin' } };
    nextIsAdmin = true;
    nextMfaStatus = {
      is_admin: true,
      mfa_enrolled: false,
      must_enrol: true,
      grace_days_remaining: 0,
    };
    renderGuard(<div data-testid="protected">protected</div>, '/admin');
    await waitFor(() => {
      expect(screen.getByTestId('mfa-route-target')).toHaveTextContent('/admin/mfa');
    });
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('does NOT redirect when already on /admin/mfa (no infinite loop)', async () => {
    nextSession = { user: { id: 'u_admin' } };
    nextIsAdmin = true;
    nextMfaStatus = {
      is_admin: true,
      mfa_enrolled: false,
      must_enrol: true,
      grace_days_remaining: 0,
    };
    renderGuard(<div data-testid="protected">protected</div>, '/admin/mfa');
    await waitFor(() => {
      expect(screen.getByTestId('mfa-route-target')).toBeInTheDocument();
    });
    // Sentinel stays mounted, no flapping.
    expect(screen.getByTestId('mfa-route-target')).toHaveTextContent('/admin/mfa');
  });

  it('fails CLOSED (redirects to /admin/mfa) when getAdminMfaStatus RPC is missing', async () => {
    // LIBO-02 (54ced56): an unavailable MFA-status RPC can no longer wave the
    // admin through — enrolment is forced instead.
    nextSession = { user: { id: 'u_admin' } };
    nextIsAdmin = true;
    nextMfaShouldThrow = true;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderGuard(<div data-testid="protected">protected</div>);
    await waitFor(() => {
      expect(screen.getByTestId('mfa-route-target')).toHaveTextContent('/admin/mfa');
    });
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('holds an aal1 session with a verified factor on the step-up screen', async () => {
    nextSession = { user: { id: 'u_admin' } };
    nextIsAdmin = true;
    nextAal = { level: 'aal1', hasVerifiedFactor: true, error: false };
    renderGuard(<div data-testid="protected">protected</div>);
    await waitFor(() => {
      expect(screen.getByText('Two-factor required')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
    await waitFor(() => expect(stepUpMock).toHaveBeenCalled());
  });

  it('fails closed to the step-up screen when the AAL cannot be read', async () => {
    nextSession = { user: { id: 'u_admin' } };
    nextIsAdmin = true;
    nextAal = { level: null, hasVerifiedFactor: false, error: true };
    renderGuard(<div data-testid="protected">protected</div>);
    await waitFor(() => {
      expect(screen.getByText('Two-factor required')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('lets an aal1 session with no verified factor through (enrol/grace case)', async () => {
    nextSession = { user: { id: 'u_admin' } };
    nextIsAdmin = true;
    nextAal = { level: 'aal1', hasVerifiedFactor: false, error: false };
    renderGuard(<div data-testid="protected">protected</div>);
    await waitFor(() => {
      expect(screen.getByTestId('protected')).toBeInTheDocument();
    });
  });
});
