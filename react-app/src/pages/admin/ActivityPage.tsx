import { useEffect, useMemo, useState } from 'react';
import { fetchActivityFeed, type ActivityFilters, type WorkoutLogRow } from '../../lib/adminApi';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, Button } from '../../components/admin/FormField';
import { KpiCard } from '../../components/admin/KpiCard';
import { colors } from '../../theme';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// workout_logs.duration is MINUTES (the app rounds before syncing);
// duration_seconds is the real elapsed time from workout_sessions when the
// feed RPC provides it. Show second precision when we have it, honest
// minute precision when we don't — never format minutes as M:SS again.
const durationSeconds = (r: Pick<WorkoutLogRow, 'duration' | 'duration_seconds'>) =>
  r.duration_seconds ?? r.duration * 60;
const fmtDuration = (r: Pick<WorkoutLogRow, 'duration' | 'duration_seconds'>) => {
  if (r.duration_seconds == null) return `${r.duration} min`;
  const s = r.duration_seconds;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const csvEscape = (v: unknown) => {
  const s = v == null ? '' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const todayStamp = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export function ActivityPage() {
  const [rows, setRows] = useState<WorkoutLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [workoutName, setWorkoutName] = useState('');

  const load = async (filters: ActivityFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActivityFeed(filters);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load activity feed');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load({ limit: 200 });
  }, []);

  const kpis = useMemo(() => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    let today = 0;
    let week = 0;
    let month = 0;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      if (isNaN(t)) continue;
      if (t >= startOfTodayMs) today += 1;
      if (now - t <= 7 * DAY) week += 1;
      if (now - t <= 30 * DAY) month += 1;
    }
    return { today, week, month };
  }, [rows]);

  const applyFilters = () => {
    const filters: ActivityFilters = { limit: 200 };
    if (from) filters.from = new Date(from).toISOString();
    if (to) filters.to = new Date(to).toISOString();
    const trimmed = userSearch.trim();
    if (trimmed && UUID_RE.test(trimmed)) filters.userId = trimmed;
    const wn = workoutName.trim();
    if (wn) filters.workoutName = wn;
    void load(filters);
  };

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setUserSearch('');
    setWorkoutName('');
    void load({ limit: 200 });
  };

  const exportCsv = () => {
    const header = ['time', 'user_name', 'user_email', 'workout_name', 'emoji', 'duration_minutes', 'duration_seconds', 'duration_formatted', 'exercise_count', 'user_id', 'workout_id'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        r.created_at,
        r.user_name ?? '',
        r.user_email ?? '',
        r.workout_name,
        r.emoji ?? '',
        r.duration,
        r.duration_seconds ?? '',
        fmtDuration(r),
        r.exercise_count,
        r.user_id,
        r.workout_id,
      ].map(csvEscape).join(','));
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `libo-activity-${todayStamp()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns: Column<WorkoutLogRow>[] = [
    {
      key: 'time',
      header: 'Time',
      width: 180,
      render: (r) => (
        <span style={{ color: colors.text, whiteSpace: 'nowrap' }}>{fmtDateTime(r.created_at)}</span>
      ),
      sort: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      key: 'user',
      header: 'User',
      render: (r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: colors.text, fontWeight: 600 }}>{r.user_name ?? '—'}</span>
          <span style={{ color: colors.muted, fontSize: 12 }}>{r.user_email ?? r.user_id}</span>
        </div>
      ),
      sort: (a, b) => (a.user_name ?? '').localeCompare(b.user_name ?? ''),
    },
    {
      key: 'workout',
      header: 'Workout',
      render: (r) => (
        <span style={{ color: colors.text }}>
          {r.emoji && <span style={{ marginRight: 8 }}>{r.emoji}</span>}
          {r.workout_name}
        </span>
      ),
      sort: (a, b) => a.workout_name.localeCompare(b.workout_name),
    },
    {
      key: 'duration',
      header: 'Duration',
      width: 110,
      align: 'right',
      render: (r) => (
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, color: colors.text }}>
          {fmtDuration(r)}
        </span>
      ),
      sort: (a, b) => durationSeconds(a) - durationSeconds(b),
    },
    {
      key: 'exercises',
      header: 'Exercises',
      width: 110,
      align: 'right',
      render: (r) => (
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, color: colors.text }}>
          {r.exercise_count}
        </span>
      ),
      sort: (a, b) => a.exercise_count - b.exercise_count,
    },
  ];

  return (
    <div style={{ padding: 24, color: colors.text, fontFamily: 'Inter, sans-serif' }}>
      <h1
        style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 38,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          margin: '0 0 6px 0',
          color: colors.text,
        }}
      >
        Activity
      </h1>
      <div style={{ color: colors.muted, fontSize: 14, marginBottom: 20 }}>
        Global feed of every workout completion.
      </div>

      {error && (
        <div
          style={{
            background: colors.errorDim,
            color: colors.error,
            border: `1px solid ${colors.error}`,
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Workouts today" value={kpis.today} />
        <KpiCard label="Last 7 days" value={kpis.week} />
        <KpiCard label="Last 30 days" value={kpis.month} />
      </div>

      <div
        style={{
          background: colors.bg2,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px', minWidth: 180 }}>
            <Field label="From">
              <TextInput
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
          </div>
          <div style={{ flex: '1 1 200px', minWidth: 180 }}>
            <Field label="To">
              <TextInput
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <Field label="User (UUID)" hint="Paste an exact user UUID to filter; free text is ignored.">
              <TextInput
                placeholder="user-id-uuid"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </Field>
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <Field label="Workout name">
              <TextInput
                placeholder="e.g. Full Body Burn"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
              />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Button variant="primary" onClick={applyFilters} disabled={loading}>
              {loading ? 'Loading…' : 'Apply'}
            </Button>
            <Button variant="secondary" onClick={clearFilters} disabled={loading}>
              Clear
            </Button>
            <Button variant="ghost" onClick={exportCsv} disabled={rows.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
        {loading ? 'Loading…' : `${rows.length} row${rows.length === 1 ? '' : 's'} (limit 200)`}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        emptyLabel={loading ? 'Loading…' : 'No workouts match these filters.'}
      />
    </div>
  );
}
