/**
 * Build-time feature flags for the marketing site.
 *
 * Mirrors the mobile app's `libo-app-v2/src/config/featureFlags.ts` so the two
 * codebases gate the same things by the same name. Keep them in sync — a
 * feature hidden in the app but described on the website is worse than either
 * state on its own.
 */

/**
 * Giveaways (prize draws, points packs, giveaway tickets) are Phase 2 —
 * targeted to return around December. Gated OFF for launch, in the app
 * (Ticket 2) and here.
 *
 * **Gate, don't delete.** Every giveaway surface stays in the codebase behind
 * this flag so it returns by flipping one constant. That includes the legal
 * text: Terms sections describing points packs and giveaway-ticket refunds
 * describe a product users cannot currently buy, so publishing them invites
 * questions we don't want to answer yet — but deleting them means rewriting
 * reviewed legal copy in December.
 */
export const GIVEAWAYS_ENABLED = false;
