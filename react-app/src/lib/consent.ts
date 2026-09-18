/**
 * Consent gate for every third-party tracker on liboworld.com.
 *
 * HISTORY — read before "restoring" anything here. Between 2026-08-10 and
 * 2026-09-18, GA4 was loaded unconditionally from index.html because
 * consent-gated GA reduced pre-launch data to a trickle. The banner
 * simultaneously told visitors "only if you agree". That is the exact
 * arrangement §25 TDDDG (and ePrivacy behind it) prohibits: a tracker that
 * reads and writes on the visitor's device before any choice is made, and a
 * notice that misdescribes it. It also made the data worthless — nobody can
 * act on numbers collected under a claim that is not true.
 *
 * From 2026-09-18 both trackers load from HERE and only here:
 *   - analytics  → Google Analytics 4 (G-R05YQ1CH2N)
 *   - marketing  → Meta Pixel (dataset "libo world web")
 * Nothing is injected until the visitor explicitly opts that category in.
 * Reject = no script tag, no network request, no cookie. The categories are
 * independent: analytics on / marketing off is a real, storable answer.
 *
 * Scripts cannot be un-injected once loaded, so withdrawal does the next best
 * thing: it flips the vendor's own kill switch (GA's `ga-disable-<id>`), makes
 * every track* helper a no-op, and deletes the cookies that vendor set.
 *
 * The choice persists in localStorage and is revocable at any time via the
 * footer's "Cookie settings" link (regulatory requirement).
 */

export type ConsentCategory = 'analytics' | 'marketing';

/** What the visitor opted into. `null` anywhere means "has not chosen yet". */
export type ConsentState = {
  analytics: boolean;
  marketing: boolean;
};

export const DENY_ALL: ConsentState = { analytics: false, marketing: false };
export const ACCEPT_ALL: ConsentState = { analytics: true, marketing: true };

const STORAGE_KEY = 'libo-consent-v2';
/**
 * The pre-2026-09-18 key: 'granted' | 'denied'. See `migrateLegacyChoice()`
 * for why only 'denied' survives the migration.
 */
const LEGACY_STORAGE_KEY = 'libo-consent';

/** GA4 measurement ID — client-side, safe to commit. */
export const GA_MEASUREMENT_ID = 'G-R05YQ1CH2N';
/** Meta dataset "libo world web" — client-side ID, safe to commit (per doc). */
export const META_PIXEL_ID = '1582491946914169';

type Listener = (state: ConsentState | null) => void;
const listeners = new Set<Listener>();

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean };
    _fbq?: unknown;
    /** Last path the pixel counted — guards double PageView on the grant moment. */
    __liboPixelPath?: string;
    /** Same guard for GA4: gtag('config') already counts the path it loads on. */
    __liboGaPath?: string;
  }
}

/**
 * The state the page is actually behaving under. Mirrors storage, except
 * after `resetConsent()` — where the stored record is gone and, until the
 * visitor answers again, everything is treated as denied.
 */
let active: ConsentState = { ...DENY_ALL };

// Script-injection guards. Separate from `active`: a script that has been
// injected stays in the page even if consent is later withdrawn, so
// "is it loaded" and "may it run" are different questions.
let gaInjected = false;
let pixelInjected = false;

// ── storage ────────────────────────────────────────────────────────────────

function readStored(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentState> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
    };
  } catch {
    return null;
  }
}

/**
 * Old records were written while GA4 ran regardless of the answer, so they do
 * not all mean what they say:
 *
 *   'denied'  → an explicit refusal. Honour it (both categories off) and do
 *               not pester the visitor again. Over-honouring a "no" harms
 *               nobody.
 *   'granted' → NOT carried over. That accept was given to a banner whose
 *               analytics half was a fiction (GA ran either way) and which
 *               named neither processor. It cannot be evidence of informed
 *               consent for analytics, and a consent record that is wrong on
 *               one category is not one to lean on for the other. The record
 *               is dropped and the visitor is asked once, properly.
 */
function migrateLegacyChoice(): ConsentState | null {
  let legacy: string | null = null;
  try {
    legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!legacy) return null;
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (legacy !== 'denied') return null;
  const denied = { ...DENY_ALL };
  persist(denied);
  return denied;
}

function persist(state: ConsentState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, v: 2, ts: new Date().toISOString() }),
    );
  } catch {
    /* private mode — the session still honors the choice in memory */
  }
}

/** The stored choice, or `null` when the visitor has not decided yet. */
export function getConsent(): ConsentState | null {
  return readStored() ?? migrateLegacyChoice();
}

/** True when this category may currently run. Never guesses: default is no. */
export function hasConsent(category: ConsentCategory): boolean {
  return active[category] === true;
}

/** Record an explicit choice, apply it immediately, and tell the UI. */
export function setConsent(state: ConsentState): void {
  const next: ConsentState = {
    analytics: state.analytics === true,
    marketing: state.marketing === true,
  };
  persist(next);
  applyConsent(next);
  listeners.forEach((l) => l(next));
}

/**
 * Re-open the banner (footer "Cookie settings"): clear the stored choice and
 * fall back to denied until the visitor answers again — withdrawal takes
 * effect the moment they ask to change it, not when they finish choosing.
 */
export function resetConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  applyConsent(DENY_ALL);
  listeners.forEach((l) => l(null));
}

export function onConsentChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

// ── applying a choice ──────────────────────────────────────────────────────

function applyConsent(state: ConsentState): void {
  active = { ...state };
  if (typeof window === 'undefined') return;

  if (state.analytics) loadAnalytics();
  else revokeAnalytics();

  if (state.marketing) loadMarketing();
  else revokeMarketing();
}

/** Deletes a cookie by name across the paths/domains a vendor may have set it on. */
function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  // "example.com" → ["example.com", ".example.com", ".liboworld.com"-style parent]
  const domains = new Set<string>(['', host, `.${host}`]);
  const parts = host.split('.');
  if (parts.length > 2) domains.add(`.${parts.slice(-2).join('.')}`);
  for (const domain of domains) {
    document.cookie =
      `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/` +
      (domain ? `; domain=${domain}` : '');
  }
}

function deleteCookiesMatching(test: (name: string) => boolean): void {
  if (typeof document === 'undefined' || !document.cookie) return;
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]?.trim();
    if (name && test(name)) deleteCookie(name);
  }
}

// ── Google Analytics 4 (category: analytics) ───────────────────────────────

/** Idempotent. Only ever called from `applyConsent` with analytics granted. */
function loadAnalytics(): void {
  // GA's documented opt-out flag. Cleared here so a visitor who rejected and
  // later accepted gets a working GA without reloading the page.
  (window as unknown as Record<string, boolean>)[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
  if (gaInjected) return;
  gaInjected = true;

  window.dataLayer = window.dataLayer || [];
  // gtag pushes the `arguments` object itself — not a copy. GA's own snippet
  // relies on that shape; spreading into an array breaks command parsing.
  function gtag(): void {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  }
  window.gtag = gtag as unknown as (...args: unknown[]) => void;
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);
  window.__liboGaPath = window.location.pathname;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);
}

function revokeAnalytics(): void {
  if (typeof window === 'undefined') return;
  (window as unknown as Record<string, boolean>)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  // _ga, _ga_<container>, _gid, _gat_* — everything gtag.js sets client-side.
  deleteCookiesMatching((n) => n.startsWith('_ga') || n.startsWith('_gid') || n.startsWith('_gat'));
}

// ── Meta Pixel (category: marketing) ───────────────────────────────────────

/** Idempotent: injects the Meta Pixel once. Called only after marketing opt-in. */
function loadMarketing(): void {
  if (pixelInjected) return;
  pixelInjected = true;

  // ── Meta Pixel base code (Meta-Pixel-Setup doc Step 1) ──
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
    if (s && s.parentNode) s.parentNode.insertBefore(t, s);
    else document.head.appendChild(t);
  }
  /* eslint-enable */
  window.fbq!('init', META_PIXEL_ID);
  window.fbq!('track', 'PageView');
  window.__liboPixelPath = window.location.pathname;
}

function revokeMarketing(): void {
  // fbevents.js has no kill switch, so the track* helpers below are the gate
  // (they all check `hasConsent('marketing')`). Its cookies go regardless.
  deleteCookiesMatching((n) => n === '_fbp' || n === '_fbc');
}

// ── event helpers — every one is a no-op without the matching consent ──────

/** SPA page view — call on route change. */
export function trackPageView(pathname: string): void {
  if (typeof window === 'undefined') return;

  if (hasConsent('marketing') && window.fbq) {
    // init() already counted the path it loaded on — don't double-fire it.
    if (window.__liboPixelPath !== pathname) {
      window.__liboPixelPath = pathname;
      window.fbq('track', 'PageView');
    }
  }

  // GA4's enhanced measurement does not see SPA route changes here (the
  // History-change trigger only fires for pushState it observes on the
  // gtag-loaded page), so send them explicitly, with the same guard against
  // re-counting the path 'config' already reported.
  if (hasConsent('analytics') && window.gtag) {
    if (window.__liboGaPath !== pathname) {
      window.__liboGaPath = pathname;
      window.gtag('event', 'page_view', {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }
}

/**
 * Lead (Meta-Pixel-Setup Step 3) — fire ONLY on confirmed success of the
 * waitlist insert, never on click. eventID enables server-side dedup later.
 */
export function trackLead(): void {
  if (!hasConsent('marketing') || !window.fbq) return;
  window.fbq('track', 'Lead', {}, { eventID: crypto.randomUUID() });
}

/**
 * Funnel film play — custom event, fired once per mount on the first press of
 * the play button, never on load. The point is to see what share of /join and
 * /cash-challenges traffic actually starts the film; a fire-on-render event
 * would just re-count pageviews.
 */
export function trackVideoPlay(name: string): void {
  if (!hasConsent('marketing') || !window.fbq) return;
  window.fbq('trackCustom', 'FunnelVideoPlay', { video: name });
}

/** Boot: re-apply whatever the visitor chose on a previous visit. */
export function initConsent(): void {
  const stored = getConsent();
  applyConsent(stored ?? DENY_ALL);
}
