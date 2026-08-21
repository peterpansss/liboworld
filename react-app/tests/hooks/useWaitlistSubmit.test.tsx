/**
 * Tests for src/hooks/useWaitlistSubmit.ts.
 *
 * The case that matters is the one that bit us in production (2026-08-21): an
 * insert that never resolves. Before the timeout, `status` stayed 'submitting'
 * forever — the visitor watched "Sending…" with no error and nothing to retry,
 * on the site's only conversion point. A silent failure on a conversion path is
 * worse than a loud one, so that transition is pinned here.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

void React;

const insertMock = vi.fn();
vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: () => ({ insert: insertMock }) },
}));
vi.mock('../../src/lib/consent', () => ({ trackLead: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: {} }),
}));

const { useWaitlistSubmit } = await import('../../src/hooks/useWaitlistSubmit');

/** supabase-js returns a thenable that also carries .abortSignal(). */
const builder = (promise: Promise<unknown>) => {
  const b = { abortSignal: () => b, then: promise.then.bind(promise) };
  return b;
};
const evt = () => ({ preventDefault: () => {} }) as unknown as React.FormEvent;

beforeEach(() => { insertMock.mockReset(); });
afterEach(() => { vi.useRealTimers(); });

describe('useWaitlistSubmit', () => {
  it('reports success on a clean insert', async () => {
    insertMock.mockReturnValue(builder(Promise.resolve({ error: null })));
    const { result } = renderHook(() => useWaitlistSubmit('homepage_waitlist'));
    act(() => { result.current.setEmail('a@b.com'); });
    await act(async () => { await result.current.submit(evt()); });
    expect(result.current.status).toBe('success');
  });

  it('treats a duplicate (23505) as success, not an error', async () => {
    insertMock.mockReturnValue(builder(Promise.resolve({ error: { code: '23505' } })));
    const { result } = renderHook(() => useWaitlistSubmit('homepage_waitlist'));
    act(() => { result.current.setEmail('a@b.com'); });
    await act(async () => { await result.current.submit(evt()); });
    expect(result.current.status).toBe('duplicate');
  });

  it('lowercases the address and records the source', async () => {
    insertMock.mockReturnValue(builder(Promise.resolve({ error: null })));
    const { result } = renderHook(() => useWaitlistSubmit('challenge_waitlist'));
    act(() => { result.current.setEmail('  MiXeD@Case.COM  '); });
    await act(async () => { await result.current.submit(evt()); });
    expect(insertMock).toHaveBeenCalledWith({ email: 'mixed@case.com', source: 'challenge_waitlist' });
  });

  it('does not leave the form stuck on "submitting" when the insert never resolves', async () => {
    vi.useFakeTimers();
    // The production failure mode: the request goes out and nothing comes back.
    // The only thing that ever settles this promise is the abort signal.
    insertMock.mockImplementation(() => ({
      abortSignal(signal: AbortSignal) {
        const pending = new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        });
        return { then: pending.then.bind(pending) };
      },
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
