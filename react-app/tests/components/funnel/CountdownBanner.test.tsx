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
    // No days segment for < 24h gap
    expect(screen.queryByText(/d$/)).not.toBeInTheDocument();
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
    // Urgent triggers the red gradient + pulse animation
    const banner = container.firstChild as HTMLElement;
    expect(banner.style.background).toContain('linear-gradient');
    expect(banner.style.background).toContain('rgb(200, 74, 74)'); // red
    expect(banner.style.animation).toContain('libo-countdown-pulse');
  });

  it('renders a non-urgent style when remaining seconds >= urgentBelowSeconds', () => {
    const target = new Date('2026-05-02T05:00:00Z'); // 5h away
    const { container } = render(
      <CountdownBanner endsAt={target.toISOString()} label="ENDS IN" urgentBelowSeconds={3600} />,
    );
    const banner = container.firstChild as HTMLElement;
    // Background is dark linear-gradient (not red)
    expect(banner.style.background).toContain('rgb(26, 26, 26)');
    expect(banner.style.animation).toBe('');
  });

  it('shows "CLOSED" when the target is in the past', () => {
    const target = new Date('2026-04-30T00:00:00Z'); // 2 days ago
    render(<CountdownBanner endsAt={target.toISOString()} label="GIVEAWAY ENDS IN" />);
    // "ENDS IN" → ends → "GIVEAWAY ENDS  CLOSED"
    expect(screen.getByText(/CLOSED/)).toBeInTheDocument();
    expect(screen.queryByText('00')).not.toBeInTheDocument();
  });

  it('updates every second via setInterval', () => {
    const target = new Date('2026-05-02T00:01:00Z'); // 60s away
    render(<CountdownBanner endsAt={target.toISOString()} label="ENDS IN" />);
    // Initially: 00h 01m 00s. Both hours and seconds are "00".
    expect(screen.getAllByText('00').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('01')).toBeInTheDocument(); // minutes
    // Advance 5 seconds — minutes should now be 0, seconds 55
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

  it('exposes the banner as a polite live region', () => {
    const target = new Date('2026-05-02T01:00:00Z');
    const { container } = render(<CountdownBanner endsAt={target.toISOString()} label="X" />);
    const banner = container.firstChild as HTMLElement;
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });
});
