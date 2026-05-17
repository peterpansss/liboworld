/**
 * User management admin RPCs and queries.
 *
 * Thin re-export from `../adminApi.ts`. UI callers get the re-auth-gated
 * `*WithReauth` wrappers under their familiar names. The ungated
 * `*_unsafe` variants are exported only so tests in `tests/lib/adminApi.test.ts`
 * can assert RPC shape without bothering to mock the re-auth modal.
 */
export {
  type AdminUserRow,
  type WorkoutLogRow,
  type PointsLedgerRow,
  type TopWorkoutRow,
  listUsers,
  fetchUserTopWorkouts,
  fetchUserRecentWorkouts,
  fetchUserPointsLedger,
  grantTicketsWithReauth,
  adjustPointsWithReauth,
  setSubscriptionTierWithReauth,
  setUserAdminFlagWithReauth,
  grantTickets_unsafe,
  adjustPoints_unsafe,
  setSubscriptionTier_unsafe,
  setUserAdminFlag_unsafe,
} from '../adminApi';
