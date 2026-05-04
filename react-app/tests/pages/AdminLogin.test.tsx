/**
 * Tests for src/pages/admin/AdminLogin.tsx.
 *
 * Verifies:
 *   - submit succeeds → onSignedIn invoked
 *   - rate-limit "locked" branch surfaces minutes message
 *   - rate-limit "rate_limited" branch surfaces "Slow down" message
 *   - generic ok=false (no known error) surfaces "Sign-in temporarily unavailable"
 *   - sign-in failure records failure + surfaces auth error
 *   - empty email/password show validation errors
 *   - describePasswordPolicyError returns first error or null
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

void React;

const checkAdminLoginAllowedMock = vi.fn();
const signInAdminMock = vi.fn();
const recordAdminLoginFailureMock = vi.fn();
const validatePasswordPolicyMock = vi.fn();

vi.mock('../../src/lib/adminApi', () => ({
  checkAdminLoginAllowed: (...args: unknown[]) => checkAdminLoginAllowedMock(...args),
  signInAdmin: (...args: unknown[]) => signInAdminMock(...args),
  recordAdminLoginFailure: (...args: unknown[]) => recordAdminLoginFailureMock(...args),
  validatePasswordPolicy: (...args: unknown[]) => validatePasswordPolicyMock(...args),
}));

import { AdminLogin, describePasswordPolicyError } from '../../src/pages/admin/AdminLogin';

beforeEach(() => {
  checkAdminLoginAllowedMock.mockReset();
  signInAdminMock.mockReset();
  recordAdminLoginFailureMock.mockReset();
  validatePasswordPolicyMock.mockReset();
});

const fillLogin = (email: string, password: string) => {
  const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
  const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
  fireEvent.change(emailInput, { target: { value: email } });
  fireEvent.change(passwordInput, { target: { value: password } });
};

describe('AdminLogin', () => {
  it('renders deniedReason on first paint', () => {
    render(<AdminLogin onSignedIn={() => {}} deniedReason="Not an admin account" />);
    expect(screen.getByText(/Not an admin account/)).toBeInTheDocument();
  });

  it('successful sign-in invokes onSignedIn', async () => {
    checkAdminLoginAllowedMock.mockResolvedValue({ ok: true });
    signInAdminMock.mockResolvedValue(undefined);
    const onSignedIn = vi.fn();
    render(<AdminLogin onSignedIn={onSignedIn} deniedReason={null} />);
    fillLogin('admin@libo.app', 'CorrectHorseBattery1!');
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await waitFor(() => {
      expect(onSignedIn).toHaveBeenCalledTimes(1);
    });
    expect(checkAdminLoginAllowedMock).toHaveBeenCalledWith('admin@libo.app');
    expect(signInAdminMock).toHaveBeenCalledWith('admin@libo.app', 'CorrectHorseBattery1!');
  });

  it('shows lockout message when gate.error === "locked"', async () => {
    checkAdminLoginAllowedMock.mockResolvedValue({ ok: false, error: 'locked', retry_after_seconds: 600 });
    const onSignedIn = vi.fn();
    render(<AdminLogin onSignedIn={onSignedIn} deniedReason={null} />);
    fillLogin('a@b.com', 'pw');
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/Too many failed sign-ins.*10 min/)).toBeInTheDocument();
    });
    expect(signInAdminMock).not.toHaveBeenCalled();
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it('lockout falls back to default 15min when retry_after missing', async () => {
    checkAdminLoginAllowedMock.mockResolvedValue({ ok: false, error: 'locked' });
    render(<AdminLogin onSignedIn={() => {}} deniedReason={null} />);
    fillLogin('a@b.com', 'pw');
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/Too many failed sign-ins.*15 min/)).toBeInTheDocument();
    });
  });

  it('shows "Slow down" message when gate.error === "rate_limited"', async () => {
    checkAdminLoginAllowedMock.mockResolvedValue({ ok: false, error: 'rate_limited' });
    render(<AdminLogin onSignedIn={() => {}} deniedReason={null} />);
    fillLogin('a@b.com', 'pw');
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/Slow down/)).toBeInTheDocument();
    });
  });

  it('shows generic unavailable message for unknown gate error', async () => {
    checkAdminLoginAllowedMock.mockResolvedValue({ ok: false, error: 'something_else' });
    render(<AdminLogin onSignedIn={() => {}} deniedReason={null} />);
    fillLogin('a@b.com', 'pw');
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/Sign-in temporarily unavailable/)).toBeInTheDocument();
    });
  });

  it('records the failure and shows the auth error on bad credentials', async () => {
    checkAdminLoginAllowedMock.mockResolvedValue({ ok: true });
    signInAdminMock.mockRejectedValue(new Error('Invalid login credentials'));
    recordAdminLoginFailureMock.mockResolvedValue(undefined);
    render(<AdminLogin onSignedIn={() => {}} deniedReason={null} />);
    fillLogin('  admin@libo.app  ', 'wrong');
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });
    // trimmed
    expect(recordAdminLoginFailureMock).toHaveBeenCalledWith('admin@libo.app');
  });

  it('still surfaces auth error if recordAdminLoginFailure rejects', async () => {
    checkAdminLoginAllowedMock.mockResolvedValue({ ok: true });
    signInAdminMock.mockRejectedValue(new Error('Invalid login credentials'));
    recordAdminLoginFailureMock.mockRejectedValue(new Error('rpc-down'));
    render(<AdminLogin onSignedIn={() => {}} deniedReason={null} />);
    fillLogin('admin@libo.app', 'wrong');
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });
  });

  it('rejects empty email', async () => {
    render(<AdminLogin onSignedIn={() => {}} deniedReason={null} />);
    // bypass HTML5 required by removing the attribute via DOM manipulation
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    emailInput.removeAttribute('required');
    passwordInput.removeAttribute('required');
    fireEvent.change(emailInput, { target: { value: '   ' } });
    fireEvent.change(passwordInput, { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Email is required.')).toBeInTheDocument();
    });
    expect(checkAdminLoginAllowedMock).not.toHaveBeenCalled();
  });

  it('rejects empty password', async () => {
    render(<AdminLogin onSignedIn={() => {}} deniedReason={null} />);
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    emailInput.removeAttribute('required');
    passwordInput.removeAttribute('required');
    fireEvent.change(emailInput, { target: { value: 'a@b.com' } });
    fireEvent.change(passwordInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Password is required.')).toBeInTheDocument();
    });
  });

  it('disables the button while loading', async () => {
    let resolve!: (v: { ok: boolean }) => void;
    checkAdminLoginAllowedMock.mockReturnValue(new Promise<{ ok: boolean }>((r) => { resolve = r; }));
    render(<AdminLogin onSignedIn={() => {}} deniedReason={null} />);
    fillLogin('a@b.com', 'pw');
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Signing in/i })).toBeDisabled();
    });
    resolve({ ok: true });
    signInAdminMock.mockResolvedValue(undefined);
  });
});

describe('describePasswordPolicyError', () => {
  it('returns null when policy passes', () => {
    validatePasswordPolicyMock.mockReturnValue({ ok: true });
    expect(describePasswordPolicyError('something')).toBeNull();
  });

  it('returns the first error message when policy fails', () => {
    validatePasswordPolicyMock.mockReturnValue({ ok: false, errors: ['too short', 'no symbol'] });
    expect(describePasswordPolicyError('x')).toBe('too short');
  });

  it('returns generic fallback when error list is empty', () => {
    validatePasswordPolicyMock.mockReturnValue({ ok: false, errors: [] });
    expect(describePasswordPolicyError('x')).toBe('Password is not strong enough.');
  });
});
