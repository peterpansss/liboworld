/**
 * Funnel signup capture for /giveaway and /cash-challenge landing pages.
 *
 * v1: writes (email + funnel + tier_slug + UTM params) into Supabase
 * `funnel_signups`. RLS allows anon insert, no read. Duplicate rows
 * per (email, funnel, tier_slug, giveaway_id) are blocked at the DB
 * level via a unique index — we surface that as a friendly "already
 * on the list" state, mirroring how Landing.tsx handles `waitlist`.
 *
 * v2 will replace `submitFunnelInterest('giveaway', ...)` with a
 * Stripe Checkout session creation for real package purchase.
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
