import { useEffect, useMemo, useRef, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import {
  listGiveawayTemplates,
  createGiveawayTemplate,
  updateGiveawayTemplate,
  deleteGiveawayTemplate,
  uploadGiveawayImage,
  type GiveawayTemplate,
  type GiveawayTemplateInput,
  type GiveawayTemplateType,
} from '../../lib/adminApi';
import { safeUrl } from '../../utils/safeUrl';

const TYPE_OPTIONS: GiveawayTemplateType[] = ['common', 'premium', 'elite'];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

function typeChipStyle(type: GiveawayTemplateType): React.CSSProperties {
  let bg: string = colors.bg3;
  let fg: string = colors.muted;
  if (type === 'premium') {
    bg = colors.accentDim;
    fg = colors.accent;
  } else if (type === 'elite') {
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

// draw_time_utc comes back as HH:MM:SS or HH:MM — normalise to HH:MM for the input.
function normaliseTime(value: string | null | undefined): string {
  if (!value) return '';
  const parts = value.split(':');
  if (parts.length < 2) return '';
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

function toTimeForDb(value: string): string {
  const v = normaliseTime(value);
  return v.length === 5 ? `${v}:00` : value;
}

type FormState = {
  title: string;
  subtitle: string;
  prize_description: string;
  prize_image_url: string;
  image_url: string;
  type: GiveawayTemplateType;
  day_of_week: string;
  draw_time_utc: string;
  duration_days: string;
  tickets_per_entry: string;
  max_entries_per_user: string;
  winner_count: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  title: '',
  subtitle: '',
  prize_description: '',
  prize_image_url: '',
  image_url: '',
  type: 'common',
  day_of_week: '1', // Monday
  draw_time_utc: '18:00',
  duration_days: '7',
  tickets_per_entry: '1',
  max_entries_per_user: '',
  winner_count: '1',
  active: true,
};

function rowToForm(row: GiveawayTemplate): FormState {
  return {
    title: row.title,
    subtitle: row.subtitle ?? '',
    prize_description: row.prize_description,
    prize_image_url: row.prize_image_url ?? '',
    image_url: row.image_url ?? '',
    type: row.type,
    day_of_week: String(row.day_of_week),
    draw_time_utc: normaliseTime(row.draw_time_utc),
    duration_days: String(row.duration_days),
    tickets_per_entry: String(row.tickets_per_entry),
    max_entries_per_user: row.max_entries_per_user == null ? '' : String(row.max_entries_per_user),
    winner_count: String(row.winner_count),
    active: row.active,
  };
}

function formToInput(form: FormState): GiveawayTemplateInput {
  return {
    title: form.title.trim(),
    subtitle: form.subtitle.trim() ? form.subtitle.trim() : null,
    prize_description: form.prize_description.trim(),
    prize_image_url: form.prize_image_url.trim() ? form.prize_image_url.trim() : null,
    image_url: form.image_url.trim() ? form.image_url.trim() : null,
    type: form.type,
    day_of_week: Number(form.day_of_week),
    draw_time_utc: toTimeForDb(form.draw_time_utc),
    duration_days: Number(form.duration_days) || 1,
    tickets_per_entry: Number(form.tickets_per_entry) || 1,
    max_entries_per_user: form.max_entries_per_user.trim() ? Number(form.max_entries_per_user) : null,
    winner_count: Number(form.winner_count) || 1,
    active: form.active,
  };
}

export function GiveawayTemplatesPage() {
  const [rows, setRows] = useState<GiveawayTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GiveawayTemplate | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPrize, setUploadingPrize] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const prizeFileInputRef = useRef<HTMLInputElement | null>(null);
  const headerFileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    setLoading(true);
    setListError(null);
    try {
      const list = await listGiveawayTemplates();
      setRows(list);
    } catch (err) {
      setListError((err as Error).message ?? 'Failed to load templates');
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
    setModalOpen(true);
  };

  const openEdit = (row: GiveawayTemplate) => {
    setEditing(row);
    setForm(rowToForm(row));
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving || uploadingPrize || uploadingHeader) return;
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleUpload = async (file: File, slot: 'prize' | 'header') => {
    if (slot === 'prize') setUploadingPrize(true);
    else setUploadingHeader(true);
    setFormError(null);
    try {
      const url = await uploadGiveawayImage(file);
      setForm((f) => (slot === 'prize' ? { ...f, prize_image_url: url } : { ...f, image_url: url }));
    } catch (err) {
      setFormError((err as Error).message ?? 'Upload failed');
    } finally {
      if (slot === 'prize') {
        setUploadingPrize(false);
        if (prizeFileInputRef.current) prizeFileInputRef.current.value = '';
      } else {
        setUploadingHeader(false);
        if (headerFileInputRef.current) headerFileInputRef.current.value = '';
      }
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
    if (!form.draw_time_utc) {
      setFormError('Draw time is required.');
      return;
    }
    const dow = Number(form.day_of_week);
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
      setFormError('Day of week must be 0 (Sun) through 6 (Sat).');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const input = formToInput(form);
      if (editing) {
        await updateGiveawayTemplate(editing.id, input);
      } else {
        await createGiveawayTemplate(input);
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

  const handleDelete = async (row: GiveawayTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete template "${row.title}"? This cannot be undone.`)) return;
    try {
      await deleteGiveawayTemplate(row.id);
      await refresh();
    } catch (err) {
      setListError((err as Error).message ?? 'Delete failed');
    }
  };

  const handleToggleActive = async (row: GiveawayTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateGiveawayTemplate(row.id, { active: !row.active });
      await refresh();
    } catch (err) {
      setListError((err as Error).message ?? 'Toggle failed');
    }
  };

  const columns: Column<GiveawayTemplate>[] = useMemo(
    () => [
      {
        key: 'title',
        header: 'Title',
        render: (r) => {
          const safePrizeImg = safeUrl(r.prize_image_url);
          return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {safePrizeImg ? (
              <img
                src={safePrizeImg}
                alt=""
                style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', background: colors.bg3 }}
              />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 8, background: colors.bg3 }} />
            )}
            <div>
              <div style={{ fontWeight: 600, color: colors.text }}>{r.title}</div>
              <div style={{ fontSize: 11, color: colors.muted }}>{r.prize_description}</div>
            </div>
          </div>
          );
        },
        sort: (a, b) => a.title.localeCompare(b.title),
      },
      {
        key: 'type',
        header: 'Type',
        render: (r) => <span style={typeChipStyle(r.type)}>{r.type}</span>,
        sort: (a, b) => a.type.localeCompare(b.type),
      },
      {
        key: 'day_of_week',
        header: 'Day',
        render: (r) => <span style={{ color: colors.text }}>{DAY_LABELS[r.day_of_week] ?? '—'}</span>,
        sort: (a, b) => a.day_of_week - b.day_of_week,
      },
      {
        key: 'draw_time_utc',
        header: 'Draw Time (UTC)',
        render: (r) => <span style={{ color: colors.muted, fontFamily: 'monospace' }}>{normaliseTime(r.draw_time_utc)}</span>,
        sort: (a, b) => a.draw_time_utc.localeCompare(b.draw_time_utc),
      },
      {
        key: 'winner_count',
        header: 'Winners',
        align: 'right',
        render: (r) => r.winner_count,
        sort: (a, b) => a.winner_count - b.winner_count,
      },
      {
        key: 'duration_days',
        header: 'Duration (d)',
        align: 'right',
        render: (r) => r.duration_days,
        sort: (a, b) => a.duration_days - b.duration_days,
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
        sort: (a, b) => Number(b.active) - Number(a.active),
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
            title="Delete template"
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
        <h1 style={h1Style}>Giveaway Templates</h1>
        <Button variant="primary" onClick={openCreate}>+ New template</Button>
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

      <DataTable<GiveawayTemplate>
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => openEdit(r)}
        emptyLabel={loading ? 'Loading…' : 'No templates yet. Create the first one.'}
      />

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit template' : 'New template'} width={720}>
        <form onSubmit={handleSave}>
          <Field label="Title">
            <TextInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Weekly Whey Drop"
              required
            />
          </Field>

          <Field label="Subtitle" hint="Optional short tagline shown under the title.">
            <TextInput
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="e.g. Every Monday 6pm"
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

          <Field label="Prize image" hint="Used as the main card thumbnail (square crop).">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {safeUrl(form.prize_image_url) ? (
                <img
                  src={safeUrl(form.prize_image_url) as string}
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
                  value={form.prize_image_url}
                  onChange={(e) => setForm({ ...form, prize_image_url: e.target.value })}
                  placeholder="https://…"
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    ref={prizeFileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUpload(f, 'prize');
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => prizeFileInputRef.current?.click()}
                    disabled={uploadingPrize}
                  >
                    {uploadingPrize ? 'Uploading…' : 'Upload prize image'}
                  </Button>
                  {form.prize_image_url && (
                    <Button type="button" variant="ghost" onClick={() => setForm({ ...form, prize_image_url: '' })}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Field>

          <Field label="Header / hero image" hint="Optional wide banner shown on the detail screen.">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {safeUrl(form.image_url) ? (
                <img
                  src={safeUrl(form.image_url) as string}
                  alt="preview"
                  style={{
                    width: 160,
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
                    width: 160,
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
                    ref={headerFileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUpload(f, 'header');
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => headerFileInputRef.current?.click()}
                    disabled={uploadingHeader}
                  >
                    {uploadingHeader ? 'Uploading…' : 'Upload header image'}
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
                onChange={(e) => setForm({ ...form, type: e.target.value as GiveawayTemplateType })}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Day of week">
              <Select
                value={form.day_of_week}
                onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
              >
                {DAY_LONG.map((label, idx) => (
                  <option key={idx} value={String(idx)}>{idx} — {label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Draw time (UTC)" hint="24-hour HH:MM.">
              <TextInput
                type="time"
                value={form.draw_time_utc}
                onChange={(e) => setForm({ ...form, draw_time_utc: e.target.value })}
                required
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <Field label="Duration (days)">
              <TextInput
                type="number"
                min={1}
                value={form.duration_days}
                onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
              />
            </Field>
            <Field label="Tickets / entry">
              <TextInput
                type="number"
                min={1}
                value={form.tickets_per_entry}
                onChange={(e) => setForm({ ...form, tickets_per_entry: e.target.value })}
              />
            </Field>
            <Field label="Max entries / user" hint="Blank = unlimited.">
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
              Active (scheduler will spawn live giveaways from this template)
            </label>
          </Field>

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
            <Button type="submit" variant="primary" disabled={saving || uploadingPrize || uploadingHeader}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create template'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
