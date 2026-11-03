/**
 * App Store / Play Store routing utilities for the funnel pages.
 *
 * On mobile, the /cash-challenge "Reserve my slot" button auto-routes
 * iOS visitors to the App Store. On desktop, the page shows a QR-code
 * overlay instead.
 *
 * Libo is iOS-only, so Android and desktop visitors go to the homepage
 * download block rather than to a store — see ANDROID_AVAILABLE below.
 *
 * When the real app listings are published, only the URLs in this file
 * need updating — every other call site reads from `STORE_URLS`.
 */

export type Platform = 'ios' | 'android' | 'desktop';

// Libo is iOS-only. `STORE_URLS.android` is still a bare placeholder, so every
// Android visitor would otherwise land on play.google.com's homepage. Send them
// to the homepage download block instead, which states plainly that it is
// iPhone only. (This used to be held shut by LAUNCH_MODE as well; that flag
// went to 'launched' on 3 Nov 2026 and this guard now stands on its own.)
// Flip to true the day the Play listing is live: the Android path below is
// intact and takes over on its own. Typed as boolean so both branches compile.
export const ANDROID_AVAILABLE: boolean = false;

/**
 * Where non-iOS visitors go instead of a store: the homepage hero download
 * block. Named WAITLIST_URL until 3 Nov 2026, when the hero stopped being a
 * waitlist — a constant whose name no longer matched where it pointed is
 * exactly the kind of thing that let the site sit half-launched for six weeks.
 */
export const NON_IOS_FALLBACK_URL = '/#hero-capture';

export const STORE_URLS = {
  // TODO: replace with the real App Store listing once Libo is published.
  ios: 'https://apps.apple.com/app/libo-world-training-club/id6773703113',
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
 *  while Libo is iOS-only; Android and desktop get the homepage download block
 *  so no one is dropped on a store page that has nothing to download. */
export function storeUrlFor(platform: Platform): string {
  if (platform === 'ios') return STORE_URLS.ios;
  if (platform === 'android' && ANDROID_AVAILABLE) return STORE_URLS.android;
  return NON_IOS_FALLBACK_URL;
}

/** Navigate the current window to the right destination. Use for in-page click handlers. */
export function redirectToStore(platform: Platform): void {
  if (typeof window === 'undefined') return;
  const url = storeUrlFor(platform);
  window.location.assign(url);
}
