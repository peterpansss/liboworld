import { useEffect, useMemo, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, TextArea, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import {
  listMoneyChallenges,
  createMoneyChallenge,
  updateMoneyChallenge,
  deleteMoneyChallenge,
  EXERCISE_OPTION_CATALOG,
  type MoneyChallenge,
  type MoneyChallengeInput,
  type MoneyChallengeTier,
  type ExerciseOptionId,
} from '../../lib/adminApi';

// ── styles ────────────────────────────────────────────────────────────────

const h1Style: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 30,
  fontWeight: 800,
  color: colors.text,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const statsStyle: React.CSSProperties = { fontSize: 13, color: colors.muted, marginTop: 6 };

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  marginBottom: 20,
  gap: 16,
};

const errorBannerStyle: React.CSSProperties = {
  background: colors.errorDim,
  color: colors.error,
  border: `1px solid ${colors.error}`,
  borderRadius: 10,
  padding: '10px 14px',
  marginBottom: 14,
  fontSize: 13,
};

const bigNum: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontSize: 18,
  fontWeight: 700,
  color: colors.text,
  letterSpacing: 0.4,
};

function tierStyle(tier: MoneyChallengeTier): React.CSSProperties {
  if (tier === 'pro') return { background: colors.accentDim, color: colors.accent };
  if (tier === 'elite') return { background: colors.warningDim, color: colors.warning };
  return { background: colors.bg3, color: colors.muted };
}

function TierChip({ tier }: { tier: MoneyChallengeTier }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        ...tierStyle(tier),
      }}
    >
      {tier}
    </span>
  );
}

function activeStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: colors.successDim, color: colors.success }
    : { background: colors.bg3, color: colors.muted };
}

function StatusChip({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        ...activeStyle(active),
      }}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ── form helpers ──────────────────────────────────────────────────────────

type FormState = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  exercise_option_ids: ExerciseOptionId[];
  reps_per_day: string;
  total_days: string;
  reward_amount: string;
  reward_currency: string;
  max_participants: string; // '' = unlimited
  required_tier: MoneyChallengeTier;
  is_active: boolean;
  sort_order: string;
  starts_at: string;
  ends_at: string;
};

const EMPTY_FORM: FormState = {
  id: '',
  title: '',
  description: '',
  emoji: '💪',
  exercise_option_ids: EXERCISE_OPTION_CATALOG.map((o) => o.id),
  reps_per_day: '',
  total_days: '',
  reward_amount: '',
  reward_currency: 'EUR',
  max_participants: '',
  required_tier: 'free',
  is_active: true,
  sort_order: '0',
  starts_at: '',
  ends_at: '',
};

function toLocalDT(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDT(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function rowToForm(row: MoneyChallenge): FormState {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    emoji: row.emoji,
    exercise_option_ids: row.exercise_option_ids ?? [],
    reps_per_day: String(row.reps_per_day),
    total_days: String(row.total_days),
    reward_amount: String(row.reward_amount),
    reward_currency: row.reward_currency,
    max_participants: row.max_participants == null ? '' : String(row.max_participants),
    required_tier: row.required_tier,
    is_active: row.is_active,
    sort_order: String(row.sort_order),
    starts_at: toLocalDT(row.starts_at),
    ends_at: toLocalDT(row.ends_at),
  };
}

function formToInput(f: FormState): MoneyChallengeInput {
  return {
    id: f.id.trim(),
    title: f.title.trim(),
    description: f.description.trim(),
    emoji: f.emoji.trim() || '💪',
    exercise_option_ids: f.exercise_option_ids,
    reps_per_day: Number(f.reps_per_day) || 0,
    total_days: Number(f.total_days) || 0,
    reward_amount: Number(f.reward_amount) || 0,
    reward_currency: f.reward_currency.trim() || 'EUR',
    max_participants: f.max_participants.trim() ? Number(f.max_participants) : null,
    required_tier: f.required_tier,
    is_active: f.is_active,
    sort_order: Number(f.sort_order) || 0,
    starts_at: fromLocalDT(f.starts_at),
    ends_at: fromLocalDT(f.ends_at),
  };
}

// ── page ──────────────────────────────────────────────────────────────────

export function ChallengesPage() {
  const [rows, setRows] = useState<MoneyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await listMoneyChallenges();
      setRows(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErr(null);
    setModalOpen(true);
  };

  const openEdit = (row: MoneyChallenge) => {
    setEditingId(row.id);
    setForm(rowToForm(row));
    setFormErr(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErr(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id.trim()) {
      setFormErr('ID is required. Use lowercase-with-underscores, e.g. pushup_50_30d_v1.');
      return;
    }
    if (!form.title.trim() || !form.description.trim()) {
      setFormErr('Title and description are required.');
      return;
    }
    if (form.exercise_option_ids.length === 0) {
      setFormErr('Select at least one exercise option.');
      return;
    }
    if (Number(form.reps_per_day) <= 0 || Number(form.total_days) <= 0) {
      setFormErr('Reps per day and total days must be > 0.');
      return;
    }
    setSaving(true);
    setFormErr(null);
    try {
      const input = formToInput(form);
      if (editingId) {
        await updateMoneyChallenge(editingId, input);
      } else {
        await createMoneyChallenge(input);
      }
      await refresh();
      closeModal();
    } catch (e2) {
      console.error('[admin/challenges] save failed', e2);
      const err = e2 as { message?: string; code?: string; details?: string; hint?: string } | null;
      const parts = [err?.message, err?.code && `(${err.code})`, err?.details, err?.hint].filter(Boolean);
      setFormErr(parts.length ? parts.join(' — ') : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: MoneyChallenge) => {
    if (row.total_ever > 0) {
      if (!confirm(`"${row.title}" has ${row.total_ever} historical enrollment(s). Deleting is blocked by the FK — set Inactive instead. Continue anyway?`)) return;
    } else if (!confirm(`Delete "${row.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteMoneyChallenge(row.id);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const columns: Column<MoneyChallenge>[] = useMemo(
    () => [
      {
        key: 'emoji',
        header: '',
        width: 48,
        render: (r) => <span style={{ fontSize: 22 }}>{r.emoji}</span>,
      },
      {
        key: 'title',
        header: 'Title',
        render: (r) => (
          <div>
            <div style={{ fontWeight: 600, color: colors.text }}>{r.title}</div>
            <div style={{ color: colors.dim, fontSize: 11, marginTop: 2 }}>{r.id}</div>
          </div>
        ),
        sort: (a, b) => a.title.localeCompare(b.title),
      },
      {
        key: 'options',
        header: 'Exercises',
        render: (r) => (
          <span style={{ color: colors.muted, fontSize: 12 }}>
            {r.exercise_option_ids?.length
              ? r.exercise_option_ids
                  .map((id) => EXERCISE_OPTION_CATALOG.find((o) => o.id === id)?.name ?? id)
                  .join(', ')
              : '—'}
          </span>
        ),
        sort: (a, b) => (a.exercise_option_ids?.length ?? 0) - (b.exercise_option_ids?.length ?? 0),
      },
      {
        key: 'target',
        header: 'Target',
        align: 'right',
        render: (r) => (
          <span style={bigNum}>
            {r.reps_per_day}×{r.total_days}d
          </span>
        ),
        sort: (a, b) => a.reps_per_day * a.total_days - b.reps_per_day * b.total_days,
      },
      {
        key: 'reward',
        header: 'Reward',
        align: 'right',
        render: (r) => (
          <span style={bigNum}>
            {Number(r.reward_amount).toFixed(2)} {r.reward_currency}
          </span>
        ),
        sort: (a, b) => Number(a.reward_amount) - Number(b.reward_amount),
      },
      {
        key: 'tier',
        header: 'Tier',
        render: (r) => <TierChip tier={r.required_tier} />,
        sort: (a, b) => a.required_tier.localeCompare(b.required_tier),
      },
      {
        key: 'participants',
        header: 'Active',
        align: 'right',
        render: (r) => (
          <span style={bigNum}>
            {r.current_active}
            {r.max_participants != null && (
              <span style={{ color: colors.dim, fontSize: 12, marginLeft: 4 }}>
                / {r.max_participants}
              </span>
            )}
          </span>
        ),
        sort: (a, b) => a.current_active - b.current_active,
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => <StatusChip active={r.is_active} />,
        sort: (a, b) => Number(b.is_active) - Number(a.is_active),
      },
      {
        key: 'actions',
        header: '',
        width: 90,
        render: (r) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              void handleDelete(r);
            }}
            aria-label="Delete"
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.muted,
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        ),
      },
    ],
    []
  );

  const activeCount = rows.filter((r) => r.is_active).length;

  return (
    <div style={{ padding: 0 }}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={h1Style}>Money Challenges</h1>
          <div style={statsStyle}>
            {loading ? 'Loading…' : `${rows.length} total · ${activeCount} active`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button variant="primary" onClick={openCreate}>
            + New challenge
          </Button>
        </div>
      </div>

      {err && <div style={errorBannerStyle}>{err}</div>}

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={openEdit}
        emptyLabel={loading ? 'Loading…' : 'No challenges yet — create one.'}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? `Edit: ${form.title || editingId}` : 'New challenge'}
        width={720}
      >
        <form onSubmit={handleSave}>
          {formErr && <div style={errorBannerStyle}>{formErr}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="ID (lowercase, unique)">
              <TextInput
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.trim() }))}
                disabled={!!editingId}
                placeholder="pushup_50_30d_v1"
                required
              />
            </Field>
            <Field label="Emoji">
              <TextInput
                value={form.emoji}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                maxLength={4}
              />
            </Field>
          </div>

          <Field label="Title">
            <TextInput
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </Field>

          <Field label="Description">
            <TextArea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              required
            />
          </Field>

          <Field label="Exercise options (users pick one per session)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {EXERCISE_OPTION_CATALOG.map((opt) => {
                const checked = form.exercise_option_ids.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: `1px solid ${checked ? colors.accent : colors.border}`,
                      background: checked ? colors.accentDim : 'transparent',
                      color: checked ? colors.accent : colors.text,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          exercise_option_ids: e.target.checked
                            ? [...f.exercise_option_ids, opt.id]
                            : f.exercise_option_ids.filter((x) => x !== opt.id),
                        }))
                      }
                      style={{ accentColor: colors.accent }}
                    />
                    <span style={{ fontSize: 16 }}>{opt.emoji}</span>
                    {opt.name}
                  </label>
                );
              })}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Reps / day">
              <TextInput
                type="number"
                min={1}
                value={form.reps_per_day}
                onChange={(e) => setForm((f) => ({ ...f, reps_per_day: e.target.value }))}
                required
              />
            </Field>
            <Field label="Total days">
              <TextInput
                type="number"
                min={1}
                value={form.total_days}
                onChange={(e) => setForm((f) => ({ ...f, total_days: e.target.value }))}
                required
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Field label="Reward amount">
              <TextInput
                type="number"
                step="0.01"
                min={0}
                value={form.reward_amount}
                onChange={(e) => setForm((f) => ({ ...f, reward_amount: e.target.value }))}
                required
              />
            </Field>
            <Field label="Currency">
              <Select
                value={form.reward_currency}
                onChange={(e) => setForm((f) => ({ ...f, reward_currency: e.target.value }))}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="POINTS">POINTS</option>
              </Select>
            </Field>
            <Field label="Max participants (blank = ∞)">
              <TextInput
                type="number"
                min={1}
                value={form.max_participants}
                onChange={(e) => setForm((f) => ({ ...f, max_participants: e.target.value }))}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Field label="Required tier">
              <Select
                value={form.required_tier}
                onChange={(e) => setForm((f) => ({ ...f, required_tier: e.target.value as MoneyChallengeTier }))}
              >
                <option value="free">free</option>
                <option value="pro">pro</option>
                <option value="elite">elite</option>
              </Select>
            </Field>
            <Field label="Sort order">
              <TextInput
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              />
            </Field>
            <Field label="Active">
              <Select
                value={form.is_active ? 'true' : 'false'}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === 'true' }))}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Starts at (optional)">
              <TextInput
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
              />
            </Field>
            <Field label="Ends at (optional)">
              <TextInput
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
              />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create challenge'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
