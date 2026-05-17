/**
 * Money challenge admin operations.
 * Re-exports from adminApi.ts.
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
  deleteMoneyChallenge,
  setMoneyChallengeActive,
} from '../adminApi';
