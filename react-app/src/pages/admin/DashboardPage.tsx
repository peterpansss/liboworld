import { useEffect, useState } from 'react';
import { colors } from '../../theme';
import { KpiCard } from '../../components/admin/KpiCard';
import { Button } from '../../components/admin/FormField';
import { fetchDashboardKpis, type DashboardKpis } from '../../lib/adminApi';

const numberFmt = new Intl.NumberFormat();

const h1Style: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 30,
  fontWeight: 800,
  color: colors.text,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: colors.muted,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: 16,
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 20,
  gap: 16,
  flexWrap: 'wrap',
};

const subtitleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const TILE_DEFS: { key: keyof DashboardKpis; label: string }[] = [
  { key: 'total_users', label: 'Total users' },
  { key: 'workouts_today', label: 'Workouts today' },
  { key: 'workouts_7d', label: 'Workouts (7d)' },
  { key: 'active_giveaways', label: 'Active giveaways' },
  { key: 'tickets_issued_7d', label: 'Tickets issued (7d)' },
  { key: 'points_awarded_7d', label: 'Points awarded (7d)' },
  { key: 'pro_subscribers', label: 'Pro subscribers' },
  { key: 'workouts_30d', label: 'Workouts (30d)' },
];

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardKpis();
      setKpis(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div style={{ padding: 0 }}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={h1Style}>Dashboard</h1>
          <div style={{ ...subtitleRowStyle, marginTop: 8 }}>
            <span style={subtitleStyle}>
              {lastUpdated ? `Last updated ${formatTime(lastUpdated)}` : 'Loading…'}
            </span>
            <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: colors.errorDim,
            color: colors.error,
            borderRadius: 10,
            border: `1px solid ${colors.error}`,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div style={gridStyle}>
        {TILE_DEFS.map((t) => {
          const raw = kpis ? kpis[t.key] : null;
          const value = loading || raw == null ? '—' : numberFmt.format(raw);
          return <KpiCard key={t.key} label={t.label} value={value} />;
        })}
      </div>
    </div>
  );
}
