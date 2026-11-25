/**
 * Rewards catalogue as published on the public Rewards Rules page
 * (/rewards-rules). Members swap training points for a gift code or cash
 * (PayPal / Revolut / Wise / bank, Noah 14 Nov 2026) of a fixed value; each
 * value exists once as a gift card and once as cash. No chance is involved.
 *
 * Economy: 1,000 points per €1 for every member since 25 Nov 2026 (was 500 on 13 Nov,
 * 800 on 14 Nov), no Premium discount. €5 and €10 are open to all members, €20 is Premium
 * only. Premium's advantages are earning 2x and the Premium-only card.
 *
 * The live catalogue (stock, brands, active flag) is edited at /admin/rewards
 * and served by get_reward_catalog(). This file is the published price list:
 * if the admin catalogue's prices or tiers change, change this file and the
 * page's "Last updated" date in the same commit, or the rules go stale.
 */

import { POINTS_MULTIPLIER } from './pointsTable';

/** Lowest plan that can redeem a reward. 'elite' is used by items only (Noah, 22 Nov 2026). */
export type RewardTier = 'free' | 'premium' | 'elite';

export type PublishedReward = {
  /** Card value in euros. */
  valueEur: number;
  /** Price in points. */
  points: number;
  /** Lowest plan that can redeem it. */
  minTier: RewardTier;
};

// Repriced 25 Nov 2026 (Noah): 4,000/8,000/15,000 -> 1,000 points per EUR 1, priced from net revenue per member
// (model: Brand-Management/Project-Structure/rewards-economy/points_model.py). Mirrors reward_catalog.
export const REWARDS_CATALOG: PublishedReward[] = [
  { valueEur: 5, points: 5000, minTier: 'free' },
  { valueEur: 10, points: 10000, minTier: 'free' },
  { valueEur: 20, points: 20000, minTier: 'premium' },
];

/**
 * Most EUR of gift + cash cards a member may redeem per rolling 90 days, by plan (Noah, 25 Nov 2026). Each is at
 * most what that plan's cheapest option nets us over 90 days. Mirrors _reward_card_eur_ceiling_90d.
 */
export const CARD_EUR_PER_90_DAYS: Record<RewardTier, number> = { free: 5, premium: 15, elite: 25 };

/**
 * Physical items (Noah, 15 Nov 2026; tiered 22 Nov 2026). Value = the item's listed value; the cash alternative
 * is itemCashEur(value). Mirrors reward_catalog kind 'item' (min_tier + min_paid_months).
 */
export type PublishedItem = {
  title: string;
  valueEur: number;
  points: number;
  minTier: RewardTier;
  /** Paid months in a row (on minTier or higher; on Elite for Elite items) needed to redeem it. */
  minPaidMonths: number;
};

/**
 * Item tiers (Noah, 22 Nov 2026). Each plan can redeem items up to a value cap; higher plans can redeem lower-plan
 * items. Mirrors the admin catalog RPC check ('item_value_over_tier_cap'). null = no cap.
 */
export const ITEM_TIER_VALUE_CAP_EUR: Record<RewardTier, number | null> = { free: 250, premium: 750, elite: null };
/**
 * Paid months in a row a member needs before redeeming an item of each tier (Noah, 22 Nov 2026): Premium items need
 * 6 on Premium or higher, Elite items 12 on Elite. Trials, offer-code free periods and memberships given by Libo do
 * not count. The admin RPC rejects less ('paid_months_below_tier_minimum'); NULL there means this default.
 */
export const ITEM_TIER_MIN_PAID_MONTHS: Record<RewardTier, number> = { free: 0, premium: 6, elite: 12 };
/** One physical item per member per this many days (Noah, 22 Nov 2026), on top of REWARDS_COOLDOWN_DAYS. */
export const ONE_ITEM_PER_DAYS = 365;
/** Most base points a member can earn in a day, before the plan multiplier (canon REWARDS-ECONOMY-RULES §6). */
export const POINTS_DAILY_BASE_CAP = 500;

export const REWARDS_ITEMS: PublishedItem[] = [
  // Elite, 12 paid months, 135,000 points since 22 Nov 2026 (Noah); was Premium, 29,000 points.
  { title: 'iPhone Duo 512 GB', valueEur: 2600, points: 135000, minTier: 'elite', minPaidMonths: 12 },
];
/** Cash instead of an item: 20% under its value, as a rule (Noah, 15 Nov 2026; _reward_item_cash_eur). */
export const itemCashEur = (valueEur: number): number => Math.floor(valueEur * 0.8);
/** Item prizes ship to these places (redeem_reward ship_country); anywhere else takes the cash. */
export const ITEM_SHIP_AREA = 'the EU and the UK';

/** Account must be at least this many days old. */
export const REWARDS_MIN_ACCOUNT_DAYS = 14;
/** Completed workouts needed before the first redemption. */
export const REWARDS_MIN_WORKOUTS = 3;
/** One reward per member per this many days. */
export const REWARDS_COOLDOWN_DAYS = 30;
/** Rewards are delivered within this many days. */
export const REWARDS_DELIVERY_DAYS = 7;
/** Points shelf life by plan (canon REWARDS-ECONOMY-RULES §6.3). */
export const POINTS_EXPIRY_DAYS = { free: 30, premium: 90, elite: 90 } as const; // Elite = Premium (Noah, 19 Nov 2026)

/**
 * Item price by tier (Noah, 22 Nov 2026): the most points a member on that plan can hold, i.e. the daily base cap
 * x plan multiplier x points shelf life. Free 500x1x30 = 15,000; Premium 500x2x90 = 90,000; Elite 500x3x90 = 135,000.
 */
export const ITEM_POINTS_BY_TIER: Record<RewardTier, number> = {
  free: POINTS_DAILY_BASE_CAP * POINTS_MULTIPLIER.free * POINTS_EXPIRY_DAYS.free,
  premium: POINTS_DAILY_BASE_CAP * POINTS_MULTIPLIER.premium * POINTS_EXPIRY_DAYS.premium,
  elite: POINTS_DAILY_BASE_CAP * POINTS_MULTIPLIER.elite * POINTS_EXPIRY_DAYS.elite,
};

/** Plan names, for copy generated from the tiers (rules page). */
export const TIER_LABEL: Record<RewardTier, string> = { free: 'Free', premium: 'Premium', elite: 'Elite' };

/** "4,000" with a comma separator regardless of the reader's locale. */
export function formatPoints(n: number): string {
  return n.toLocaleString('en-GB');
}
