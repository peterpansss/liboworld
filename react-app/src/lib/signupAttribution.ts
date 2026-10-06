/**
 * Signup attribution — "which platform, and where did they come from".
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * ─────────────────────────────────────────────────────────────────────────
 * Until now the web captured nothing about a signup's origin, so the admin
 * panel could not tell a liboworld.com signup from an iOS or Android one,
 * and could not see which ad or post produced it.
 *
 * The contract (fixed — do NOT rename these keys; a DB trigger copies them
 * from auth.users.raw_user_meta_data into public.profiles):
 *
 *   signup_platform  always the string 'web'
 *   signup_source    utm_source from the LANDING url, else the referrer's
 *                    host, else 'organic'
 *   signup_campaign  utm_campaign from the landing url, else null
 *   signup_locale    navigator.language
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY IT MUST BE PERSISTED (and not just read at signup time)
 * ─────────────────────────────────────────────────────────────────────────
 * A visitor lands on `/?utm_source=tiktok&utm_campaign=x`, browses to
 * /join, and converts three routes later. By then `window.location.search`
 * is empty and `document.referrer` is either blank (SPA navigation never
 * sets it) or our own host. Reading either at the moment of signup yields
 * 'organic' for every single paid click — which is worse than no data,
 * because it reads as a real answer.
 *
 * So the landing values are captured ONCE, on first load, and read back at
 * signup. `readUtm()` in funnelSignups.ts had exactly this bug and now
 * delegates here.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STORAGE: sessionStorage (deliberate — see below before changing it)
 * ─────────────────────────────────────────────────────────────────────────
 * sessionStorage, not localStorage, for three reasons:
 *
 *  1. CORRECTNESS. The question is "what brought THIS signup", i.e. this
 *     visit. localStorage would keep a March TikTok click on the device
 *     forever and misattribute a June organic signup to it. Session scope
 *     is the honest window: last touch within the visit that converted.
 *  2. DATA MINIMISATION. sessionStorage dies with the tab. It is per-visit
 *     state for a request the visitor themselves initiated (they carried
 *     the utm_* params in in their own URL), not a durable marketing
 *     identifier persisted across visits.
 *  3. IT IS NOT AN IDENTIFIER. Nothing here is unique to a person; it is
 *     the campaign label the visitor arrived with.
 *
 * The cost is real and accepted: land with a UTM, close the tab, come back
 * tomorrow and sign up → 'organic'. Under-attributing is the safe failure
 * direction. If first-touch-across-visits is ever wanted, that is a product
 * + privacy decision, not a one-line storage swap.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CONSENT — READ THIS. NOT settled by me; flagged for a human.
 * ─────────────────────────────────────────────────────────────────────────
 * This module is NOT behind the src/lib/consent.ts gate. That gate exists
 * for third-party trackers (GA4, Meta Pixel) that inject vendor script and
 * ship data off-site; nothing here loads a script, sets a cookie, or talks
 * to a third party, and the values only ever travel to our own Supabase
 * attached to the account the visitor is deliberately creating.
 *
 * It is also consistent with what this repo already does: `logFunnelClick`
 * and `submitFunnelInterest` in funnelSignups.ts have been sending
 * utm_source/medium/campaign/content/term, document.referrer AND the full
 * navigator.userAgent to `capture_funnel_signup` un-gated for a long time.
 * Putting this one path behind the banner while those stay open would be
 * inconsistent, not more protective.
 *
 * BUT: §25 TDDDG gates *any* read/write of device storage, not just
 * third-party ones, and exempts only what is strictly necessary for a
 * service the user asked for. Marketing attribution is arguably not
 * strictly necessary. I am not confident which side of §25(2) a
 * session-scoped, first-party, non-identifying campaign label falls on,
 * and I did not want to make that call silently.
 *
 * If the answer is "it needs consent", the change is contained: gate the
 * body of `captureAttribution()` and `readStored()` on
 * `hasConsent('analytics')` and subscribe via `onConsentChange` so the
 * capture runs on the grant. Everything else keeps working — un-stored
 * attribution just degrades to 'organic'.
 */

const STORAGE_KEY = 'libo-attribution-v1';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
type UtmKey = (typeof UTM_KEYS)[number];

export type UtmRecord = Record<UtmKey, string | null>;

/** Exactly the four contract keys, nothing else. */
export type SignupMetadata = {
  signup_platform: 'web';
  signup_source: string;
  signup_campaign: string | null;
  signup_locale: string | null;
};

type StoredAttribution = UtmRecord & {
  /** Host of the external referrer on the landing page, 'www.' stripped. */
  referrer_host: string | null;
  /** First-touch timestamp — debugging only, never sent. */
  ts: string;
};

const EMPTY_UTM: UtmRecord = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
};

// ── sanitising ─────────────────────────────────────────────────────────────

// Same rule as sanitizeUtm() in funnelSignups.ts, duplicated here rather than
// imported: funnelSignups imports THIS module, and importing back would be a
// cycle. UTM values are tracking codes, not free text — strip control chars,
// clamp, then keep only [A-Za-z0-9._-] (which also covers hostnames).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\x00-\x1F\x7F]/g;

function clean(input: string | null | undefined, max = 200): string | null {
  if (!input) return null;
  const trimmed = String(input).trim().replace(CONTROL_CHARS_RE, '').slice(0, max);
  const filtered = trimmed.replace(/[^A-Za-z0-9._-]/g, '');
  return filtered || null;
}

// ── reading the current page ───────────────────────────────────────────────

function utmFromLocation(): UtmRecord {
  if (typeof window === 'undefined') return { ...EMPTY_UTM };
  const params = new URLSearchParams(window.location.search);
  const out = { ...EMPTY_UTM };
  for (const k of UTM_KEYS) out[k] = clean(params.get(k));
  return out;
}

/**
 * The referrer's host, or null when there isn't a usable external one.
 *
 * Returns null for: no referrer, an unparseable one, and — importantly —
 * our own host, so an internal navigation never masquerades as a source.
 */
function externalReferrerHost(): string | null {
  if (typeof document === 'undefined' || !document.referrer) return null;
  try {
    const host = new URL(document.referrer).hostname.replace(/^www\./, '');
    if (!host) return null;
    const self = window.location.hostname.replace(/^www\./, '');
    if (host === self) return null;
    // app.liboworld.com → liboworld.com etc. are still us.
    if (self && (host.endsWith(`.${self}`) || self.endsWith(`.${host}`))) return null;
    return clean(host, 253);
  } catch {
    return null;
  }
}

// ── storage ────────────────────────────────────────────────────────────────

function readStored(): StoredAttribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAttribution> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    const out: StoredAttribution = {
      ...EMPTY_UTM,
      referrer_host: clean(parsed.referrer_host, 253),
      ts: typeof parsed.ts === 'string' ? parsed.ts : '',
    };
    for (const k of UTM_KEYS) out[k] = clean(parsed[k]);
    return out;
  } catch {
    // Private mode / storage disabled. Callers fall back to the live URL.
    return null;
  }
}

function persist(record: StoredAttribution): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* private mode — attribution degrades to whatever the live URL says */
  }
}

// ── public API ─────────────────────────────────────────────────────────────

/**
 * Capture the landing page's attribution. Call ONCE at boot, before the
 * router can replace the URL (App.tsx, next to initConsent()).
 *
 * First touch wins, with one upgrade: a session that began with no
 * utm_source and later loads a URL that has one takes the UTM values (a
 * genuine campaign click should not be swallowed by an earlier organic
 * landing). An existing utm_source is never overwritten.
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;

  const fresh = utmFromLocation();
  const stored = readStored();

  if (stored && (stored.utm_source || !fresh.utm_source)) return;

  persist({
    ...fresh,
    // Keep the original landing referrer if we already had one: on the
    // upgrade path document.referrer is our own host by now.
    referrer_host: stored?.referrer_host ?? externalReferrerHost(),
    ts: new Date().toISOString(),
  });
}

/**
 * The landing page's UTM params, surviving navigation.
 *
 * Prefers the persisted first-touch record and falls back to the live URL
 * when storage is unavailable (private mode) or boot capture never ran.
 */
export function getAttributionUtm(): UtmRecord {
  const stored = readStored();
  if (!stored) return utmFromLocation();
  const out = { ...EMPTY_UTM };
  for (const k of UTM_KEYS) out[k] = stored[k];
  return out;
}

/**
 * The metadata to attach to a signup, in the agreed shape. Pass straight
 * through as Supabase auth `options.data` (client-side signup) or as the
 * signup-metadata field of the Edge Function body (server-side signup) —
 * either way it must end up in auth.users.raw_user_meta_data for the
 * trigger to copy into public.profiles.
 */
export function getSignupMetadata(): SignupMetadata {
  const stored = readStored();
  const utm = stored ?? { ...utmFromLocation(), referrer_host: externalReferrerHost(), ts: '' };

  const source = utm.utm_source ?? utm.referrer_host ?? 'organic';

  return {
    signup_platform: 'web',
    signup_source: source,
    signup_campaign: utm.utm_campaign ?? null,
    signup_locale:
      typeof navigator !== 'undefined' && navigator.language ? navigator.language : null,
  };
}
