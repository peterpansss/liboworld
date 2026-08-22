import { useEffect, useMemo, useRef, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, TextArea, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import { safeUrl } from '../../utils/safeUrl';
import {
  listChallengeEnrollments,
  type ChallengeEnrollmentRow,
  listMoneyChallenges,
  createMoneyChallenge,
  updateMoneyChallenge,
  // Destructive op goes through the *WithReauth wrapper so
  // requireRecentAuth() can challenge the operator before delete.
  deleteMoneyChallengeWithReauth as deleteMoneyChallenge,
  uploadGiveawayImage,
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
  required_tier: MoneyChallengeTier; // the tier band: free = Free-only, paid = that tier and up
  is_active: boolean;
  sort_order: string;
  image_url: string;
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
  image_url: '',
};

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
    // Prefer the gate column (min_tier); fall back to legacy required_tier.
    required_tier: row.min_tier ?? row.required_tier,
    is_active: row.is_active,
    sort_order: String(row.sort_order),
    image_url: row.image_url ?? '',
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
    // The tier selector sets a MINIMUM tier only — never a maximum.
    // A paying member must always see everything a free member sees, plus
    // more; capping the band made Premium feel like *less* than Free (a Pro
    // member was locked out of the free challenge). See canon
    // REWARDS-ECONOMY-RULES.md §7.4.
    //
    // max_tier stays NULL. It is deliberately not written here: this function
    // previously set max_tier = required_tier, so any save — even an unrelated
    // one like a title tweak — silently re-locked the challenge to a single
    // tier. The column still exists and the server still honours a non-null
    // value; it is simply never set from the admin panel.
    //
    // Slot crowding (paying members consuming free seats) is handled by sizing
    // max_participants for the combined population, not by exclusion.
    required_tier: f.required_tier,
    min_tier: f.required_tier,
    max_tier: null,
    is_active: f.is_active,
    sort_order: Number(f.sort_order) || 0,
    image_url: f.image_url.trim() || null,
  };
}

// ── page ──────────────────────────────────────────────────────────────────

export function ChallengesPage() {
  const [rows, setRows] = useState<MoneyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Participants (who is on this challenge, across all their cycles)
  const [partRow, setPartRow] = useState<MoneyChallenge | null>(null);
  const [parts, setParts] = useState<ChallengeEnrollmentRow[] | null>(null);
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsErr, setPartsErr] = useState<string | null>(null);
  const [partsActiveOnly, setPartsActiveOnly] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Upload a JPG/PNG directly instead of pasting a URL. The file is resized,
  // pushed to Supabase Storage, and the resulting public URL is written into
  // the same image_url field the manual input edits.
  const handleUpload = async (file: File) => {
    setUploading(true);
    setFormErr(null);
    try {
      const url = await uploadGiveawayImage(file);
      setForm((f) => ({ ...f, image_url: url }));
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
    if (saving || uploading) return;
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

  /**
   * Open the "New challenge" modal pre-filled with the source row's fields.
   * The ID is cleared (admin must pick a new unique slug — `id` is the PK and
   * can't be auto-generated) and the duplicate starts Inactive so a live
   * challenge isn't accidentally cloned into another live one. editingId=null
   * so handleSave hits createMoneyChallenge.
   */
  const handleDuplicate = (row: MoneyChallenge, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    const maxSort = rows.reduce((m, r) => Math.max(m, r.sort_order ?? 0), 0);
    setForm({
      ...rowToForm(row),
      id: '', // PK is required at create — admin must pick a new unique slug
      title: `${row.title} (copy)`,
      is_active: false, // never auto-go-live on duplicate
      sort_order: String(maxSort + 1), // park at the end
    });
    setFormErr(null);
    setModalOpen(true);
  };

  const openParticipants = async (row: MoneyChallenge, activeOnly = true) => {
    setPartRow(row);
    setParts(null);
    setPartsErr(null);
    setPartsActiveOnly(activeOnly);
    setPartsLoading(true);
    try {
      setParts(await listChallengeEnrollments(row.id, activeOnly ? 'active' : null));
    } catch (e) {
      setPartsErr(e instanceof Error ? e.message : 'Failed to load participants');
    } finally {
      setPartsLoading(false);
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
        width: 116,
        render: (r) => (
          <div style={{ display: 'inline-flex', gap: 4 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                void openParticipants(r);
              }}
              aria-label={`Participants in ${r.title}`}
              title="Who is enrolled"
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.muted,
                cursor: 'pointer',
                fontSize: 14,
                padding: '4px 6px',
                borderRadius: 6,
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = colors.accent;
                (e.currentTarget as HTMLButtonElement).style.background = colors.accentDim;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = colors.muted;
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              &#9679;&#9679;&#9679;
            </button>
            <button
              onClick={(e) => handleDuplicate(r, e)}
              aria-label={`Duplicate ${r.title}`}
              title="Duplicate challenge"
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.muted,
                cursor: 'pointer',
                fontSize: 14,
                padding: '4px 6px',
                borderRadius: 6,
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = colors.accent;
                (e.currentTarget as HTMLButtonElement).style.background = colors.accentDim;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = colors.muted;
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              ⎘
            </button>
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
          </div>
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
            Reusable challenge templates — schedule actual runs under Cycles.
          </div>
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
        open={!!partRow}
        onClose={() => setPartRow(null)}
        title={partRow ? `Participants — ${partRow.title}` : 'Participants'}
        width={860}
      >
        {partRow && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ color: colors.muted, fontSize: 13 }}>
                {partsLoading
                  ? 'Loading…'
                  : `${parts?.length ?? 0} ${partsActiveOnly ? 'active' : 'total'} · cap ${partRow.max_participants ?? 'unlimited'}`}
              </span>
              <button
                type="button"
                onClick={() => void openParticipants(partRow, !partsActiveOnly)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {partsActiveOnly ? 'Show all statuses' : 'Show active only'}
              </button>
            </div>

            {partsErr && <div style={{ color: colors.error, fontSize: 13, marginBottom: 10 }}>{partsErr}</div>}

            {!partsLoading && parts && parts.length === 0 && (
              <div style={{ color: colors.dim, fontSize: 13, padding: '18px 0' }}>
                Nobody is enrolled{partsActiveOnly ? ' right now' : ''}.
              </div>
            )}

            {parts && parts.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: colors.muted, textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Email</th>
                      <th style={{ padding: '6px 8px' }}>Status</th>
                      <th style={{ padding: '6px 8px' }}>Tier at enrol</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Days</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Freezes</th>
                      <th style={{ padding: '6px 8px' }}>Enrolled</th>
                      <th style={{ padding: '6px 8px' }}>Ends</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((p) => (
                      <tr key={p.enrollment_id} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '6px 8px', color: colors.text }}>
                          {p.email ?? p.user_id.slice(0, 8)}
                        </td>
                        <td style={{ padding: '6px 8px', color: colors.muted }}>
                          {p.status}
                          {p.removed_reason ? ` (${p.removed_reason})` : ''}
                        </td>
                        <td style={{ padding: '6px 8px', color: colors.muted }}>{p.tier_at_enrollment}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: colors.text }}>
                          {p.completed_days}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: colors.muted }}>
                          {p.freeze_tokens_remaining ?? 0}
                        </td>
                        <td style={{ padding: '6px 8px', color: colors.muted }}>
                          {p.enrolled_at ? new Date(p.enrolled_at).toISOString().slice(0, 10) : '—'}
                        </td>
                        <td style={{ padding: '6px 8px', color: colors.muted }}>
                          {p.effective_end_date ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

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
            <Field
              label="Required tier"
              hint="Challenge is exclusive to this tier — free = Free members only, pro = Pro members only."
            >
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

          <Field
            label="Hero image (optional)"
            hint="Upload a JPG/PNG or paste a URL. Square preferred — card swaps to photographic mode when set. Blank shows the gradient fallback."
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {safeUrl(form.image_url) ? (
                <img
                  src={safeUrl(form.image_url) as string}
                  alt="preview"
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 10,
                    objectFit: 'cover',
                    background: colors.bg3,
                    border: `1px solid ${colors.border}`,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 10,
                    background: colors.bg3,
                    border: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.muted,
                    fontSize: 11,
                  }}
                >
                  No image
                </div>
              )}
              <div style={{ flex: 1 }}>
                <TextInput
                  type="text"
                  placeholder="https://… (leave empty for gradient fallback)"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUpload(f);
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : 'Upload image'}
                  </Button>
                  {form.image_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setForm((f) => ({ ...f, image_url: '' }))}
                      disabled={uploading}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Field>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button type="button" variant="ghost" onClick={closeModal} disabled={saving || uploading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving || uploading}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create challenge'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
