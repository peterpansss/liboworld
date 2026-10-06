import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  effectiveTier,
  resolveGrantPlan,
  GRANT_DURATION_OPTIONS,
  type GrantDuration,
} from '../../lib/entitlement';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import {
  listUsers,
  fetchUserTopWorkouts,
  fetchUserRecentWorkouts,
  fetchUserPointsLedger,
  // Sensitive ops go through the *WithReauth wrappers so requireRecentAuth()
  // can prompt the operator before mutating user state. The un-wrapped
  // versions exist for backward-compat / unit tests but MUST NOT be used
  // by UI callers (see lib/adminApi.ts comment near the wrappers).
  grantTicketsWithReauth as grantTickets,
  adjustPointsWithReauth as adjustPoints,
  setSubscriptionTierWithReauth as setSubscriptionTier,
  setUserAdminFlagWithReauth as setUserAdminFlag,
  deleteUserWithReauth as deleteUser,
  setUserBannedWithReauth as setUserBanned,
  fetchLeaderboard,
  listUserEnrollments,
  resetEnrollment,
  removeEnrollment,
  type AdminUserRow,
  type TopWorkoutRow,
  type WorkoutLogRow,
  type PointsLedgerRow,
  type LeaderboardRow,
  type AdminUserEnrollment,
} from '../../lib/adminApi';

// ── helpers ────────────────────────────────────────────────────────────────

type Tier = 'free' | 'pro' | 'elite';

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = (Date.now() - then) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

/** "22 Nov 2026" — used in grant confirmation copy, where an ambiguous 11/22 won't do. */
function formatGrantDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** `YYYY-MM-DD` for a date input's min attribute, in the operator's local timezone. */
function localDateInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function tierStyle(tier: Tier | null | undefined): React.CSSProperties {
  if (tier === 'pro') {
    return { background: colors.accentDim, color: colors.accent, border: `1px solid ${colors.accent}` };
  }
  if (tier === 'elite') {
    return { background: colors.warningDim, color: colors.warning, border: `1px solid ${colors.warning}` };
  }
  return { background: colors.bg3, color: colors.muted, border: `1px solid ${colors.border}` };
}

function isDeactivated(user: { banned_until: string | null }): boolean {
  if (!user.banned_until) return false;
  const t = new Date(user.banned_until).getTime();
  // 'infinity' from Postgres parses to a huge/NaN value; treat NaN OR future as banned.
  return Number.isNaN(t) || t > Date.now();
}

function TierChip({ tier }: { tier: Tier | null | undefined }) {
  const label = (tier ?? 'free').toUpperCase();
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.5,
        ...tierStyle(tier),
      }}
    >
      {label}
    </span>
  );
}

/**
 * The tier badge for a user row. Shows what the user can USE — i.e. what the
 * phone shows them — not the raw `subscriptions.tier` column.
 *
 * The distinction is not cosmetic. `admin_users_view` reads `tier` with no
 * expiry check, so a member whose subscription lapsed keeps reading 'pro'
 * here forever while the app has already dropped them to free and padlocked
 * the gym workouts. Rendering the raw column made this panel report the
 * opposite of the user's reality, which is how a lapsed member gets told
 * "you're Pro on our side" while staring at a paywall.
 *
 * When the two disagree we show the effective tier AND the lapse, because the
 * operator's next question is always "since when".
 */
function EntitlementChip({ user }: { user: AdminUserRow }) {
  const effective = effectiveTier(user);
  const purchased = user.tier ?? 'free';
  const lapsed = purchased !== 'free' && effective === 'free';

  if (!lapsed) return <TierChip tier={effective} />;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <TierChip tier="free" />
      <span style={{ fontSize: 11, color: colors.muted, whiteSpace: 'nowrap' }}>
        {purchased} lapsed {formatDate(user.subscription_expires_at)}
      </span>
    </span>
  );
}

// ── signup attribution ─────────────────────────────────────────────────────

/**
 * `unknown` is a first-class value here, not a rendering accident.
 *
 * Every account that signed up before the attribution columns landed has
 * `signup_platform = null`, and that is the majority of the table. The one
 * thing this column must never do is turn "nothing was recorded" into a
 * plausible-looking 'ios' — somebody budgets against these numbers.
 *
 * `other` keeps an unrecognised-but-present value (a stray 'ipados', a typo
 * from a manual back-fill) visible and filterable instead of quietly folding
 * it in with the nulls.
 */
type PlatformKey = 'ios' | 'android' | 'web' | 'other' | 'unknown';

function platformKey(raw: string | null | undefined): PlatformKey {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === '') return 'unknown';
  if (v === 'ios') return 'ios';
  if (v === 'android') return 'android';
  if (v === 'web') return 'web';
  return 'other';
}

const PLATFORM_LABEL: Record<PlatformKey, string> = {
  ios: 'iOS',
  android: 'Android',
  web: 'Web',
  other: 'Other',
  unknown: 'Unknown',
};

const PLATFORM_FILTER_OPTIONS: { value: PlatformKey | 'all'; label: string }[] = [
  { value: 'all', label: 'All platforms' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'web', label: 'Web' },
  { value: 'unknown', label: 'Unknown (not recorded)' },
  { value: 'other', label: 'Other / unrecognised' },
];

const INFERRED_HINT =
  'Inferred: this platform was derived after the fact (from a user agent, a receipt, a back-fill) — it was NOT reported by the client at signup.';

const MEASURED_HINT = 'Reported by the client at signup.';

const UNKNOWN_PLATFORM_HINT =
  'No platform recorded at signup. Not a guess — this account predates platform capture, or the client sent nothing.';

/**
 * Platform cell. Three visually distinct states, because conflating any two of
 * them misleads the operator:
 *   measured  → solid chip, full-strength text
 *   inferred  → dashed chip, muted text, trailing asterisk (+ table legend)
 *   unknown   → an em dash, no chip at all
 */
function PlatformCell({ user }: { user: AdminUserRow }) {
  const key = platformKey(user.signup_platform);

  if (key === 'unknown') {
    return (
      <span style={{ color: colors.dim }} title={UNKNOWN_PLATFORM_HINT}>
        —
      </span>
    );
  }

  const inferred = user.signup_platform_inferred === true;
  // For 'other', show what the database actually holds rather than the word
  // "Other" — the raw value is the whole point of noticing it.
  const label = key === 'other' ? (user.signup_platform ?? '').trim() : PLATFORM_LABEL[key];

  return (
    <span
      title={inferred ? INFERRED_HINT : MEASURED_HINT}
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.5,
        whiteSpace: 'nowrap',
        background: colors.bg3,
        color: inferred ? colors.muted : colors.text,
        border: inferred ? `1px dashed ${colors.warning}` : `1px solid ${colors.border}`,
      }}
    >
      {label}
      {inferred && (
        <span style={{ color: colors.warning, marginLeft: 4 }} aria-label="inferred">
          *
        </span>
      )}
    </span>
  );
}

/** Source, with the campaign as secondary text (full value on hover). */
function SourceCell({ user }: { user: AdminUserRow }) {
  const source = (user.signup_source ?? '').trim();
  const campaign = (user.signup_campaign ?? '').trim();

  if (!source && !campaign) {
    return (
      <span style={{ color: colors.dim }} title="No source recorded at signup.">
        —
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-block', maxWidth: 180 }}>
      <span
        style={{
          display: 'block',
          color: source ? colors.text : colors.dim,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={source || 'No source recorded — campaign only.'}
      >
        {source || '—'}
      </span>
      {campaign && (
        <span
          style={{
            display: 'block',
            fontSize: 11,
            color: colors.dim,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={`Campaign: ${campaign}`}
        >
          {campaign}
        </span>
      )}
    </span>
  );
}

// ── headings ───────────────────────────────────────────────────────────────

const H1: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 32,
  fontWeight: 700,
  color: colors.text,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  margin: 0,
};

const H3: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 18,
  fontWeight: 700,
  color: colors.text,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  margin: '0 0 10px 0',
};

const bigNum: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 20,
  fontWeight: 700,
  color: colors.text,
  letterSpacing: 0.4,
};

// ── page ───────────────────────────────────────────────────────────────────

type Tab = 'users' | 'leaderboard';

export function UsersPage() {
  const [tab, setTab] = useState<Tab>('users');

  // Users tab state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformKey | 'all'>('all');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Leaderboard tab state
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadUsers = useCallback(async (search: string) => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const rows = await listUsers(search.length > 0 ? search : null, 200, 0);
      setUsers(rows);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'users') void loadUsers(debouncedSearch);
  }, [tab, debouncedSearch, loadUsers]);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const rows = await fetchLeaderboard(100);
      setLeaderboard(rows);
    } catch (err) {
      setLeaderboardError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'leaderboard') void loadLeaderboard();
  }, [tab, loadLeaderboard]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  // Platform filtering is client-side, over the rows already loaded — the same
  // place the DataTable does its sorting. The search box is the server-side
  // filter (`admin_list_users`), and it caps at 200 rows, so this narrows the
  // loaded page rather than the whole table. The count readout below the
  // filter bar says so, because "3 users on Android" would otherwise read as a
  // total.
  const visibleUsers = useMemo(() => {
    if (platformFilter === 'all') return users;
    return users.filter((u) => platformKey(u.signup_platform) === platformFilter);
  }, [users, platformFilter]);

  const anyInferredPlatform = useMemo(
    () => visibleUsers.some((u) => u.signup_platform_inferred === true),
    [visibleUsers]
  );

  // ── Users table columns ──────────────────────────────────────────────
  const userColumns: Column<AdminUserRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (r) => (
          <span style={{ fontWeight: 600, color: colors.text }}>{r.name ?? '—'}</span>
        ),
        sort: (a, b) => (a.name ?? '').localeCompare(b.name ?? ''),
      },
      {
        key: 'email',
        header: 'Email',
        render: (r) => <span style={{ color: colors.muted }}>{r.email ?? '—'}</span>,
        sort: (a, b) => (a.email ?? '').localeCompare(b.email ?? ''),
      },
      {
        key: 'tier',
        header: 'Tier',
        render: (r) => <EntitlementChip user={r} />,
        // Sort on the effective tier so the column orders by what the badge
        // says. Sorting on the raw column would file lapsed members under
        // "pro" while they display as free.
        sort: (a, b) => effectiveTier(a).localeCompare(effectiveTier(b)),
      },
      {
        key: 'points',
        header: 'Points',
        align: 'right',
        render: (r) => <span style={bigNum}>{r.points.toLocaleString()}</span>,
        sort: (a, b) => a.points - b.points,
      },
      {
        key: 'tickets',
        header: 'Tickets',
        align: 'right',
        render: (r) => <span style={bigNum}>{r.tickets.toLocaleString()}</span>,
        sort: (a, b) => a.tickets - b.tickets,
      },
      {
        key: 'workouts',
        header: 'Workouts',
        align: 'right',
        render: (r) => <span style={bigNum}>{r.workout_count.toLocaleString()}</span>,
        sort: (a, b) => a.workout_count - b.workout_count,
      },
      {
        key: 'last_workout',
        header: 'Last workout',
        render: (r) => <span style={{ color: colors.muted }}>{relativeTime(r.last_workout_at)}</span>,
        sort: (a, b) =>
          new Date(a.last_workout_at ?? 0).getTime() - new Date(b.last_workout_at ?? 0).getTime(),
      },
      {
        key: 'signup',
        header: 'Signup',
        render: (r) => <span style={{ color: colors.muted }}>{formatDate(r.signup_at)}</span>,
        sort: (a, b) => new Date(a.signup_at ?? 0).getTime() - new Date(b.signup_at ?? 0).getTime(),
      },
      {
        key: 'platform',
        header: 'Platform',
        render: (r) => <PlatformCell user={r} />,
        // Sort by the normalised key so the three real platforms group
        // together and the unknowns collect at one end, instead of ordering by
        // whatever casing the client happened to send.
        sort: (a, b) => {
          const ka = platformKey(a.signup_platform);
          const kb = platformKey(b.signup_platform);
          if (ka !== kb) return ka.localeCompare(kb);
          // Within a platform, measured before inferred.
          return Number(a.signup_platform_inferred === true) - Number(b.signup_platform_inferred === true);
        },
      },
      {
        key: 'source',
        header: 'Source',
        render: (r) => <SourceCell user={r} />,
        sort: (a, b) => (a.signup_source ?? '').localeCompare(b.signup_source ?? ''),
      },
    ],
    []
  );

  // ── Leaderboard table columns ───────────────────────────────────────
  const leaderboardColumns: Column<LeaderboardRow & { _rank: number }>[] = useMemo(
    () => [
      {
        key: 'rank',
        header: 'Rank',
        width: 70,
        align: 'center',
        render: (r) => (
          <span
            style={{
              ...bigNum,
              color: r._rank <= 3 ? colors.accent : colors.text,
            }}
          >
            {r._rank}
          </span>
        ),
      },
      {
        key: 'name',
        header: 'Name',
        render: (r) => <span style={{ fontWeight: 600 }}>{r.name ?? '—'}</span>,
      },
      {
        key: 'email',
        header: 'Email',
        render: (r) => <span style={{ color: colors.muted }}>{r.email ?? '—'}</span>,
      },
      {
        key: 'points',
        header: 'Points',
        align: 'right',
        render: (r) => <span style={bigNum}>{r.points.toLocaleString()}</span>,
      },
      {
        key: 'tickets',
        header: 'Tickets',
        align: 'right',
        render: (r) => <span style={bigNum}>{r.tickets.toLocaleString()}</span>,
      },
      {
        key: 'workout_count',
        header: 'Workouts',
        align: 'right',
        render: (r) => <span style={bigNum}>{r.workout_count.toLocaleString()}</span>,
      },
      {
        key: 'total_minutes',
        header: 'Minutes',
        align: 'right',
        render: (r) => <span style={bigNum}>{r.total_minutes.toLocaleString()}</span>,
      },
      {
        key: 'total_volume_kg',
        header: 'Volume (kg)',
        align: 'right',
        render: (r) => (
          <span style={bigNum}>
            {Math.round(Number(r.total_volume_kg) || 0).toLocaleString()}
          </span>
        ),
      },
    ],
    []
  );

  const rankedLeaderboard = useMemo(
    () => leaderboard.map((r, i) => ({ ...r, _rank: i + 1 })),
    [leaderboard]
  );

  // ── render ─────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={H1}>Users</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, margin: '18px 0 20px 0' }}>
        <TabButton active={tab === 'users'} onClick={() => setTab('users')}>
          Users
        </TabButton>
        <TabButton active={tab === 'leaderboard'} onClick={() => setTab('leaderboard')}>
          Leaderboard
        </TabButton>
      </div>

      {tab === 'users' && (
        <>
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 16,
            }}
          >
            <div style={{ flex: '1 1 260px', maxWidth: 400 }}>
              <TextInput
                placeholder="Search by name or email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div style={{ minWidth: 210 }}>
              <Select
                aria-label="Filter by signup platform"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as PlatformKey | 'all')}
              >
                {PLATFORM_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            {platformFilter !== 'all' && (
              <span style={{ fontSize: 12, color: colors.muted }}>
                {visibleUsers.length} of {users.length} loaded
              </span>
            )}
          </div>
          {usersError && <ErrorBanner message={usersError} />}
          <DataTable<AdminUserRow>
            rows={visibleUsers}
            columns={userColumns}
            rowKey={(r) => r.id}
            onRowClick={(r) => setSelectedUserId(r.id)}
            emptyLabel={
              usersLoading
                ? 'Loading…'
                : platformFilter !== 'all'
                ? `No loaded users with platform "${PLATFORM_LABEL[platformFilter]}"`
                : 'No users found'
            }
          />
          {/* Legend for the asterisk. Only shown when something on screen
              carries it — a permanent footnote to nothing trains operators to
              stop reading footnotes. */}
          {anyInferredPlatform && (
            <div style={{ fontSize: 12, color: colors.muted, marginTop: 10 }}>
              <span style={{ color: colors.warning, fontWeight: 700 }}>*</span> platform inferred —
              derived after signup (user agent, receipt, back-fill), not reported by the client. A
              dash means nothing was recorded at all.
            </div>
          )}
        </>
      )}

      {tab === 'leaderboard' && (
        <>
          {leaderboardError && <ErrorBanner message={leaderboardError} />}
          <DataTable
            rows={rankedLeaderboard}
            columns={leaderboardColumns}
            rowKey={(r) => r.user_id}
            emptyLabel={leaderboardLoading ? 'Loading…' : 'No leaderboard entries'}
          />
        </>
      )}

      <UserDetailModal
        user={selectedUser}
        onClose={() => setSelectedUserId(null)}
        onMutated={async () => {
          await loadUsers(debouncedSearch);
        }}
      />
    </div>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px',
        background: active ? colors.bg3 : 'transparent',
        border: `1px solid ${active ? colors.border : 'transparent'}`,
        borderRadius: 10,
        color: active ? colors.text : colors.muted,
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: 16,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        background: colors.errorDim,
        border: `1px solid ${colors.error}`,
        color: colors.error,
        padding: '10px 14px',
        borderRadius: 10,
        marginBottom: 12,
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

// ── Tier grant card ────────────────────────────────────────────────────────

/**
 * "Set tier" — now a tier AND a duration, so an operator can comp someone a
 * month of Premium and have it end by itself.
 *
 * Two deliberate choices:
 *
 * 1. The tier dropdown no longer commits on change. It can't: a tier and a
 *    duration have to be chosen together, and committing on the tier change
 *    alone would hand out an indefinite grant before the operator had said how
 *    long they meant. Nothing is written until "Apply tier", and the line above
 *    the button spells out the exact outcome first.
 * 2. Duration defaults to Indefinite, which is precisely what this card did
 *    before. An operator who ignores the new control gets the old behaviour.
 *
 * State is initialised from props and re-armed by remounting (the caller keys
 * this on user + purchased tier), so there is no effect syncing props into
 * state and no window where the form shows a tier the row no longer has.
 */
function TierGrantCard({
  user,
  saving,
  onApply,
}: {
  user: AdminUserRow;
  saving: boolean;
  onApply: (tier: Tier, expiresAt: string | null) => void;
}) {
  const purchased: Tier = (user.tier as Tier | null | undefined) ?? 'free';
  const [tier, setTier] = useState<Tier>(purchased);
  const [duration, setDuration] = useState<GrantDuration>('indefinite');
  const [customDate, setCustomDate] = useState('');
  // Captured once on mount rather than read during render — the date picker's
  // floor only has to be roughly "tomorrow", and `resolveGrantPlan` re-checks
  // the date against the real clock anyway.
  const [minCustomDate] = useState(() => localDateInputValue(new Date(Date.now() + 86400000)));

  const plan = resolveGrantPlan({ tier, duration, customDate, current: user });
  const lapsed = effectiveTier(user) === 'free' && purchased !== 'free';
  const tierLabel = tier === 'pro' ? 'Pro' : 'Elite';

  const apply = () => {
    // Re-resolve at click time: a modal can sit open for a long while, and the
    // preview must not be able to drift from what gets written.
    const fresh = resolveGrantPlan({ tier, duration, customDate, current: user });
    if (fresh.error) return;
    onApply(tier, fresh.expiresAt);
  };

  return (
    <div
      style={{
        background: colors.bg3,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
        Set tier
      </div>

      {/* The tier dropdown deliberately shows the PURCHASED tier — that is what
          you are editing. The status line further down shows why it may not be
          what the user actually has: without it the operator sees "Pro"
          selected and has no way to tell the window closed. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Tier">
          <Select value={tier} onChange={(e) => setTier(e.target.value as Tier)} disabled={saving}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="elite">Elite</option>
          </Select>
        </Field>
        <Field label="Duration">
          <Select
            value={duration}
            onChange={(e) => setDuration(e.target.value as GrantDuration)}
            disabled={saving || tier === 'free'}
          >
            {GRANT_DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {tier !== 'free' && duration === 'custom' && (
        <Field label="Ends on">
          <TextInput
            type="date"
            value={customDate}
            min={minCustomDate}
            onChange={(e) => setCustomDate(e.target.value)}
            disabled={saving}
          />
        </Field>
      )}

      {/* Say what the button will do, in full, before it is pressed — an
          entitlement grant is invisible from this screen once made. */}
      <div
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: '8px 10px',
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 13, color: colors.text, fontWeight: 600 }}>
          {plan.error
            ? '—'
            : tier === 'free'
            ? 'Free — paid access removed'
            : plan.expiresAt
            ? `${tierLabel} until ${formatGrantDate(plan.expiresAt)}`
            : `${tierLabel}, no expiry`}
        </div>
        {plan.error ? (
          <div style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{plan.error}</div>
        ) : plan.extendsFrom ? (
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            Extends the current grant, which ends {formatGrantDate(plan.extendsFrom)} — the
            remaining time is added to, not replaced.
          </div>
        ) : plan.shortensIndefinite ? (
          <div style={{ fontSize: 12, color: colors.warning, marginTop: 4 }}>
            This user currently has {purchased} with no expiry. Applying a duration REPLACES that
            open-ended grant with one that ends.
          </div>
        ) : tier !== 'free' && plan.expiresAt ? (
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            New window, counted from today.
          </div>
        ) : null}
      </div>

      <Button variant="primary" onClick={apply} disabled={saving || plan.error !== null}>
        {saving ? 'Updating…' : 'Apply tier'}
      </Button>

      <div style={{ fontSize: 12, color: colors.muted, marginTop: 10 }}>
        Status: <strong style={{ color: colors.text }}>{user.subscription_status ?? 'no row'}</strong>
        {' · '}
        {user.subscription_expires_at
          ? `${lapsed ? 'expired' : 'expires'} ${formatDate(user.subscription_expires_at)}`
          : 'no expiry'}
      </div>
      {lapsed && (
        <div style={{ fontSize: 12, color: colors.warning, marginTop: 6 }}>
          Subscription window has closed — the app is showing this user as Free and gating paid
          content. Pick a tier and duration above and apply to grant it again.
        </div>
      )}
    </div>
  );
}

// ── User detail modal ──────────────────────────────────────────────────────

function UserDetailModal({
  user,
  onClose,
  onMutated,
}: {
  user: AdminUserRow | null;
  onClose: () => void;
  onMutated: () => Promise<void> | void;
}) {
  const [topWorkouts, setTopWorkouts] = useState<TopWorkoutRow[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutLogRow[]>([]);
  const [ledger, setLedger] = useState<PointsLedgerRow[]>([]);
  const [enrollments, setEnrollments] = useState<AdminUserEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action form state
  const [ticketAmount, setTicketAmount] = useState('');
  const [ticketNote, setTicketNote] = useState('');
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsNote, setPointsNote] = useState('');
  const [savingAction, setSavingAction] = useState<string | null>(null);

  const userId = user?.id ?? null;

  const loadDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [tops, recents, led, enrolls] = await Promise.all([
        fetchUserTopWorkouts(id, 5),
        fetchUserRecentWorkouts(id, 20),
        fetchUserPointsLedger(id, 50),
        listUserEnrollments(id),
      ]);
      setTopWorkouts(tops);
      setRecentWorkouts(recents);
      setLedger(led);
      setEnrollments(enrolls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      void loadDetails(userId);
    } else {
      setTopWorkouts([]);
      setRecentWorkouts([]);
      setLedger([]);
      setEnrollments([]);
      setError(null);
      setTicketAmount('');
      setTicketNote('');
      setPointsAmount('');
      setPointsNote('');
    }
  }, [userId, loadDetails]);

  const purchasedTier: Tier = (user?.tier as Tier | null | undefined) ?? 'free';

  const wrap = async (key: string, fn: () => Promise<void>) => {
    if (!userId) return;
    setSavingAction(key);
    setError(null);
    try {
      await fn();
      await loadDetails(userId);
      await onMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSavingAction(null);
    }
  };

  const handleGrantTickets = () =>
    wrap('tickets', async () => {
      const n = Number(ticketAmount);
      if (!Number.isFinite(n) || n === 0) throw new Error('Enter a non-zero number of tickets');
      await grantTickets(userId!, n, ticketNote || undefined);
      setTicketAmount('');
      setTicketNote('');
    });

  const handleAdjustPoints = () =>
    wrap('points', async () => {
      const n = Number(pointsAmount);
      if (!Number.isFinite(n) || n === 0) throw new Error('Enter a non-zero amount');
      await adjustPoints(userId!, n, pointsNote || undefined);
      setPointsAmount('');
      setPointsNote('');
    });

  const handleApplyTier = (tier: Tier, expiresAt: string | null) =>
    wrap('tier', async () => {
      await setSubscriptionTier(userId!, tier, expiresAt);
    });

  const handleToggleAdmin = () =>
    wrap('admin', async () => {
      await setUserAdminFlag(userId!, !user!.is_admin);
    });

  const handleResetEnrollment = (enrollmentId: string, label: string) => {
    if (!window.confirm(
      `Reset "${label}"?\n\n` +
      `Wipes per-day completion history, restores freeze tokens to the user's ` +
      `current tier default, and re-stamps enrolled_at to now. The user will ` +
      `appear freshly joined in the running cycle.`
    )) {
      return;
    }
    void wrap(`reset-${enrollmentId}`, async () => {
      await resetEnrollment(enrollmentId);
    });
  };

  const handleKickEnrollment = (enrollmentId: string, label: string) => {
    const reason = window.prompt(
      `Kick user from "${label}"?\n\n` +
      `Removes them from the running cycle (status → removed). The row stays ` +
      `for history. Enter a reason (required):`
    );
    if (reason === null) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      window.alert('A reason is required to kick a user.');
      return;
    }
    void wrap(`kick-${enrollmentId}`, async () => {
      await removeEnrollment(enrollmentId, trimmed);
    });
  };

  const handleToggleBan = () => {
    if (!user) return;
    const deactivated = isDeactivated(user);
    const ok = window.confirm(
      deactivated
        ? `Reactivate ${user.email ?? 'this user'}? They will be able to log in again.`
        : `Deactivate ${user.email ?? 'this user'}? They will be blocked from logging in until reactivated. Their data is kept.`
    );
    if (!ok) return;
    void wrap('ban', async () => {
      await setUserBanned(userId!, !deactivated);
    });
  };

  const handleDeleteUser = () => {
    if (!user) return;
    const email = user.email ?? 'this user';
    const ok = window.confirm(
      `PERMANENTLY DELETE ${email}?\n\n` +
      `This removes the account and ALL their data (workouts, points, tickets, ` +
      `challenge history) and frees the email so it can be used to sign up again.\n\n` +
      `This cannot be undone.`
    );
    if (!ok) return;
    void wrap('delete', async () => {
      await deleteUser(userId!);
      // User no longer exists — close the modal; onMutated() (called by wrap) refreshes the list.
      onClose();
    });
  };

  return (
    <Modal open={user !== null} onClose={onClose} title={user?.name ?? user?.email ?? 'User'} width={720}>
      {user && (
        <div>
          {/* Header info */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>{user.email ?? '—'}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <EntitlementChip user={user} />
              {user.is_admin && (
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    background: colors.accentDim,
                    color: colors.accent,
                    border: `1px solid ${colors.accent}`,
                  }}
                >
                  ADMIN
                </span>
              )}
              {isDeactivated(user) && (
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    background: colors.errorDim,
                    color: colors.error,
                    border: `1px solid ${colors.error}`,
                  }}
                >
                  DISABLED
                </span>
              )}
              <span style={{ fontSize: 12, color: colors.dim }}>
                Signed up {formatDate(user.signup_at)}
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginTop: 16,
              }}
            >
              <StatBox label="Points" value={user.points.toLocaleString()} />
              <StatBox label="Tickets" value={user.tickets.toLocaleString()} />
              <StatBox label="Workouts" value={user.workout_count.toLocaleString()} />
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          {/* Signup attribution — app version and locale live here rather than
              as more top-level columns: they're per-user forensics, not
              something you scan a table for. */}
          <Section title="Where they came from">
            <SignupAttribution user={user} />
          </Section>

          {/* Actions */}
          <Section title="Actions">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                marginBottom: 12,
              }}
            >
              {/* Grant tickets */}
              <div
                style={{
                  background: colors.bg3,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Grant tickets
                </div>
                <Field label="Amount">
                  <TextInput
                    type="number"
                    placeholder="e.g. 5"
                    value={ticketAmount}
                    onChange={(e) => setTicketAmount(e.target.value)}
                  />
                </Field>
                <Field label="Note (optional)">
                  <TextInput
                    placeholder="Reason"
                    value={ticketNote}
                    onChange={(e) => setTicketNote(e.target.value)}
                  />
                </Field>
                <Button
                  variant="primary"
                  onClick={handleGrantTickets}
                  disabled={savingAction === 'tickets'}
                >
                  {savingAction === 'tickets' ? 'Granting…' : 'Grant'}
                </Button>
              </div>

              {/* Adjust points */}
              <div
                style={{
                  background: colors.bg3,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Adjust points
                </div>
                <Field label="Amount (± allowed)">
                  <TextInput
                    type="number"
                    placeholder="e.g. 100 or -50"
                    value={pointsAmount}
                    onChange={(e) => setPointsAmount(e.target.value)}
                  />
                </Field>
                <Field label="Note (optional)">
                  <TextInput
                    placeholder="Reason"
                    value={pointsNote}
                    onChange={(e) => setPointsNote(e.target.value)}
                  />
                </Field>
                <Button
                  variant="primary"
                  onClick={handleAdjustPoints}
                  disabled={savingAction === 'points'}
                >
                  {savingAction === 'points' ? 'Saving…' : 'Adjust'}
                </Button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
              }}
            >
              <TierGrantCard
                key={`${userId}:${purchasedTier}`}
                user={user}
                saving={savingAction === 'tier'}
                onApply={handleApplyTier}
              />

              <div
                style={{
                  background: colors.bg3,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Admin flag
                </div>
                <div style={{ fontSize: 13, color: colors.text, marginBottom: 12 }}>
                  Currently: <strong>{user.is_admin ? 'Admin' : 'Not admin'}</strong>
                </div>
                <Button
                  variant={user.is_admin ? 'danger' : 'secondary'}
                  onClick={handleToggleAdmin}
                  disabled={savingAction === 'admin'}
                >
                  {savingAction === 'admin'
                    ? 'Saving…'
                    : user.is_admin
                    ? 'Revoke admin'
                    : 'Grant admin'}
                </Button>
              </div>
            </div>
          </Section>

          {/* Cash challenges */}
          <Section title={`Cash challenges${enrollments.length ? ` (${enrollments.length})` : ''}`}>
            {loading && enrollments.length === 0 ? (
              <Muted text="Loading…" />
            ) : enrollments.length === 0 ? (
              <Muted text="No challenge history yet." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {enrollments.map((e) => {
                  const label = `${e.challenge_emoji ?? ''} ${e.challenge_title}`.trim();
                  return (
                    <EnrollmentRow
                      key={e.enrollment_id}
                      enrollment={e}
                      busyReset={savingAction === `reset-${e.enrollment_id}`}
                      busyKick={savingAction === `kick-${e.enrollment_id}`}
                      onReset={() => handleResetEnrollment(e.enrollment_id, label)}
                      onKick={() => handleKickEnrollment(e.enrollment_id, label)}
                    />
                  );
                })}
              </div>
            )}
          </Section>

          {/* Top workouts */}
          <Section title="What they train most">
            {loading && topWorkouts.length === 0 ? (
              <Muted text="Loading…" />
            ) : topWorkouts.length === 0 ? (
              <Muted text="No workouts yet" />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {topWorkouts.map((w) => (
                  <li
                    key={w.workout_name}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: `1px solid ${colors.border}`,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: colors.text }}>{w.workout_name}</span>
                    <span style={{ color: colors.muted, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>
                      {w.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Recent workouts */}
          <Section title="Recent workouts">
            {loading && recentWorkouts.length === 0 ? (
              <Muted text="Loading…" />
            ) : recentWorkouts.length === 0 ? (
              <Muted text="No workouts yet" />
            ) : (
              <div style={{ maxHeight: 240, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: colors.muted, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>
                      <th style={{ textAlign: 'left', padding: '6px 4px' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '6px 4px' }}>Workout</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px' }}>Duration</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px' }}>Exercises</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentWorkouts.map((w) => (
                      <tr key={w.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '6px 4px', color: colors.muted }}>{formatDate(w.date)}</td>
                        <td style={{ padding: '6px 4px', color: colors.text }}>
                          {w.emoji ? `${w.emoji} ` : ''}
                          {w.workout_name}
                        </td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', color: colors.muted }}>
                          {Math.round(w.duration / 60)}m
                        </td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', color: colors.muted }}>
                          {w.exercise_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Points ledger */}
          <Section title="Points ledger">
            {loading && ledger.length === 0 ? (
              <Muted text="Loading…" />
            ) : ledger.length === 0 ? (
              <Muted text="No ledger entries" />
            ) : (
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: colors.muted, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>
                      <th style={{ textAlign: 'left', padding: '6px 4px' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '6px 4px' }}>Reason</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px' }}>Base</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px' }}>×</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((l) => (
                      <tr key={l.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '6px 4px', color: colors.muted, whiteSpace: 'nowrap' }}>
                          {formatDateTime(l.created_at)}
                        </td>
                        <td style={{ padding: '6px 4px', color: colors.text }}>{l.reason}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', color: colors.muted }}>
                          {l.base_amount}
                        </td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', color: colors.muted }}>
                          {l.multiplier}
                        </td>
                        <td
                          style={{
                            padding: '6px 4px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: l.amount >= 0 ? colors.success : colors.error,
                          }}
                        >
                          {l.amount >= 0 ? '+' : ''}
                          {l.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Danger zone */}
          <Section title="Danger zone">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
              }}
            >
              {/* Deactivate / Reactivate */}
              <div
                style={{
                  background: colors.bg3,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Account access
                </div>
                <div style={{ fontSize: 13, color: colors.text, marginBottom: 12 }}>
                  Currently:{' '}
                  <strong>{isDeactivated(user) ? 'Disabled (login blocked)' : 'Active'}</strong>
                </div>
                <Button
                  variant={isDeactivated(user) ? 'secondary' : 'warning'}
                  onClick={handleToggleBan}
                  disabled={savingAction === 'ban'}
                >
                  {savingAction === 'ban'
                    ? 'Saving…'
                    : isDeactivated(user)
                    ? 'Reactivate'
                    : 'Deactivate'}
                </Button>
              </div>

              {/* Delete user */}
              <div
                style={{
                  background: colors.bg3,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Delete user
                </div>
                <div style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
                  Permanently removes the account and all data. Frees the email for re-signup. Cannot be undone.
                </div>
                <Button
                  variant="danger"
                  onClick={handleDeleteUser}
                  disabled={savingAction === 'delete'}
                >
                  {savingAction === 'delete' ? 'Deleting…' : 'Delete user'}
                </Button>
              </div>
            </div>
          </Section>
        </div>
      )}
    </Modal>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={H3}>{title}</h3>
      {children}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: colors.bg3,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: '10px 14px',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: colors.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 24,
          fontWeight: 700,
          color: colors.text,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Muted({ text }: { text: string }) {
  return <div style={{ fontSize: 13, color: colors.muted, padding: '8px 0' }}>{text}</div>;
}

// ── Signup attribution (per-user detail) ───────────────────────────────────

function AttrItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: colors.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, wordBreak: 'break-word' }}>{children}</div>
    </div>
  );
}

/** "Not recorded" in dim text — never a placeholder that could pass for data. */
function AttrValue({ value }: { value: string | null | undefined }) {
  const v = (value ?? '').trim();
  if (!v) return <span style={{ color: colors.dim }}>Not recorded</span>;
  return <span style={{ color: colors.text }}>{v}</span>;
}

/**
 * The attribution a signup carried. Here the measured/inferred distinction is
 * spelled out in words rather than as the table's asterisk — there is room,
 * and this is the screen an operator is on when they're about to act on it.
 */
function SignupAttribution({ user }: { user: AdminUserRow }) {
  const key = platformKey(user.signup_platform);
  const inferred = user.signup_platform_inferred === true;

  return (
    <div
      style={{
        background: colors.bg3,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 14,
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 14,
      }}
    >
      <AttrItem label="Platform">
        {key === 'unknown' ? (
          <span style={{ color: colors.dim }}>
            Not recorded — predates platform capture, or the client sent nothing
          </span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <PlatformCell user={user} />
            <span style={{ fontSize: 11, color: inferred ? colors.warning : colors.muted }}>
              {inferred ? 'inferred — derived, not reported at signup' : 'reported at signup'}
            </span>
          </span>
        )}
      </AttrItem>
      <AttrItem label="Source">
        <AttrValue value={user.signup_source} />
      </AttrItem>
      <AttrItem label="Campaign">
        <AttrValue value={user.signup_campaign} />
      </AttrItem>
      <AttrItem label="App version">
        <AttrValue value={user.signup_app_version} />
      </AttrItem>
      <AttrItem label="Locale">
        <AttrValue value={user.signup_locale} />
      </AttrItem>
      <AttrItem label="Signed up">
        <span style={{ color: colors.text }}>{formatDateTime(user.signup_at)}</span>
      </AttrItem>
    </div>
  );
}

// ── Enrollment row (per-user cash-challenge state + reset) ─────────────────

const ENROLLMENT_STATUS_STYLE: Record<AdminUserEnrollment['status'], React.CSSProperties> = {
  active:         { background: colors.accentDim,  color: colors.accent,  border: `1px solid ${colors.accent}` },
  completed:      { background: colors.successDim, color: colors.success, border: `1px solid ${colors.success}` },
  failed:         { background: colors.errorDim,   color: colors.error,   border: `1px solid ${colors.error}` },
  removed:        { background: colors.bg3,        color: colors.muted,   border: `1px solid ${colors.border}` },
  reward_claimed: { background: colors.successDim, color: colors.success, border: `1px solid ${colors.success}` },
};

function EnrollmentRow({
  enrollment,
  busyReset,
  busyKick,
  onReset,
  onKick,
}: {
  enrollment: AdminUserEnrollment;
  busyReset: boolean;
  busyKick: boolean;
  onReset: () => void;
  onKick: () => void;
}) {
  const e = enrollment;
  const canKick = e.status === 'active';
  return (
    <div
      style={{
        background: colors.bg3,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1 1 200px', minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 18 }}>{e.challenge_emoji ?? '🏆'}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{e.challenge_title}</span>
        </div>
        <div style={{ fontSize: 11, color: colors.dim }}>
          {e.cycle_start_date && e.cycle_end_date
            ? `${formatDate(e.cycle_start_date)} – ${formatDate(e.cycle_end_date)}`
            : 'No cycle'}
          {e.cycle_status ? ` · cycle ${e.cycle_status}` : ''}
          {' · enrolled '}
          {relativeTime(e.enrolled_at)}
        </div>
        {e.status === 'removed' && e.removed_reason && (
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
            Removed {e.last_active_at ? relativeTime(e.last_active_at) : ''}
            {' · '}
            <span style={{ color: colors.text, fontStyle: 'italic' }}>“{e.removed_reason}”</span>
          </div>
        )}
      </div>

      <span
        style={{
          padding: '3px 10px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          ...ENROLLMENT_STATUS_STYLE[e.status],
        }}
      >
        {e.status.replace('_', ' ')}
      </span>

      <div style={{ ...bigNum, fontSize: 16, minWidth: 60, textAlign: 'right' }}>
        {e.completed_days}/{e.challenge_total_days}
        <div style={{ fontSize: 10, color: colors.muted, fontFamily: 'inherit', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          days
        </div>
      </div>

      <TierChip tier={e.tier_at_enrollment} />

      <div style={{ ...bigNum, fontSize: 16, minWidth: 40, textAlign: 'right' }}>
        ❄ {e.freeze_tokens_remaining}
      </div>

      {canKick && (
        <Button variant="warning" onClick={onKick} disabled={busyKick || busyReset}>
          {busyKick ? 'Kicking…' : 'Kick'}
        </Button>
      )}

      <Button variant="danger" onClick={onReset} disabled={busyReset || busyKick}>
        {busyReset ? 'Resetting…' : 'Reset'}
      </Button>
    </div>
  );
}
