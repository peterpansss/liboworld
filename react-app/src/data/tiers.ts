/**
 * Tier data — single source of truth shared by the homepage Pricing CTA, the
 * dedicated /pricing page, and the (legacy) PricingSection component on the
 * landing build.
 *
 * Mirrors libo-app-v2/src/constants/tierFeatures.ts. The landing repo builds
 * in isolation so we duplicate the values here. If tier numbers change in the
 * mobile app, update this file too.
 *
 * Tier-by-feature policy (see Brand-Management/Project-Structure/PARTNERSHIP-FINANCE-MODEL.md, Y1):
 *   - Cash challenges run on ALL tiers. A tier does NOT scale the reward — it
 *     raises the CEILING of which challenges you can enter. Canon
 *     REWARDS-ECONOMY-RULES.md §7.4: "a challenge may have a minimum tier,
 *     never a maximum" — Premium sees every challenge a Free user sees, plus
 *     the gated ones. So Premium reaches the €50 / 100-rep Flagship challenge;
 *     it is not an Elite perk. Elite adds Elite-only challenges (creator
 *     challenges among them) on top; never publish an Elite payout here that
 *     the server does not run.
 *   - Challenge numbers (payout · reps/day) are duplicated from
 *     src/data/challengeTiers.ts — that file is the source of truth for
 *     /cash-challenges and the funnels. Change them THERE first, then mirror.
 *   - Freeze tokens: the per-tier number is the GRANT, not the ceiling. Every
 *     tier can earn +1 more by training 60 of the last 90 days (canon §5.2).
 *     Premium's grant was cut 2 → 1 on 2026-08-10 (migration deployed to
 *     staging + production). User-facing framing across all five locales is
 *     "1 freeze token per challenge, +1 you can earn" — match it here.
 *   - Giveaway entries are a BONUS on top of the service (Free 1 / Premium 3 /
 *     Elite 9 per round, the same again per loyalty month — data/giveawayRounds.ts).
 *     Never sell a tier on entries: Elite leads with the coach, Elite-only
 *     challenges and VIP events.
 */

// YEARLY_PRICE is the annual TOTAL (per-month equivalent = /12). Premium is
// shown to users as €10.00/mo billed annually (= €119.99/yr, 50% off €19.99/mo).
// Raised 12 Nov 2026 (Noah) at the start of Phase 2, with zero active
// subscriptions on RevenueCat — so nobody was grandfathered.
// Elite went on sale 19 Nov 2026 (Noah): €29.99/mo or €179.99/yr. Billing is
// monthly or yearly only — the Premium 3-month plan was withdrawn the same
// day and must not appear anywhere on the site.
export const MONTHLY_PRICE = { premium: 19.99, elite: 29.99 } as const;
export const YEARLY_PRICE = { premium: 119.99, elite: 179.99 } as const;
// Premium: 119.99 vs 19.99x12 = 49.98% off; Elite: 179.99 vs 29.99x12 = 49.99%
// off. Both shown as 50.
export const YEARLY_DISCOUNT = { premium: 50, elite: 50 } as const;
// NOTE: there is deliberately no TRIAL_DAYS export. App Store Connect carries
// no introductory offer on either subscription product
// (com.liboworld.app.premium.monthly / .yearly), and the mobile app has shipped
// TIER_TRIAL_DAYS = {free: 0, pro: 0, elite: 0} since 2026-08-22 — a user who
// subscribes is charged immediately. The free tier is the try-before-you-buy
// story; nothing on this site may promise a trial period. If a real
// introductory offer is ever configured in ASC, add the constant back then.

export type TierId = 'free' | 'premium' | 'elite';
export type BillingCycle = 'monthly' | 'yearly';

/**
 * Tiers shown to users. Elite is on sale since 19 Nov 2026 (Noah). Render
 * sites map over VISIBLE_TIERS and VISIBLE_COMPARISON_TIERS, never the raw
 * arrays, so a tier can still be hidden by removing it here.
 */
export const VISIBLE_TIER_IDS: readonly TierId[] = ['free', 'premium', 'elite'] as const;
export const isTierVisible = (id: TierId): boolean => VISIBLE_TIER_IDS.includes(id);

export type Tier = {
  id: TierId;
  name: string;
  tagline: string;
  monthlyLabel: string;
  yearlyLabel: string;
  monthlySubline: string;
  yearlySubline: string;
  badge?: string;
  features: string[];
  cta: string;
  href: string;
  highlight: 'none' | 'accent' | 'warning';
};

export const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Start tracking. No card required.',
    monthlyLabel: '€0',
    yearlyLabel: '€0',
    monthlySubline: 'forever',
    yearlySubline: 'forever',
    features: [
      '20 curated workouts',
      'Reps & kg tracking',
      'Basic progress charts',
      'Rewards program (1× Libo)',
      'AI coach: 1 message a day',
      // Giveaways are live (membership model, 10-13 Nov 2026) with the free
      // postal route live since 14 Nov; the pricing footnote links the rules.
      // Numbers must match data/giveawayRounds.ts (GIVEAWAY_ENTRIES /
      // LOYALTY_PER_MONTH).
      'Every giveaway: 1 entry, +1 every month you train',
      // Starter challenge — src/data/challengeTiers.ts ('starter': €5, 30 reps,
      // requiresPremium: false). Source of truth for these numbers.
      'Cash challenges (€5 reward · 30 reps/day)',
    ],
    cta: 'Get started',
    href: '/onboarding',
    highlight: 'none',
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'Everything you need to train harder.',
    monthlyLabel: `€${MONTHLY_PRICE.premium.toFixed(2)}`,
    yearlyLabel: `€${(YEARLY_PRICE.premium / 12).toFixed(2)}`,
    monthlySubline: '/month',
    yearlySubline: '/mo billed annually',
    badge: 'Most popular',
    features: [
      'Everything in Free',
      'Full 140-workout library',
      'Custom workout builder',
      'Workout generator',
      'Advanced analytics',
      '2× Libo',
      'AI coach: 3 messages a day + voice notes',
      'Community events',
      // GRANT, not ceiling. Canon §5.2: Premium is granted 1 and can earn a
      // second (train 60 of the last 90 days). Cut 2 → 1 on 2026-08-10.
      '1 freeze token per challenge, +1 you can earn',
      'Every giveaway: 3 entries, +3 every month you train',
      // Premium reaches 'committed' (€15 · 50 reps) in src/data/challengeTiers.ts.
      // The €50 flagship is Elite only since 22 Nov 2026 (minTier 'elite').
      'The €15 cash challenge (50 reps/day, 30 days)',
    ],
    cta: 'Get Premium',
    href: '/onboarding?tier=premium',
    highlight: 'accent',
  },
  {
    id: 'elite',
    name: 'Elite',
    // Leads with the service (coach, Elite-only challenges, VIP events), not
    // with entries — entries are a bonus, never the pitch (Noah, 19 Nov 2026).
    tagline: 'More coaching. Elite-only challenges. VIP events.',
    monthlyLabel: `€${MONTHLY_PRICE.elite.toFixed(2)}`,
    yearlyLabel: `€${(YEARLY_PRICE.elite / 12).toFixed(2)}`,
    monthlySubline: '/month',
    yearlySubline: '/mo billed annually',
    badge: 'Full access',
    features: [
      'Everything in Premium',
      'AI coach: 10 messages a day + voice notes',
      '€50 cash challenge (100 reps/day) + Elite-only creator challenges',
      'VIP events',
      'Early access to new features',
      '3× Libo',
      'Every giveaway: 9 entries, +9 every month you train',
    ],
    cta: 'Get Elite',
    href: '/onboarding?tier=elite',
    highlight: 'warning',
  },
];

/** Tier cards currently shown to users (Free, Premium, Elite). */
export const VISIBLE_TIERS: Tier[] = TIERS.filter((t) => isTierVisible(t.id));

export function buildHref(base: string, id: TierId, cycle: BillingCycle): string {
  if (id === 'free') return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}cycle=${cycle}`;
}

// Comparison-table rows for the dedicated /pricing page. Each row maps a
// human label to per-tier values. Kept here (not in TIERS) because the table
// view groups features by capability — orthogonal to the bullet list.
export type ComparisonRow = {
  label: string;
  free: string | boolean;
  premium: string | boolean;
  elite: string | boolean;
  group?: string;
};

/** Read a row's value for a given tier column. */
export const comparisonValue = (row: ComparisonRow, id: TierId): string | boolean =>
  id === 'free' ? row.free : id === 'premium' ? row.premium : row.elite;

/**
 * Comparison-table columns currently rendered, with their display headers.
 * A column drops out when its tier is removed from VISIBLE_TIER_IDS.
 */
export const VISIBLE_COMPARISON_TIERS: Array<{ id: TierId; label: string }> = [
  { id: 'free', label: 'Free' },
  { id: 'premium', label: 'Premium' },
  ...(isTierVisible('elite') ? [{ id: 'elite' as TierId, label: 'Elite' }] : []),
];

/**
 * Rows worth showing for the visible columns. A row whose only "yes" is in a
 * hidden tier (e.g. an Elite-only perk) would render as all-empty across the
 * visible columns, so we drop it.
 */
export function visibleComparisonRows(rows: ComparisonRow[]): ComparisonRow[] {
  return rows.filter((row) =>
    VISIBLE_COMPARISON_TIERS.some(({ id }) => comparisonValue(row, id) !== false)
  );
}

export const COMPARISON_GROUPS: Array<{ title: string; rows: ComparisonRow[] }> = [
  {
    title: 'Library & training',
    rows: [
      { label: 'Curated workouts', free: '20', premium: '140+', elite: '140+' },
      { label: 'Exercise library (600+)', free: true, premium: true, elite: true },
      { label: 'Custom workout builder', free: false, premium: true, elite: true },
      { label: 'Workout generator', free: false, premium: true, elite: true },
    ],
  },
  {
    title: 'Tracking & analytics',
    rows: [
      { label: 'Reps & kg tracking', free: true, premium: true, elite: true },
      { label: 'Basic progress charts', free: true, premium: true, elite: true },
      { label: 'Advanced analytics', free: false, premium: true, elite: true },
    ],
  },
  {
    title: 'Rewards & challenges',
    rows: [
      { label: 'Rewards Libo', free: '1×', premium: '2×', elite: '3×' },
      // Reward + reps mirror src/data/challengeTiers.ts (starter €5/30,
      // committed €15/60, flagship €50/100) — that file is the source of truth.
      // A paid tier raises the CEILING, it does not scale a single reward:
      // canon §7.4 gives challenges a minimum tier and never a maximum. Since
      // 22 Nov 2026 the €50 / 100-rep flagship's minimum is Elite, so Premium
      // tops out at €15 / 50 reps. Hence "up to" on Elite only.
      { label: 'Cash-challenge reward', free: '€5', premium: '€15', elite: 'up to €50' },
      { label: 'Reps per day', free: '30', premium: '50', elite: 'up to 100' },
      // Granted, then the universal earn path (canon §5.2) — same shape in all
      // three columns. Premium's grant is 1, not 2; 2 is its max per challenge.
      {
        label: 'Freeze tokens per cycle',
        free: '0 (earn 1 · train 60 of 90 days)',
        premium: '1 (earn 1 · train 60 of 90 days)',
        elite: '3 (earn 1 · train 60 of 90 days)',
      },
      // Giveaway rows removed — Phase 2 (canon REWARDS-ECONOMY-RULES.md §8).
      // They were truthy on Free/Premium, so visibleComparisonRows() kept them:
      // that filter only drops rows whose sole "yes" is the hidden Elite column.
      { label: 'Elite-only challenges (incl. creator challenges)', free: false, premium: false, elite: true },
    ],
  },
  {
    title: 'Other',
    rows: [
      { label: 'AI coach messages per day', free: '1', premium: '3 + voice', elite: '10 + voice' },
      { label: 'Community events', free: false, premium: true, elite: true },
      { label: 'VIP events', free: false, premium: false, elite: true },
      { label: 'Early access to features', free: false, premium: false, elite: true },
    ],
  },
];
