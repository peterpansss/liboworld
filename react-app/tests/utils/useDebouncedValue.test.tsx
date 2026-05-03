/**
 * Coverage for src/utils/useDebouncedValue.ts.
 *
 * Verifies:
 *  - initial value returns immediately
 *  - subsequent updates are deferred by `delayMs`
 *  - rapid changes cancel the pending update
 *  - changing the delay resets the timer
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '../../src/utils/useDebouncedValue';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('hello', 200));
    expect(result.current).toBe('hello');
  });

  it('does not update before the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    );
    rerender({ value: 'b' });
    // Before timeout, still 'a'
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe('a');
  });

  it('updates exactly once after the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    );
    rerender({ value: 'b' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('b');
  });

  it('a new value before the timer fires cancels the pending update', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    );
    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(200); });
    rerender({ value: 'c' });
    act(() => { vi.advanceTimersByTime(200); });
    // 200 + 200 = 400 ms total, but the second rerender reset the timer at
    // 200 ms. So at 400 ms total elapsed, only 200 ms has passed since 'c'.
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('c');
  });

  it('a delay change re-arms the timer with the new duration', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'a', delay: 500 } },
    );
    rerender({ value: 'b', delay: 100 });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('b');
  });

  it('works with non-string values (numbers, objects, undefined)', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: any }) => useDebouncedValue(value, 50),
      { initialProps: { value: 0 as any } },
    );
    rerender({ value: 42 });
    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current).toBe(42);
    rerender({ value: { foo: 'bar' } });
    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current).toEqual({ foo: 'bar' });
    rerender({ value: undefined });
    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current).toBeUndefined();
  });
});
