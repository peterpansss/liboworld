import { useCallback, useEffect, useMemo, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import {
  listUsers,
  fetchUserTopWorkouts,
  fetchUserRecentWorkouts,
  fetchUserPointsLedger,
  grantTickets,
  adjustPoints,
  setSubscriptionTier,
  setUserAdminFlag,
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
        render: (r) => <TierChip tier={r.tier} />,
        sort: (a, b) => (a.tier ?? 'free').localeCompare(b.tier ?? 'free'),
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
          <div style={{ marginBottom: 16, maxWidth: 400 }}>
            <TextInput
              placeholder="Search by name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          {usersError && <ErrorBanner message={usersError} />}
          <DataTable<AdminUserRow>
            rows={users}
            columns={userColumns}
            rowKey={(r) => r.id}
            onRowClick={(r) => setSelectedUserId(r.id)}
            emptyLabel={usersLoading ? 'Loading…' : 'No users found'}
          />
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

  const handleSetTier = (tier: Tier) =>
    wrap('tier', async () => {
      await setSubscriptionTier(userId!, tier);
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

  return (
    <Modal open={user !== null} onClose={onClose} title={user?.name ?? user?.email ?? 'User'} width={720}>
      {user && (
        <div>
          {/* Header info */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>{user.email ?? '—'}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <TierChip tier={user.tier} />
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
                <Field label="Tier">
                  <Select
                    value={user.tier ?? 'free'}
                    onChange={(e) => handleSetTier(e.target.value as Tier)}
                    disabled={savingAction === 'tier'}
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="elite">Elite</option>
                  </Select>
                </Field>
                {savingAction === 'tier' && (
                  <div style={{ fontSize: 12, color: colors.muted }}>Updating…</div>
                )}
              </div>

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
        <Button variant="secondary" onClick={onKick} disabled={busyKick || busyReset}>
          {busyKick ? 'Kicking…' : 'Kick'}
        </Button>
      )}

      <Button variant="danger" onClick={onReset} disabled={busyReset || busyKick}>
        {busyReset ? 'Resetting…' : 'Reset'}
      </Button>
    </div>
  );
}
