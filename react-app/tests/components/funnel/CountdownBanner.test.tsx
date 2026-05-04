/**
 * Tests for src/components/funnel/CountdownBanner.tsx.
 *
 * Time-based component — we drive Date.now() with vi.useFakeTimers and
 * advance the clock to verify:
 *   - normal countdown rendering (HH:MM:SS)
 *   - days segment appears when target is > 24h away
 *   - urgent gradient kicks in inside the urgentBelowSeconds window
 *   - "ENDS IN" → "CLOSED" wording when ended
 *   - the interval cleans up on unmount
 *   - aria-live=assertive companion fires only on threshold transitions,
 *     NOT on the per-second tick (a11y polish)
 *   - visually-hidden full-sentence label is present for context
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import CountdownBanner from '../../../src/components/funnel/CountdownBanner';

void React;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-02T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CountdownBanner', () => {
  it('renders the label and time parts in the future', () => {
    const target = new Date('2026-05-02T01:30:45Z'); // 1h 30m 45s away
    render(<CountdownBanner endsAt={target.toISOString()} label="GIVEAWAY ENDS IN" />);
    expect(screen.getByText('GIVEAWAY ENDS IN')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument(); // hours
    expect(screen.getByText('30')).toBeInTheDocument(); // minutes
    expect(screen.getByText('45')).toBeInTheDocument(); // seconds
  });

  it('renders a days segment for targets > 24h away', () => {
    const target = new Date('2026-05-04T05:00:00Z'); // 2d 5h
    render(<CountdownBanner endsAt={target.toISOString()} label="ENDS IN" />);
    expect(screen.getByText('02d')).toBeInTheDocument();
    expect(screen.getByText('05')).toBeInTheDocument();
  });

  it('switches to urgent style when remaining seconds < urgentBelowSeconds', () => {
    const target = new Date('2026-05-02T00:30:00Z'); // 30 minutes away
    const { container } = render(
      <CountdownBanner endsAt={target.toISOString()} label="ENDS IN" urgentBelowSeconds={3600} />,
    );
    const banner = container.firstChild as HTMLElement;
    expect(banner.style.background).toContain('linear-gradient');
    expect(banner.style.background).toContain('rgb(200, 74, 74)');
    expect(banner.style.animation).toContain('libo-countdown-pulse');
  });

  it('renders a non-urgent style when remaining seconds >= urgentBelowSeconds', () => {
    const target = new Date('2026-05-02T05:00:00Z'); // 5h away
    const { container } = render(
      <CountdownBanner endsAt={target.toISOString()} label="ENDS IN" urgentBelowSeconds={3600} />,
    );
    const banner = container.firstChild as HTMLElement;
    expect(banner.style.background).toContain('rgb(26, 26, 26)');
    expect(banner.style.animation).toBe('');
  });

  it('shows "CLOSED" when the target is in the past', () => {
    const target = new Date('2026-04-30T00:00:00Z'); // 2 days ago
    render(<CountdownBanner endsAt={target.toISOString()} label="GIVEAWAY ENDS IN" />);
    expect(screen.getByText(/CLOSED/)).toBeInTheDocument();
    expect(screen.queryByText('00')).not.toBeInTheDocument();
  });

  it('updates every second via setInterval', () => {
    const target = new Date('2026-05-02T00:01:00Z'); // 60s away
    render(<CountdownBanner endsAt={target.toISOString()} label="ENDS IN" />);
    expect(screen.getAllByText('00').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('01')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('55')).toBeInTheDocument();
  });

  it('clears the interval on unmount (no leaked timers throw)', () => {
    const target = new Date('2026-05-02T01:00:00Z');
    const { unmount } = render(<CountdownBanner endsAt={target.toISOString()} label="X" />);
    expect(() => {
      unmount();
      vi.advanceTimersByTime(10_000);
    }).not.toThrow();
  });

  it('exposes the banner with role=status (no per-second aria-live noise)', () => {
    // Per a11y polish: the visual countdown is NOT itself a live region
    // because announcing every second pummels screen readers. Status role
    // alone keeps it in the accessibility tree without forcing announcements.
    const target = new Date('2026-05-02T01:00:00Z');
    const { container } = render(<CountdownBanner endsAt={target.toISOString()} label="X" />);
    const banner = container.firstChild as HTMLElement;
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.getAttribute('aria-live')).toBeNull();
  });

  it('renders a hidden assertive live region for threshold announcements', () => {
    const target = new Date('2026-05-02T05:00:00Z'); // far enough out — not urgent
    const { container } = render(
      <CountdownBanner endsAt={target.toISOString()} label="ENDS IN" urgentBelowSeconds={3600} />,
    );
    const live = container.querySelector('[aria-live="assertive"]');
    expect(live).not.toBeNull();
    // No transition has fired yet → it's empty.
    expect(live?.textContent).toBe('');
  });

  it('does NOT update the assertive live region on every per-second tick', () => {
    // 5h away — not urgent. Crank the clock 10 seconds and the live region
    // must remain empty (no transition crossed).
    const target = new Date('2026-05-02T05:00:00Z');
    const { container } = render(
      <CountdownBanner endsAt={target.toISOString()} label="ENDS IN" urgentBelowSeconds={3600} />,
    );
    const live = container.querySelector('[aria-live="assertive"]');
    expect(live?.textContent).toBe('');
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(live?.textContent).toBe('');
  });

  it('announces "Less than 1 hour remaining" when crossing into urgent', () => {
    // Start 1h 0m 5s away (NOT urgent); after 10s we cross urgent threshold.
    const target = new Date('2026-05-02T01:00:05Z');
    const { container } = render(
      <CountdownBanner endsAt={target.toISOString()} label="ENDS IN" urgentBelowSeconds={3600} />,
    );
    const live = container.querySelector('[aria-live="assertive"]') as HTMLElement;
    expect(live.textContent).toBe('');
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(live.textContent).toMatch(/Less than 1 hour remaining/);
  });

  it('announces "Less than 1 minute remaining" when crossing into sub-minute', () => {
    // Start 1m 5s away — already urgent (so it WILL announce hour first).
    // Then advance 10s to cross the sub-minute threshold.
    const target = new Date('2026-05-02T00:01:05Z');
    const { container } = render(
      <CountdownBanner endsAt={target.toISOString()} label="ENDS IN" urgentBelowSeconds={3600} />,
    );
    const live = container.querySelector('[aria-live="assertive"]') as HTMLElement;
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(live.textContent).toMatch(/Less than 1 minute remaining/);
  });

  it('announces "closed" when the timer expires', () => {
    // 2s out, then advance 5s.
    const target = new Date('2026-05-02T00:00:02Z');
    const { container } = render(
      <CountdownBanner endsAt={target.toISOString()} label="GIVEAWAY ENDS IN" />,
    );
    const live = container.querySelector('[aria-live="assertive"]') as HTMLElement;
    act(() => { vi.advanceTimersByTime(5000); });
    expect(live.textContent).toMatch(/closed/i);
    expect(live.textContent).toMatch(/GIVEAWAY ENDS/i);
  });

  it('renders a visually-hidden full sentence ("X hours, Y minutes…") for AT', () => {
    const target = new Date('2026-05-02T01:30:45Z'); // 1h 30m 45s away
    const { container } = render(
      <CountdownBanner endsAt={target.toISOString()} label="ENDS IN" />,
    );
    // The visible time digits are aria-hidden; the long-form label is the
    // accessible text. Find it by partial match.
    const sentence = Array.from(container.querySelectorAll('span'))
      .find((s) => /1 hour, 30 minutes, 45 seconds remaining/.test(s.textContent || ''));
    expect(sentence).toBeTruthy();
  });

  it('marks the visible time digits aria-hidden so AT only hears the sentence', () => {
    const target = new Date('2026-05-02T01:30:45Z');
    const { container } = render(
      <CountdownBanner endsAt={target.toISOString()} label="ENDS IN" />,
    );
    // The font-display container that wraps the digit spans should be hidden.
    const digits = container.querySelector('.font-display');
    expect(digits).not.toBeNull();
    expect(digits?.getAttribute('aria-hidden')).toBe('true');
  });
});
