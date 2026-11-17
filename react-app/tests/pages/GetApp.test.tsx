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
  ANDROID_AVAILABLE: true,
  STORE_URLS: { ios: 'https://apps.apple.com/libo', android: 'https://play.google.com/libo' },
  detectPlatform: () => detectPlatformMock(),
  redirectToStore: (p: unknown, ct: unknown) => redirectToStoreMock(p, ct),
  cleanCampaignSource: (raw: string | null) =>
    raw ? raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || null : null,
  storeUrlWithSource: (p: string, ct: string | null) =>
    (p === 'ios' ? 'https://apps.apple.com/libo' : 'https://play.google.com/libo') + (ct ? `#ct=${ct}` : ''),
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
  it('renders both store fallback links (Android live since 9 Nov 2026)', () => {
    renderAt('');
    const appStore = screen.getByRole('link', { name: /Download on the App Store/ });
    expect(appStore).toHaveAttribute('href', 'https://apps.apple.com/libo');
    const play = screen.getByRole('link', { name: /Google Play/i });
    expect(play).toHaveAttribute('href', 'https://play.google.com/libo');
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('carries a sanitised ?ct= source into the redirect and both fallback links', () => {
    detectPlatformMock.mockReturnValue('ios');
    renderAt('?ct=IG_LiboWorld!');
    expect(screen.getByRole('link', { name: /App Store/ })).toHaveAttribute('href', 'https://apps.apple.com/libo#ct=ig_liboworld');
    expect(screen.getByRole('link', { name: /Google Play/i })).toHaveAttribute('href', 'https://play.google.com/libo#ct=ig_liboworld');
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(redirectToStoreMock).toHaveBeenCalledWith('ios', 'ig_liboworld');
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
    expect(redirectToStoreMock).toHaveBeenCalledWith('android', null);
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
