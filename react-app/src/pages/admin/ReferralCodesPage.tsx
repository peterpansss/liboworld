import { useEffect, useMemo, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import {
  listReferralCodes,
  createReferralCode,
  updateReferralCode,
  // Destructive op goes through the *WithReauth wrapper so
  // requireRecentAuth() can challenge the operator before delete.
  deleteReferralCodeWithReauth as deleteReferralCode,
  listConversionsForCode,
  listUsers,
  type ReferralCode,
  type ReferralCodeInput,
  type ReferralCodeType,
  type ReferralConversion,
  type AdminUserRow,
} from '../../lib/adminApi';

const TYPE_OPTIONS: ReferralCodeType[] = ['user', 'creator', 'partner'];

const CODE_PATTERN = /^[A-Za-z0-9]{3,20}$/;

const h1Style: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 30,
  fontWeight: 800,
  color: colors.text,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const pageStyle: React.CSSProperties = {
  padding: 28,
  maxWidth: 1400,
  margin: '0 auto',
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 20,
};

function typeChipStyle(type: ReferralCodeType): React.CSSProperties {
  let bg: string = colors.bg3;
  let fg: string = colors.muted;
  if (type === 'creator') {
    bg = colors.accentDim;
    fg = colors.accent;
  } else if (type === 'partner') {
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

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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

function shortId(id: string | null): string {
  if (!id) return '';
  return id.slice(0, 8);
}

type FormState = {
  code: string;
  code_type: ReferralCodeType;
  owner_user_id: string; // empty = null
  owner_label: string; // for display next to the picker
  bonus_points_referee: string;
  bonus_points_referrer: string;
  boost_multiplier: string;
  boost_days: string;
  max_uses: string;
  expires_at: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  code: '',
  code_type: 'user',
  owner_user_id: '',
  owner_label: '',
  bonus_points_referee: '100',
  bonus_points_referrer: '100',
  boost_multiplier: '1',
  boost_days: '0',
  max_uses: '',
  expires_at: '',
  active: true,
};

function rowToForm(row: ReferralCode): FormState {
  return {
    code: row.code,
    code_type: row.code_type,
    owner_user_id: row.owner_user_id ?? '',
    owner_label: row.owner_user_id ? shortId(row.owner_user_id) : '',
    bonus_points_referee: String(row.bonus_points_referee),
    bonus_points_referrer: String(row.bonus_points_referrer),
    boost_multiplier: String(row.boost_multiplier),
    boost_days: String(row.boost_days),
    max_uses: row.max_uses == null ? '' : String(row.max_uses),
    expires_at: toLocalDateTimeInput(row.expires_at),
    active: row.active,
  };
}

function formToInput(form: FormState): ReferralCodeInput {
  return {
    code: form.code.trim(),
    code_type: form.code_type,
    owner_user_id: form.owner_user_id.trim() ? form.owner_user_id.trim() : null,
    bonus_points_referee: Number(form.bonus_points_referee) || 0,
    bonus_points_referrer: Number(form.bonus_points_referrer) || 0,
    boost_multiplier: Number(form.boost_multiplier) || 1,
    boost_days: Number(form.boost_days) || 0,
    max_uses: form.max_uses.trim() ? Number(form.max_uses) : null,
    expires_at: fromLocalDateTimeInput(form.expires_at),
    active: form.active,
  };
}

// ── User picker ────────────────────────────────────────────────────────────

function UserPicker({
  selectedId,
  selectedLabel,
  onSelect,
  onClear,
}: {
  selectedId: string;
  selectedLabel: string;
  onSelect: (user: AdminUserRow) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const list = await listUsers(query.length > 0 ? query : null, 20, 0);
        if (!cancelled) setResults(list);
      } catch (err) {
        if (!cancelled) setError((err as Error).message ?? 'Search failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  if (selectedId) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          color: colors.text,
          fontSize: 13,
        }}
      >
        <span style={{ flex: 1 }}>
          <span style={{ color: colors.accent, fontWeight: 700 }}>●</span>{' '}
          {selectedLabel || shortId(selectedId)}
          <span style={{ color: colors.muted, marginLeft: 8, fontFamily: 'monospace', fontSize: 11 }}>
            {shortId(selectedId)}
          </span>
        </span>
        <Button type="button" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Assign to user
      </Button>
    );
  }

  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 10, borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: 8 }}>
        <TextInput
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by email or name…"
        />
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setQuery('');
          }}
        >
          Close
        </Button>
      </div>
      <div style={{ maxHeight: 220, overflow: 'auto' }}>
        {error && <div style={{ padding: 12, color: colors.error, fontSize: 12 }}>{error}</div>}
        {loading && <div style={{ padding: 12, color: colors.muted, fontSize: 12 }}>Searching…</div>}
        {!loading && results.length === 0 && (
          <div style={{ padding: 12, color: colors.muted, fontSize: 12 }}>No users found.</div>
        )}
        {results.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => {
              onSelect(u);
              setOpen(false);
              setQuery('');
            }}
            style={{
              display: 'flex',
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${colors.border}`,
              cursor: 'pointer',
              color: colors.text,
              fontSize: 13,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = colors.bg3)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{u.name ?? u.email ?? shortId(u.id)}</div>
              <div style={{ fontSize: 11, color: colors.muted }}>
                {u.email ?? '—'} · <span style={{ fontFamily: 'monospace' }}>{shortId(u.id)}</span>
              </div>
            </div>
            {u.tier && u.tier !== 'free' && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: colors.accent,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginLeft: 8,
                }}
              >
                {u.tier}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Conversions panel (inside modal) ──────────────────────────────────────

function ConversionsPanel({ code }: { code: string }) {
  const [rows, setRows] = useState<ReferralConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const list = await listConversionsForCode(code);
        if (!cancelled) setRows(list);
      } catch (err) {
        if (!cancelled) setError((err as Error).message ?? 'Load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div
      style={{
        marginTop: 8,
        marginBottom: 16,
        padding: 12,
        background: colors.bg3,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: colors.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Conversion history</span>
        <span>{rows.length} total</span>
      </div>
      {loading && <div style={{ color: colors.muted, fontSize: 12 }}>Loading…</div>}
      {error && <div style={{ color: colors.error, fontSize: 12 }}>{error}</div>}
      {!loading && !error && rows.length === 0 && (
        <div style={{ color: colors.muted, fontSize: 12 }}>No conversions yet.</div>
      )}
      {!loading && rows.length > 0 && (
        <div style={{ maxHeight: 260, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: colors.muted, textAlign: 'left' }}>
                <th style={{ padding: '6px 8px', fontWeight: 600 }}>When</th>
                <th style={{ padding: '6px 8px', fontWeight: 600 }}>Referee</th>
                <th style={{ padding: '6px 8px', fontWeight: 600 }}>Referrer</th>
                <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Pts (ee/er)</th>
                <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Boost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${colors.border}`, color: colors.text }}>
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{formatDateTime(r.converted_at)}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{shortId(r.referee_user_id)}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>
                    {r.referrer_user_id ? shortId(r.referrer_user_id) : '—'}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                    {r.bonus_points_referee} / {r.bonus_points_referrer}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                    {r.boost_multiplier_applied}× · {r.boost_days_applied}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function ReferralCodesPage() {
  const [rows, setRows] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<ReferralCodeType | ''>('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReferralCode | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async (filters?: {
    search?: string | null;
    codeType?: ReferralCodeType | null;
    active?: boolean | null;
  }) => {
    setLoading(true);
    setListError(null);
    try {
      const list = await listReferralCodes(filters);
      setRows(list);
    } catch (err) {
      setListError((err as Error).message ?? 'Failed to load referral codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const applyFilters = () => {
    void refresh({
      search: searchInput.trim() ? searchInput.trim() : null,
      codeType: typeFilter || null,
      active: activeFilter === '' ? null : activeFilter === 'true',
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: ReferralCode) => {
    setEditing(row);
    setForm(rowToForm(row));
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!CODE_PATTERN.test(form.code.trim())) {
      setFormError('Code must be 3–20 alphanumeric characters.');
      return;
    }
    const mult = Number(form.boost_multiplier);
    if (!Number.isFinite(mult) || mult < 1 || mult > 10) {
      setFormError('Boost multiplier must be between 1.0 and 10.0.');
      return;
    }
    const days = Number(form.boost_days);
    if (!Number.isInteger(days) || days < 0 || days > 90) {
      setFormError('Boost days must be between 0 and 90.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const input = formToInput(form);
      if (editing) {
        await updateReferralCode(editing.id, input);
      } else {
        await createReferralCode(input);
      }
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await refresh();
    } catch (err) {
      setFormError((err as Error).message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: ReferralCode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete referral code "${row.code}"? This cannot be undone.`)) return;
    try {
      await deleteReferralCode(row.id);
      await refresh();
    } catch (err) {
      setListError((err as Error).message ?? 'Delete failed');
    }
  };

  const handleToggleActive = async (row: ReferralCode, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateReferralCode(row.id, { active: !row.active });
      await refresh();
    } catch (err) {
      setListError((err as Error).message ?? 'Toggle failed');
    }
  };

  const columns: Column<ReferralCode>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'Code',
        render: (r) => (
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: colors.text, letterSpacing: 0.5 }}>
            {r.code}
          </span>
        ),
        sort: (a, b) => a.code.localeCompare(b.code),
      },
      {
        key: 'code_type',
        header: 'Type',
        render: (r) => <span style={typeChipStyle(r.code_type)}>{r.code_type}</span>,
        sort: (a, b) => a.code_type.localeCompare(b.code_type),
      },
      {
        key: 'owner_user_id',
        header: 'Owner',
        render: (r) =>
          r.owner_user_id ? (
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: colors.muted }}>
              {shortId(r.owner_user_id)}
            </span>
          ) : (
            <span style={{ color: colors.dim }}>—</span>
          ),
      },
      {
        key: 'bonus',
        header: 'Bonus (er/ee)',
        align: 'right',
        render: (r) => (
          <span style={{ color: colors.muted, fontSize: 12 }}>
            {r.bonus_points_referrer} / {r.bonus_points_referee}
          </span>
        ),
      },
      {
        key: 'boost',
        header: 'Boost',
        align: 'right',
        render: (r) =>
          r.boost_multiplier > 1 || r.boost_days > 0 ? (
            <span style={{ color: colors.accent, fontSize: 12, fontWeight: 600 }}>
              {r.boost_multiplier}× · {r.boost_days}d
            </span>
          ) : (
            <span style={{ color: colors.dim, fontSize: 12 }}>—</span>
          ),
      },
      {
        key: 'uses',
        header: 'Uses',
        align: 'right',
        render: (r) => (
          <span style={{ color: colors.muted, fontSize: 12 }}>
            {r.uses_count}
            {r.max_uses != null ? ` / ${r.max_uses}` : ''}
          </span>
        ),
        sort: (a, b) => a.uses_count - b.uses_count,
      },
      {
        key: 'expires_at',
        header: 'Expires',
        render: (r) => <span style={{ color: colors.muted, fontSize: 12 }}>{formatDate(r.expires_at)}</span>,
        sort: (a, b) => {
          const av = a.expires_at ? new Date(a.expires_at).getTime() : 0;
          const bv = b.expires_at ? new Date(b.expires_at).getTime() : 0;
          return av - bv;
        },
      },
      {
        key: 'active',
        header: 'Active',
        render: (r) => (
          <button
            onClick={(e) => void handleToggleActive(r, e)}
            title={r.active ? 'Click to deactivate' : 'Click to activate'}
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: 8,
              background: r.active ? colors.successDim : colors.bg3,
              color: r.active ? colors.success : colors.muted,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              cursor: 'pointer',
              border: `1px solid ${r.active ? colors.success : colors.border}`,
            }}
          >
            {r.active ? 'Active' : 'Inactive'}
          </button>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: 48,
        align: 'right',
        render: (r) => (
          <button
            onClick={(e) => void handleDelete(r, e)}
            aria-label={`Delete ${r.code}`}
            title="Delete code"
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.muted,
              cursor: 'pointer',
              fontSize: 16,
              padding: 4,
              borderRadius: 6,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = colors.error;
              (e.currentTarget as HTMLButtonElement).style.background = colors.errorDim;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = colors.muted;
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            ×
          </button>
        ),
      },
    ],
    []
  );

  return (
    <div style={pageStyle}>
      <div style={headerRowStyle}>
        <h1 style={h1Style}>Referral Codes</h1>
        <Button variant="primary" onClick={openCreate}>+ New code</Button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 240px', minWidth: 200 }}>
          <Field label="Search code">
            <TextInput
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters();
              }}
              placeholder="e.g. WELCOME100"
            />
          </Field>
        </div>
        <div style={{ width: 180 }}>
          <Field label="Type">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ReferralCodeType | '')}>
              <option value="">All</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div style={{ width: 180 }}>
          <Field label="Active">
            <Select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as '' | 'true' | 'false')}>
              <option value="">All</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </Select>
          </Field>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Button variant="secondary" onClick={applyFilters}>Apply filters</Button>
        </div>
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

      <DataTable<ReferralCode>
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => openEdit(r)}
        emptyLabel={loading ? 'Loading…' : 'No referral codes yet. Create the first one.'}
      />

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit referral code' : 'New referral code'} width={720}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Code" hint="3–20 alphanumeric characters. Case-insensitive in practice.">
              <TextInput
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. WELCOME100"
                disabled={!!editing}
                required
              />
            </Field>
            <Field label="Type">
              <Select
                value={form.code_type}
                onChange={(e) => setForm({ ...form, code_type: e.target.value as ReferralCodeType })}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Owner (optional)"
            hint="If this code belongs to a specific user (the 'referrer'), assign them here."
          >
            <UserPicker
              selectedId={form.owner_user_id}
              selectedLabel={form.owner_label}
              onSelect={(u) =>
                setForm({
                  ...form,
                  owner_user_id: u.id,
                  owner_label: u.name ?? u.email ?? shortId(u.id),
                })
              }
              onClear={() => setForm({ ...form, owner_user_id: '', owner_label: '' })}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Bonus points — referee" hint="Points granted to the new user.">
              <TextInput
                type="number"
                min={0}
                value={form.bonus_points_referee}
                onChange={(e) => setForm({ ...form, bonus_points_referee: e.target.value })}
              />
            </Field>
            <Field label="Bonus points — referrer" hint="Points granted to the code owner.">
              <TextInput
                type="number"
                min={0}
                value={form.bonus_points_referrer}
                onChange={(e) => setForm({ ...form, bonus_points_referrer: e.target.value })}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Boost multiplier" hint="1.0–10.0. Applied for the boost window below.">
              <TextInput
                type="number"
                min={1}
                max={10}
                step={0.1}
                value={form.boost_multiplier}
                onChange={(e) => setForm({ ...form, boost_multiplier: e.target.value })}
              />
            </Field>
            <Field label="Boost days" hint="0–90. Length of the multiplier window.">
              <TextInput
                type="number"
                min={0}
                max={90}
                value={form.boost_days}
                onChange={(e) => setForm({ ...form, boost_days: e.target.value })}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Max uses" hint="Blank = unlimited.">
              <TextInput
                type="number"
                min={1}
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="Unlimited"
              />
            </Field>
            <Field label="Expires at" hint="Optional.">
              <TextInput
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </Field>
          </div>

          <Field>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '10px 12px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                color: colors.text,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              Active (code can be redeemed)
            </label>
          </Field>

          {editing && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginTop: 8,
                  marginBottom: 8,
                  padding: '12px 14px',
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Uses
                  </div>
                  <div
                    style={{
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontSize: 20,
                      fontWeight: 700,
                      color: colors.text,
                    }}
                  >
                    {editing.uses_count}
                    {editing.max_uses != null ? ` / ${editing.max_uses}` : ''}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Created
                  </div>
                  <div style={{ fontSize: 13, color: colors.text }}>{formatDateTime(editing.created_at)}</div>
                </div>
              </div>
              <ConversionsPanel code={editing.code} />
            </>
          )}

          {formError && (
            <div
              style={{
                padding: 10,
                marginBottom: 12,
                background: colors.errorDim,
                color: colors.error,
                borderRadius: 10,
                border: `1px solid ${colors.error}`,
                fontSize: 13,
              }}
            >
              {formError}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 8,
              paddingTop: 16,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create code'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
