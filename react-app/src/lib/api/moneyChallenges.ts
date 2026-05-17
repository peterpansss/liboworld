/**
 * Money challenge admin operations.
 * Re-exports from adminApi.ts.
 *
 * `deleteMoneyChallenge` resolves to the re-auth-gated wrapper for UI
 * callers; the `_unsafe` variant is exported for tests.
 */
export {
  type MoneyChallenge,
  type MoneyChallengeInput,
  type MoneyChallengeTier,
  type ExerciseOptionId,
  EXERCISE_OPTION_CATALOG,
  listMoneyChallenges,
  createMoneyChallenge,
  updateMoneyChallenge,
  deleteMoneyChallengeWithReauth as deleteMoneyChallenge,
  deleteMoneyChallenge_unsafe,
  setMoneyChallengeActive,
} from '../adminApi';
