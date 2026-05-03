/**
 * User management admin RPCs and queries.
 *
 * NOTE: this is currently a thin re-export from `../adminApi.ts` to introduce
 * the new domain-organized api/ layout. The data-mutation functions
 * (grantTickets, adjustPoints, setSubscriptionTier, setUserAdminFlag) are
 * coordinated with the admin-auth security work and live in adminApi.ts;
 * this file re-exports them so callers can migrate import paths file-by-file.
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
  grantTickets,
  adjustPoints,
  setSubscriptionTier,
  setUserAdminFlag,
} from '../adminApi';
