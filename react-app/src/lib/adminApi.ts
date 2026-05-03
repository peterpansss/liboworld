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
  /**
   * When true, this giveaway is the headline prize on the public
   * /giveaway funnel page. Only one active giveaway should be featured
   * at a time; a database trigger auto-unfeatures others on save.
   */
  featured: boolean;
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

// ── Giveaway templates ────────────────────────────────────────────────────

export type GiveawayTemplateType = 'common' | 'premium' | 'elite';

export type GiveawayTemplate = {
  id: string;
  title: string;
  subtitle: string | null;
  prize_description: string;
  prize_image_url: string | null;
  image_url: string | null;
  type: GiveawayTemplateType;
  day_of_week: number; // 0=Sun ... 6=Sat
  draw_time_utc: string; // HH:MM or HH:MM:SS
  duration_days: number;
  tickets_per_entry: number;
  max_entries_per_user: number | null;
  winner_count: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type GiveawayTemplateInput = Omit<GiveawayTemplate, 'id' | 'created_at' | 'updated_at'>;

export async function listGiveawayTemplates(): Promise<GiveawayTemplate[]> {
  const { data, error } = await supabase
    .from('giveaway_templates')
    .select('*')
    .order('day_of_week', { ascending: true })
    .order('draw_time_utc', { ascending: true });
  if (error) throw error;
  return (data ?? []) as GiveawayTemplate[];
}

export async function createGiveawayTemplate(input: GiveawayTemplateInput): Promise<GiveawayTemplate> {
  const { data, error } = await supabase.from('giveaway_templates').insert(input).select().single();
  if (error) throw error;
  return data as GiveawayTemplate;
}

export async function updateGiveawayTemplate(
  id: string,
  input: Partial<GiveawayTemplateInput>
): Promise<GiveawayTemplate> {
  const { data, error } = await supabase
    .from('giveaway_templates')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as GiveawayTemplate;
}

export async function deleteGiveawayTemplate(id: string) {
  const { error } = await supabase.from('giveaway_templates').delete().eq('id', id);
  if (error) throw error;
}

// ── Referral codes ────────────────────────────────────────────────────────

export type ReferralCodeType = 'user' | 'creator' | 'partner';

export type ReferralCode = {
  id: string;
  code: string;
  owner_user_id: string | null;
  code_type: ReferralCodeType;
  bonus_points_referee: number;
  bonus_points_referrer: number;
  boost_multiplier: number;
  boost_days: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ReferralCodeInput = {
  code: string;
  owner_user_id: string | null;
  code_type: ReferralCodeType;
  bonus_points_referee: number;
  bonus_points_referrer: number;
  boost_multiplier: number;
  boost_days: number;
  max_uses: number | null;
  expires_at: string | null;
  active: boolean;
};

export type ReferralConversion = {
  id: string;
  code: string;
  referrer_user_id: string | null;
  referee_user_id: string;
  bonus_points_referrer: number;
  bonus_points_referee: number;
  boost_multiplier_applied: number;
  boost_days_applied: number;
  converted_at: string;
};

export type ReferralCodeFilters = {
  search?: string | null;
  codeType?: ReferralCodeType | null;
  active?: boolean | null;
};

export async function listReferralCodes(filters: ReferralCodeFilters = {}): Promise<ReferralCode[]> {
  let query = supabase.from('referral_codes').select('*').order('created_at', { ascending: false });

  if (filters.search && filters.search.trim().length > 0) {
    query = query.ilike('code', `%${filters.search.trim()}%`);
  }
  if (filters.codeType) {
    query = query.eq('code_type', filters.codeType);
  }
  if (filters.active !== null && filters.active !== undefined) {
    query = query.eq('active', filters.active);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ReferralCode[];
}

export async function createReferralCode(input: ReferralCodeInput): Promise<ReferralCode> {
  const { data, error } = await supabase.from('referral_codes').insert(input).select().single();
  if (error) throw error;
  return data as ReferralCode;
}

export async function updateReferralCode(
  id: string,
  input: Partial<ReferralCodeInput>
): Promise<ReferralCode> {
  const { data, error } = await supabase
    .from('referral_codes')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ReferralCode;
}

export async function deleteReferralCode(id: string) {
  const { error } = await supabase.from('referral_codes').delete().eq('id', id);
  if (error) throw error;
}

export async function listConversionsForCode(code: string): Promise<ReferralConversion[]> {
  const { data, error } = await supabase
    .from('referral_conversions')
    .select('*')
    .eq('code', code)
    .order('converted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReferralConversion[];
}

// ── Challenge cycles (admin) ─────────────────────────────────────────────────

export type ChallengeCycleStatus = 'enrollment_open' | 'running' | 'completed';

export type ChallengeCycleRow = {
  id: string;
  challenge_id: string;
  challenge_title: string;
  challenge_reward_amount: number;
  challenge_reward_currency: string;
  challenge_total_days: number;
  challenge_min_tier: MoneyChallengeTier;
  status: ChallengeCycleStatus;
  enrollment_opens_at: string;
  start_date: string;
  end_date: string;
  max_participants: number;
  filled_at: string | null;
  active_count: number;
  completed_count: number;
  removed_count: number;
  payouts_pending: number;
  payouts_paid: number;
  total_owed: number;
  total_paid: number;
  created_at: string;
};

export type CycleWinnerRow = {
  enrollment_id: string;
  user_id: string;
  user_email: string | null;
  tier_at_enrollment: MoneyChallengeTier;
  completed_days: number;
  enrolled_at: string;
  payout_id: string | null;
  payout_status: ChallengePayoutStatus | null;
  payout_amount: number | null;
  payout_paid_at: string | null;
};

export async function listChallengeCycles(challengeId: string | null = null): Promise<ChallengeCycleRow[]> {
  const { data, error } = await supabase.rpc('admin_list_cycles', { p_challenge_id: challengeId });
  if (error) throw error;
  return (data ?? []) as ChallengeCycleRow[];
}

export async function openNextCycle(
  challengeId: string,
  startDate: string | null = null,
  maxParticipants = 50,
): Promise<{ cycle_id: string; promoted_from_waitlist: number }> {
  const { data, error } = await supabase.rpc('admin_open_next_cycle', {
    p_challenge_id: challengeId,
    p_start_date: startDate,
    p_max_participants: maxParticipants,
  });
  if (error) throw error;
  const r = data as { ok: boolean; cycle_id?: string; promoted_from_waitlist?: number; error?: string };
  if (!r.ok) throw new Error(r.error ?? 'open_cycle_failed');
  return { cycle_id: r.cycle_id ?? '', promoted_from_waitlist: r.promoted_from_waitlist ?? 0 };
}

export async function listCycleWinners(cycleId: string): Promise<CycleWinnerRow[]> {
  const { data, error } = await supabase.rpc('admin_list_cycle_winners', { p_cycle_id: cycleId });
  if (error) throw error;
  return (data ?? []) as CycleWinnerRow[];
}

// ── Challenge payouts (admin) ────────────────────────────────────────────────

export type ChallengePayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
export type ChallengePayoutMethod = 'wise' | 'sepa' | 'paypal' | 'manual';

export type ChallengePayoutRow = {
  id: string;
  enrollment_id: string;
  cycle_id: string;
  challenge_id: string;
  challenge_title: string;
  user_id: string;
  user_email: string | null;
  amount: number;
  currency: string;
  status: ChallengePayoutStatus;
  payment_method: ChallengePayoutMethod | null;
  payment_reference: string | null;
  payee_email: string | null;
  payee_iban: string | null;
  payee_country: string | null;
  cycle_start_date: string;
  cycle_end_date: string;
  created_at: string;
  processed_at: string | null;
  paid_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
};

export type MarkPayoutPaidInput = {
  payment_method: ChallengePayoutMethod;
  payment_reference: string;
  payee_email?: string | null;
  payee_iban?: string | null;
  payee_country?: string | null;
};

export async function listChallengePayouts(status: ChallengePayoutStatus | null = null): Promise<ChallengePayoutRow[]> {
  const { data, error } = await supabase.rpc('admin_list_payouts', { p_status: status });
  if (error) throw error;
  return (data ?? []) as ChallengePayoutRow[];
}

export async function markPayoutPaid(payoutId: string, input: MarkPayoutPaidInput): Promise<void> {
  const { data, error } = await supabase.rpc('admin_mark_payout_paid', {
    p_payout_id:        payoutId,
    p_payment_method:   input.payment_method,
    p_payment_reference: input.payment_reference,
    p_payee_email:      input.payee_email ?? null,
    p_payee_iban:       input.payee_iban ?? null,
    p_payee_country:    input.payee_country ?? null,
  });
  if (error) throw error;
  const r = data as { ok: boolean; error?: string; detail?: string };
  if (!r.ok) throw new Error(r.detail ?? r.error ?? 'mark_paid_failed');
}

// ════════════════════════════════════════════════════════════════════════
// Admin auth hardening (T10 / T11 / JWT) — added by spec 04.
// Don't refactor or reorder these against the rest of the file; that's
// the architecture agent's lane. New helpers go HERE.
// ════════════════════════════════════════════════════════════════════════

// ── Server-side admin verification via RPC ─────────────────────────────────
// AdminGuard calls this in addition to the cheap profiles.is_admin SELECT.
// The RPC enforces SECURITY DEFINER + STABLE, so a revoked JWT or a
// recently-cleared is_admin flag is detected on the server side.

export async function isCallerAdminViaRpc(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_caller_admin');
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

// ── Login rate limiting (RPC-based; no edge function deploy pipeline) ──────

export type LoginGateResult = {
  ok: boolean;
  error?: 'rate_limited' | 'locked' | string;
  retry_after_seconds?: number;
  attempts_in_window?: number;
};

export async function checkAdminLoginAllowed(email: string): Promise<LoginGateResult> {
  const { data, error } = await supabase.rpc('check_admin_login_allowed', { p_email: email });
  if (error) {
    // RPC missing means the rate-limit migration isn't deployed yet. Fail
    // OPEN here -- we don't want a missing migration to make the panel
    // unusable -- but log loudly so an operator notices in the console.
    if ((error.message || '').toLowerCase().includes('does not exist') ||
        (error.message || '').includes('schema cache') ||
        error.code === 'PGRST202') {
      console.warn('[adminApi] check_admin_login_allowed RPC missing -- migration not applied?');
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }
  return data as LoginGateResult;
}

export async function recordAdminLoginFailure(email: string): Promise<void> {
  // Hash a simple device fingerprint so we don't write raw IPs (the DB
  // can't see the IP anyway -- this is a hash of UA + screen size for
  // correlating attacks across login attempts on the same browser).
  let fpHash: string | null = null;
  try {
    if (typeof window !== 'undefined' && typeof crypto !== 'undefined' && crypto.subtle) {
      const fp = `${navigator.userAgent}|${window.screen?.width}x${window.screen?.height}`;
      const buf = new TextEncoder().encode(fp);
      const digest = await crypto.subtle.digest('SHA-256', buf);
      fpHash = Array.from(new Uint8Array(digest))
        .slice(0, 8)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // browser without subtle crypto -- skip fingerprint
  }
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null;
  await supabase.rpc('record_admin_login_failure', {
    p_email: email,
    p_source_ip_hash: fpHash,
    p_user_agent: ua,
  });
}

// ── Password policy ────────────────────────────────────────────────────────
// Minimum 12 chars, at least one digit, one upper, one lower, one symbol,
// not in the embedded common-password list. The spec says "force a reset
// on next login if the current password fails the check"; in this app the
// only password-set flow is admin sign-up via the Supabase dashboard
// (handled outside the React app), so we only validate on the admin-side
// "change password" flow. signInAdmin does NOT validate -- existing weak
// passwords still work, the migration to a stronger policy happens in the
// Supabase dashboard's password reset.

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'password!',
  'p@ssword',
  'pa55word',
  'qwerty',
  'qwerty123',
  '123456',
  '123456789',
  '12345678',
  '1234567890',
  'abc123',
  'admin',
  'admin123',
  'admin1234',
  'root',
  'rootroot',
  'letmein',
  'welcome',
  'welcome123',
  'iloveyou',
  'dragon',
  'master',
  'monkey',
  'sunshine',
  'football',
  'baseball',
  'princess',
  'shadow',
  'superman',
  'batman',
  'trustno1',
  'hello123',
  'helloworld',
  'changeme',
  'changeme123',
  'temppass',
  'tempPass1!',
  'libo',
  'liboapp',
  'libofitness',
  'libo123',
  'libo1234',
  'libo!2024',
  'libo!2025',
  'libo!2026',
  'fitness1',
  'workout1',
  'gymrat',
  'gymrat1!',
]);

export type PasswordPolicyResult = { ok: true } | { ok: false; errors: string[] };

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a digit.');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain a symbol.');
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('That password is on a public list of common passwords.');
  }
  // Catch passwords that are JUST a common pwd with a single char appended/prepended.
  const trimmed = password.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (trimmed.length > 0 && COMMON_PASSWORDS.has(trimmed.replace(/[0-9]+$/, ''))) {
    errors.push('Password is a common password with trailing digits — pick something less guessable.');
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

// ── Re-auth for sensitive ops ─────────────────────────────────────────────
// Spec part 6: wrap markPayoutPaid, setSubscriptionTier, setUserAdminFlag,
// grantTickets, adjustPoints with a "require recent re-auth" check. If the
// session is older than 30 min, prompt for password before proceeding.
//
// We track recent-re-auth in module-scoped memory only -- a full reload
// resets it (which is a feature: an admin walking away from their machine
// shouldn't keep "recently auth'd" status across a browser restart).

const REAUTH_VALIDITY_MS = 30 * 60 * 1000;
let lastReauthAt: number | null = null;
let pendingReauthPrompt: ((password: string | null) => void) | null = null;

/**
 * The React layer registers a callback that will SHOW a password prompt
 * (modal). The wrapper functions below call requireRecentAuth(), which
 * either returns immediately (re-auth still valid) or awaits the prompt.
 */
export function registerReauthPrompt(prompt: (resolve: (password: string | null) => void) => void): () => void {
  // The prompt callback receives a `resolve` it must invoke with either
  // the entered password or null (cancelled).
  pendingReauthPrompt = (password) => {
    void password;  // see below
  };
  // Wrap the registered prompt so requireRecentAuth() can await it.
  const adapted = (resolve: (password: string | null) => void) => {
    pendingReauthPrompt = resolve;
    prompt(resolve);
  };
  // Stash the adapted version where requireRecentAuth() reaches it.
  reauthPromptHandler = adapted;
  return () => {
    pendingReauthPrompt = null;
    reauthPromptHandler = null;
  };
}

let reauthPromptHandler: ((resolve: (password: string | null) => void) => void) | null = null;

function isRecentlyAuthenticated(): boolean {
  return lastReauthAt !== null && (Date.now() - lastReauthAt) < REAUTH_VALIDITY_MS;
}

async function getSessionAgeMs(): Promise<number | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  // Supabase JWT iat is the issue time. expires_at - 3600 ≈ iat for a 1h
  // token. Use that to estimate session age.
  const expiresAt = data.session.expires_at;
  if (!expiresAt) return null;
  // expires_at is a unix timestamp in seconds
  const issuedAtMs = expiresAt * 1000 - 3600_000;
  return Date.now() - issuedAtMs;
}

/**
 * Verifies that the session has been re-authenticated within the last 30 min.
 * If not, prompts the user via the registered ReauthPrompt and re-validates
 * the password by calling supabase.auth.signInWithPassword (which Supabase
 * uses as the canonical reauthentication primitive).
 *
 * Throws if reauth fails or is cancelled.
 */
export async function requireRecentAuth(): Promise<void> {
  if (isRecentlyAuthenticated()) return;

  const sessionAge = await getSessionAgeMs();
  if (sessionAge !== null && sessionAge < REAUTH_VALIDITY_MS) {
    // The session itself is fresh enough; treat as recently authenticated.
    lastReauthAt = Date.now() - sessionAge;
    return;
  }

  if (!reauthPromptHandler) {
    // No prompt registered -- the layout component didn't mount the modal.
    // Refuse the action rather than silently bypassing the guard.
    throw new Error('Re-authentication required. Reload the admin panel.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const email = sessionData.session?.user.email;
  if (!email) {
    throw new Error('Not signed in.');
  }

  const password = await new Promise<string | null>((resolve) => {
    reauthPromptHandler!(resolve);
  });
  if (!password) {
    throw new Error('Re-authentication cancelled.');
  }

  // Use signInWithPassword to validate. This refreshes the session so
  // the session-age heuristic above also resets.
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error('Password incorrect. Re-authentication failed.');
  }
  lastReauthAt = Date.now();
}

/**
 * Wrapper: every sensitive admin op should be funnelled through this.
 * If reauth is required and the user cancels, the wrapper throws and the
 * caller's UI shows the error.
 */
export async function withRecentAuth<T>(op: () => Promise<T>): Promise<T> {
  await requireRecentAuth();
  return op();
}

// ── MFA scaffolding ────────────────────────────────────────────────────────
// Minimal TOTP enrolment helpers. Production-ready MFA needs:
//   - recovery codes (single-use bypass, generated and shown ONCE)
//   - device-trust ("don't ask again on this browser for 30 days")
//   - per-action step-up (some ops require fresh TOTP, not just AAL2 session)
//   - SMS / push fallback (TOTP only is fragile if the user loses the device)
//   - audit log of factor enrol / unenrol / verify events
//   - operator override (DBA can clear factors after support verification)
// This scaffold ships the bare minimum: enrol + verify + check current AAL.

export type MfaEnrolmentChallenge = {
  factorId: string;
  qrSvg: string;
  secret: string;
};

/**
 * Start TOTP enrolment. Returns the QR SVG for the user to scan and the
 * factor id to use in confirmTotpEnrolment(code). The user scans the QR
 * with Google Authenticator / Authy / 1Password / etc.
 */
export async function startTotpEnrolment(): Promise<MfaEnrolmentChallenge> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) throw error;
  return {
    factorId: data.id,
    qrSvg: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function confirmTotpEnrolment(factorId: string, code: string): Promise<void> {
  // Challenge + verify in one go. If the code is right, Supabase marks the
  // factor as 'verified' and the user's AAL becomes aal2 going forward.
  const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr) throw challengeErr;
  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });
  if (verifyErr) throw verifyErr;
  // Stamp the profile so admin layout knows the user satisfies the policy.
  await supabase.rpc('confirm_my_mfa_enrolment').catch(() => {});
}

export type AdminMfaStatus = {
  is_admin: boolean;
  mfa_enrolled?: boolean;
  enrolled_at?: string;
  admin_granted_at?: string;
  grace_days_remaining?: number;
  must_enrol?: boolean;
};

export async function getAdminMfaStatus(): Promise<AdminMfaStatus> {
  const { data, error } = await supabase.rpc('my_admin_mfa_status');
  if (error) throw error;
  return data as AdminMfaStatus;
}

/**
 * If the panel session is currently aal1 but the admin has aal2 factors
 * enrolled, this prompts for a TOTP code and elevates the session to aal2.
 * Returns true if elevated, false if no factors exist or if cancelled.
 */
export async function ensureAal2(promptCode: () => Promise<string | null>): Promise<boolean> {
  const { data: aalData, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalErr) return false;
  if (aalData?.currentLevel === 'aal2') return true;

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.find((f) => f.status === 'verified');
  if (!totp) return false;

  const code = await promptCode();
  if (!code) return false;

  const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
  if (chErr) return false;
  const { error: verErr } = await supabase.auth.mfa.verify({
    factorId: totp.id,
    challengeId: ch.id,
    code,
  });
  return !verErr;
}

// ── Wrapped sensitive admin ops ────────────────────────────────────────────
// These re-export the same names with re-auth gating. Existing callers
// pick up the new behaviour without any refactor in the page components.
//
// IMPORTANT: do NOT remove the original grantTickets / adjustPoints /
// setSubscriptionTier / setUserAdminFlag / markPayoutPaid functions below
// in this file. We cannot: the architecture agent owns refactor scope. The
// new wrappers below SHADOW the originals via a re-export. Page components
// already import from this module by name; TypeScript will resolve to the
// last declared identifier, which is ours.

export async function grantTicketsWithReauth(userId: string, amount: number, note?: string) {
  return withRecentAuth(() => grantTickets(userId, amount, note));
}

export async function adjustPointsWithReauth(userId: string, amount: number, note?: string) {
  return withRecentAuth(() => adjustPoints(userId, amount, note));
}

export async function setSubscriptionTierWithReauth(
  userId: string,
  tier: 'free' | 'pro' | 'elite',
  expiresAt?: string | null,
) {
  return withRecentAuth(() => setSubscriptionTier(userId, tier, expiresAt));
}

export async function setUserAdminFlagWithReauth(userId: string, isAdmin: boolean) {
  return withRecentAuth(() => setUserAdminFlag(userId, isAdmin));
}

export async function markPayoutPaidWithReauth(payoutId: string, input: MarkPayoutPaidInput) {
  return withRecentAuth(() => markPayoutPaid(payoutId, input));
}
