/**
 * Referral code admin operations.
 * Re-exports from adminApi.ts.
 *
 * `deleteReferralCode` resolves to the re-auth-gated wrapper for UI
 * callers; the `_unsafe` variant is exported for tests.
 */
export {
  type ReferralCode,
  type ReferralCodeInput,
  type ReferralCodeType,
  type ReferralCodeFilters,
  type ReferralConversion,
  listReferralCodes,
  createReferralCode,
  updateReferralCode,
  deleteReferralCodeWithReauth as deleteReferralCode,
  deleteReferralCode_unsafe,
  listConversionsForCode,
} from '../adminApi';
