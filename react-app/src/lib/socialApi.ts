/**
 * Admin data layer for the social scheduler.
 *
 * Schema source of truth: libo-app-v2/supabase-migration-social-posts.sql.
 * Writes go straight to the tables (admin RLS on social_posts /
 * social_post_targets is `is_admin()` FOR ALL), matching how the other admin
 * pages read and write content tables.
 *
 * `social_accounts` is never selected directly: it holds platform access tokens
 * and has RLS enabled with zero policies, so only the worker's service_role can
 * read it. Connection state comes from the `admin_list_social_accounts()` RPC,
 * which is gated on is_admin() and returns `has_token` rather than the token.
 */
import { supabase } from './supabase';

export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'threads' | 'facebook';
export type SocialMediaType = 'video' | 'image' | 'carousel' | 'text';
export type SocialPostStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'posted'
  | 'failed'
  | 'cancelled';
export type SocialTargetStatus =
  | 'pending'
  | 'publishing'
  | 'posted'
  | 'failed'
  | 'needs_tap'
  | 'skipped';

export type SocialPostTarget = {
  id: string;
  post_id: string;
  platform: SocialPlatform;
  mode: 'direct' | 'inbox';
  title: string | null;
  caption: string | null;
  tags: string[];
  status: SocialTargetStatus;
  remote_id: string | null;
  remote_url: string | null;
  attempts: number;
  last_error: string | null;
  posted_at: string | null;
};

export type SocialPost = {
  id: string;
  status: SocialPostStatus;
  scheduled_at: string | null;
  media_type: SocialMediaType;
  media_urls: string[];
  cover_url: string | null;
  cover_index: number | null;
  source_clip: string | null;
  captions_md_path: string | null;
  notes: string | null;
  music_track: string | null;
  music_volume: number | null;
  created_at: string;
  updated_at: string;
  targets: SocialPostTarget[];
};

const POST_COLUMNS =
  'id, status, scheduled_at, media_type, media_urls, cover_url, cover_index, ' +
  'source_clip, captions_md_path, notes, music_track, music_volume, created_at, updated_at';

export async function fetchSocialPosts(): Promise<SocialPost[]> {
  const { data, error } = await supabase
    .from('social_posts')
    .select(`${POST_COLUMNS}, targets:social_post_targets(*)`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...(row as Omit<SocialPost, 'targets'>),
    targets: (((row as { targets?: SocialPostTarget[] }).targets ?? []) as SocialPostTarget[]).sort(
      (a, b) => a.platform.localeCompare(b.platform),
    ),
  }));
}

/**
 * Release a post to the scheduler. pg_cron picks it up within 5 minutes of
 * `scheduled_at`; there is no instant-post path by design, so "post now" means
 * "within the next cron tick".
 */
export async function schedulePost(id: string, scheduledAtIso: string): Promise<void> {
  const { error } = await supabase
    .from('social_posts')
    .update({ status: 'scheduled', scheduled_at: scheduledAtIso, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function unschedulePost(id: string): Promise<void> {
  const { error } = await supabase
    .from('social_posts')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function cancelPost(id: string): Promise<void> {
  const { error } = await supabase
    .from('social_posts')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updatePostFields(
  id: string,
  patch: Partial<Pick<SocialPost, 'music_track' | 'music_volume' | 'notes' | 'cover_index'>>,
): Promise<void> {
  const { error } = await supabase
    .from('social_posts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateTarget(
  id: string,
  patch: Partial<Pick<SocialPostTarget, 'title' | 'caption' | 'mode' | 'status'>>,
): Promise<void> {
  const { error } = await supabase
    .from('social_post_targets')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Put a failed target back in the queue. Resets attempts, because the 5-attempt
 * budget is meant to stop an automatic retry storm, not to block a human who
 * has fixed whatever was wrong.
 */
export async function retryTarget(id: string): Promise<void> {
  const { error } = await supabase
    .from('social_post_targets')
    .update({ status: 'pending', attempts: 0, last_error: null, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Connection state per platform. Goes through an RPC rather than a table read:
 * social_accounts holds access tokens and has RLS enabled with NO policies, so
 * a direct select always returns empty and the panel would claim "nothing
 * connected" forever. The RPC is SECURITY DEFINER, gated on is_admin(), and
 * returns `has_token` instead of the token itself.
 */
export type SocialAccountState = {
  platform: SocialPlatform;
  handle: string | null;
  audit_status: string;
  has_token: boolean;
  expires_at: string | null;
};

export async function fetchConnectedPlatforms(): Promise<SocialAccountState[]> {
  const { data, error } = await supabase.rpc('admin_list_social_accounts');
  if (error) throw new Error(error.message);
  return (data ?? []) as SocialAccountState[];
}
