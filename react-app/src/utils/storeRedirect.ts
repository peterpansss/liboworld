/**
 * App Store / Play Store routing utilities for the funnel pages.
 *
 * On mobile, the /cash-challenge "Reserve my slot" button auto-routes
 * iOS visitors to the App Store. On desktop, the page shows a QR-code
 * overlay instead.
 *
 * Launch (3 Sep 2026) is iOS-only, so Android and desktop visitors go to the
 * homepage waitlist rather than to a store — see ANDROID_AVAILABLE below.
 *
 * When the real app listings are published, only the URLs in this file
 * need updating — every other call site reads from `STORE_URLS`.
 */

export type Platform = 'ios' | 'android' | 'desktop';

// Launch is iOS-only. `STORE_URLS.android` is still a bare placeholder, and the
// routes that use it (/get-app, /cash-challenge, the QR overlay) are only held
// shut by LAUNCH_MODE — the day that flips to 'launched', every Android visitor
// would land on play.google.com's homepage. Send them to the waitlist instead.
// Flip to true the day the Play listing is live: the Android path below is
// intact and takes over on its own. Typed as boolean so both branches compile.
export const ANDROID_AVAILABLE: boolean = false;

/** Where non-iOS visitors go instead of a store: the homepage hero capture. */
export const WAITLIST_URL = '/#hero-capture';

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

/** Return the right destination for a platform. Only iOS gets a store link
 *  while the launch is iOS-only; Android and desktop get the waitlist so no
 *  one is dropped on a store page that has nothing to download. */
export function storeUrlFor(platform: Platform): string {
  if (platform === 'ios') return STORE_URLS.ios;
  if (platform === 'android' && ANDROID_AVAILABLE) return STORE_URLS.android;
  return WAITLIST_URL;
}

/** Navigate the current window to the right destination. Use for in-page click handlers. */
export function redirectToStore(platform: Platform): void {
  if (typeof window === 'undefined') return;
  const url = storeUrlFor(platform);
  window.location.assign(url);
}
