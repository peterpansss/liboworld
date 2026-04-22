import { useEffect, useMemo, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Select, Button, TextInput } from '../../components/admin/FormField';
import { listUsers, setSubscriptionTier, type AdminUserRow } from '../../lib/adminApi';

type Tier = 'free' | 'pro' | 'elite';
const TIER_OPTIONS: Tier[] = ['free', 'pro', 'elite'];

const h1Style: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 30,
  fontWeight: 800,
  color: colors.text,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 20,
  gap: 16,
  flexWrap: 'wrap',
};

function tierChipStyle(tier: Tier | null): React.CSSProperties {
  let bg: string = colors.bg3;
  let fg: string = colors.muted;
  if (tier === 'pro') {
    bg = colors.accentDim;
    fg = colors.accent;
  } else if (tier === 'elite') {
    bg = colors.warningDim;
    fg = colors.warning;
  }
  return {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 8,
    background: bg,
    color: fg,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  };
}

function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDateTimeInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function formatExpires(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'never';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

type DraftState = {
  tier: Tier;
  expiresAt: string; // local datetime-local string
};

export function SubscriptionsPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<{ id: string; text: string } | null>(null);
  const [rowError, setRowError] = useState<{ id: string; text: string } | null>(null);

  const refresh = async () => {
    setLoading(true);
    setListError(null);
    try {
      const users = await listUsers(null, 200, 0);
      setRows(users);
      // Seed drafts from current tier/expires so inputs start "in sync" with the row.
      const nextDrafts: Record<string, DraftState> = {};
      for (const u of users) {
        nextDrafts[u.id] = {
          tier: (u.tier ?? 'free') as Tier,
          expiresAt: toLocalDateTimeInput(u.subscription_expires_at),
        };
      }
      setDrafts(nextDrafts);
    } catch (err) {
      setListError((err as Error).message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const visibleRows = useMemo(() => {
    const withSub = rows.filter((r) => r.tier !== null);
    return withSub.length > 0 ? withSub : rows;
  }, [rows]);

  const handleSave = async (row: AdminUserRow) => {
    const draft = drafts[row.id];
    if (!draft) return;
    setSavingId(row.id);
    setRowError(null);
    setSavedMessage(null);
    try {
      const expiresIso = fromLocalDateTimeInput(draft.expiresAt);
      await setSubscriptionTier(row.id, draft.tier, expiresIso);
      setSavedMessage({ id: row.id, text: 'Saved' });
      await refresh();
    } catch (err) {
      setRowError({ id: row.id, text: (err as Error).message ?? 'Save failed' });
    } finally {
      setSavingId(null);
    }
  };

  const columns: Column<AdminUserRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (r) => (
          <span style={{ color: colors.text, fontWeight: 600 }}>{r.name ?? '—'}</span>
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
        render: (r) => (
          <span style={tierChipStyle(r.tier)}>{r.tier ?? 'none'}</span>
        ),
        sort: (a, b) => (a.tier ?? '').localeCompare(b.tier ?? ''),
      },
      {
        key: 'expires_at',
        header: 'Expires',
        render: (r) => (
          <span style={{ color: colors.muted, fontSize: 12 }}>{formatExpires(r.subscription_expires_at)}</span>
        ),
        sort: (a, b) => {
          const ta = a.subscription_expires_at ? new Date(a.subscription_expires_at).getTime() : 0;
          const tb = b.subscription_expires_at ? new Date(b.subscription_expires_at).getTime() : 0;
          return ta - tb;
        },
      },
      {
        key: 'actions',
        header: 'Change tier',
        width: 520,
        render: (r) => {
          const draft = drafts[r.id] ?? { tier: (r.tier ?? 'free') as Tier, expiresAt: toLocalDateTimeInput(r.subscription_expires_at) };
          const isSaving = savingId === r.id;
          const showSaved = savedMessage?.id === r.id;
          const showError = rowError?.id === r.id;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Select
                value={draft.tier}
                onChange={(e) =>
                  setDrafts((d) => ({
                    ...d,
                    [r.id]: { ...draft, tier: e.target.value as Tier },
                  }))
                }
                style={{ width: 110 }}
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
              <TextInput
                type="datetime-local"
                value={draft.expiresAt}
                onChange={(e) =>
                  setDrafts((d) => ({
                    ...d,
                    [r.id]: { ...draft, expiresAt: e.target.value },
                  }))
                }
                style={{ width: 210 }}
              />
              <Button
                variant="primary"
                onClick={() => void handleSave(r)}
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
              {showSaved && (
                <span style={{ color: colors.accent, fontSize: 12, fontWeight: 600 }}>{savedMessage?.text}</span>
              )}
              {showError && (
                <span style={{ color: colors.error, fontSize: 12 }}>{rowError?.text}</span>
              )}
            </div>
          );
        },
      },
    ],
    [drafts, savingId, savedMessage, rowError]
  );

  return (
    <div style={{ padding: 0 }}>
      <div style={headerRowStyle}>
        <h1 style={h1Style}>Subscriptions</h1>
        <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {listError && (
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
          {listError}
        </div>
      )}

      <DataTable<AdminUserRow>
        rows={visibleRows}
        columns={columns}
        rowKey={(r) => r.id}
        emptyLabel={loading ? 'Loading…' : 'No users found.'}
      />
    </div>
  );
}
