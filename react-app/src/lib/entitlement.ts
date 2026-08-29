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
