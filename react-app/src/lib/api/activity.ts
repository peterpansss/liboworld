/**
 * Workout activity feed and dashboard KPIs.
 * Re-exports from adminApi.ts.
 */
export {
  type DashboardKpis,
  type LeaderboardRow,
  type ActivityFilters,
  fetchDashboardKpis,
  fetchActivityFeed,
  fetchDistinctWorkoutNames,
  fetchLeaderboard,
} from '../adminApi';
