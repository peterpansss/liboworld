/**
 * The three cash-challenge tiers. Single source of truth for the overview page
 * (/cash-challenges) and the three funnel pages (/cash-challenges/:tier).
 *
 * Payouts are €5 / €15 / €50 — MASTER-HANDOFF §15. Older docs say €10 for the
 * middle tier; that is the superseded v1 round, do not reintroduce it.
 *
 * Copy rule: "earn", never "win". A prize-draw connotation is exactly what this
 * product is not — the payout is set aside when you join and is funded by Libo,
 * never by other members failing.
 */

export type ChallengeTierSlug = 'starter' | 'committed' | 'flagship';

export type ChallengeTier = {
  slug: ChallengeTierSlug;
  /** Payout in euros, rendered as €{payout}. */
  payout: number;
  /** Daily rep target. */
  reps: number;
  days: number;
  /**
   * No participant cap here on purpose. Canon (REWARDS-ECONOMY-RULES §7.1c)
   * makes the cap an internal operational parameter that must never reach
   * public copy — the site says "Limited spots" with no number. The real cap
   * lives per challenge in Supabase `money_challenges.max_participants` and is
   * set in admin; do not mirror it into front-end data.
   */
  /** Uppercase tier name for cards and funnel headings. */
  name: string;
  /**
   * Free tier entrants join at launch; the paid tiers are unlocked by Premium.
   * Eligibility wording rule: Premium UNLOCKS a tier, it never guarantees
   * entry — spots are first come, first served.
   */
  requiresPremium: boolean;
  /**
   * PLACEHOLDER photography. The designs show three distinct athlete shots that
   * are not in the handoff bundle; these are the closest existing assets. Swap
   * when real tier photography lands. (05-challenge-committed-desktop.png in the
   * bundle is itself a mismatched asset — a shoe still-life among people shots.)
   */
  image: string;
};

export const CHALLENGE_TIERS: readonly ChallengeTier[] = [
  {
    slug: 'starter',
    payout: 5,
    reps: 30,
    days: 30,
    name: 'Starter',
    requiresPremium: false,
    image: '/images/marketing/cash-challenge-starter-ai.jpg',
  },
  {
    slug: 'committed',
    payout: 15,
    // 50, not 60. Verified against production `money_challenges` 2026-08-29:
    // reps_50_30d_pro_v1 is reps_per_day = 50, reward 15.00 EUR. The site had
    // published 60, which told people to do more work than the challenge they
    // would actually enrol in requires. The database is the source of truth
    // here — this file mirrors it.
    reps: 50,
    days: 30,
    name: 'Committed',
    requiresPremium: true,
    // Tier photo (Noah, 2026-08-07) — new filename to sidestep the CF asset cache.
    image: '/challenge-committed.jpg',
  },
  {
    slug: 'flagship',
    payout: 50,
    reps: 100,
    days: 30,
    name: 'Flagship',
    requiresPremium: true,
    image: '/images/marketing/cash-challenge-flagship-ai.jpg',
  },
] as const;

export function getChallengeTier(slug: string | undefined): ChallengeTier | undefined {
  return CHALLENGE_TIERS.find((tier) => tier.slug === slug);
}

/**
 * Marketing slugs → the tier slugs `funnel_signups` already stores
 * (see `FunnelTierSlug` in src/lib/funnelSignups.ts). The analytics vocabulary
 * predates the €5/€15/€50 naming; mapping here keeps historical rows joinable
 * instead of forking the enum.
 */
export const FUNNEL_TIER_SLUG: Record<ChallengeTierSlug, 'starter' | 'pro_pool' | 'elite_pool'> = {
  starter: 'starter',
  committed: 'pro_pool',
  flagship: 'elite_pool',
};
