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
 *   - Cash challenges run on ALL tiers; rewards + daily reps scale by tier.
 *   - Common product giveaways: all tiers.
 *   - Premium + Special giveaways: Premium AND Elite.
 *   - "Elite-exclusive" framing reserved for genuinely rare campaigns (€5k+).
 */

export const MONTHLY_PRICE = { premium: 9.99, elite: 19.99 } as const;
export const YEARLY_PRICE = { premium: 79, elite: 149 } as const;
export const YEARLY_DISCOUNT = { premium: 34, elite: 37 } as const;
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
      'Common product giveaways',
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
    yearlyLabel: `€${YEARLY_PRICE.premium}`,
    monthlySubline: '/month',
    yearlySubline: `/year — save ${YEARLY_DISCOUNT.premium}%`,
    badge: 'Most popular',
    features: [
      'Everything in Free',
      'Full 140-workout library',
      'Custom workout builder',
      'AI workout generator',
      'Advanced analytics',
      '2× Libo',
      '2 freeze tokens per challenge cycle',
      'Premium giveaways + Special prize draws (e.g. iPhone-class items)',
      'Cash challenges (€10 reward · 50 reps/day)',
    ],
    cta: `Start ${TRIAL_DAYS}-day free trial`,
    href: '/onboarding?tier=premium',
    highlight: 'accent',
  },
  {
    id: 'elite',
    name: 'Elite',
    tagline: 'The full experience, biggest prizes.',
    monthlyLabel: `€${MONTHLY_PRICE.elite.toFixed(2)}`,
    yearlyLabel: `€${YEARLY_PRICE.elite}`,
    monthlySubline: '/month',
    yearlySubline: `/year — save ${YEARLY_DISCOUNT.elite}%`,
    badge: 'Elite',
    features: [
      'Everything in Premium',
      'Exclusive seasonal workouts',
      '3× Libo',
      '3 freeze tokens per challenge cycle',
      'Top cash reward (€50 · 100 reps/day)',
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
      { label: 'Cash-challenge reward', free: '€5', premium: '€10', elite: '€50' },
      { label: 'Reps per day', free: '30', premium: '50', elite: '100' },
      { label: 'Freeze tokens per cycle', free: '0 (earn 1 · train 60 of 90 days)', premium: '2', elite: '3' },
      { label: 'Common product giveaways', free: true, premium: true, elite: true },
      { label: 'Premium + Special giveaways', free: false, premium: true, elite: true },
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
