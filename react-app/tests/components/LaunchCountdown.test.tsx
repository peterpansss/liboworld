/**
 * Tests for src/components/LaunchCountdown.tsx.
 *
 * This is the block that makes the founding pre-sale expire on its own, so the
 * behaviour worth pinning is the boundary: three units before LAUNCH_DATE, the
 * closed line after it, and the flip happening on the 30s tick without a
 * reload. Getting that wrong means either a countdown reading "closed" above a
 * live Buy button, or a 3 a.m. deploy on launch morning — the two outcomes the
 * date-driven design exists to prevent.
 *
 * launchMode is mocked so the suite doesn't depend on the real launch date
 * still being in the future. react-i18next resolves against the real en.json
 * (as in CountdownBanner.test.tsx) so the assertions check shipped copy.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

void React;

const LAUNCH = '2026-09-03T00:00:00+02:00';

vi.mock('../../src/config/launchMode', () => ({
  LAUNCH_DATE: '2026-09-03T00:00:00+02:00',
  LAUNCH_MODE: 'prelaunch',
  isPrelaunch: () => true,
  isLaunched: () => false,
  isFoundingOpen: () => Date.now() < new Date('2026-09-03T00:00:00+02:00').getTime(),
}));

vi.mock('react-i18next', async () => {
  const en = (await import('../../src/i18n/locales/en.json')).default as Record<string, unknown>;
  const lookup = (key: string) =>
    key.split('.').reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      en,
    );
  return {
    useTranslation: () => ({
      t: (key: string, opts?: { defaultValue?: string }) => {
        const hit = lookup(key);
        return typeof hit === 'string' ? hit : opts?.defaultValue ?? key;
      },
      i18n: {},
    }),
    initReactI18next: { type: '3rdParty', init: () => {} },
  };
});

const LaunchCountdown = (await import('../../src/components/LaunchCountdown')).default;

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

/** `ms` before launch. */
const at = (ms: number) => vi.setSystemTime(new Date(new Date(LAUNCH).getTime() - ms));

describe('LaunchCountdown', () => {
  it('renders days, hours and minutes — and never seconds', () => {
    at(2 * 86400_000 + 3 * 3600_000 + 4 * 60_000 + 30_000); // 2d 3h 4m 30s out
    const { container } = render(<LaunchCountdown />);
    expect(container.querySelectorAll('.launch-countdown__unit')).toHaveLength(3);
    const caps = Array.from(container.querySelectorAll('.launch-countdown__cap')).map((n) => n.textContent);
    expect(caps).toEqual(['DAYS', 'HRS', 'MIN']);
    const nums = Array.from(container.querySelectorAll('.launch-countdown__num')).map((n) => n.textContent);
    expect(nums).toEqual(['2', '3', '4']); // the 30 leftover seconds are not shown
  });

  it('shows the dated founder label while the offer is open', () => {
    at(10 * 86400_000);
    render(<LaunchCountdown />);
    expect(
      screen.getAllByText(/Founder pricing ends when we launch — 3 September/).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/Founding closed/)).toBeNull();
  });

  it('collapses to the closed line once the date passes', () => {
    at(-1000); // one second after launch
    const { container } = render(<LaunchCountdown />);
    expect(screen.getByText('Founding closed — Premium is €79.99/yr')).toBeInTheDocument();
    expect(container.querySelectorAll('.launch-countdown__unit')).toHaveLength(0);
    expect(container.firstElementChild?.className).toContain('launch-countdown--closed');
  });

  it('flips itself on the tick — a tab left open crosses over without a reload', () => {
    at(20_000); // 20s before launch
    const { container } = render(<LaunchCountdown />);
    expect(container.querySelectorAll('.launch-countdown__unit')).toHaveLength(3);
    act(() => { vi.advanceTimersByTime(30_000); }); // one tick, now past launch
    // getAllByText, not getByText: crossing over live also fills the aria-live
    // span, so the closed line is legitimately present twice.
    expect(screen.getAllByText('Founding closed — Premium is €79.99/yr').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.launch-countdown__unit')).toHaveLength(0);
  });

  it('announces the close once, and stays silent while merely ticking', () => {
    at(20_000);
    const { container } = render(<LaunchCountdown />);
    const live = container.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(live.textContent).toBe('');
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(live.textContent).toMatch(/Founding closed/);
  });

  it('does not announce on an ordinary tick far from launch', () => {
    at(10 * 86400_000);
    const { container } = render(<LaunchCountdown />);
    const live = container.querySelector('[aria-live="polite"]') as HTMLElement;
    act(() => { vi.advanceTimersByTime(120_000); });
    expect(live.textContent).toBe('');
  });

  it('clears its interval on unmount', () => {
    at(10 * 86400_000);
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = render(<LaunchCountdown />);
    unmount();
    expect(clear).toHaveBeenCalled();
  });
});
