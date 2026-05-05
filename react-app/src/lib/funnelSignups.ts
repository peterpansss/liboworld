/**
 * Funnel signup capture for /giveaway and /cash-challenge landing pages.
 *
 * v1 (intent-only fallback): writes (email + funnel + tier_slug + UTM)
 * into Supabase `funnel_signups`. RLS allows anon insert, no read.
 * Duplicate rows per (email, funnel, tier_slug, giveaway_id) are blocked
 * at the DB level via a unique index — we surface that as a friendly
 * "already on the list" state, mirroring how Landing.tsx handles
 * `waitlist`. Used when Stripe isn't configured (no publishable key /
 * Edge Function).
 *
 * ─────────────────────────────────────────────────────────────────────
 * v2 ARCHITECTURE — Stripe-backed package purchase (ONE-TIME)
 * ─────────────────────────────────────────────────────────────────────
 * Giveaway packages are one-time payments. No subscription, no trial,
 * no auto-renewal. Cash-challenge stays email-only (slot reservation
 * happens in-app via existing `enroll_in_cycle` RPC).
 *
 * Flow:
 *   1. Visitor clicks SELECT → opens modal → enters email + clicks Buy
 *   2. Frontend calls Edge Function `create_payment_intent`:
 *        - Stripe Customer is created/found by email
 *        - PaymentIntent created for the package amount
 *          (entry €5 / silver €25 / gold €75)
 *        - mode='payment' — NO Subscription, NO trial_period_days
 *        - Returns { client_secret, payment_intent_id }
 *   3. Frontend confirms payment via stripe.confirmPayment(clientSecret)
 *      using the PaymentElement in the modal
 *   4. Stripe webhook `payment_intent.succeeded` fires →
 *      `credit_funnel_package` Postgres RPC routes the user:
 *
 *        SELECT user_id FROM auth.users WHERE email = $1;
 *        IF NULL → auth.signup({email}) creates user + magic link
 *        ELSE    → reuse existing user_id (entries STACK)
 *
 *        INSERT INTO tickets_ledger (user_id, amount, reason='funnel_purchase', reference_id=stripe_payment_intent_id);
 *        INSERT INTO points_ledger  (user_id, amount, reason='funnel_purchase', reference_id=stripe_payment_intent_id);
 *
 *        Existing subscriptions row is left untouched — no plan change,
 *        no trial start. Premium upsell (if any) lives in the app.
 *
 *   5. Email user: "You're in! Download Libo + log in with [email]."
 *      Magic link routes to mobile app via universal-link handler.
 *
 * Idempotency: the Stripe `payment_intent_id` is stored as `reference_id`
 * in both ledgers (UNIQUE constraint already exists), so webhook retries
 * are safe — duplicate inserts no-op.
 *
 * NOTE for the Edge Function (`create_payment_intent`, lives in the
 * supabase/ project, not in this repo): it MUST create only a
 * PaymentIntent. Do not attach a Subscription or set trial_period_days.
 * Terms.tsx, FAQ a2, and the package copy all promise one-time billing.
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
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
    utm_term: utm.utm_term,
    referrer: readReferrer(),
    user_agent: readUserAgent(),
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
    full_name: input.fullName?.trim() || null,
    phone: input.phone?.trim() || null,
    funnel: input.funnel,
    tier_slug: input.tierSlug,
    giveaway_id: input.giveawayId ?? null,
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
    utm_term: utm.utm_term,
    referrer: readReferrer(),
    user_agent: readUserAgent(),
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
