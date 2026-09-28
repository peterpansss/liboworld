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

/* ─────────────────────────────────────────────────────────────────────────────
 * DRIFT CHECK — this file mirrors production `money_challenges`
 *
 * Everything above is deliberately STATIC: these numbers are prose as much as
 * data. They are interpolated into marketing copy, funnel headlines and — most
 * importantly — /rules, the published rulebook a member is pointed at *before*
 * they enrol. A runtime fetch would mean the rulebook could render blank, or
 * render a number that changed between the funnel page and the rules page. So
 * the file stays hand-maintained and the *check* is what becomes automatic.
 *
 * The mirror has been wrong before (the site published 50 reps while the
 * challenge required 60, i.e. it told people to do more work than they had
 * signed up for). Nothing detected it. That is what the functions below fix.
 *
 * ── How to run the check ────────────────────────────────────────────────────
 *
 *   cd libo-landing/react-app && node scripts/check-challenge-tiers.mjs
 *
 * It reads production (read-only SELECT via PostgREST with the public anon key
 * — `money_challenges` has an "Anyone can view" SELECT policy, so no service
 * key and no database password are needed) and compares every row against the
 * table above. The script picks its credentials up from `.env.local`, so on a
 * dev machine it needs no arguments. In CI, pass them explicitly:
 *
 *   CHALLENGE_TIERS_SUPABASE_URL=https://oaftqweofrifoiuwntce.supabase.co \
 *   CHALLENGE_TIERS_SUPABASE_ANON_KEY=<anon key> \
 *   node scripts/check-challenge-tiers.mjs
 *
 * The default `npx vitest run` does NOT touch the network: the live comparison
 * only runs when CHALLENGE_TIERS_LIVE_CHECK=1 (which the script sets). The
 * offline half of tests/data/challengeTiersDrift.test.ts always runs, and pins
 * the parsing/comparison logic against a fixture snapshot of production, so the
 * check itself cannot rot into a no-op.
 *
 * That snapshot is also a tripwire on THIS side: changing a number below fails
 * the ordinary test run until the snapshot is updated too, which forces whoever
 * changes it to re-verify against production and to revisit the copy, App Review
 * notes and store listings that quote the figure.
 *
 * ── What to do when it fails ────────────────────────────────────────────────
 *
 * DO NOT edit this file to make it pass, and do not edit the database either.
 * The failure names the tier, the column, the published value and the
 * production value. Stop and escalate to Noah. The payouts are legally
 * load-bearing: they are quoted in the App Store review notes, the German store
 * description and /rules, and a member who enrolled under the published figure
 * is owed that figure. Deciding *which side is wrong* is a product/legal call,
 * not a cleanup. Only once that is decided does anybody change a number — and a
 * change to the published side ships together with the copy and store-listing
 * updates that quote it.
 * ────────────────────────────────────────────────────────────────────────────*/

/**
 * `money_challenges.id` each tier mirrors, verified against production
 * (oaftqweofrifoiuwntce) 2026-09-28.
 *
 * The ids are historical and two of them are actively misleading — the free
 * tier's row is `reps_100_30d_v1` but prescribes 30 reps, and the flagship is
 * `_v11`. Do not "tidy" them: they are the primary key challenge enrolments
 * point at. The id is only a row address here; the numbers are what matter.
 */
export const CHALLENGE_TIER_DB_IDS: Readonly<Record<ChallengeTierSlug, string>> = {
  starter: 'reps_100_30d_v1',
  committed: 'reps_50_30d_pro_v1',
  flagship: 'reps_100_30d_elite_v11',
};

/** The tier value `required_tier` / `min_tier` use for "no subscription needed". */
const DB_FREE_TIER = 'free';

/**
 * The columns the drift check reads. Postgres `numeric` (reward_amount) arrives
 * as a *string* over PostgREST ("5.00") and as a number over other clients, so
 * both are accepted and compared numerically.
 */
export type MoneyChallengeRow = {
  id: string;
  reps_per_day: number | string;
  total_days: number | string;
  reward_amount: number | string;
  reward_currency: string;
  required_tier: string;
  min_tier?: string | null;
  is_active?: boolean | null;
};

/** One field-level disagreement between this file and production. */
export type ChallengeTierDrift = {
  /** Tier slug, or `(unmapped)` for a live challenge no tier mirrors. */
  tier: string;
  /** `money_challenges.id` compared against; '' when the row is missing. */
  rowId: string;
  /** What disagrees, written as `file field <-> db column`. */
  field: string;
  /** What src/data/challengeTiers.ts publishes. */
  published: string;
  /** What production says. */
  production: string;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Compare the published tiers against rows read from `money_challenges`.
 *
 * Pure: takes rows, returns findings, does no I/O — so the comparison logic is
 * unit-testable offline (tests/data/challengeTiersDrift.test.ts) while the
 * network fetch lives in scripts/check-challenge-tiers.mjs.
 *
 * An empty array means the mirror is correct. Pass the result to
 * `formatChallengeTierDrift` for the human-readable report.
 */
export function diffChallengeTiersAgainstDb(
  rows: readonly MoneyChallengeRow[],
): ChallengeTierDrift[] {
  const drifts: ChallengeTierDrift[] = [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const mirrored = new Set<string>();

  for (const tier of CHALLENGE_TIERS) {
    const rowId = CHALLENGE_TIER_DB_IDS[tier.slug];
    mirrored.add(rowId);
    const row = byId.get(rowId);

    if (!row) {
      drifts.push({
        tier: tier.slug,
        rowId: '',
        field: 'tier row <-> money_challenges.id',
        published: `${tier.name} mirrors money_challenges.id = "${rowId}"`,
        production: `no row with id "${rowId}" (deleted, re-keyed, or filtered out of the query)`,
      });
      continue;
    }

    const reps = toNumber(row.reps_per_day);
    if (reps !== tier.reps) {
      drifts.push({
        tier: tier.slug,
        rowId: row.id,
        field: 'reps <-> reps_per_day',
        published: `${tier.reps} reps per day`,
        production: `${reps ?? JSON.stringify(row.reps_per_day)} reps per day`,
      });
    }

    const days = toNumber(row.total_days);
    if (days !== tier.days) {
      drifts.push({
        tier: tier.slug,
        rowId: row.id,
        field: 'days <-> total_days',
        published: `${tier.days} days`,
        production: `${days ?? JSON.stringify(row.total_days)} days`,
      });
    }

    const payout = toNumber(row.reward_amount);
    if (payout !== tier.payout) {
      drifts.push({
        tier: tier.slug,
        rowId: row.id,
        field: 'payout <-> reward_amount',
        published: `€${tier.payout}`,
        production: `${payout ?? JSON.stringify(row.reward_amount)} ${row.reward_currency}`,
      });
    }

    if (row.reward_currency !== 'EUR') {
      drifts.push({
        tier: tier.slug,
        rowId: row.id,
        field: 'payout currency <-> reward_currency',
        published: `EUR (copy hardcodes the € sign: "€${tier.payout}")`,
        production: `${row.reward_currency}`,
      });
    }

    const dbRequiresPremium = row.required_tier !== DB_FREE_TIER;
    if (dbRequiresPremium !== tier.requiresPremium) {
      drifts.push({
        tier: tier.slug,
        rowId: row.id,
        field: 'requiresPremium <-> required_tier',
        published: tier.requiresPremium
          ? 'true (Premium unlocks this tier)'
          : 'false (open to every member)',
        production: `required_tier = "${row.required_tier}" (i.e. requiresPremium would be ${dbRequiresPremium})`,
      });
    }

    // `min_tier` duplicates the gate in production and the app reads both; one
    // boolean here mirrors the pair, so an internal split is drift too.
    if (row.min_tier != null && row.min_tier !== '') {
      const minRequiresPremium = row.min_tier !== DB_FREE_TIER;
      if (minRequiresPremium !== tier.requiresPremium) {
        drifts.push({
          tier: tier.slug,
          rowId: row.id,
          field: 'requiresPremium <-> min_tier',
          published: tier.requiresPremium
            ? 'true (Premium unlocks this tier)'
            : 'false (open to every member)',
          production: `min_tier = "${row.min_tier}" (i.e. requiresPremium would be ${minRequiresPremium})`,
        });
      }
    }

    if (row.is_active === false) {
      drifts.push({
        tier: tier.slug,
        rowId: row.id,
        field: 'published on /cash-challenges and /rules <-> is_active',
        published: `${tier.name} is listed as an enterable challenge`,
        production: 'is_active = false (nobody can enrol in it)',
      });
    }
  }

  for (const row of rows) {
    if (mirrored.has(row.id) || row.is_active === false) continue;
    drifts.push({
      tier: '(unmapped)',
      rowId: row.id,
      field: 'CHALLENGE_TIERS coverage <-> money_challenges',
      published: 'nothing — no tier mirrors this row, so it appears on neither /cash-challenges nor /rules',
      production: `active challenge "${row.id}": ${toNumber(row.reps_per_day)} reps per day × ${toNumber(row.total_days)} days for ${toNumber(row.reward_amount)} ${row.reward_currency}, required_tier = "${row.required_tier}"`,
    });
  }

  return drifts;
}

/** Message for a clean run; asserted on so the check can't silently pass-by-empty. */
export const CHALLENGE_TIERS_NO_DRIFT =
  'No drift: src/data/challengeTiers.ts matches production money_challenges.';

/**
 * Human-readable report. Every line names the tier, the row, the field, and
 * BOTH values — "drift detected" is useless at 2am.
 */
export function formatChallengeTierDrift(drifts: readonly ChallengeTierDrift[]): string {
  if (drifts.length === 0) return CHALLENGE_TIERS_NO_DRIFT;

  const body = drifts.map(
    (drift) =>
      `  ${drift.tier} [${drift.rowId || 'row missing'}] — ${drift.field}\n` +
      `      published (src/data/challengeTiers.ts): ${drift.published}\n` +
      `      production (money_challenges):          ${drift.production}`,
  );

  return [
    `CASH-CHALLENGE DRIFT: ${drifts.length} mismatch${drifts.length === 1 ? '' : 'es'} between ` +
      'src/data/challengeTiers.ts and production money_challenges (oaftqweofrifoiuwntce).',
    '',
    ...body,
    '',
    'These figures are published on /rules — the rulebook members are pointed at before they',
    'enrol — and are quoted in the App Store review notes and the German store description.',
    'DO NOT change either side to make this pass. Escalate to Noah and establish which side is',
    'wrong first; a member who enrolled under a published figure is owed that figure.',
  ].join('\n');
}
