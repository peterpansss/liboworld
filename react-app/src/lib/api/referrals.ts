/**
 * Referral code admin operations.
 * Re-exports from adminApi.ts.
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
  deleteReferralCode,
  listConversionsForCode,
} from '../adminApi';
