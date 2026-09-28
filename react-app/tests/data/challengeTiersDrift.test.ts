/**
 * Guards src/data/challengeTiers.ts — the hand-maintained mirror of production
 * `money_challenges` — against silent drift.
 *
 * Two halves:
 *
 *  1. OFFLINE (always runs, part of `npx vitest run`). Fixture-based: a
 *     snapshot of the three production rows as PostgREST returns them, plus a
 *     perturbation per field. These pin the parsing (numeric-as-string) and the
 *     comparison logic, and — the point — assert that a failure message names
 *     the field and BOTH values. No network, so no flake.
 *
 *  2. LIVE (opt-in, skipped unless CHALLENGE_TIERS_LIVE_CHECK=1). Reads
 *     production read-only over PostgREST and runs the same comparison.
 *     Driven by scripts/check-challenge-tiers.mjs; see the long comment at the
 *     bottom of src/data/challengeTiers.ts for how to run it and what to do
 *     when it fails (short version: escalate, do not "fix" either side).
 *
 * Note the deliberate second-order effect: because the fixture is a *verified*
 * snapshot of production, editing a published number in challengeTiers.ts fails
 * this file on a plain `npx vitest run` until somebody also updates the snapshot
 * — which is the moment to re-verify against production and re-check the copy,
 * App Review notes and store listings that quote the figure. The offline suite
 * is therefore a tripwire on the published side, and the live check is the
 * tripwire on the database side.
 *
 * The live half reads CHALLENGE_TIERS_SUPABASE_URL / _ANON_KEY rather than
 * VITE_SUPABASE_*, because tests/setup.ts stubs the VITE_ names globally
 * (http://test.local) and a stub would silently point the check at nothing.
 */
import { describe, expect, it } from 'vitest';

import {
  CHALLENGE_TIERS,
  CHALLENGE_TIER_DB_IDS,
  CHALLENGE_TIERS_NO_DRIFT,
  diffChallengeTiersAgainstDb,
  formatChallengeTierDrift,
  type MoneyChallengeRow,
} from '../../src/data/challengeTiers';

/**
 * Production `money_challenges` as at 2026-09-28 (oaftqweofrifoiuwntce),
 * in PostgREST's wire shape — note `reward_amount` is a *string* because the
 * column is `numeric`. This is a fixture of the CORRECT state: the offline
 * suite proves the checker says "no drift" here and complains about everything
 * else, and the live half proves production still looks like this.
 */
const PRODUCTION_SNAPSHOT: MoneyChallengeRow[] = [
  {
    id: 'reps_100_30d_v1',
    reps_per_day: 30,
    total_days: 30,
    reward_amount: '5.00',
    reward_currency: 'EUR',
    required_tier: 'free',
    min_tier: 'free',
    is_active: true,
  },
  {
    id: 'reps_50_30d_pro_v1',
    reps_per_day: 50,
    total_days: 30,
    reward_amount: '15.00',
    reward_currency: 'EUR',
    required_tier: 'pro',
    min_tier: 'pro',
    is_active: true,
  },
  {
    id: 'reps_100_30d_elite_v11',
    reps_per_day: 100,
    total_days: 30,
    reward_amount: '50.00',
    reward_currency: 'EUR',
    required_tier: 'pro',
    min_tier: 'pro',
    is_active: true,
  },
];

/** Shallow-copy the snapshot with one row patched. */
function snapshotWith(id: string, patch: Partial<MoneyChallengeRow>): MoneyChallengeRow[] {
  return PRODUCTION_SNAPSHOT.map((row) => (row.id === id ? { ...row, ...patch } : { ...row }));
}

describe('challengeTiers drift check — fixtures', () => {
  it('reports no drift against the verified production snapshot', () => {
    const drifts = diffChallengeTiersAgainstDb(PRODUCTION_SNAPSHOT);
    expect(formatChallengeTierDrift(drifts)).toBe(CHALLENGE_TIERS_NO_DRIFT);
    expect(drifts).toEqual([]);
  });

  it('maps every tier to a distinct money_challenges id', () => {
    const ids = CHALLENGE_TIERS.map((tier) => CHALLENGE_TIER_DB_IDS[tier.slug]);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(CHALLENGE_TIERS.length);
    // Every mapped id exists in the snapshot — a typo'd id would otherwise make
    // the check fail loudly for the wrong reason.
    for (const id of ids) {
      expect(PRODUCTION_SNAPSHOT.some((row) => row.id === id)).toBe(true);
    }
  });

  it('accepts numeric columns as numbers or as PostgREST strings', () => {
    const asNumbers = PRODUCTION_SNAPSHOT.map((row) => ({
      ...row,
      reward_amount: Number(row.reward_amount),
      reps_per_day: Number(row.reps_per_day),
      total_days: Number(row.total_days),
    }));
    expect(diffChallengeTiersAgainstDb(asNumbers)).toEqual([]);
  });

  it('names the rep target and both values when reps_per_day drifts', () => {
    // The exact historical failure: the DB required 60, the site published 50.
    const drifts = diffChallengeTiersAgainstDb(
      snapshotWith('reps_50_30d_pro_v1', { reps_per_day: 60 }),
    );
    expect(drifts).toHaveLength(1);
    expect(drifts[0]).toMatchObject({
      tier: 'committed',
      rowId: 'reps_50_30d_pro_v1',
      field: 'reps <-> reps_per_day',
      published: '50 reps per day',
      production: '60 reps per day',
    });

    const report = formatChallengeTierDrift(drifts);
    expect(report).toContain('committed [reps_50_30d_pro_v1] — reps <-> reps_per_day');
    expect(report).toContain('50 reps per day');
    expect(report).toContain('60 reps per day');
    expect(report).toContain('DO NOT change either side to make this pass.');
  });

  it('names both payout values when reward_amount drifts', () => {
    const drifts = diffChallengeTiersAgainstDb(
      snapshotWith('reps_100_30d_elite_v11', { reward_amount: '40.00' }),
    );
    expect(drifts).toHaveLength(1);
    expect(drifts[0]).toMatchObject({
      tier: 'flagship',
      field: 'payout <-> reward_amount',
      published: '€50',
      production: '40 EUR',
    });
  });

  it('flags a currency change even when the amount still matches', () => {
    const drifts = diffChallengeTiersAgainstDb(
      snapshotWith('reps_100_30d_v1', { reward_currency: 'USD' }),
    );
    expect(drifts).toHaveLength(1);
    expect(drifts[0]).toMatchObject({
      tier: 'starter',
      field: 'payout currency <-> reward_currency',
      production: 'USD',
    });
    expect(drifts[0].published).toContain('EUR');
  });

  it('flags a changed challenge length', () => {
    const drifts = diffChallengeTiersAgainstDb(
      snapshotWith('reps_100_30d_v1', { total_days: 21 }),
    );
    expect(drifts).toHaveLength(1);
    expect(drifts[0]).toMatchObject({
      tier: 'starter',
      field: 'days <-> total_days',
      published: '30 days',
      production: '21 days',
    });
  });

  it('flags a gate change in required_tier', () => {
    // Admin putting the free tier behind Premium moves both gate columns, so
    // both are reported — each names its own column and value.
    const drifts = diffChallengeTiersAgainstDb(
      snapshotWith('reps_100_30d_v1', { required_tier: 'pro', min_tier: 'pro' }),
    );
    expect(drifts).toHaveLength(2);
    expect(drifts[0]).toMatchObject({
      tier: 'starter',
      field: 'requiresPremium <-> required_tier',
      published: 'false (open to every member)',
      production: 'required_tier = "pro" (i.e. requiresPremium would be true)',
    });
    expect(drifts[1]).toMatchObject({
      tier: 'starter',
      field: 'requiresPremium <-> min_tier',
      production: 'min_tier = "pro" (i.e. requiresPremium would be true)',
    });
  });

  it('flags required_tier and min_tier disagreeing with the published gate independently', () => {
    const drifts = diffChallengeTiersAgainstDb(
      snapshotWith('reps_50_30d_pro_v1', { min_tier: 'free' }),
    );
    expect(drifts).toHaveLength(1);
    expect(drifts[0]).toMatchObject({
      tier: 'committed',
      field: 'requiresPremium <-> min_tier',
      production: 'min_tier = "free" (i.e. requiresPremium would be false)',
    });
  });

  it('flags a tier whose row no longer exists', () => {
    const rows = PRODUCTION_SNAPSHOT.filter((row) => row.id !== 'reps_100_30d_elite_v11');
    const drifts = diffChallengeTiersAgainstDb(rows);
    expect(drifts).toHaveLength(1);
    expect(drifts[0]).toMatchObject({
      tier: 'flagship',
      rowId: '',
      field: 'tier row <-> money_challenges.id',
    });
    expect(drifts[0].production).toContain('no row with id "reps_100_30d_elite_v11"');
    expect(formatChallengeTierDrift(drifts)).toContain('flagship [row missing]');
  });

  it('flags a published tier that has been deactivated in admin', () => {
    const drifts = diffChallengeTiersAgainstDb(
      snapshotWith('reps_50_30d_pro_v1', { is_active: false }),
    );
    expect(drifts).toHaveLength(1);
    expect(drifts[0]).toMatchObject({
      tier: 'committed',
      field: 'published on /cash-challenges and /rules <-> is_active',
      production: 'is_active = false (nobody can enrol in it)',
    });
  });

  it('flags a new active challenge that no tier publishes', () => {
    const drifts = diffChallengeTiersAgainstDb([
      ...PRODUCTION_SNAPSHOT,
      {
        id: 'reps_200_30d_legend_v1',
        reps_per_day: 200,
        total_days: 30,
        reward_amount: '100.00',
        reward_currency: 'EUR',
        required_tier: 'pro',
        min_tier: 'pro',
        is_active: true,
      },
    ]);
    expect(drifts).toHaveLength(1);
    expect(drifts[0]).toMatchObject({
      tier: '(unmapped)',
      rowId: 'reps_200_30d_legend_v1',
      field: 'CHALLENGE_TIERS coverage <-> money_challenges',
    });
    expect(drifts[0].production).toContain('200 reps per day × 30 days for 100 EUR');
  });

  it('ignores inactive challenges no tier publishes (archived rounds)', () => {
    const drifts = diffChallengeTiersAgainstDb([
      ...PRODUCTION_SNAPSHOT,
      {
        id: 'reps_30_14d_v0_archived',
        reps_per_day: 30,
        total_days: 14,
        reward_amount: '5.00',
        reward_currency: 'EUR',
        required_tier: 'free',
        min_tier: 'free',
        is_active: false,
      },
    ]);
    expect(drifts).toEqual([]);
  });

  it('reports every mismatch in one run rather than stopping at the first', () => {
    const rows = snapshotWith('reps_100_30d_v1', { reps_per_day: 40, reward_amount: '7.00' });
    const drifts = diffChallengeTiersAgainstDb(rows);
    expect(drifts.map((drift) => drift.field)).toEqual([
      'reps <-> reps_per_day',
      'payout <-> reward_amount',
    ]);
    expect(formatChallengeTierDrift(drifts)).toContain('2 mismatches');
  });
});

/* ── Live check (opt-in) ─────────────────────────────────────────────────────
 * Run it with:  node scripts/check-challenge-tiers.mjs
 * It is skipped by a plain `npx vitest run` so CI never depends on the network.
 */
const LIVE = process.env.CHALLENGE_TIERS_LIVE_CHECK === '1';

describe.runIf(LIVE)('challengeTiers drift check — live production', () => {
  it(
    'matches production money_challenges',
    async () => {
      const url = process.env.CHALLENGE_TIERS_SUPABASE_URL;
      const key = process.env.CHALLENGE_TIERS_SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error(
          'CHALLENGE_TIERS_LIVE_CHECK=1 but CHALLENGE_TIERS_SUPABASE_URL / ' +
            'CHALLENGE_TIERS_SUPABASE_ANON_KEY are not set. Run the check via ' +
            'scripts/check-challenge-tiers.mjs, which sets them from .env.local.',
        );
      }

      const columns =
        'id,reps_per_day,total_days,reward_amount,reward_currency,required_tier,min_tier,is_active';
      const response = await fetch(`${url}/rest/v1/money_challenges?select=${columns}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (!response.ok) {
        throw new Error(
          `Could not read money_challenges from ${url}: HTTP ${response.status} ` +
            `${response.statusText}. ${await response.text()}`,
        );
      }

      const rows = (await response.json()) as MoneyChallengeRow[];
      expect(Array.isArray(rows), `Expected an array of rows, got: ${JSON.stringify(rows)}`).toBe(
        true,
      );
      expect(rows.length, 'money_challenges came back empty — check the anon read policy').
        toBeGreaterThan(0);

      const drifts = diffChallengeTiersAgainstDb(rows);
      if (drifts.length > 0) throw new Error(`\n${formatChallengeTierDrift(drifts)}\n`);
    },
    30_000,
  );
});
