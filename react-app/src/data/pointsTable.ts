/**
 * Libo points, as published on /earn.
 *
 * Mirrors canon `libo-app-v2/docs/REWARDS-ECONOMY-RULES.md` §6.1 (base values),
 * §6.2 (tier multiplier) and §6.3 (shelf life). The server's `award_points`
 * RPC is what actually credits points; if a value changes there, change it
 * here in the same PR.
 *
 * Copy rule (canon §6.2): "Premium earns 2×" is safe to say, "double on
 * everything" is not, because an effort multiplier (100/50/25/10%) sits
 * underneath the tier multiplier. The page shows these as BASE values and
 * says so.
 */

export type PointsAction = {
  /** i18n key suffix under earnPages.earn.actions.<id> */
  id: string;
  /** Base points before the tier multiplier. */
  base: number;
  /** Prop image under /props shown next to the row. */
  prop: string;
};

export const POINTS_ACTIONS: PointsAction[] = [
  { id: 'workout', base: 50, prop: 'kettlebell-lime' },
  { id: 'challengeDay', base: 25, prop: 'tripod-phone' },
  { id: 'achievement', base: 100, prop: 'trophy-lime' },
  { id: 'friend', base: 200, prop: 'gym-card' },
];

/** Streak milestones (canon §6.1, `streak_milestone`). */
export const STREAK_MILESTONES: { days: number; base: number }[] = [
  { days: 3, base: 25 },
  { days: 7, base: 75 },
  { days: 14, base: 150 },
  { days: 30, base: 500 },
];

/** Tier multiplier (canon §6.2). Server-enforced. */
export const POINTS_MULTIPLIER = { free: 1, premium: 2 } as const;
