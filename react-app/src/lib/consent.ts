/**
 * Consent gate for the Meta Pixel (Meta-Pixel-Setup-2026-08-05 Step 0,
 * option 1 — "load on accept"). The pixel does not exist in the page until
 * the visitor accepts; reject keeps it permanently absent for that visitor.
 *
 * GA4 is NOT gated here: it loads unconditionally from index.html — the
 * pre-Aug-7 behavior, restored on Noah's explicit call (2026-08-10) because
 * consent-gated GA reduced pre-launch data to a trickle. Revisit before a
 * serious EU compliance review.
 *
 * The choice persists in localStorage and is changeable via the footer's
 * "Cookie settings" link (regulatory requirement: revocable at any time).
 */

export type ConsentChoice = 'granted' | 'denied';

const STORAGE_KEY = 'libo-consent';
/** Meta dataset "libo world web" — client-side ID, safe to commit (per doc). */
export const META_PIXEL_ID = '1582491946914169';

type Listener = (choice: ConsentChoice | null) => void;
const listeners = new Set<Listener>();

export function getConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* private mode — the session still honors the choice in memory */
  }
  if (choice === 'granted') loadTrackers();
  listeners.forEach((l) => l(choice));
}

/** Re-open the banner (footer "Cookie settings"): clear the stored choice. */
export function resetConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(null));
}

export function onConsentChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean };
    _fbq?: unknown;
    /** Last path the pixel counted — guards double PageView on the grant moment. */
    __liboPixelPath?: string;
  }
}

let loaded = false;

/** Idempotent: injects the Meta Pixel once. Called only after accept.
    (GA4 loads unconditionally from index.html — see the header comment.) */
export function loadTrackers(): void {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;

  // ── Meta Pixel base code (doc Step 1) ──
  // The doc's <noscript> beacon is DELIBERATELY omitted: a noscript <img>
  // fires unconditionally and cannot be consent-gated — including it would
  // defeat the gate for no-JS visitors (who never saw a banner at all).
  /* eslint-disable */
  const f = window as any;
  if (!f.fbq) {
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    const t = document.createElement('script');
    t.async = true;
    t.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const s = document.getElementsByTagName('script')[0];
    s.parentNode!.insertBefore(t, s);
  }
  /* eslint-enable */
  window.fbq!('init', META_PIXEL_ID);
  window.fbq!('track', 'PageView');
  window.__liboPixelPath = window.location.pathname;
}

/** SPA PageView (doc Step 2) — call on route change; no-ops without consent. */
export function trackPageView(pathname: string): void {
  if (getConsent() !== 'granted' || !window.fbq) return;
  // init() already counted the path it loaded on — don't double-fire it.
  if (window.__liboPixelPath === pathname) return;
  window.__liboPixelPath = pathname;
  window.fbq('track', 'PageView');
}

/**
 * Lead (doc Step 3) — fire ONLY on confirmed success of the waitlist insert,
 * never on click. eventID enables server-side dedup later; keep it.
 */
export function trackLead(): void {
  if (getConsent() !== 'granted' || !window.fbq) return;
  window.fbq('track', 'Lead', {}, { eventID: crypto.randomUUID() });
}

/** Boot: if the visitor accepted on a previous visit, load immediately. */
export function initConsent(): void {
  if (getConsent() === 'granted') loadTrackers();
}
