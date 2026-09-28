#!/usr/bin/env node
/**
 * Fails loudly when src/data/challengeTiers.ts — the published cash-challenge
 * economics behind /cash-challenges, the three funnel pages and /rules — has
 * drifted from production `money_challenges`.
 *
 * Usage (from libo-landing/react-app):
 *
 *   node scripts/check-challenge-tiers.mjs
 *
 * Credentials are read, in order of precedence, from:
 *   1. CHALLENGE_TIERS_SUPABASE_URL / CHALLENGE_TIERS_SUPABASE_ANON_KEY
 *   2. VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in the environment
 *   3. .env.local in this directory   <- the normal dev-machine path, no args
 *
 * The read is a plain PostgREST SELECT with the PUBLIC anon key:
 * `money_challenges` has an "Anyone can view money challenges" SELECT policy,
 * so no service-role key and no database password are involved. This script
 * never writes anything, anywhere.
 *
 * `--allow-non-production` lets it run against staging; without it, a URL that
 * is not the production project ref is refused, because drift only matters
 * against the database the published pages describe.
 *
 * Exit codes: 0 = mirror is correct, 1 = drift (or the read failed),
 *             2 = misconfigured (no credentials / wrong project).
 *
 * The comparison itself lives in src/data/challengeTiers.ts
 * (`diffChallengeTiersAgainstDb`) and is exercised offline by
 * tests/data/challengeTiersDrift.test.ts, so this script and the unit tests can
 * never disagree about what "drift" means. This script's only job is to hand
 * production's rows to that logic, which it does by running the live half of
 * that test file (CHALLENGE_TIERS_LIVE_CHECK=1) — the ordinary
 * `npx vitest run` leaves that half skipped, so CI's unit suite stays offline
 * and non-flaky.
 *
 * WHEN IT FAILS: do not edit challengeTiers.ts and do not edit the database.
 * The payouts are quoted in /rules, the App Store review notes and the German
 * store description; a member who enrolled under a published figure is owed
 * that figure. Escalate to Noah with the report and settle which side is wrong
 * before anybody changes a number. Full note at the bottom of
 * src/data/challengeTiers.ts.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEST_FILE = 'tests/data/challengeTiersDrift.test.ts';
const PRODUCTION_REF = 'oaftqweofrifoiuwntce';

const allowNonProduction = process.argv.includes('--allow-non-production');

/** Minimal KEY=VALUE reader — no dotenv dependency for a single-purpose script. */
function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function fail(code, ...lines) {
  for (const line of lines) console.error(line);
  process.exit(code);
}

const fileEnv = readEnvFile(join(APP_ROOT, '.env.local'));

const url =
  process.env.CHALLENGE_TIERS_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  fileEnv.VITE_SUPABASE_URL;
const anonKey =
  process.env.CHALLENGE_TIERS_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  fileEnv.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  fail(
    2,
    'check-challenge-tiers: no Supabase credentials found.',
    '',
    'Set them in the environment:',
    '  CHALLENGE_TIERS_SUPABASE_URL=https://' + PRODUCTION_REF + '.supabase.co \\',
    '  CHALLENGE_TIERS_SUPABASE_ANON_KEY=<public anon key> \\',
    '  node scripts/check-challenge-tiers.mjs',
    '',
    'or put VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in react-app/.env.local.',
  );
}

if (!url.includes(PRODUCTION_REF) && !allowNonProduction) {
  fail(
    2,
    `check-challenge-tiers: refusing to run against ${url}.`,
    `The published tiers describe production (${PRODUCTION_REF}); comparing them to any other`,
    'database proves nothing. Pass --allow-non-production if you really mean to.',
  );
}

// Print the target in the same breath as the read (CLAUDE.md database rule):
// never let the reader infer which database was checked.
console.log(`TARGET: ${url}  (read-only SELECT on money_challenges)`);
console.log(`Comparing against src/data/challengeTiers.ts via ${TEST_FILE}\n`);

const result = spawnSync('npx', ['vitest', 'run', TEST_FILE], {
  cwd: APP_ROOT,
  stdio: 'inherit',
  env: {
    ...process.env,
    CHALLENGE_TIERS_LIVE_CHECK: '1',
    CHALLENGE_TIERS_SUPABASE_URL: url,
    CHALLENGE_TIERS_SUPABASE_ANON_KEY: anonKey,
  },
});

if (result.error) {
  fail(1, `check-challenge-tiers: could not run vitest — ${result.error.message}`);
}

if (result.status === 0) {
  console.log('\nOK: the published cash-challenge tiers match production money_challenges.');
  process.exit(0);
}

console.error(
  [
    '',
    'check-challenge-tiers FAILED. Read the report above: it names the tier, the column and',
    'both values. Do NOT edit src/data/challengeTiers.ts or the database to make it pass —',
    'these figures are published in /rules, the App Store review notes and the German store',
    'description. Escalate to Noah and establish which side is wrong first.',
  ].join('\n'),
);
process.exit(result.status ?? 1);
