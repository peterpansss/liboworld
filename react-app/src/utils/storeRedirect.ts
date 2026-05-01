/**
 * App Store / Play Store routing utilities for the funnel pages.
 *
 * On mobile, the /cash-challenge "Reserve my slot" button auto-routes
 * iOS visitors to the App Store and Android visitors to the Play Store.
 * On desktop, the page shows a QR-code overlay instead.
 *
 * When the real app listings are published, only the URLs in this file
 * need updating — every other call site reads from `STORE_URLS`.
 */

export type Platform = 'ios' | 'android' | 'desktop';

export const STORE_URLS = {
  // TODO: replace with the real App Store listing once Libo is published.
  // e.g. 'https://apps.apple.com/app/libo/id1234567890'
  ios: 'https://apps.apple.com',
  // TODO: replace with the real Play Store listing once Libo is published.
  // e.g. 'https://play.google.com/store/apps/details?id=world.libo.app'
  android: 'https://play.google.com',
} as const;

/** UA-detect the visitor's platform. SSR-safe (returns 'desktop' off-window). */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';

  // iPadOS 13+ reports as Mac in UA; check maxTouchPoints to disambiguate.
  const isIPad =
    /iPad/.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1);

  if (/iPhone|iPod/.test(ua) || isIPad) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/** Return the right store URL for a platform. Desktop falls through to iOS
 *  (used by the QR-code target — iOS is the largest app-store base globally). */
export function storeUrlFor(platform: Platform): string {
  if (platform === 'android') return STORE_URLS.android;
  return STORE_URLS.ios;
}

/** Navigate the current window to the right store. Use for in-page click handlers. */
export function redirectToStore(platform: Platform): void {
  if (typeof window === 'undefined') return;
  const url = storeUrlFor(platform);
  window.location.assign(url);
}
