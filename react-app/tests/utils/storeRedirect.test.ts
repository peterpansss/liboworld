/**
 * Coverage for src/utils/storeRedirect.ts.
 *
 * Covers UA-detection branches (iOS, Android, iPadOS-13+ as Mac, desktop)
 * and the redirect navigation helper.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { detectPlatform, storeUrlFor, redirectToStore, STORE_URLS, WAITLIST_URL, ANDROID_AVAILABLE } from '../../src/utils/storeRedirect';

const ORIG_NAV = global.navigator;
const ORIG_LOC = global.window?.location;

afterEach(() => {
  // Restore navigator + window.location.
  Object.defineProperty(global, 'navigator', { configurable: true, value: ORIG_NAV });
});

function setUserAgent(ua: string, opts?: { platform?: string; maxTouchPoints?: number }) {
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: {
      userAgent: ua,
      platform: opts?.platform ?? '',
      maxTouchPoints: opts?.maxTouchPoints ?? 0,
    },
  });
}

describe('detectPlatform', () => {
  it('returns "ios" for iPhone UA', () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    );
    expect(detectPlatform()).toBe('ios');
  });

  it('returns "ios" for iPod UA', () => {
    setUserAgent('Mozilla/5.0 (iPod touch; CPU iPhone OS 16_0)');
    expect(detectPlatform()).toBe('ios');
  });

  it('returns "ios" for iPad UA', () => {
    setUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)');
    expect(detectPlatform()).toBe('ios');
  });

  it('returns "ios" for iPadOS 13+ that pretends to be Mac (high maxTouchPoints)', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      { platform: 'MacIntel', maxTouchPoints: 5 },
    );
    expect(detectPlatform()).toBe('ios');
  });

  it('returns "desktop" for actual macOS without touch points', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      { platform: 'MacIntel', maxTouchPoints: 0 },
    );
    expect(detectPlatform()).toBe('desktop');
  });

  it('returns "android" for Android UA', () => {
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36',
    );
    expect(detectPlatform()).toBe('android');
  });

  it('returns "desktop" for typical Windows / Linux UA', () => {
    setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    );
    expect(detectPlatform()).toBe('desktop');
  });
});

describe('storeUrlFor', () => {
  it('returns the iOS URL for ios', () => {
    expect(storeUrlFor('ios')).toBe(STORE_URLS.ios);
  });

  // Launch is iOS-only: nothing but iOS may be handed a store link, or an
  // Android visitor lands on the Play Store homepage with nothing to install.
  it('sends android to the waitlist while ANDROID_AVAILABLE is off', () => {
    expect(ANDROID_AVAILABLE).toBe(false);
    expect(storeUrlFor('android')).toBe(WAITLIST_URL);
  });

  it('sends desktop to the waitlist, not to a store', () => {
    expect(storeUrlFor('desktop')).toBe(WAITLIST_URL);
  });
});

describe('redirectToStore', () => {
  beforeEach(() => {
    // Replace location.assign with a spy.
    const origLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...origLocation, assign: vi.fn() },
    });
  });

  it('navigates to the iOS URL for ios platform', () => {
    redirectToStore('ios');
    expect((window.location.assign as any).mock.calls[0][0]).toBe(STORE_URLS.ios);
  });

  it('navigates android to the waitlist, not the Play Store', () => {
    redirectToStore('android');
    expect((window.location.assign as any).mock.calls[0][0]).toBe(WAITLIST_URL);
  });
});

describe('detectPlatform — SSR safety', () => {
  it('returns "desktop" if navigator is undefined (SSR)', () => {
    const origNav = global.navigator;
    // @ts-expect-error temporarily delete navigator
    delete global.navigator;
    // Force the global lookup to fall through to the default.
    expect(detectPlatform()).toBe('desktop');
    Object.defineProperty(global, 'navigator', { configurable: true, value: origNav });
  });
});
