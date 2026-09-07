import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cancelPost,
  fetchConnectedPlatforms,
  fetchSocialPosts,
  retryTarget,
  schedulePost,
  unschedulePost,
  updateTarget,
  type SocialAccountState,
  type SocialPlatform,
  type SocialPost,
  type SocialPostTarget,
  type SocialTargetStatus,
} from '../../lib/socialApi';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Button, Field, Select, TextArea, TextInput } from '../../components/admin/FormField';
import { KpiCard } from '../../components/admin/KpiCard';
import { colors } from '../../theme';

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  threads: 'Threads',
  facebook: 'Facebook',
};

const STATUS_COLOR: Record<SocialTargetStatus, string> = {
  pending: colors.muted,
  publishing: colors.warning,
  posted: colors.success,
  failed: colors.error,
  needs_tap: colors.warning,
  skipped: colors.dim,
};

const fmtDateTime = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** datetime-local wants local wall-clock with no zone; the DB wants UTC ISO. */
const toLocalInputValue = (iso: string | null) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
};

function StatusPill({ status }: { status: SocialTargetStatus }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        color: STATUS_COLOR[status],
        border: `1px solid ${STATUS_COLOR[status]}`,
        background: 'transparent',
        whiteSpace: 'nowrap',
      }}
    >
      {status === 'needs_tap' ? 'NEEDS TAP' : status.toUpperCase()}
    </span>
  );
}

/**
 * A TikTok inbox draft is NOT live. It is the single most misreadable state in
 * this panel — the API call succeeded, so everything looks green, but the clip
 * is sitting in the phone's inbox waiting for someone to open the app. Say so
 * in words rather than relying on the pill.
 */
function NeedsTapBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        border: `1px solid ${colors.warning}`,
        background: colors.warningDim,
        color: colors.text,
        fontSize: 13,
        marginBottom: 16,
      }}
    >
      <strong>{count} post{count === 1 ? '' : 's'} waiting on a tap.</strong>{' '}
      These reached TikTok as drafts and are <em>not published</em> until you open the TikTok
      app and finish them. Video drafts also need the caption pasted in — TikTok&apos;s inbox
      endpoint cannot prefill it.
    </div>
  );
}

function TargetEditor({
  target,
  onSaved,
}: {
  target: SocialPostTarget;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(target.title ?? '');
  const [caption, setCaption] = useState(target.caption ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dirty = title !== (target.title ?? '') || caption !== (target.caption ?? '');

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await updateTarget(target.id, { title: title || null, caption });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 14,
        background: colors.bg3,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>{PLATFORM_LABEL[target.platform]}</strong>
        {target.mode === 'inbox' && (
          <span style={{ fontSize: 11, color: colors.warning }}>inbox draft</span>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <StatusPill status={target.status} />
        </div>
      </div>

      {target.platform === 'youtube' && (
        <Field label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        </Field>
      )}

      <Field
        label="Caption"
        hint={
          target.platform === 'tiktok' && target.mode === 'inbox'
            ? 'Video drafts cannot be prefilled — you retype this in the app. Photo carousels DO prefill.'
            : undefined
        }
      >
        <TextArea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={6}
          style={{ fontFamily: 'inherit', lineHeight: 1.5 }}
        />
      </Field>

      <div style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>
        {caption.length} chars
        {target.tags.length > 0 && ` · ${target.tags.join(' ')}`}
      </div>

      {target.last_error && (
        <div style={{ fontSize: 12, color: colors.error, marginBottom: 8 }}>
          {target.last_error} (attempt {target.attempts})
        </div>
      )}
      {err && <div style={{ fontSize: 12, color: colors.error, marginBottom: 8 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={save} disabled={!dirty || busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        {target.status === 'failed' && (
          <Button
            variant="warning"
            onClick={async () => {
              await retryTarget(target.id);
              onSaved();
            }}
          >
            Retry
          </Button>
        )}
        {target.remote_url && (
          <a
            href={target.remote_url}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, color: colors.accent, alignSelf: 'center' }}
          >
            View post ↗
          </a>
        )}
      </div>
    </div>
  );
}

function PostDetail({ post, onChanged }: { post: SocialPost; onChanged: () => void }) {
  const [when, setWhen] = useState(toLocalInputValue(post.scheduled_at));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const staged = post.media_urls.length > 0;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {post.cover_url ? (
          <img
            src={post.cover_url}
            alt=""
            style={{ width: 108, borderRadius: 10, border: `1px solid ${colors.border}` }}
          />
        ) : (
          <div
            style={{
              width: 108,
              height: 192,
              borderRadius: 10,
              border: `1px dashed ${colors.border}`,
              display: 'grid',
              placeItems: 'center',
              color: colors.dim,
              fontSize: 11,
              textAlign: 'center',
              padding: 8,
            }}
          >
            not staged
          </div>
        )}

        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 13, color: colors.muted, marginBottom: 6 }}>
            {post.source_clip ?? '—'}
          </div>
          <div style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
            {post.media_type} · music: {post.music_track ?? 'none'}
            {post.music_track && ` @ ${post.music_volume ?? 0.15}`}
          </div>

          {!staged && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: colors.bg3,
                fontSize: 12,
                color: colors.muted,
                marginBottom: 12,
              }}
            >
              No media staged yet. Every platform fetches the file from a public URL, so this
              cannot publish until the clip is on R2. Run:
              <code style={{ display: 'block', marginTop: 6, color: colors.text }}>
                npx tsx scripts/stage_social_media.ts --post {post.id}
              </code>
            </div>
          )}

          <Field label="Publish at">
            <TextInput
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </Field>
          <div style={{ fontSize: 11, color: colors.muted, marginTop: -6, marginBottom: 10 }}>
            The scheduler ticks every 5 minutes, so a post goes out within 5 minutes of this
            time — not exactly on it.
          </div>

          {err && <div style={{ fontSize: 12, color: colors.error, marginBottom: 8 }}>{err}</div>}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              disabled={busy || !staged}
              onClick={() => run(() => schedulePost(post.id, new Date(when).toISOString()))}
            >
              {post.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
            </Button>
            {post.status === 'scheduled' && (
              <Button variant="secondary" disabled={busy} onClick={() => run(() => unschedulePost(post.id))}>
                Back to draft
              </Button>
            )}
            <Button variant="danger" disabled={busy} onClick={() => run(() => cancelPost(post.id))}>
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {post.targets.map((t) => (
          <TargetEditor key={t.id} target={t} onSaved={onChanged} />
        ))}
      </div>
    </div>
  );
}

export function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [connected, setConnected] = useState<SocialAccountState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await fetchSocialPosts();
      setPosts(p);
      // Connection state is secondary; a failure here must not blank the list.
      try {
        setConnected(await fetchConnectedPlatforms());
      } catch {
        setConnected([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load social posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const needsTapCount = useMemo(
    () => posts.filter((p) => p.targets.some((t) => t.status === 'needs_tap')).length,
    [posts],
  );
  const stats = useMemo(
    () => ({
      drafts: posts.filter((p) => p.status === 'draft').length,
      scheduled: posts.filter((p) => p.status === 'scheduled').length,
      unstaged: posts.filter((p) => p.media_urls.length === 0).length,
      failed: posts.filter((p) => p.targets.some((t) => t.status === 'failed')).length,
    }),
    [posts],
  );

  const rows = useMemo(
    () => (statusFilter ? posts.filter((p) => p.status === statusFilter) : posts),
    [posts, statusFilter],
  );

  const columns: Column<SocialPost>[] = [
    {
      key: 'clip',
      header: 'Clip',
      render: (p) => (
        <span style={{ fontSize: 13 }}>
          {p.source_clip?.split('/').pop() ?? p.id.slice(0, 8)}
          {p.media_urls.length === 0 && (
            <span style={{ color: colors.warning, marginLeft: 8, fontSize: 11 }}>unstaged</span>
          )}
        </span>
      ),
      sort: (a, b) => (a.source_clip ?? '').localeCompare(b.source_clip ?? ''),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <span style={{ fontSize: 12 }}>{p.status}</span>,
      sort: (a, b) => a.status.localeCompare(b.status),
    },
    {
      key: 'platforms',
      header: 'Platforms',
      render: (p) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {p.targets.map((t) => (
            <span key={t.id} title={`${PLATFORM_LABEL[t.platform]}: ${t.status}`}>
              <StatusPill status={t.status} />
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'when',
      header: 'Publish at',
      render: (p) => <span style={{ fontSize: 12 }}>{fmtDateTime(p.scheduled_at)}</span>,
      sort: (a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''),
    },
  ];

  const current = posts.find((p) => p.id === selected) ?? null;

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Social</h1>
      <p style={{ color: colors.muted, fontSize: 13, marginTop: 0, marginBottom: 20 }}>
        Schedule posts across Instagram, TikTok and YouTube. Captions are imported from the
        pipeline&apos;s <code>.captions.md</code> files — one variant per platform, never one
        caption pasted across all of them.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KpiCard label="Drafts" value={String(stats.drafts)} />
        <KpiCard label="Scheduled" value={String(stats.scheduled)} />
        <KpiCard label="Unstaged" value={String(stats.unstaged)} />
        <KpiCard label="Failed" value={String(stats.failed)} />
      </div>

      <NeedsTapBanner count={needsTapCount} />

      {connected.length === 0 && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            background: colors.bg3,
            fontSize: 13,
            color: colors.muted,
            marginBottom: 16,
          }}
        >
          No platform accounts connected yet — nothing can publish. See
          {' '}
          <code>Brand-Management/Marketing/SocialScheduler/PHASE-0-PLATFORM-ACCESS.md</code>.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
        <Field label="Status">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="publishing">Publishing</option>
            <option value="posted">Posted</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </Field>
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {error && <div style={{ color: colors.error, fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(p) => p.id}
        onRowClick={(p) => setSelected(p.id === selected ? null : p.id)}
        emptyLabel={
          loading
            ? 'Loading…'
            : 'No posts yet — import captions with scripts/social/import_captions.py --apply'
        }
      />

      {current && (
        <div
          style={{
            marginTop: 20,
            padding: 18,
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            background: colors.bg2,
          }}
        >
          <PostDetail post={current} onChanged={() => void load()} />
        </div>
      )}
    </div>
  );
}
