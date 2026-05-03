/**
 * Tests for src/pages/AuthCallback.tsx — Supabase email-link landing page.
 *
 * Covers the full state machine derived from the URL fragment:
 *   - signup       → "Email Verified" passive copy
 *   - magiclink    → "Signed In" passive copy
 *   - recovery     → form, validation, updateUser flow, success state
 *   - error/empty  → friendly messages
 *
 * Supabase auth methods are mocked at module scope so we control the
 * setSession / updateUser / signOut promise resolutions per test.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

void React;

// ── Mocks ────────────────────────────────────────────────────────────
let setSessionImpl: (args: { access_token: string; refresh_token: string }) => Promise<{ error: { message: string } | null }>;
let updateUserImpl: (args: { password: string }) => Promise<{ error: { message: string } | null }>;
let signOutImpl: () => Promise<void>;

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      setSession: (args: { access_token: string; refresh_token: string }) => setSessionImpl(args),
      updateUser: (args: { password: string }) => updateUserImpl(args),
      signOut: () => signOutImpl(),
    },
  },
}));

import AuthCallback from '../../src/pages/AuthCallback';

function renderWithHash(hash: string) {
  // jsdom's location.hash setter triggers hashchange but the page reads
  // window.location.hash synchronously inside deriveInitialState.
  window.history.replaceState(null, '', '/auth/callback' + hash);
  return render(
    <MemoryRouter>
      <AuthCallback />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setSessionImpl = () => Promise.resolve({ error: null });
  updateUserImpl = () => Promise.resolve({ error: null });
  signOutImpl = () => Promise.resolve();
});

afterEach(() => {
  // Reset URL for next test
  window.history.replaceState(null, '', '/');
});

describe('AuthCallback', () => {
  describe('signup verification', () => {
    it('renders the "Email Verified" passive copy', () => {
      renderWithHash('#access_token=abc&refresh_token=def&type=signup');
      expect(screen.getByText(/Email Verified/)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /You.*re verified/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Back to liboworld.com/ })).toHaveAttribute('href', '/');
    });

    it('treats unknown link types with tokens as signup', () => {
      renderWithHash('#access_token=abc&refresh_token=def&type=mystery');
      expect(screen.getByText(/Email Verified/)).toBeInTheDocument();
    });
  });

  describe('magiclink', () => {
    it('renders the "Signed In" passive copy', () => {
      renderWithHash('#access_token=abc&refresh_token=def&type=magiclink');
      expect(screen.getByText(/Signed In/)).toBeInTheDocument();
    });
  });

  describe('error link', () => {
    it('shows the friendly expired message for otp_expired', () => {
      renderWithHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
      expect(screen.getByText(/Link Problem/)).toBeInTheDocument();
      expect(screen.getByText(/expired or already been used/)).toBeInTheDocument();
      expect(screen.getByText(/otp_expired:/)).toBeInTheDocument();
    });

    it('decodes URL-encoded plus signs in the description for unknown errors', () => {
      renderWithHash('#error=oops&error_description=Some+other+thing+went+wrong');
      // Description renders twice: once in the friendly body, once in the
      // technical detail panel. Both should be decoded.
      const matches = screen.getAllByText(/Some other thing went wrong/);
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('shows a generic message when there is no description', () => {
      renderWithHash('#error=oops&error_code=mystery');
      expect(screen.getAllByText(/Something went wrong with this link/).length).toBeGreaterThan(0);
    });
  });

  describe('empty link (no tokens, no error)', () => {
    it('shows "Nothing to confirm"', () => {
      renderWithHash('');
      expect(screen.getByText(/Nothing to confirm/)).toBeInTheDocument();
      expect(screen.getByText(/This link looks broken/)).toBeInTheDocument();
    });

    it('treats only-access-token as empty (refresh required)', () => {
      renderWithHash('#access_token=only');
      expect(screen.getByText(/Nothing to confirm/)).toBeInTheDocument();
    });
  });

  describe('recovery', () => {
    it('shows the verifying-link spinner first, then the form when setSession resolves', async () => {
      // Block setSession until we resolve it manually
      let resolveSession!: (v: { error: null }) => void;
      setSessionImpl = () => new Promise<{ error: null }>((res) => { resolveSession = res; });

      renderWithHash('#access_token=abc&refresh_token=def&type=recovery');

      expect(screen.getByText(/Verifying Link/)).toBeInTheDocument();

      resolveSession({ error: null });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Set a new password/ })).toBeInTheDocument();
      });
    });

    it('errors out if setSession returns an error', async () => {
      setSessionImpl = () => Promise.resolve({ error: { message: 'Token rejected' } });

      renderWithHash('#access_token=abc&refresh_token=def&type=recovery');

      await waitFor(() => {
        expect(screen.getByText(/Link Problem/)).toBeInTheDocument();
      });
      // The error message comes through the friendlyErrorMessage helper which
      // strips "expired/invalid" wording — we just confirm the state transition.
    });

    it('catches a thrown error from setSession', async () => {
      setSessionImpl = () => Promise.reject(new Error('network down'));

      renderWithHash('#access_token=abc&refresh_token=def&type=recovery');

      await waitFor(() => {
        expect(screen.getByText(/Link Problem/)).toBeInTheDocument();
      });
    });

    it('rejects mismatched passwords', async () => {
      const user = userEvent.setup();
      renderWithHash('#access_token=abc&refresh_token=def&type=recovery');

      await screen.findByRole('heading', { name: /Set a new password/ });

      const [pw, confirm] = screen.getAllByPlaceholderText(/At least 8 characters|Re-enter password/);
      await user.type(pw, 'longenough1');
      await user.type(confirm, 'different11');
      await user.click(screen.getByRole('button', { name: /Update password/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/Passwords do not match/);
    });

    it('rejects too-short passwords', async () => {
      const user = userEvent.setup();
      renderWithHash('#access_token=abc&refresh_token=def&type=recovery');
      await screen.findByRole('heading', { name: /Set a new password/ });

      const [pw, confirm] = screen.getAllByPlaceholderText(/At least 8 characters|Re-enter password/);
      await user.type(pw, 'ab1');
      await user.type(confirm, 'ab1');
      // Disable HTML5 validation by submitting via fireEvent — the noValidate
      // attribute is present on the form, so we can submit short values.
      const form = pw.closest('form')!;
      fireEvent.submit(form);

      expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8 characters/);
    });

    it('rejects passwords missing a letter', async () => {
      const user = userEvent.setup();
      renderWithHash('#access_token=abc&refresh_token=def&type=recovery');
      await screen.findByRole('heading', { name: /Set a new password/ });

      const [pw, confirm] = screen.getAllByPlaceholderText(/At least 8 characters|Re-enter password/);
      await user.type(pw, '12345678');
      await user.type(confirm, '12345678');
      await user.click(screen.getByRole('button', { name: /Update password/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/include at least one letter/);
    });

    it('rejects passwords missing a number', async () => {
      const user = userEvent.setup();
      renderWithHash('#access_token=abc&refresh_token=def&type=recovery');
      await screen.findByRole('heading', { name: /Set a new password/ });

      const [pw, confirm] = screen.getAllByPlaceholderText(/At least 8 characters|Re-enter password/);
      await user.type(pw, 'longenough');
      await user.type(confirm, 'longenough');
      await user.click(screen.getByRole('button', { name: /Update password/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/include at least one number/);
    });

    it('shows the "All set" success state after a valid password update', async () => {
      const user = userEvent.setup();
      const updateSpy = vi.fn(() => Promise.resolve({ error: null }));
      const signOutSpy = vi.fn(() => Promise.resolve());
      updateUserImpl = updateSpy;
      signOutImpl = signOutSpy;

      renderWithHash('#access_token=abc&refresh_token=def&type=recovery');
      await screen.findByRole('heading', { name: /Set a new password/ });

      const [pw, confirm] = screen.getAllByPlaceholderText(/At least 8 characters|Re-enter password/);
      await user.type(pw, 'longenough1');
      await user.type(confirm, 'longenough1');
      await user.click(screen.getByRole('button', { name: /Update password/ }));

      await waitFor(() => {
        expect(screen.getByText(/Password Updated/)).toBeInTheDocument();
      });
      expect(updateSpy).toHaveBeenCalledWith({ password: 'longenough1' });
      expect(signOutSpy).toHaveBeenCalled();
    });

    it('returns to the form with the error message when updateUser fails', async () => {
      const user = userEvent.setup();
      updateUserImpl = () => Promise.resolve({ error: { message: 'Password too weak' } });

      renderWithHash('#access_token=abc&refresh_token=def&type=recovery');
      await screen.findByRole('heading', { name: /Set a new password/ });

      const [pw, confirm] = screen.getAllByPlaceholderText(/At least 8 characters|Re-enter password/);
      await user.type(pw, 'longenough1');
      await user.type(confirm, 'longenough1');
      await user.click(screen.getByRole('button', { name: /Update password/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/Password too weak/);
    });

    it('falls back to a generic error when updateUser throws', async () => {
      const user = userEvent.setup();
      updateUserImpl = () => Promise.reject(new Error('boom'));

      renderWithHash('#access_token=abc&refresh_token=def&type=recovery');
      await screen.findByRole('heading', { name: /Set a new password/ });

      const [pw, confirm] = screen.getAllByPlaceholderText(/At least 8 characters|Re-enter password/);
      await user.type(pw, 'longenough1');
      await user.type(confirm, 'longenough1');
      await user.click(screen.getByRole('button', { name: /Update password/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/boom/);
    });

    it('still succeeds even when signOut rejects (password is already set)', async () => {
      const user = userEvent.setup();
      signOutImpl = () => Promise.reject(new Error('logout failed'));

      renderWithHash('#access_token=abc&refresh_token=def&type=recovery');
      await screen.findByRole('heading', { name: /Set a new password/ });

      const [pw, confirm] = screen.getAllByPlaceholderText(/At least 8 characters|Re-enter password/);
      await user.type(pw, 'longenough1');
      await user.type(confirm, 'longenough1');
      await user.click(screen.getByRole('button', { name: /Update password/ }));

      await waitFor(() => {
        expect(screen.getByText(/Password Updated/)).toBeInTheDocument();
      });
    });
  });

  describe('document title', () => {
    it('sets and clears the title across navigations', () => {
      const { unmount } = renderWithHash('#access_token=abc&refresh_token=def&type=signup');
      expect(document.title).toBe('Auth | Libo');
      unmount();
      expect(document.title).toBe('Libo');
    });
  });
});
