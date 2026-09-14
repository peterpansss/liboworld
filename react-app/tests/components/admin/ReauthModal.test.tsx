/**
 * Tests for src/components/admin/ReauthModal.tsx.
 *
 * The modal subscribes to a global "needs reauth" prompt registered via
 * registerReauthPrompt (in lib/adminApi). We mock that lib so the test
 * can drive the `resolve(...)` callback the modal hands back to the lib
 * and verify the modal opens, validates, submits and cancels correctly.
 *
 * Since LIBO-02 (43a3ea7) re-auth is 2FA-based: the modal asks for the 6-digit
 * TOTP code from the admin's authenticator app and never handles a password.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

void React;

let promptCallback: ((resolve: (code: string | null) => void) => void) | null = null;
let unregisterCalls = 0;

vi.mock('../../../src/lib/adminApi', () => ({
  registerReauthPrompt: (cb: (resolve: (code: string | null) => void) => void) => {
    promptCallback = cb;
    return () => { unregisterCalls += 1; };
  },
}));

import { ReauthModal } from '../../../src/components/admin/ReauthModal';

beforeEach(() => {
  promptCallback = null;
  unregisterCalls = 0;
});

function triggerPrompt(): { resolve: ReturnType<typeof vi.fn> } {
  const resolve = vi.fn();
  // Wrap in act so the modal's setState (open=true, password=, error=)
  // flushes before assertions read the DOM.
  act(() => { promptCallback?.(resolve); });
  return { resolve };
}

function codeInput(): HTMLInputElement {
  return document.querySelector('input[autocomplete="one-time-code"]') as HTMLInputElement;
}

describe('ReauthModal', () => {
  it('renders nothing initially', () => {
    const { container } = render(<ReauthModal />);
    expect(container.firstChild).toBeNull();
    expect(promptCallback).toBeTypeOf('function');
  });

  it('opens when the prompt is triggered', () => {
    render(<ReauthModal />);
    triggerPrompt();
    expect(screen.getByText(/Confirm with authenticator/i)).toBeInTheDocument();
    expect(codeInput()).toBeInTheDocument();
    // Never a password field.
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it('resolves with the typed 6-digit code and closes on submit', async () => {
    const user = userEvent.setup();
    render(<ReauthModal />);
    const { resolve } = triggerPrompt();
    const input = codeInput();
    await user.type(input, '123456');
    fireEvent.submit(input.closest('form')!);
    expect(resolve).toHaveBeenCalledWith('123456');
    expect(screen.queryByText(/Confirm with authenticator/i)).not.toBeInTheDocument();
  });

  it('strips non-digits and caps the code at 6 characters', async () => {
    const user = userEvent.setup();
    render(<ReauthModal />);
    triggerPrompt();
    const input = codeInput();
    await user.type(input, '12a34-5678');
    expect(input.value).toBe('123456');
  });

  it('shows a validation error (and does not resolve) when submitted empty', () => {
    render(<ReauthModal />);
    const { resolve } = triggerPrompt();
    fireEvent.submit(codeInput().closest('form')!);
    expect(screen.getByText('Enter the 6-digit code from your authenticator app.')).toBeInTheDocument();
    expect(resolve).not.toHaveBeenCalled();
  });

  it('rejects a code shorter than 6 digits', async () => {
    const user = userEvent.setup();
    render(<ReauthModal />);
    const { resolve } = triggerPrompt();
    const input = codeInput();
    await user.type(input, '123');
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByText('Enter the 6-digit code from your authenticator app.')).toBeInTheDocument();
    expect(resolve).not.toHaveBeenCalled();
  });

  it('resolves with null and closes when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ReauthModal />);
    const { resolve } = triggerPrompt();
    await user.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(resolve).toHaveBeenCalledWith(null);
    expect(screen.queryByText(/Confirm with authenticator/i)).not.toBeInTheDocument();
  });

  it('resolves with null when the overlay is clicked (cancel behavior)', () => {
    const { container } = render(<ReauthModal />);
    const { resolve } = triggerPrompt();
    fireEvent.click(container.firstChild as HTMLElement);
    expect(resolve).toHaveBeenCalledWith(null);
  });

  it('does not bubble overlay clicks when the form is clicked (stopPropagation)', () => {
    render(<ReauthModal />);
    const { resolve } = triggerPrompt();
    fireEvent.click(codeInput().closest('form')!);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('unregisters the prompt callback on unmount', () => {
    const { unmount } = render(<ReauthModal />);
    unmount();
    expect(unregisterCalls).toBe(1);
  });
});
