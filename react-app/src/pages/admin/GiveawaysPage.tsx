import { useEffect, useMemo, useRef, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, TextArea, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import {
  listGiveaways,
  createGiveaway,
  updateGiveaway,
  deleteGiveaway,
  drawGiveawayWinners,
  uploadGiveawayImage,
  listGiveawayWinners,
  type Giveaway,
  type GiveawayInput,
} from '../../lib/adminApi';
import { safeUrl } from '../../utils/safeUrl';

type Row = Giveaway & { entry_count: number };

const STATUS_OPTIONS: Giveaway['status'][] = ['upcoming', 'active', 'drawing', 'completed'];
const TYPE_OPTIONS: Giveaway['type'][] = ['common', 'premium', 'elite'];
const CATEGORY_OPTIONS: Giveaway['category'][] = ['win', 'buy'];

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

function statusChipStyle(status: Giveaway['status']): React.CSSProperties {
  let bg: string = colors.bg3;
  let fg: string = colors.muted;
  if (status === 'active') {
    bg = colors.accentDim;
    fg = colors.accent;
  } else if (status === 'upcoming') {
    bg = colors.warningDim;
    fg = colors.warning;
  } else if (status === 'completed') {
    bg = colors.successDim;
    fg = colors.success;
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

function fromLocalDateTimeInput(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

function formatDateCell(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type FormState = {
  title: string;
  description: string;
  prize_description: string;
  image_url: string;
  type: Giveaway['type'];
  category: Giveaway['category'];
  status: Giveaway['status'];
  tickets_per_entry: string;
  max_entries_per_user: string;
  winner_count: string;
  starts_at: string;
  ends_at: string;
  featured: boolean;
};

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  prize_description: '',
  image_url: '',
  type: 'common',
  category: 'win',
  status: 'upcoming',
  tickets_per_entry: '1',
  max_entries_per_user: '',
  winner_count: '1',
  starts_at: '',
  ends_at: '',
  featured: false,
};

function rowToForm(row: Giveaway): FormState {
  return {
    title: row.title,
    description: row.description ?? '',
    prize_description: row.prize_description,
    image_url: row.image_url ?? '',
    type: row.type,
    category: row.category,
    status: row.status,
    tickets_per_entry: String(row.tickets_per_entry),
    max_entries_per_user: row.max_entries_per_user == null ? '' : String(row.max_entries_per_user),
    winner_count: String(row.winner_count),
    starts_at: toLocalDateTimeInput(row.starts_at),
    ends_at: toLocalDateTimeInput(row.ends_at),
    featured: !!row.featured,
  };
}

function formToInput(form: FormState): GiveawayInput {
  return {
    title: form.title.trim(),
    description: form.description.trim() ? form.description.trim() : null,
    prize_description: form.prize_description.trim(),
    image_url: form.image_url.trim() ? form.image_url.trim() : null,
    type: form.type,
    category: form.category,
    status: form.status,
    tickets_per_entry: Number(form.tickets_per_entry) || 0,
    max_entries_per_user: form.max_entries_per_user.trim() ? Number(form.max_entries_per_user) : null,
    winner_count: Number(form.winner_count) || 1,
    starts_at: fromLocalDateTimeInput(form.starts_at),
    ends_at: fromLocalDateTimeInput(form.ends_at),
    featured: form.featured,
  };
}

export function GiveawaysPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [winners, setWinners] = useState<unknown[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    setLoading(true);
    setListError(null);
    try {
      const list = await listGiveaways();
      setRows(list);
    } catch (err) {
      setListError((err as Error).message ?? 'Failed to load giveaways');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormMessage(null);
    setWinners(null);
    setModalOpen(true);
  };

  const openEdit = async (row: Row) => {
    setEditing(row);
    setForm(rowToForm(row));
    setFormError(null);
    setFormMessage(null);
    setWinners(null);
    setModalOpen(true);
    if (row.status === 'completed') {
      try {
        const w = await listGiveawayWinners(row.id);
        setWinners(w);
      } catch {
        // Non-fatal — winners panel just stays empty.
      }
    }
  };

  const closeModal = () => {
    if (saving || uploading || drawing) return;
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormMessage(null);
    setWinners(null);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setFormError(null);
    try {
      const url = await uploadGiveawayImage(file);
      setForm((f) => ({ ...f, image_url: url }));
    } catch (err) {
      setFormError((err as Error).message ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!form.prize_description.trim()) {
      setFormError('Prize description is required.');
      return;
    }
    if (!form.starts_at || !form.ends_at) {
      setFormError('Start and end dates are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const input = formToInput(form);
      if (editing) {
        await updateGiveaway(editing.id, input);
      } else {
        await createGiveaway(input);
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

  const handleDraw = async () => {
    if (!editing) return;
    if (editing.status === 'completed') return;
    if (!window.confirm(`Draw ${editing.winner_count} winner(s) for "${editing.title}"? This cannot be undone.`)) return;
    setDrawing(true);
    setFormError(null);
    setFormMessage(null);
    try {
      const n = await drawGiveawayWinners(editing.id);
      setFormMessage(`Drew ${n} winner${n === 1 ? '' : 's'}.`);
      await refresh();
      // Reload the winners list into the panel for the currently open giveaway.
      try {
        const w = await listGiveawayWinners(editing.id);
        setWinners(w);
      } catch {
        // ignore
      }
    } catch (err) {
      setFormError((err as Error).message ?? 'Draw failed');
    } finally {
      setDrawing(false);
    }
  };

  const handleDelete = async (row: Row, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete giveaway "${row.title}"? This cannot be undone.`)) return;
    try {
      await deleteGiveaway(row.id);
      await refresh();
    } catch (err) {
      setListError((err as Error).message ?? 'Delete failed');
    }
  };

  const columns: Column<Row>[] = useMemo(
    () => [
      {
        key: 'title',
        header: 'Title',
        render: (r) => {
          const safeImg = safeUrl(r.image_url);
          return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {safeImg ? (
              <img
                src={safeImg}
                alt=""
                style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', background: colors.bg3 }}
              />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 8, background: colors.bg3 }} />
            )}
            <div>
              <div style={{ fontWeight: 600, color: colors.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                {r.title}
                {r.featured && (
                  <span
                    title="Headlines the public /giveaway funnel"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: colors.accentDim,
                      color: colors.accent,
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    ★ Featured
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: colors.muted }}>{r.prize_description}</div>
            </div>
          </div>
          );
        },
        sort: (a, b) => a.title.localeCompare(b.title),
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => <span style={statusChipStyle(r.status)}>{r.status}</span>,
        sort: (a, b) => a.status.localeCompare(b.status),
      },
      {
        key: 'type',
        header: 'Type',
        render: (r) => <span style={{ color: colors.muted, textTransform: 'capitalize' }}>{r.type}</span>,
        sort: (a, b) => a.type.localeCompare(b.type),
      },
      {
        key: 'tickets_per_entry',
        header: 'Tickets/entry',
        align: 'right',
        render: (r) => r.tickets_per_entry,
        sort: (a, b) => a.tickets_per_entry - b.tickets_per_entry,
      },
      {
        key: 'winner_count',
        header: 'Winners',
        align: 'right',
        render: (r) => r.winner_count,
        sort: (a, b) => a.winner_count - b.winner_count,
      },
      {
        key: 'entry_count',
        header: 'Entries',
        align: 'right',
        render: (r) => r.entry_count,
        sort: (a, b) => a.entry_count - b.entry_count,
      },
      {
        key: 'starts_at',
        header: 'Starts',
        render: (r) => <span style={{ color: colors.muted, fontSize: 12 }}>{formatDateCell(r.starts_at)}</span>,
        sort: (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      },
      {
        key: 'ends_at',
        header: 'Ends',
        render: (r) => <span style={{ color: colors.muted, fontSize: 12 }}>{formatDateCell(r.ends_at)}</span>,
        sort: (a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime(),
      },
      {
        key: 'actions',
        header: '',
        width: 48,
        align: 'right',
        render: (r) => (
          <button
            onClick={(e) => void handleDelete(r, e)}
            aria-label={`Delete ${r.title}`}
            title="Delete giveaway"
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
        <h1 style={h1Style}>Giveaways</h1>
        <Button variant="primary" onClick={openCreate}>+ New giveaway</Button>
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

      <DataTable<Row>
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => void openEdit(r)}
        emptyLabel={loading ? 'Loading…' : 'No giveaways yet. Create the first one.'}
      />

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit giveaway' : 'New giveaway'} width={720}>
        <form onSubmit={handleSave}>
          <Field label="Title">
            <TextInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. April Protein Powder Drop"
              required
            />
          </Field>

          <Field label="Prize description">
            <TextInput
              value={form.prize_description}
              onChange={(e) => setForm({ ...form, prize_description: e.target.value })}
              placeholder="e.g. 1kg tub of Whey Protein"
              required
            />
          </Field>

          <Field label="Description" hint="Optional long-form copy shown on the giveaway detail screen.">
            <TextArea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </Field>

          <Field label="Image">
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
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://…"
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUpload(f);
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? 'Uploading…' : 'Upload image'}
                  </Button>
                  {form.image_url && (
                    <Button type="button" variant="ghost" onClick={() => setForm({ ...form, image_url: '' })}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Type">
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as Giveaway['type'] })}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Giveaway['category'] })}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Giveaway['status'] })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Tickets per entry">
              <TextInput
                type="number"
                min={0}
                value={form.tickets_per_entry}
                onChange={(e) => setForm({ ...form, tickets_per_entry: e.target.value })}
              />
            </Field>
            <Field label="Max entries per user" hint="Leave blank for unlimited.">
              <TextInput
                type="number"
                min={1}
                value={form.max_entries_per_user}
                onChange={(e) => setForm({ ...form, max_entries_per_user: e.target.value })}
                placeholder="Unlimited"
              />
            </Field>
            <Field label="Winner count">
              <TextInput
                type="number"
                min={1}
                value={form.winner_count}
                onChange={(e) => setForm({ ...form, winner_count: e.target.value })}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Starts at">
              <TextInput
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                required
              />
            </Field>
            <Field label="Ends at">
              <TextInput
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                required
              />
            </Field>
          </div>

          <Field
            label="Featured on /giveaway funnel"
            hint="When ON, this giveaway is the headline prize on the public liboworld.com/giveaway funnel page. Only one active giveaway can be featured at a time — flipping a new one ON automatically unmarks any previously featured giveaway."
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 10,
                border: `1px solid ${form.featured ? colors.accent : colors.border}`,
                background: form.featured ? colors.accentDim : colors.bg3,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: colors.accent,
                  cursor: 'pointer',
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: form.featured ? colors.accent : colors.text,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {form.featured ? 'Featured · headlines public funnel' : 'Not featured'}
              </span>
            </label>
          </Field>

          {editing && editing.status === 'completed' && winners && winners.length > 0 && (
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
                  marginBottom: 6,
                }}
              >
                Winners ({winners.length})
              </div>
              <div style={{ fontSize: 12, color: colors.text, fontFamily: 'monospace' }}>
                {winners.map((w, i) => (
                  <div key={i}>{JSON.stringify(w)}</div>
                ))}
              </div>
            </div>
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

          {formMessage && (
            <div
              style={{
                padding: 10,
                marginBottom: 12,
                background: colors.successDim,
                color: colors.success,
                borderRadius: 10,
                border: `1px solid ${colors.success}`,
                fontSize: 13,
              }}
            >
              {formMessage}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
              paddingTop: 16,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <div>
              {editing && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDraw}
                  disabled={editing.status === 'completed' || drawing || saving}
                >
                  {drawing ? 'Drawing…' : editing.status === 'completed' ? 'Winners drawn' : 'Draw winners'}
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving || uploading}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create giveaway'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
