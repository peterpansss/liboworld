/**
 * Tests for src/pages/GetApp.tsx — QR-target redirect endpoint.
 *
 * On mount the page:
 *   1. Reads ?tier= from the URL
 *   2. logFunnelClick (only when tier provided)
 *   3. Fires gtag('event', ...) when window.gtag exists
 *   4. After 200ms, calls redirectToStore(detectPlatform()) and flips UI
 *      copy from "Opening the app store" to "Redirecting…"
 *
 * Both the store-redirect util and the funnel-signups lib are mocked.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

void React;

const logFunnelClickMock = vi.fn(() => Promise.resolve({ ok: true } as { ok: true }));
const detectPlatformMock = vi.fn<[], 'ios' | 'android' | 'desktop'>(() => 'ios');
const redirectToStoreMock = vi.fn();

vi.mock('../../src/lib/funnelSignups', () => ({
  logFunnelClick: (args: unknown) => logFunnelClickMock(args),
}));

vi.mock('../../src/utils/storeRedirect', () => ({
  detectPlatform: () => detectPlatformMock(),
  redirectToStore: (p: unknown) => redirectToStoreMock(p),
  STORE_URLS: {
    ios: 'https://apps.apple.com/libo',
    android: 'https://play.google.com/libo',
  },
}));

import GetAppPage from '../../src/pages/GetApp';

beforeEach(() => {
  logFunnelClickMock.mockClear();
  detectPlatformMock.mockClear();
  redirectToStoreMock.mockClear();
  detectPlatformMock.mockReturnValue('ios');
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  // Clean up any gtag stub
  delete (window as Window & { gtag?: unknown }).gtag;
});

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={['/get-app' + search]}>
      <GetAppPage />
    </MemoryRouter>,
  );
}

describe('GetApp', () => {
  it('renders the App Store and Play Store fallback links', () => {
    renderAt('');
    const appStore = screen.getByRole('link', { name: /Download on the App Store/ });
    const play = screen.getByRole('link', { name: /Get it on Google Play/ });
    expect(appStore).toHaveAttribute('href', 'https://apps.apple.com/libo');
    expect(play).toHaveAttribute('href', 'https://play.google.com/libo');
  });

  it('shows "Opening the app store" copy before the redirect timer fires', () => {
    renderAt('');
    expect(screen.getByText(/Opening the app store/)).toBeInTheDocument();
  });

  it('logs an anonymous funnel click when ?tier= is present', () => {
    renderAt('?tier=pro_pool');
    expect(logFunnelClickMock).toHaveBeenCalledWith({
      funnel: 'cash_challenge',
      tierSlug: 'pro_pool',
    });
  });

  it('does not log a click when no ?tier= is provided', () => {
    renderAt('');
    expect(logFunnelClickMock).not.toHaveBeenCalled();
  });

  it('fires a gtag event when window.gtag is defined (with tier)', () => {
    const gtagSpy = vi.fn();
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag = gtagSpy;

    renderAt('?tier=elite_pool');
    expect(gtagSpy).toHaveBeenCalledWith('event', 'cash_challenge_app_redirect_qr', {
      tier: 'elite_pool',
    });
  });

  it('fires a gtag event with "unknown" tier when no tier is provided', () => {
    const gtagSpy = vi.fn();
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag = gtagSpy;

    renderAt('');
    expect(gtagSpy).toHaveBeenCalledWith('event', 'cash_challenge_app_redirect_qr', {
      tier: 'unknown',
    });
  });

  it('redirects to the detected store after the 200ms delay and flips the heading', () => {
    detectPlatformMock.mockReturnValue('android');
    renderAt('');

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByText('Redirecting…')).toBeInTheDocument();
    expect(redirectToStoreMock).toHaveBeenCalledWith('android');
  });

  it('clears its timeout on unmount so a stale redirect cannot fire', () => {
    const { unmount } = renderAt('');
    unmount();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(redirectToStoreMock).not.toHaveBeenCalled();
  });
});
