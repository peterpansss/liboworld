/**
 * Tests for src/components/funnel/CountdownBanner.tsx.
 *
 * Time-based component — we drive Date.now() with vi.useFakeTimers and
 * advance the clock to verify:
 *   - normal countdown rendering (HH:MM:SS)
 *   - days segment appears when target is > 24h away
 *   - urgent gradient kicks in inside the urgentBelowSeconds window
 *   - "ENDS IN" → "CLOSED" wording when ended (legacy English fallback)
 *   - the new `closedLabel` prop renders verbatim once expired (i18n fix)
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
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('renders a days segment for targets > 24h away', () => {
    const target = new Date('2026-05-04T05:00:00Z');
    render(<CountdownBanner endsAt={target.toISOString()} label="ENDS IN" />);
    expect(screen.getByText('02d')).toBeInTheDocument();
    expect(screen.getByText('05')).toBeInTheDocument();
  });

  it('switches to urgent style inside the urgentBelowSeconds window', () => {
    const target = new Date('2026-05-02T00:30:00Z');
    const { container } = render(
      <CountdownBanner endsAt={target.toISOString()} label="ENDS IN" urgentBelowSeconds={3600} />,
    );
    const banner = container.firstChild as HTMLElement;
    expect(banner.style.background).toContain('rgb(200, 74, 74)');
    expect(banner.style.animation).toContain('libo-countdown-pulse');
  });

  it('updates every second via setInterval', () => {
    const target = new Date('2026-05-02T00:01:00Z'); // 60s away
    render(<CountdownBanner endsAt={target.toISOString()} label="ENDS IN" />);
    expect(screen.getByText('01')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('55')).toBeInTheDocument();
  });

  describe('expired state', () => {
    it('falls back to English "CLOSED" wording when no closedLabel is given (legacy)', () => {
      const target = new Date('2026-04-30T00:00:00Z');
      render(<CountdownBanner endsAt={target.toISOString()} label="GIVEAWAY ENDS IN" />);
      // The trailing "IN" is stripped and " CLOSED" appended.
      expect(screen.getByText(/GIVEAWAY ENDS\s+CLOSED/)).toBeInTheDocument();
    });

    it('renders closedLabel verbatim when provided (i18n fix — French)', () => {
      const target = new Date('2026-04-30T00:00:00Z');
      render(
        <CountdownBanner
          endsAt={target.toISOString()}
          label="FIN DANS"
          closedLabel="FERMÉ"
        />,
      );
      // Closed label wins — the regex-based English fallback is bypassed.
      expect(screen.getByText('FERMÉ')).toBeInTheDocument();
      // The original prefix "FIN DANS" is gone (we replaced the whole text).
      expect(screen.queryByText(/FIN DANS/)).not.toBeInTheDocument();
    });

    it('renders closedLabel verbatim when provided (i18n fix — German)', () => {
      const target = new Date('2026-04-30T00:00:00Z');
      render(
        <CountdownBanner
          endsAt={target.toISOString()}
          label="ENDET IN"
          closedLabel="GESCHLOSSEN"
        />,
      );
      expect(screen.getByText('GESCHLOSSEN')).toBeInTheDocument();
      expect(screen.queryByText(/ENDET/)).not.toBeInTheDocument();
    });

    it('uses closedLabel even when the English fallback would also have worked', () => {
      const target = new Date('2026-04-30T00:00:00Z');
      render(
        <CountdownBanner
          endsAt={target.toISOString()}
          label="GIVEAWAY ENDS IN"
          closedLabel="GIVEAWAY OVER"
        />,
      );
      expect(screen.getByText('GIVEAWAY OVER')).toBeInTheDocument();
      expect(screen.queryByText(/CLOSED/)).not.toBeInTheDocument();
    });
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
