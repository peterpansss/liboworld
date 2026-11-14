/**
 * Giveaway rounds. Single source of truth for the public Official Giveaway
 * Rules page (/giveaway-rules).
 *
 * Model decided by Noah on 10 Nov 2026 — canon LEGAL-COMPETITIONS.md §4b/§5/§8
 * and REWARDS-ECONOMY-RULES.md §8.1/§8.4. One open draw per round, every
 * eligible member entered automatically (Free 1 entry, Premium 3, plus
 * the same again per loyalty month — Noah, 13 Nov 2026), entries activate on one completed workout while the round
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
export const GIVEAWAY_ENTRIES = { free: 1, premium: 3 } as const;

/**
 * Loyalty entries (Noah, 10 Nov 2026; computed server-side). For every
 * calendar month in a row before the round's month in which the member
 * completed at least one workout of LOYALTY_MIN_WORKOUT_MINUTES or more, they
 * get LOYALTY_PER_MONTH extra entries, counting up to LOYALTY_MAX_MONTHS
 * months. A month without such a workout restarts the count. Must match the
 * server, which is the one that actually assigns entries.
 */
/** Equal to the plan's base entries: entries accumulate per month (Noah, 13 Nov 2026). */
export const LOYALTY_PER_MONTH = { free: GIVEAWAY_ENTRIES.free, premium: GIVEAWAY_ENTRIES.premium } as const;
export const LOYALTY_MAX_MONTHS = 12;
export const LOYALTY_MIN_WORKOUT_MINUTES = 10;

/** Most entries a member can hold in one round: base + a full loyalty streak. */
export const GIVEAWAY_MAX_ENTRIES = {
  free: GIVEAWAY_ENTRIES.free + LOYALTY_PER_MONTH.free * LOYALTY_MAX_MONTHS,
  premium: GIVEAWAY_ENTRIES.premium + LOYALTY_PER_MONTH.premium * LOYALTY_MAX_MONTHS,
} as const;

/**
 * Free entry by post (Noah, 13 Nov 2026). One letter = one entry. Letters let a
 * member reach exactly what a Premium member with the same loyalty months
 * holds, never more: Free can count 2 + 2 per loyalty month (max 26); Premium
 * already holds that, so letters add nothing. It must arrive before the round
 * closes, and the member still needs one workout in the round. Must match the
 * server (libo-app-v2/supabase-migration-giveaway-postal-entries.sql).
 */
export const POSTAL_BASE_LETTERS = GIVEAWAY_ENTRIES.premium - GIVEAWAY_ENTRIES.free;
export const POSTAL_LETTERS_PER_LOYALTY_MONTH = LOYALTY_PER_MONTH.premium - LOYALTY_PER_MONTH.free;
export const POSTAL_MAX_LETTERS = POSTAL_BASE_LETTERS + POSTAL_LETTERS_PER_LOYALTY_MONTH * LOYALTY_MAX_MONTHS;

/**
 * Where letters go (Noah, 14 Nov 2026): his mother's business office in
 * Andernach, which logs each letter's arrival date and sends Noah a photo the
 * same day. Addressed c/o the business so the post delivers it.
 */
export const POSTAL_ENTRY_ADDRESS: readonly string[] | null = [
  'Libo Giveaway',
  'c/o Fornicher Hof',
  'Fornicher Weg 3',
  '56626 Andernach',
  'Germany',
];

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
