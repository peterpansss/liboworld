/**
 * Tests for src/hooks/useWaitlistSubmit.ts.
 *
 * The case that matters is the one that bit us in production (2026-08-21): an
 * request that never resolves. Before the timeout, `status` stayed 'submitting'
 * forever — the visitor watched "Sending…" with no error and nothing to retry,
 * on the site's only conversion point. A silent failure on a conversion path is
 * worse than a loud one, so that transition is pinned here.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

void React;

const submitMock = vi.fn();
vi.mock('../../src/lib/waitlistSignup', () => ({ submitWaitlistSignup: submitMock }));
vi.mock('../../src/lib/consent', () => ({ trackLead: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: {} }),
}));

const { useWaitlistSubmit } = await import('../../src/hooks/useWaitlistSubmit');

const evt = () => ({ preventDefault: () => {} }) as unknown as React.FormEvent;

beforeEach(() => { submitMock.mockReset(); });
afterEach(() => { vi.useRealTimers(); });

describe('useWaitlistSubmit', () => {
  it('reports success on a clean signup', async () => {
    submitMock.mockResolvedValue('success');
    const { result } = renderHook(() => useWaitlistSubmit('homepage_waitlist'));
    act(() => { result.current.setEmail('a@b.com'); });
    await act(async () => { await result.current.submit(evt()); });
    expect(result.current.status).toBe('success');
  });

  it('treats a duplicate as success, not an error', async () => {
    submitMock.mockResolvedValue('duplicate');
    const { result } = renderHook(() => useWaitlistSubmit('homepage_waitlist'));
    act(() => { result.current.setEmail('a@b.com'); });
    await act(async () => { await result.current.submit(evt()); });
    expect(result.current.status).toBe('duplicate');
  });

  it('lowercases the address and records the source', async () => {
    submitMock.mockResolvedValue('success');
    const { result } = renderHook(() => useWaitlistSubmit('challenge_waitlist'));
    act(() => { result.current.setEmail('  MiXeD@Case.COM  '); });
    await act(async () => { await result.current.submit(evt()); });
    expect(submitMock).toHaveBeenCalledWith('mixed@case.com', 'challenge_waitlist', undefined, expect.any(AbortSignal));
  });

  it('does not leave the form stuck on "submitting" when the request never resolves', async () => {
    vi.useFakeTimers();
    // The production failure mode: the request goes out and nothing comes back.
    // The only thing that ever settles this promise is the abort signal.
    submitMock.mockImplementation((_email, _source, _answers, signal: AbortSignal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      }));

    const { result } = renderHook(() => useWaitlistSubmit('homepage_waitlist'));
    act(() => { result.current.setEmail('a@b.com'); });
    act(() => { void result.current.submit(evt()); });
    await act(async () => { await Promise.resolve(); });
    expect(result.current.status).toBe('submitting');

    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe('waitlist.errorMessage');
  });
});
