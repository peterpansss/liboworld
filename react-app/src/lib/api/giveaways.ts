/**
 * Giveaway admin operations: list, CRUD, draw winners, image upload.
 * Re-exports from adminApi.ts (single source of truth pending full split).
 *
 * UI callers receive the re-auth-gated wrappers under their familiar names
 * (e.g. `deleteGiveaway`, `drawGiveawayWinners`). The ungated `*_unsafe`
 * variants are exported only so tests in `tests/lib/adminApi.test.ts` can
 * assert RPC/table shape without mocking the re-auth modal.
 */
export {
  type Giveaway,
  type GiveawayInput,
  listGiveaways,
  createGiveaway,
  updateGiveaway,
  deleteGiveawayWithReauth as deleteGiveaway,
  drawGiveawayWinnersWithReauth as drawGiveawayWinners,
  deleteGiveaway_unsafe,
  drawGiveawayWinners_unsafe,
  listGiveawayWinners,
  uploadGiveawayImage,
} from '../adminApi';
