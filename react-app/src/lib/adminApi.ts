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
  // The exercise-videos bucket only allows video/mp4, but iPhone/QuickTime
  // recordings come in as video/quicktime (.mov). Both formats share the
  // ISO BMFF container, so we always store as .mp4 with mime video/mp4 —
  // browsers and downstream ffmpeg handle either input transparently.
  const path = `${crypto.randomUUID()}.mp4`;
  const { error } = await supabase.storage.from('exercise-videos').upload(path, file, {
    upsert: false,
    contentType: 'video/mp4',
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

// ── Phase 5: canonical content rows (exercises, workouts, programs) ───────
//
// These coexist with the override-based functions above during migration.
// Once the canonical tables become the source of truth in the app, the
// override functions can be retired — but until then both paths keep working.

export type ContentStatus = 'draft' | 'published' | 'archived';

export type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  cat: string | null;
  primary_cat: string | null;
  subcat: string | null;
  environment: string | null;
  body_focus: string | null;
  equipment: string | null;
  machine_required: boolean;
  diff: string | null;
  variation: string;
  emoji: string;
  setup_notes: string;
  parent_id: string;
  parent_name: string;
  video_url: string | null;
  thumbnail_url: string | null;
  voiceover_url: string | null;
  status: ContentStatus;
  origin: string;
  created_at: string;
  updated_at: string;
};

export type WorkoutBlockEntry = {
  exercise_id: string | null;
  exercise_name: string;
  sets: string;
  reps: string;
};

export type WorkoutRow = {
  id: string;
  slug: string;
  name: string;
  cat: string | null;
  subcat: string | null;
  dur: number | null;
  diff: string | null;
  emoji: string;
  warmup: WorkoutBlockEntry[];
  main: WorkoutBlockEntry[];
  cooldown: WorkoutBlockEntry[];
  status: ContentStatus;
  origin: string;
  created_at: string;
  updated_at: string;
};

export type ProgramRow = WorkoutRow & { days: number; blocks: unknown[] };

type CanonicalMutationResult<T> = { ok: boolean; row?: T; error?: string };

// ── Exercises (canonical) ─────────────────────────────────────────────────

export async function listExercises(status?: ContentStatus): Promise<ExerciseRow[]> {
  const { data, error } = await supabase.rpc('admin_list_exercises', {
    p_status: status ?? null,
  });
  if (error) throw error;
  return (data ?? []) as ExerciseRow[];
}

export async function createExercise(
  row: Partial<ExerciseRow>,
): Promise<CanonicalMutationResult<ExerciseRow>> {
  const { data, error } = await supabase.rpc('admin_create_exercise', { p_row: row });
  if (error) throw error;
  return data as CanonicalMutationResult<ExerciseRow>;
}

export async function updateExercise(
  id: string,
  patch: Partial<ExerciseRow>,
): Promise<CanonicalMutationResult<ExerciseRow>> {
  const { data, error } = await supabase.rpc('admin_update_exercise', {
    p_id: id,
    p_patch: patch,
  });
  if (error) throw error;
  return data as CanonicalMutationResult<ExerciseRow>;
}

export async function deleteExercise(
  id: string,
): Promise<CanonicalMutationResult<ExerciseRow>> {
  const { data, error } = await supabase.rpc('admin_delete_exercise', { p_id: id });
  if (error) throw error;
  return data as CanonicalMutationResult<ExerciseRow>;
}

// ── Workouts (canonical) ──────────────────────────────────────────────────

export async function listWorkouts(status?: ContentStatus): Promise<WorkoutRow[]> {
  const { data, error } = await supabase.rpc('admin_list_workouts', {
    p_status: status ?? null,
  });
  if (error) throw error;
  return (data ?? []) as WorkoutRow[];
}

export async function createWorkout(
  row: Partial<WorkoutRow>,
): Promise<CanonicalMutationResult<WorkoutRow>> {
  const { data, error } = await supabase.rpc('admin_create_workout', { p_row: row });
  if (error) throw error;
  return data as CanonicalMutationResult<WorkoutRow>;
}

export async function updateWorkout(
  id: string,
  patch: Partial<WorkoutRow>,
): Promise<CanonicalMutationResult<WorkoutRow>> {
  const { data, error } = await supabase.rpc('admin_update_workout', {
    p_id: id,
    p_patch: patch,
  });
  if (error) throw error;
  return data as CanonicalMutationResult<WorkoutRow>;
}

export async function deleteWorkout(
  id: string,
): Promise<CanonicalMutationResult<WorkoutRow>> {
  const { data, error } = await supabase.rpc('admin_delete_workout', { p_id: id });
  if (error) throw error;
  return data as CanonicalMutationResult<WorkoutRow>;
}

// ── Programs (canonical) ──────────────────────────────────────────────────

export async function listPrograms(status?: ContentStatus): Promise<ProgramRow[]> {
  const { data, error } = await supabase.rpc('admin_list_programs', {
    p_status: status ?? null,
  });
  if (error) throw error;
  return (data ?? []) as ProgramRow[];
}

export async function createProgram(
  row: Partial<ProgramRow>,
): Promise<CanonicalMutationResult<ProgramRow>> {
  const { data, error } = await supabase.rpc('admin_create_program', { p_row: row });
  if (error) throw error;
  return data as CanonicalMutationResult<ProgramRow>;
}

export async function updateProgram(
  id: string,
  patch: Partial<ProgramRow>,
): Promise<CanonicalMutationResult<ProgramRow>> {
  const { data, error } = await supabase.rpc('admin_update_program', {
    p_id: id,
    p_patch: patch,
  });
  if (error) throw error;
  return data as CanonicalMutationResult<ProgramRow>;
}

export async function deleteProgram(
  id: string,
): Promise<CanonicalMutationResult<ProgramRow>> {
  const { data, error } = await supabase.rpc('admin_delete_program', { p_id: id });
  if (error) throw error;
  return data as CanonicalMutationResult<ProgramRow>;
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

// ─── Media jobs (video processing + voiceover generation) ───────────────────
export type MediaJobStatus = 'pending' | 'processing' | 'done' | 'error';
export type MediaJobType = 'process_video' | 'generate_voiceover' | 'delete_video';

export type MediaJobRow = {
  id: number;
  exercise_id: string | null;
  job_type: MediaJobType;
  storage_path: string | null;
  voice: string | null;
  status: MediaJobStatus;
  progress_message: string | null;
  error_message: string | null;
  output_url: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  created_by: string | null;
};

const RAW_VIDEO_BUCKET = 'exercise-videos-raw';

/**
 * Upload a raw MP4 to the private `exercise-videos-raw` bucket.
 * Returns the storage path that downstream jobs use to look up the file.
 */
export async function uploadExerciseVideoRaw(
  file: File,
  intendedSlug: string,
): Promise<{ storage_path: string }> {
  const safeSlug = intendedSlug.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase() || 'exercise';
  const path = `${safeSlug}-${Date.now()}.mp4`;
  const { error } = await supabase.storage.from(RAW_VIDEO_BUCKET).upload(path, file, {
    contentType: 'video/mp4',
    upsert: false,
  });
  if (error) throw new Error(`upload failed: ${error.message}`);
  return { storage_path: path };
}

export async function createMediaJob(
  exercise_id: string,
  job_type: MediaJobType,
  storage_path: string | null = null,
  voice: string | null = null,
): Promise<{ ok: boolean; job?: MediaJobRow; error?: string }> {
  const { data, error } = await supabase.rpc('admin_create_media_job', {
    p_exercise_id: exercise_id,
    p_job_type: job_type,
    p_storage_path: storage_path,
    p_voice: voice,
  });
  if (error) return { ok: false, error: error.message };
  return data as { ok: boolean; job?: MediaJobRow; error?: string };
}

export async function listMediaJobs(
  exercise_id: string | null = null,
  status: MediaJobStatus | null = null,
  limit = 50,
): Promise<MediaJobRow[]> {
  const { data, error } = await supabase.rpc('admin_list_media_jobs', {
    p_exercise_id: exercise_id,
    p_status: status,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as MediaJobRow[];
}

export async function getMediaJob(id: number): Promise<MediaJobRow | null> {
  const { data, error } = await supabase.rpc('admin_get_media_job', { p_id: id });
  if (error) throw error;
  const r = data as { ok: boolean; job?: MediaJobRow };
  return r.ok && r.job ? r.job : null;
}

/**
 * Subscribe to status updates for a single media_jobs row via Supabase Realtime.
 * Falls back to a 3s polling loop if realtime fails to connect within 2s.
 * Returns an unsubscribe function.
 */
export function subscribeToMediaJob(
  jobId: number,
  onUpdate: (job: MediaJobRow) => void,
): () => void {
  let cancelled = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  const channel = supabase
    .channel(`media-job-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'media_jobs',
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        if (!cancelled) onUpdate(payload.new as MediaJobRow);
      },
    )
    .subscribe();

  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
      if (cancelled) return;
      try {
        const j = await getMediaJob(jobId);
        if (j && !cancelled) onUpdate(j);
      } catch {
        // ignore — next tick will retry
      }
    }, 3000);
  };

  // Fallback: if realtime hasn't subscribed in 2s, start polling.
  const fallback = setTimeout(() => {
    if (channel.state !== 'joined') startPolling();
  }, 2000);

  return () => {
    cancelled = true;
    clearTimeout(fallback);
    if (pollTimer) clearInterval(pollTimer);
    void supabase.removeChannel(channel);
  };
}
