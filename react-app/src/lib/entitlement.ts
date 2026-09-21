/**
 * Entitlement rules, shared by the admin UI.
 *
 * Deliberately its own module rather than living in `adminApi.ts`: this is pure
 * logic with no network, and every admin test mocks `adminApi` wholesale. A
 * component importing these from there gets `undefined` under test and throws
 * at render — which is exactly what happened when they were first added.
 *
 * Behaviour is a port of the mobile app's `isEntitled` (libo-app-v2
 * src/types/index.ts). Keep the two in step: if they disagree, the admin panel
 * tells the operator something different from what the member's app does,
 * which is the bug this exists to prevent.
 */

export type AdminTier = 'free' | 'pro' | 'elite';

/** Does this subscription grant access RIGHT NOW? */
export function isEntitledSubscription(
  status: string | null | undefined,
  expiresAt: string | null | undefined,
): boolean {
  if (status === 'expired') return false;

  // An unparseable timestamp counts as "no expiry", not as "expired" — a
  // malformed field must never revoke access from a paying member.
  const parsed = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const expiryMs = Number.isNaN(parsed) ? null : parsed;
  const hasFutureExpiry = expiryMs != null && expiryMs > Date.now();

  if (expiryMs != null && !hasFutureExpiry) return false;
  // A cancelled subscription is paid through to its expiry, so it needs one.
  if (status === 'cancelled' || status === 'canceled') return hasFutureExpiry;
  return status === 'active' || status === 'trialing';
}

/**
 * What the member can actually USE right now, as opposed to what they bought.
 *
 * `subscriptions.tier` is the PURCHASED tier and deliberately survives a lapse
 * (the webhooks re-activate against it), so rendering it raw as "current plan"
 * is what made the admin panel show PRO for a member whose access expired on
 * 2026-08-19 while their app correctly showed FREE.
 *
 * Tolerates rows missing the status/expiry columns: an older view shape should
 * degrade to "not entitled", never crash the users table.
 */
export function effectiveTier(row: {
  tier?: AdminTier | null;
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
}): AdminTier {
  if (!row?.tier || row.tier === 'free') return 'free';
  return isEntitledSubscription(row.subscription_status, row.subscription_expires_at)
    ? row.tier
    : 'free';
}

// ── time-limited grants ────────────────────────────────────────────────────

/** The duration presets offered by the admin panel's "Set tier" card. */
export type GrantDuration = 'indefinite' | '1m' | '2m' | '3m' | '6m' | '12m' | 'custom';

export const GRANT_DURATION_OPTIONS: ReadonlyArray<{
  value: GrantDuration;
  label: string;
  months: number | null;
}> = [
  { value: 'indefinite', label: 'Indefinite', months: null },
  { value: '1m', label: '1 month', months: 1 },
  { value: '2m', label: '2 months', months: 2 },
  { value: '3m', label: '3 months', months: 3 },
  { value: '6m', label: '6 months', months: 6 },
  { value: '12m', label: '12 months', months: 12 },
  { value: 'custom', label: 'Custom date…', months: null },
];

/**
 * Add whole months, clamping the day of month instead of rolling over.
 *
 * `setMonth` on its own turns 31 Jan + 1 month into 3 Mar, which would hand a
 * member two extra days and — worse — makes "1 month" mean different things on
 * different days. Clamping gives 28/29 Feb, which is what a human means.
 */
function addMonths(from: Date, months: number): Date {
  const day = from.getDate();
  const out = new Date(from.getTime());
  out.setDate(1);
  out.setMonth(out.getMonth() + months);
  const lastDayOfTargetMonth = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(day, lastDayOfTargetMonth));
  return out;
}

/** What a pending grant would actually do, resolved before the operator commits. */
export interface GrantPlan {
  /** Value to hand `admin_set_subscription_tier(p_expires_at)`. null = indefinite. */
  expiresAt: string | null;
  /**
   * When the new window was measured from an EXISTING future expiry rather than
   * from today, this is that existing expiry (ISO). null = the window starts now.
   */
  extendsFrom: string | null;
  /**
   * True when the operator is about to put an expiry on a grant that is
   * currently indefinite — i.e. this SHORTENS access rather than extending it.
   * Legal, but it must be said out loud in the confirmation copy.
   */
  shortensIndefinite: boolean;
  /** Non-null when the selection cannot be committed (bad/missing custom date). */
  error: string | null;
}

/**
 * Resolve the expiry a "Set tier" click should write.
 *
 * EXTEND vs REPLACE — the rule, and why:
 *
 * A duration preset extends from the member's existing expiry when, and only
 * when, they are holding a LIVE grant of the SAME tier with a future expiry.
 * Handing someone a second month while their first is still running is an
 * additional month, not a reset that silently eats the remainder — an operator
 * topping up a comped account should never be able to take time away by giving
 * time. Everything else starts from today, because there is nothing to extend:
 *
 *   - no subscription row, or a lapsed/expired one → a fresh window from now
 *   - a different tier (free→pro, pro→elite) → you cannot extend a tier the
 *     member does not hold; the new tier's clock starts now
 *   - an indefinite grant of the same tier → there is no expiry to add to.
 *     Applying a duration here REPLACES the open-ended grant with a dated one,
 *     which is a downgrade, so `shortensIndefinite` is set and the UI says so.
 *
 * Note this is computed client-side and passed as an absolute timestamp. The
 * RPC itself is a plain replace (`expires_at = EXCLUDED.expires_at`), and is
 * deliberately left alone so no database migration is needed to ship this.
 */
export function resolveGrantPlan(args: {
  tier: AdminTier;
  duration: GrantDuration;
  /** `YYYY-MM-DD` from a date input. Only read when duration === 'custom'. */
  customDate?: string | null;
  current?: {
    tier?: AdminTier | null;
    subscription_status?: string | null;
    subscription_expires_at?: string | null;
  } | null;
  /** Injectable for tests. */
  now?: Date;
}): GrantPlan {
  const { tier, duration, customDate, current } = args;
  const now = args.now ?? new Date();
  const none: GrantPlan = { expiresAt: null, extendsFrom: null, shortensIndefinite: false, error: null };

  // Free is the absence of an entitlement, not a timed one. Never write a
  // window alongside it — a dated 'free' row reads as "free until then", which
  // is meaningless and would confuse the next operator.
  if (tier === 'free') return none;
  if (duration === 'indefinite') return none;

  const currentTier = current?.tier ?? 'free';
  const currentExpiry = current?.subscription_expires_at ?? null;
  const currentlyLive = isEntitledSubscription(current?.subscription_status, currentExpiry);
  const sameTierLive = currentlyLive && currentTier === tier;

  if (duration === 'custom') {
    if (!customDate) return { ...none, error: 'Pick an end date for the grant.' };
    // Parsed as LOCAL end-of-day so "until 22 Nov" includes the 22nd, rather
    // than expiring at midnight UTC the operator never intended.
    const [y, m, d] = customDate.split('-').map(Number);
    if (!y || !m || !d) return { ...none, error: 'Pick a valid end date for the grant.' };
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);
    if (Number.isNaN(end.getTime())) return { ...none, error: 'Pick a valid end date for the grant.' };
    if (end.getTime() <= now.getTime()) {
      return { ...none, error: 'The end date must be in the future.' };
    }
    return {
      expiresAt: end.toISOString(),
      extendsFrom: null,
      shortensIndefinite: sameTierLive && currentExpiry === null,
      error: null,
    };
  }

  const months = GRANT_DURATION_OPTIONS.find((o) => o.value === duration)?.months ?? null;
  if (months === null) return { ...none, error: 'Pick a grant duration.' };

  const existing = currentExpiry ? new Date(currentExpiry) : null;
  const canExtend =
    sameTierLive &&
    existing !== null &&
    !Number.isNaN(existing.getTime()) &&
    existing.getTime() > now.getTime();

  const base = canExtend ? existing! : now;
  return {
    expiresAt: addMonths(base, months).toISOString(),
    extendsFrom: canExtend ? existing!.toISOString() : null,
    shortensIndefinite: sameTierLive && currentExpiry === null,
    error: null,
  };
}
