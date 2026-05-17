/**
 * Funnel signup capture for /giveaway and /cash-challenge landing pages.
 *
 * v1 (current): writes (email + funnel + tier_slug + UTM params) into
 * Supabase `funnel_signups`. RLS allows anon insert, no read. Duplicate
 * rows per (email, funnel, tier_slug, giveaway_id) are blocked at the DB
 * level via a unique index — we surface that as a friendly "already on
 * the list" state, mirroring how Landing.tsx handles `waitlist`.
 *
 * ─────────────────────────────────────────────────────────────────────
 * v2 ARCHITECTURE — Stripe-backed package purchase
 * ─────────────────────────────────────────────────────────────────────
 * Replace `submitFunnelInterest` with a Stripe Checkout session for
 * /giveaway packages. Cash-challenge stays email-only (slot reservation
 * happens in-app via existing `enroll_in_cycle` RPC).
 *
 * Flow:
 *   1. Visitor clicks SELECT → opens modal → enters email + clicks Buy
 *   2. Frontend calls Edge Function `create_checkout_session`:
 *        - Returns Stripe Checkout URL (mode='subscription' since the
 *          package includes a Premium trial that auto-renews)
 *        - Stripe Customer is created/found by email
 *        - Stripe Subscription is configured with:
 *            * trial_period_days = tier-specific (7 / 14 / 30)
 *            * Recurring price item = Premium €9.99/mo
 *            * One-off line item = the package bonus (entries+points)
 *   3. User completes Stripe Checkout (card collected)
 *   4. Stripe webhook `checkout.session.completed` fires →
 *      `purchase_funnel_package` Postgres RPC routes the user:
 *
 *        SELECT user_id FROM auth.users WHERE email = $1;
 *        IF NULL → auth.signup({email}) creates user + magic link
 *        ELSE    → reuse existing user_id (entries STACK)
 *
 *        INSERT INTO tickets_ledger (user_id, amount, reason='funnel_purchase', reference_id=stripe_session_id);
 *        INSERT INTO points_ledger  (user_id, amount, reason='funnel_purchase', reference_id=stripe_session_id);
 *        UPSERT subscriptions
 *           SET tier='premium', status='trialing',
 *               trial_ends_at = NOW() + tier_trial_length,
 *               stripe_customer_id, stripe_subscription_id;
 *
 *   5. Email user: "You're in! Download Libo + log in with [email]."
 *      Magic link routes to mobile app via universal-link handler.
 *
 *   6. After trial:
 *        - Stripe auto-charges €9.99/mo (subscription continues)
 *        - User can cancel via mobile app (RevenueCat) or via Stripe
 *          billing portal link in their account email
 *
 * Idempotency: the Stripe `session_id` is stored as `reference_id` in
 * both ledgers (UNIQUE constraint already exists), so webhook retries
 * are safe — duplicate inserts no-op.
 *
 * Existing-user case: if the email matches an existing auth.users row
 * with an active subscription, we DON'T downgrade their plan or restart
 * their trial — we just stack the entries+points and skip the
 * subscriptions UPSERT (or extend their period if their tier matches).
 */
import { supabase } from './supabase';

export type FunnelKind = 'giveaway' | 'cash_challenge';

export type GiveawayTierSlug = 'entry' | 'bronze' | 'silver' | 'gold' | 'platinum';
export type ChallengeTierSlug = 'starter' | 'pro_pool' | 'elite_pool';
export type FunnelTierSlug = GiveawayTierSlug | ChallengeTierSlug;

export type FunnelSubmitResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; error: 'invalid_email' | 'network' | 'unknown' };

export type FunnelSubmitInput = {
  email: string;
  fullName?: string;
  phone?: string;
  funnel: FunnelKind;
  tierSlug: FunnelTierSlug;
  giveawayId?: string | null;
};

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

function readUtm(): Record<string, string | null> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const out: Record<string, string | null> = {};
  for (const k of UTM_KEYS) out[k] = params.get(k);
  return out;
}

function readReferrer(): string | null {
  if (typeof document === 'undefined') return null;
  return document.referrer || null;
}

function readUserAgent(): string | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.userAgent || null;
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Strips ASCII control characters (\x00-\x1F and \x7F). They have no business
// in any of these fields and are a common smuggling vector.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\x00-\x1F\x7F]/g;

function stripControlChars(s: string): string {
  return s.replace(CONTROL_CHARS_RE, '');
}

function clamp(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Sanitise a free-text name field. Trims, strips control chars, clamps to
 * `max`. Returns null for empty input. We do NOT HTML-escape here — JSX
 * auto-escapes on render, and double-escaping shows up as literal entities
 * in the admin UI.
 */
export function sanitizeFullName(input: string | null | undefined, max = 80): string | null {
  if (!input) return null;
  const cleaned = clamp(stripControlChars(String(input).trim()), max);
  return cleaned || null;
}

/**
 * Sanitise a phone field: trim, strip control chars, clamp to `max`, then
 * keep only `[+\d\-\s()]`. Returns null if nothing usable remains.
 */
export function sanitizePhone(input: string | null | undefined, max = 30): string | null {
  if (!input) return null;
  const trimmed = clamp(stripControlChars(String(input).trim()), max);
  const filtered = trimmed.replace(/[^+\d\-\s()]/g, '');
  return filtered || null;
}

/**
 * Sanitise referrer / user_agent: trim, strip control chars, clamp to 2000.
 */
export function sanitizeLongText(input: string | null | undefined, max = 2000): string | null {
  if (!input) return null;
  const cleaned = clamp(stripControlChars(String(input).trim()), max);
  return cleaned || null;
}

/**
 * Sanitise a UTM parameter: trim, strip control chars, clamp to 200, then
 * keep only `[A-Za-z0-9._\-]`. UTM values are tracking codes, not free text;
 * anything else is almost certainly an injection attempt.
 */
export function sanitizeUtm(input: string | null | undefined, max = 200): string | null {
  if (!input) return null;
  const trimmed = clamp(stripControlChars(String(input).trim()), max);
  const filtered = trimmed.replace(/[^A-Za-z0-9._-]/g, '');
  return filtered || null;
}

/**
 * Anonymous click logger — used by /cash-challenge's RESERVE buttons and
 * the /get-app QR-redirect endpoint. Captures (funnel, tier_slug, UTM,
 * referrer, user_agent) into funnel_signups with email=NULL so we can
 * see "X% of visitors clicked Pro Pool, Y% Elite Pool" without forcing
 * a contact form on people who just want to download the app.
 *
 * Fire-and-forget: the network call runs but we never throw or await it
 * past returning — navigation continues regardless of whether the row
 * lands. Schema requires that funnel_signups.email be NULLABLE
 * (see supabase-migration-funnel-signups-email-nullable.sql).
 */
export async function logFunnelClick(args: {
  funnel: FunnelKind;
  tierSlug: FunnelTierSlug;
  giveawayId?: string | null;
}): Promise<void> {
  const utm = readUtm();
  const row = {
    email: null,
    full_name: null,
    phone: null,
    funnel: args.funnel,
    tier_slug: args.tierSlug,
    giveaway_id: args.giveawayId ?? null,
    utm_source: sanitizeUtm(utm.utm_source),
    utm_medium: sanitizeUtm(utm.utm_medium),
    utm_campaign: sanitizeUtm(utm.utm_campaign),
    utm_content: sanitizeUtm(utm.utm_content),
    utm_term: sanitizeUtm(utm.utm_term),
    referrer: sanitizeLongText(readReferrer()),
    user_agent: sanitizeLongText(readUserAgent()),
  };
  try {
    await supabase.from('funnel_signups').insert(row);
  } catch {
    // Swallow — never block navigation on analytics
  }
}

export async function submitFunnelInterest(input: FunnelSubmitInput): Promise<FunnelSubmitResult> {
  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) return { ok: false, error: 'invalid_email' };

  const utm = readUtm();
  const row = {
    email,
    full_name: sanitizeFullName(input.fullName),
    phone: sanitizePhone(input.phone),
    funnel: input.funnel,
    tier_slug: input.tierSlug,
    giveaway_id: input.giveawayId ?? null,
    utm_source: sanitizeUtm(utm.utm_source),
    utm_medium: sanitizeUtm(utm.utm_medium),
    utm_campaign: sanitizeUtm(utm.utm_campaign),
    utm_content: sanitizeUtm(utm.utm_content),
    utm_term: sanitizeUtm(utm.utm_term),
    referrer: sanitizeLongText(readReferrer()),
    user_agent: sanitizeLongText(readUserAgent()),
  };

  try {
    const { error } = await supabase.from('funnel_signups').insert(row);
    if (!error) return { ok: true, duplicate: false };
    if (error.code === '23505') return { ok: true, duplicate: true };
    return { ok: false, error: 'unknown' };
  } catch {
    return { ok: false, error: 'network' };
  }
}
