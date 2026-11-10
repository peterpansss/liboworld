/**
 * Giveaway rounds. Single source of truth for the public Official Giveaway
 * Rules page (/giveaway-rules).
 *
 * Model decided by Noah on 10 Nov 2026 — canon LEGAL-COMPETITIONS.md §4b/§5/§8
 * and REWARDS-ECONOMY-RULES.md §8.1/§8.4. One open draw per round, every
 * eligible member entered automatically (Free 1 entry, Premium 5, plus
 * loyalty entries), entries activate on one completed workout while the round
 * is open.
 *
 * Adding a round is a one-line change: append an object below. Dates are
 * calendar dates in Berlin time (Europe/Berlin); a round opens at 00:00 on
 * `opens` and closes at 23:59 on `closes`. The draw runs automatically at the
 * close and the winner is announced the following day (a Monday).
 */

export type GiveawayRound = {
  /** Round number, rendered as "Round {n}". */
  n: number;
  /** First day of the round, YYYY-MM-DD, Berlin time. Opens 00:00. */
  opens: string;
  /** Last day of the round, YYYY-MM-DD, Berlin time. Closes 23:59. */
  closes: string;
  /** Cash prize in euros, rendered as €{prize}. */
  prize: number;
  /** Number of winners drawn in this round. */
  winners: number;
};

export const GIVEAWAY_ROUNDS: GiveawayRound[] = [
  { n: 1, opens: '2026-11-23', closes: '2026-11-29', prize: 150, winners: 1 },
  { n: 2, opens: '2026-11-30', closes: '2026-12-06', prize: 150, winners: 1 },
  { n: 3, opens: '2026-12-07', closes: '2026-12-13', prize: 150, winners: 1 },
  { n: 4, opens: '2026-12-14', closes: '2026-12-20', prize: 150, winners: 1 },
];

/** Entries per member per round, by plan. Same activation rule for every plan. */
export const GIVEAWAY_ENTRIES = { free: 1, premium: 5 } as const;

/**
 * Loyalty entries (Noah, 10 Nov 2026; computed server-side). For every
 * calendar month in a row before the round's month in which the member
 * completed at least one workout of LOYALTY_MIN_WORKOUT_MINUTES or more, they
 * get LOYALTY_PER_MONTH extra entries, counting up to LOYALTY_MAX_MONTHS
 * months. A month without such a workout restarts the count. Must match the
 * server, which is the one that actually assigns entries.
 */
export const LOYALTY_PER_MONTH = { free: 1, premium: 2 } as const;
export const LOYALTY_MAX_MONTHS = 12;
export const LOYALTY_MIN_WORKOUT_MINUTES = 10;

/** Most entries a member can hold in one round: base + a full loyalty streak. */
export const GIVEAWAY_MAX_ENTRIES = {
  free: GIVEAWAY_ENTRIES.free + LOYALTY_PER_MONTH.free * LOYALTY_MAX_MONTHS,
  premium: GIVEAWAY_ENTRIES.premium + LOYALTY_PER_MONTH.premium * LOYALTY_MAX_MONTHS,
} as const;

/** Days a winner has to claim before a new winner is drawn. */
export const GIVEAWAY_CLAIM_DAYS = 7;

/** Minimum age to be entered. */
export const GIVEAWAY_MIN_AGE = 16;

/**
 * Excluded places, in addition to anywhere local law prohibits the giveaway.
 * Noah, 10 Nov 2026. Quebec is NOT on this list (removed 10 Nov 2026) — it
 * stays excluded from cash challenges only (Terms §Governing Law).
 */
export const GIVEAWAY_EXCLUDED = [
  'mainland China',
  'Cuba',
  'Iran',
  'North Korea',
  'Syria',
  'India',
  'Nigeria',
  'Ghana',
  'Kenya',
];

/**
 * Formats a YYYY-MM-DD date as e.g. "Mon 23 Nov 2026". Parsed and formatted in
 * UTC so the calendar date never shifts with the reader's own timezone.
 */
export function formatRoundDate(iso: string, offsetDays = 0): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
