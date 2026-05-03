/**
 * Barrel re-export of every public API in `src/lib/`.
 *
 * Phase 4 of the architecture refactor introduces a domain-organized
 * `src/lib/api/` and `src/lib/infra/` layout. Everything continues to be
 * implemented in the original locations (adminApi.ts, funnelCheckout.ts,
 * funnelSignups.ts, supabase.ts, stripe.ts) for now; this module pulls them
 * together so callers can migrate import paths a file at a time.
 *
 * Coordination notes:
 *   - admin-auth agent owns adminApi.ts auth + admin-RPC sections (lines
 *     ~100-230). Those functions stay in adminApi.ts and are re-exported.
 *   - storage agent owns the upload functions in adminApi.ts. Same.
 *   - xss agent owns funnel signup display. funnelSignups.ts stays put.
 */

// Domain-organized API surface
export * from './api/auth';
export * from './api/users';
export * from './api/giveaways';
export * from './api/giveawayTemplates';
export * from './api/moneyChallenges';
export * from './api/challengeCycles';
export * from './api/challengePayouts';
export * from './api/referrals';
export * from './api/activity';
export * from './api/overrides';

// Funnel surfaces
export * from './funnelCheckout';
export * from './funnelSignups';

// Infra (kept thin so swap-out is easy)
export { supabase } from './infra/supabase';
export * from './infra/stripe';
