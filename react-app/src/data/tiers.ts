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
 *     it is not an Elite perk. Elite (Phase 2) unlocks no higher payout.
 *   - Challenge numbers (payout · reps/day) are duplicated from
 *     src/data/challengeTiers.ts — that file is the source of truth for
 *     /cash-challenges and the funnels. Change them THERE first, then mirror.
 *   - Freeze tokens: the per-tier number is the GRANT, not the ceiling. Every
 *     tier can earn +1 more by training 60 of the last 90 days (canon §5.2).
 *     Premium's grant was cut 2 → 1 on 2026-08-10 (migration deployed to
 *     staging + production). User-facing framing across all five locales is
 *     "1 freeze token per challenge, +1 you can earn" — match it here.
 *   - Giveaways of every kind are Phase 2 — see the note on the Free tier below
 *     and canon REWARDS-ECONOMY-RULES.md §8 "Phase 2 — NOT FOR LAUNCH".
 *   - "Elite-exclusive" framing reserved for genuinely rare campaigns (€5k+),
 *     and only once Elite itself returns in Phase 2.
 */

// YEARLY_PRICE is the annual TOTAL (per-month equivalent = /12). Premium is
// shown to users as €6.67/mo billed annually (= €79.99/yr, 49% off €12.99/mo).
// Launch/introductory pricing — competitive with training apps (Alpha, Liftoff
// €79.99/yr); to be raised as rewards/partner-discounts/features land (Dec/Jan).
export const MONTHLY_PRICE = { premium: 12.99, elite: 19.99 } as const;
export const YEARLY_PRICE = { premium: 79.99, elite: 149 } as const;
export const YEARLY_DISCOUNT = { premium: 49, elite: 37 } as const;
export const TRIAL_DAYS = 7;

export type TierId = 'free' | 'premium' | 'elite';
export type BillingCycle = 'monthly' | 'yearly';

/**
 * Tiers shown to users at launch. Elite is deferred until signed partner
 * discounts justify a higher tier (mirrors LAUNCH_TIERS in
 * libo-app-v2/src/constants/tierFeatures.ts). The full TIERS array and
 * COMPARISON_GROUPS below keep their Elite data intact and dormant — to
 * relaunch Elite, add 'elite' here. Render sites map over VISIBLE_TIERS and
 * VISIBLE_COMPARISON_TIERS, never the raw arrays.
 */
export const VISIBLE_TIER_IDS: readonly TierId[] = ['free', 'premium'] as const;
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
      // No giveaway bullet here. Giveaways (common, premium, special, prize
      // draws, entry allocation) are Phase 2 — canon
      // Brand-Management/Project-Structure/canon/REWARDS-ECONOMY-RULES.md §8
      // "Phase 2 — NOT FOR LAUNCH"; §3 launches Free + Premium only.
      // NOTE: VISIBLE_TIER_IDS / isTierVisible do NOT protect us here — they
      // only hide Elite. A giveaway promise written onto Free or Premium ships
      // the moment anything renders these tiers. Same applies to the Premium
      // features below and to the COMPARISON_GROUPS rows.
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
      'AI workout generator',
      'Advanced analytics',
      '2× Libo',
      // GRANT, not ceiling. Canon §5.2: Premium is granted 1 and can earn a
      // second (train 60 of the last 90 days). Cut 2 → 1 on 2026-08-10.
      '1 freeze token per challenge, +1 you can earn',
      // Giveaway / prize-draw bullet removed — Phase 2, see the Free tier note above.
      // Premium unlocks BOTH gated challenges in src/data/challengeTiers.ts:
      // 'committed' (€15 · 60 reps) and 'flagship' (€50 · 100 reps), both
      // requiresPremium: true. Canon §7.4 — no maximum tier, so the €50 run is
      // reachable on Premium; it is not held back for Elite.
      'Cash challenges up to €50 (€15 · 60 reps/day, €50 · 100 reps/day)',
    ],
    cta: `Start ${TRIAL_DAYS}-day free trial`,
    href: '/onboarding?tier=premium',
    highlight: 'accent',
  },
  {
    id: 'elite',
    name: 'Elite',
    // Tagline no longer claims "biggest prizes": Elite unlocks no challenge
    // above Premium's €50 (canon §7.4 — minimum tier only, never a maximum),
    // and "prizes" is prize-draw wording that was deliberately cut from this file.
    tagline: 'The full experience.',
    monthlyLabel: `€${MONTHLY_PRICE.elite.toFixed(2)}`,
    yearlyLabel: `€${(YEARLY_PRICE.elite / 12).toFixed(2)}`,
    monthlySubline: '/month',
    yearlySubline: '/mo billed annually',
    badge: 'Elite',
    features: [
      'Everything in Premium',
      'Exclusive seasonal workouts',
      '3× Libo',
      // Canon §5.2: Elite grant stays 3, plus the same universal +1 earn path.
      '3 freeze tokens per challenge, +1 you can earn',
      // NOT a bigger payout than Premium — challengeTiers.ts tops out at the
      // €50 / 100-rep 'flagship', which Premium already unlocks. Elite's edge
      // here is the freeze grant above, not a higher cash ceiling.
      'Cash challenges up to €50 (100 reps/day)',
      'Priority on rare Elite-exclusive campaigns',
      'Creator perks',
      'Early access to new features',
    ],
    cta: `Start ${TRIAL_DAYS}-day free trial`,
    href: '/onboarding?tier=elite',
    highlight: 'warning',
  },
];

/** Tier cards currently shown to users (Free + Premium at launch). */
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
 * Drops the Elite column while Elite is deferred.
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
      { label: 'Curated workouts', free: '20', premium: '140+', elite: '140+ exclusives' },
      { label: 'Exercise library (600+)', free: true, premium: true, elite: true },
      { label: 'Custom workout builder', free: false, premium: true, elite: true },
      { label: 'AI workout generator', free: false, premium: true, elite: true },
      { label: 'Seasonal exclusive workouts', free: false, premium: false, elite: true },
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
      // canon §7.4 gives challenges a minimum tier and never a maximum, so
      // Premium (and Elite) reach the €50 / 100-rep flagship. Hence "up to".
      { label: 'Cash-challenge reward', free: '€5', premium: 'up to €50', elite: 'up to €50' },
      { label: 'Reps per day', free: '30', premium: 'up to 100', elite: 'up to 100' },
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
      { label: 'Elite-exclusive campaigns', free: false, premium: false, elite: true },
    ],
  },
  {
    title: 'Other',
    rows: [
      { label: 'Creator perks', free: false, premium: false, elite: true },
      { label: 'Early access to features', free: false, premium: false, elite: true },
    ],
  },
];
