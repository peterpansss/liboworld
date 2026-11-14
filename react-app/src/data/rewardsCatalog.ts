/**
 * Rewards catalogue as published on the public Rewards Rules page
 * (/rewards-rules). Members swap training points for a gift code or cash
 * (PayPal / Revolut / Wise / bank, Noah 14 Nov 2026) of a fixed value; each
 * value exists once as a gift card and once as cash. No chance is involved.
 *
 * Economy decided by Noah, 13 Nov 2026: 500 points per €1 for every member,
 * no Premium discount. €5 and €10 are open to all members, €20 is Premium
 * only. Premium's advantages are earning 2x and the Premium-only card.
 *
 * The live catalogue (stock, brands, active flag) is edited at /admin/rewards
 * and served by get_reward_catalog(). This file is the published price list:
 * if the admin catalogue's prices or tiers change, change this file and the
 * page's "Last updated" date in the same commit, or the rules go stale.
 */

export type RewardTier = 'free' | 'premium';

export type PublishedReward = {
  /** Card value in euros. */
  valueEur: number;
  /** Price in points. */
  points: number;
  /** Lowest plan that can redeem it. */
  minTier: RewardTier;
};

export const REWARDS_CATALOG: PublishedReward[] = [
  { valueEur: 5, points: 2500, minTier: 'free' },
  { valueEur: 10, points: 5000, minTier: 'free' },
  { valueEur: 20, points: 10000, minTier: 'premium' },
];

/** Account must be at least this many days old. */
export const REWARDS_MIN_ACCOUNT_DAYS = 14;
/** Completed workouts needed before the first redemption. */
export const REWARDS_MIN_WORKOUTS = 3;
/** One reward per member per this many days. */
export const REWARDS_COOLDOWN_DAYS = 30;
/** Rewards are delivered within this many days. */
export const REWARDS_DELIVERY_DAYS = 7;
/** Points shelf life by plan (canon REWARDS-ECONOMY-RULES §6.3). */
export const POINTS_EXPIRY_DAYS = { free: 30, premium: 90 } as const;

/** "2,500" with a comma separator regardless of the reader's locale. */
export function formatPoints(n: number): string {
  return n.toLocaleString('en-GB');
}
