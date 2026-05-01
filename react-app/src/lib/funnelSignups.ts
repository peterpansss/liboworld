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
