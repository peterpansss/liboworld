/**
 * Tests for src/components/admin/ReauthModal.tsx.
 *
 * The modal subscribes to a global "needs reauth" prompt registered via
 * registerReauthPrompt (in lib/adminApi). We mock that lib so the test
 * can drive the `resolve(...)` callback the modal hands back to the lib
 * and verify the modal opens, validates, submits and cancels correctly.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

void React;

let promptCallback: ((resolve: (pw: string | null) => void) => void) | null = null;
let unregisterCalls = 0;

vi.mock('../../../src/lib/adminApi', () => ({
  registerReauthPrompt: (cb: (resolve: (pw: string | null) => void) => void) => {
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

describe('ReauthModal', () => {
  it('renders nothing initially', () => {
    const { container } = render(<ReauthModal />);
    expect(container.firstChild).toBeNull();
    expect(promptCallback).toBeTypeOf('function');
  });

  it('opens when the prompt is triggered', () => {
    render(<ReauthModal />);
    triggerPrompt();
    expect(screen.getByText(/Confirm with password/i)).toBeInTheDocument();
    expect(document.querySelector('input[type="password"]') as HTMLInputElement).toBeInTheDocument();
  });

  it('resolves with the typed password and closes on submit', async () => {
    const user = userEvent.setup();
    render(<ReauthModal />);
    const { resolve } = triggerPrompt();
    const pwd = document.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(pwd, 'hunter2');
    fireEvent.submit(pwd.closest('form')!);
    expect(resolve).toHaveBeenCalledWith('hunter2');
    expect(screen.queryByText(/Confirm with password/i)).not.toBeInTheDocument();
  });

  it('shows a "Password is required" error when submitted empty', () => {
    render(<ReauthModal />);
    triggerPrompt();
    const pwd = document.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.submit(pwd.closest('form')!);
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
  });

  it('resolves with null and closes when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ReauthModal />);
    const { resolve } = triggerPrompt();
    await user.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(resolve).toHaveBeenCalledWith(null);
    expect(screen.queryByText(/Confirm with password/i)).not.toBeInTheDocument();
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
    const pwd = document.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.click(pwd.closest('form')!);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('unregisters the prompt callback on unmount', () => {
    const { unmount } = render(<ReauthModal />);
    unmount();
    expect(unregisterCalls).toBe(1);
  });
});
