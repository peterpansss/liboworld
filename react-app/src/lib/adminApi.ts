import { supabase } from './supabase';

// ── Types ──────────────────────────────────────────────────────────────────

export type AdminUserRow = {
  id: string;
  email: string | null;
  signup_at: string | null;
  last_sign_in_at: string | null;
  name: string | null;
  goal: string | null;
  activity_level: string | null;
  experience: string | null;
  days_per_week: string | null;
  is_admin: boolean;
  profile_created_at: string | null;
  profile_updated_at: string | null;
  tier: 'free' | 'pro' | 'elite' | null;
  subscription_status: string | null;
  subscription_expires_at: string | null;
  points: number;
  tickets: number;
  workout_count: number;
  last_workout_at: string | null;
};

export type DashboardKpis = {
  total_users: number;
  workouts_today: number;
  workouts_7d: number;
  active_giveaways: number;
  tickets_issued_7d: number;
  points_awarded_7d: number;
  pro_subscribers: number;
  workouts_30d: number;
};

export type Giveaway = {
  id: string;
  title: string;
  description: string | null;
  prize_description: string;
  image_url: string | null;
  type: 'common' | 'premium' | 'elite';
  category: 'win' | 'buy';
  status: 'upcoming' | 'active' | 'drawing' | 'completed';
  tickets_per_entry: number;
  max_entries_per_user: number | null;
  winner_count: number;
  starts_at: string;
  ends_at: string;
  drawn_at: string | null;
  created_at: string;
};

export type GiveawayInput = Omit<Giveaway, 'id' | 'drawn_at' | 'created_at'>;

export type WorkoutLogRow = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  workout_id: string;
  workout_name: string;
  duration: number;
  exercise_count: number;
  emoji: string | null;
  date: string;
  created_at: string;
};

export type LeaderboardRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  points: number;
  tickets: number;
  workout_count: number;
  total_minutes: number;
  total_volume_kg: number;
};

export type PointsLedgerRow = {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  reference_id: string | null;
  multiplier: number;
  base_amount: number;
  created_at: string;
};

export type TopWorkoutRow = { workout_name: string; count: number };

// ── Auth / session ─────────────────────────────────────────────────────────

export async function getCurrentUserIsAdmin(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user.id;
  if (!uid) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', uid)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.is_admin);
}

export async function signInAdmin(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const isAdmin = await getCurrentUserIsAdmin();
  if (!isAdmin) {
    await supabase.auth.signOut();
    throw new Error('This account is not an admin.');
  }
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  const { data, error } = await supabase.rpc('admin_dashboard_kpis');
  if (error) throw error;
  return data as DashboardKpis;
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function listUsers(search: string | null, limit = 100, offset = 0): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_search: search && search.length > 0 ? search : null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as AdminUserRow[];
}

export async function fetchUserTopWorkouts(userId: string, limit = 5): Promise<TopWorkoutRow[]> {
  const { data, error } = await supabase.rpc('admin_user_top_workouts', {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as TopWorkoutRow[];
}

export async function fetchUserRecentWorkouts(userId: string, limit = 20): Promise<WorkoutLogRow[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('id, user_id, workout_id, workout_name, duration, exercise_count, emoji, date, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    user_name: null,
    user_email: null,
  })) as WorkoutLogRow[];
}

export async function fetchUserPointsLedger(userId: string, limit = 50): Promise<PointsLedgerRow[]> {
  const { data, error } = await supabase
    .from('points_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PointsLedgerRow[];
}

export async function grantTickets(userId: string, amount: number, note?: string) {
  const { data, error } = await supabase.rpc('admin_grant_tickets', {
    p_user_id: userId,
    p_amount: amount,
    p_note: note ?? null,
  });
  if (error) throw error;
  if (!(data as { ok: boolean }).ok) throw new Error((data as { error: string }).error);
}

export async function adjustPoints(userId: string, amount: number, note?: string) {
  const { data, error } = await supabase.rpc('admin_adjust_points', {
    p_user_id: userId,
    p_amount: amount,
    p_note: note ?? null,
  });
  if (error) throw error;
  if (!(data as { ok: boolean }).ok) throw new Error((data as { error: string }).error);
}

export async function setSubscriptionTier(userId: string, tier: 'free' | 'pro' | 'elite', expiresAt?: string | null) {
  const { data, error } = await supabase.rpc('admin_set_subscription_tier', {
    p_user_id: userId,
    p_tier: tier,
    p_expires_at: expiresAt ?? null,
  });
  if (error) throw error;
  if (!(data as { ok: boolean }).ok) throw new Error((data as { error: string }).error);
}

export async function setUserAdminFlag(userId: string, isAdmin: boolean) {
  const { data, error } = await supabase.rpc('admin_set_user_admin_flag', {
    p_user_id: userId,
    p_is_admin: isAdmin,
  });
  if (error) throw error;
  if (!(data as { ok: boolean }).ok) throw new Error((data as { error: string }).error);
}

// ── Leaderboard ────────────────────────────────────────────────────────────

export async function fetchLeaderboard(limit = 100): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc('admin_leaderboard', { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

// ── Giveaways ──────────────────────────────────────────────────────────────

export async function listGiveaways(): Promise<(Giveaway & { entry_count: number })[]> {
  const { data, error } = await supabase
    .from('giveaways')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Giveaway[];

  const counts = await Promise.all(
    rows.map(async (g) => {
      const { count } = await supabase
        .from('giveaway_entries')
        .select('*', { count: 'exact', head: true })
        .eq('giveaway_id', g.id);
      return { id: g.id, count: count ?? 0 };
    })
  );
  const countById = new Map(counts.map((c) => [c.id, c.count]));
  return rows.map((g) => ({ ...g, entry_count: countById.get(g.id) ?? 0 }));
}

export async function createGiveaway(input: GiveawayInput): Promise<Giveaway> {
  const { data, error } = await supabase.from('giveaways').insert(input).select().single();
  if (error) throw error;
  return data as Giveaway;
}

export async function updateGiveaway(id: string, input: Partial<GiveawayInput>): Promise<Giveaway> {
  const { data, error } = await supabase.from('giveaways').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data as Giveaway;
}

export async function deleteGiveaway(id: string) {
  const { error } = await supabase.from('giveaways').delete().eq('id', id);
  if (error) throw error;
}

export async function drawGiveawayWinners(giveawayId: string): Promise<number> {
  const { data, error } = await supabase.rpc('draw_giveaway_winners', { p_giveaway_id: giveawayId });
  if (error) throw error;
  const r = data as { ok: boolean; winners_drawn?: number; error?: string };
  if (!r.ok) throw new Error(r.error ?? 'draw_failed');
  return r.winners_drawn ?? 0;
}

export async function listGiveawayWinners(giveawayId: string) {
  const { data, error } = await supabase
    .from('giveaway_winners')
    .select('*, user:user_id(id)')
    .eq('giveaway_id', giveawayId);
  if (error) throw error;
  return data ?? [];
}

export async function uploadGiveawayImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('giveaway-images').upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('giveaway-images').getPublicUrl(path);
  return data.publicUrl;
}

// ── Activity feed ──────────────────────────────────────────────────────────

export type ActivityFilters = {
  from?: string | null;
  to?: string | null;
  userId?: string | null;
  workoutName?: string | null;
  limit?: number;
  offset?: number;
};

export async function fetchActivityFeed(filters: ActivityFilters = {}): Promise<WorkoutLogRow[]> {
  const { data, error } = await supabase.rpc('admin_activity_feed', {
    p_from: filters.from ?? null,
    p_to: filters.to ?? null,
    p_user_id: filters.userId ?? null,
    p_workout_name: filters.workoutName ?? null,
    p_limit: filters.limit ?? 200,
    p_offset: filters.offset ?? 0,
  });
  if (error) throw error;
  return (data ?? []) as WorkoutLogRow[];
}

export async function fetchDistinctWorkoutNames(): Promise<string[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('workout_name')
    .limit(1000);
  if (error) throw error;
  const set = new Set((data ?? []).map((r) => r.workout_name));
  return Array.from(set).sort();
}

// ── Content overrides (exercises + workouts) ──────────────────────────────

export type ExerciseOverride = {
  id: string;
  patch: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
};

export type WorkoutOverride = {
  id: string;
  patch: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
};

export async function listExerciseOverrides(): Promise<ExerciseOverride[]> {
  const { data, error } = await supabase
    .from('exercise_overrides')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExerciseOverride[];
}

export async function listWorkoutOverrides(): Promise<WorkoutOverride[]> {
  const { data, error } = await supabase
    .from('workout_overrides')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkoutOverride[];
}

export async function upsertExerciseOverride(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('admin_upsert_exercise_override', {
    p_id: id,
    p_patch: patch,
  });
  if (error) throw error;
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) throw new Error(r.error ?? 'upsert_failed');
}

export async function replaceExerciseOverride(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('admin_replace_exercise_override', {
    p_id: id,
    p_patch: patch,
  });
  if (error) throw error;
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) throw new Error(r.error ?? 'replace_failed');
}

export async function deleteExerciseOverride(id: string) {
  const { data, error } = await supabase.rpc('admin_delete_exercise_override', { p_id: id });
  if (error) throw error;
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) throw new Error(r.error ?? 'delete_failed');
}

export async function upsertWorkoutOverride(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('admin_upsert_workout_override', {
    p_id: id,
    p_patch: patch,
  });
  if (error) throw error;
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) throw new Error(r.error ?? 'upsert_failed');
}

export async function replaceWorkoutOverride(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('admin_replace_workout_override', {
    p_id: id,
    p_patch: patch,
  });
  if (error) throw error;
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) throw new Error(r.error ?? 'replace_failed');
}

export async function deleteWorkoutOverride(id: string) {
  const { data, error } = await supabase.rpc('admin_delete_workout_override', { p_id: id });
  if (error) throw error;
  const r = data as { ok: boolean; error?: string };
  if (!r.ok) throw new Error(r.error ?? 'delete_failed');
}

export async function uploadExerciseVideo(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() ?? 'mp4').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('exercise-videos').upload(path, file, {
    upsert: false,
    contentType: file.type || 'video/mp4',
  });
  if (error) throw error;
  const { data } = supabase.storage.from('exercise-videos').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadExerciseThumbnail(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('exercise-thumbnails').upload(path, file, {
    upsert: false,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw error;
  const { data } = supabase.storage.from('exercise-thumbnails').getPublicUrl(path);
  return data.publicUrl;
}

// ── Money challenges ──────────────────────────────────────────────────────

export type MoneyChallengeTier = 'free' | 'pro' | 'elite';

export type ExerciseOptionId =
  | 'pushups'
  | 'squats'
  | 'mountain_climbers'
  | 'pull_ups';

export const EXERCISE_OPTION_CATALOG: { id: ExerciseOptionId; name: string; emoji: string }[] = [
  { id: 'pushups', name: 'Pushups', emoji: '💪' },
  { id: 'squats', name: 'Squats', emoji: '🦵' },
  { id: 'mountain_climbers', name: 'Mountain Climbers', emoji: '⛰️' },
  { id: 'pull_ups', name: 'Pull-ups', emoji: '🆙' },
];

export type MoneyChallenge = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  exercise_option_ids: ExerciseOptionId[];
  reps_per_day: number;
  total_days: number;
  reward_amount: number;
  reward_currency: string;
  max_participants: number | null;
  required_tier: MoneyChallengeTier;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  current_active: number;
  total_ever: number;
  created_at: string;
  updated_at: string;
};

export type MoneyChallengeInput = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  exercise_option_ids: ExerciseOptionId[];
  reps_per_day: number;
  total_days: number;
  reward_amount: number;
  reward_currency: string;
  max_participants: number | null;
  required_tier: MoneyChallengeTier;
  is_active: boolean;
  sort_order: number;
  starts_at?: string | null;
  ends_at?: string | null;
};

export async function listMoneyChallenges(): Promise<MoneyChallenge[]> {
  const { data, error } = await supabase.rpc('admin_list_money_challenges');
  if (error) throw error;
  return (data ?? []) as MoneyChallenge[];
}

export async function createMoneyChallenge(input: MoneyChallengeInput) {
  const { error } = await supabase.from('money_challenges').insert(input);
  if (error) throw error;
}

export async function updateMoneyChallenge(id: string, input: Partial<MoneyChallengeInput>) {
  const { error } = await supabase.from('money_challenges').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteMoneyChallenge(id: string) {
  const { error } = await supabase.from('money_challenges').delete().eq('id', id);
  if (error) throw error;
}

export async function setMoneyChallengeActive(id: string, isActive: boolean) {
  const { error } = await supabase.from('money_challenges').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}
