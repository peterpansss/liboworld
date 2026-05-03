/**
 * Giveaway admin operations: list, CRUD, draw winners, image upload.
 * Re-exports from adminApi.ts (single source of truth pending full split).
 */
export {
  type Giveaway,
  type GiveawayInput,
  listGiveaways,
  createGiveaway,
  updateGiveaway,
  deleteGiveaway,
  drawGiveawayWinners,
  listGiveawayWinners,
  uploadGiveawayImage,
} from '../adminApi';
