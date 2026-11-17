/**
 * App Store / Play Store routing utilities for the funnel pages.
 *
 * On mobile, the /cash-challenge "Reserve my slot" button auto-routes
 * iOS visitors to the App Store. On desktop, the page shows a QR-code
 * overlay instead.
 *
 * Libo is on the App Store and Google Play (Play live since 9 Nov 2026), so
 * iOS and Android visitors go to their store; desktop gets the homepage
 * download block.
 *
 * Every call site reads from `STORE_URLS`, so the URLs live only here.
 */

export type Platform = 'ios' | 'android' | 'desktop';

// Android is live on Google Play (9 Nov 2026). The flag stays so the store
// badges and redirects can be held shut again from one place if the listing
// is ever pulled. Typed as boolean so both branches compile.
export const ANDROID_AVAILABLE: boolean = true;

/**
 * Where non-iOS visitors go instead of a store: the homepage hero download
 * block. Named WAITLIST_URL until 3 Nov 2026, when the hero stopped being a
 * waitlist — a constant whose name no longer matched where it pointed is
 * exactly the kind of thing that let the site sit half-launched for six weeks.
 */
export const NON_IOS_FALLBACK_URL = '/#hero-capture';

export const APP_STORE_ID = '6773703113';
export const PLAY_PACKAGE = 'com.liboworld.app';

export const STORE_URLS = {
  ios: 'https://apps.apple.com/app/libo-world-training-club/id6773703113',
  android: 'https://play.google.com/store/apps/details?id=com.liboworld.app',
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

/** Return the right destination for a platform: its store on iOS and Android
 *  (Android only while ANDROID_AVAILABLE), the homepage download block on desktop. */
export function storeUrlFor(platform: Platform): string {
  if (platform === 'ios') return STORE_URLS.ios;
  if (platform === 'android' && ANDROID_AVAILABLE) return STORE_URLS.android;
  return NON_IOS_FALLBACK_URL;
}

/** Navigate the current window to the right destination. Use for in-page click handlers. */
export function redirectToStore(platform: Platform, ct: string | null = null): void {
  if (typeof window === 'undefined') return;
  const url = storeUrlWithSource(platform, ct);
  window.location.assign(url);
}

/**
 * Sanitise a campaign source (`?ct=` on /get-app, e.g. a social bio link) to
 * what App Store Connect accepts: lowercase letters, digits, - and _, max 40.
 * Returns null when nothing usable is left.
 */
export function cleanCampaignSource(raw: string | null): string | null {
  if (!raw) return null;
  const ct = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  return ct || null;
}

/**
 * Store URL carrying a campaign source, so one link (a social bio) can serve
 * both stores and still show in App Store Connect's sources (`ct`) and in Play
 * Console's acquisition report (`utm_source` via the install referrer).
 */
export function storeUrlWithSource(platform: Platform, ct: string | null): string {
  if (!ct) return storeUrlFor(platform);
  if (platform === 'ios') {
    return `https://apps.apple.com/app/apple-store/id${APP_STORE_ID}?pt=128957923&ct=${ct}&mt=8`;
  }
  if (platform === 'android' && ANDROID_AVAILABLE) {
    const referrer = encodeURIComponent(`utm_source=${ct}&utm_medium=social`);
    return `${STORE_URLS.android}&referrer=${referrer}`;
  }
  return NON_IOS_FALLBACK_URL;
}
