/**
 * Giveaway template admin operations.
 * Re-exports from adminApi.ts.
 *
 * `deleteGiveawayTemplate` resolves to the re-auth-gated wrapper for UI
 * callers; the `_unsafe` variant is exported for tests.
 */
export {
  type GiveawayTemplate,
  type GiveawayTemplateInput,
  type GiveawayTemplateType,
  listGiveawayTemplates,
  createGiveawayTemplate,
  updateGiveawayTemplate,
  deleteGiveawayTemplateWithReauth as deleteGiveawayTemplate,
  deleteGiveawayTemplate_unsafe,
} from '../adminApi';
