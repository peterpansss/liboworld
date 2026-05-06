import { useEffect, useMemo, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import {
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  listWorkouts,
  type ProgramRow,
  type WorkoutRow,
  type ContentStatus,
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

// ── chips ─────────────────────────────────────────────────────────────────

function statusStyle(status: ContentStatus): React.CSSProperties {
  if (status === 'published') return { background: colors.successDim, color: colors.success };
  if (status === 'archived') return { background: colors.bg3, color: colors.muted };
  return { background: colors.warningDim, color: colors.warning };
}

function StatusChip({ status }: { status: ContentStatus }) {
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
        ...statusStyle(status),
      }}
    >
      {status}
    </span>
  );
}

// ── form types ────────────────────────────────────────────────────────────

type ProgramCat = 'gym' | 'home' | 'mobility';

type DayBlock = {
  /** null = rest day */
  workout_id: string | null;
  /** denormalised name for display when workout was deleted/renamed */
  workout_name: string;
};

type FormState = {
  id: string;
  name: string;
  slug: string;
  slugTouched: boolean;
  cat: ProgramCat;
  subcat: string;
  dur: string;
  diff: 'beginner' | 'intermediate' | 'advanced';
  emoji: string;
  days: string;
  status: 'draft' | 'published';
  blocks: DayBlock[];
};

const EMPTY_FORM: FormState = {
  id: '',
  name: '',
  slug: '',
  slugTouched: false,
  cat: 'gym',
  subcat: '',
  dur: '',
  diff: 'beginner',
  emoji: '🏋️',
  days: '7',
  status: 'draft',
  blocks: Array.from({ length: 7 }, () => ({ workout_id: null, workout_name: '' })),
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function rebuildBlocks(prev: DayBlock[], nextLen: number): DayBlock[] {
  if (nextLen <= prev.length) return prev.slice(0, nextLen);
  const extra = Array.from({ length: nextLen - prev.length }, () => ({
    workout_id: null as string | null,
    workout_name: '',
  }));
  return [...prev, ...extra];
}

function rowToForm(row: ProgramRow): FormState {
  const blocksRaw = Array.isArray(row.blocks) ? row.blocks : [];
  const blocks: DayBlock[] = Array.from({ length: row.days || blocksRaw.length || 1 }, (_, i) => {
    const b = blocksRaw[i] as { workout_id?: string | null; workout_name?: string } | undefined;
    return {
      workout_id: b?.workout_id ?? null,
      workout_name: b?.workout_name ?? '',
    };
  });
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    slugTouched: true,
    cat: ((row.cat ?? 'gym') as ProgramCat),
    subcat: row.subcat ?? '',
    dur: row.dur != null ? String(row.dur) : '',
    diff: ((row.diff ?? 'beginner') as FormState['diff']),
    emoji: row.emoji || '🏋️',
    days: String(row.days || 1),
    status: row.status === 'published' ? 'published' : 'draft',
    blocks,
  };
}

function formToPayload(f: FormState): Partial<ProgramRow> {
  const days = Math.max(1, Number(f.days) || 1);
  const blocks = f.blocks.slice(0, days).map((b, i) => ({
    day: i + 1,
    workout_id: b.workout_id,
    workout_name: b.workout_name,
  }));
  return {
    name: f.name.trim(),
    slug: (f.slug || slugify(f.name)).trim(),
    cat: f.cat,
    subcat: f.subcat.trim() || null,
    dur: f.dur.trim() ? Number(f.dur) : null,
    diff: f.diff,
    emoji: f.emoji.trim() || '🏋️',
    days,
    blocks,
    status: f.status,
  };
}

// ── page ──────────────────────────────────────────────────────────────────

export function ProgramsPage() {
  const [rows, setRows] = useState<ProgramRow[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
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
      const [progs, wks] = await Promise.all([listPrograms(), listWorkouts()]);
      setRows(progs);
      setWorkouts(wks);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load programs');
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

  const openEdit = (row: ProgramRow) => {
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
    if (!form.name.trim()) {
      setFormErr('Name is required.');
      return;
    }
    if (!form.slug.trim()) {
      setFormErr('Slug is required.');
      return;
    }
    const days = Number(form.days);
    if (!Number.isInteger(days) || days < 1) {
      setFormErr('Days must be an integer ≥ 1.');
      return;
    }
    setSaving(true);
    setFormErr(null);
    try {
      const payload = formToPayload(form);
      const res = editingId
        ? await updateProgram(editingId, payload)
        : await createProgram(payload);
      if (!res.ok) {
        setFormErr(res.error ?? 'Save failed');
        return;
      }
      await refresh();
      closeModal();
    } catch (e2) {
      setFormErr(e2 instanceof Error ? e2.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: ProgramRow) => {
    if (!confirm(`Archive "${row.name}"? It will be hidden from users but kept in the database.`)) {
      return;
    }
    try {
      const res = await deleteProgram(row.id);
      if (!res.ok) {
        setErr(res.error ?? 'Delete failed');
        return;
      }
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const columns: Column<ProgramRow>[] = useMemo(
    () => [
      {
        key: 'emoji',
        header: '',
        width: 48,
        render: (r) => <span style={{ fontSize: 22 }}>{r.emoji || '•'}</span>,
      },
      {
        key: 'name',
        header: 'Name',
        render: (r) => (
          <div>
            <div style={{ fontWeight: 600, color: colors.text }}>{r.name}</div>
            <div style={{ color: colors.dim, fontSize: 11, marginTop: 2 }}>{r.slug}</div>
          </div>
        ),
        sort: (a, b) => a.name.localeCompare(b.name),
      },
      {
        key: 'cat',
        header: 'Cat',
        width: 90,
        render: (r) => <span style={{ color: colors.muted }}>{r.cat ?? '—'}</span>,
        sort: (a, b) => (a.cat ?? '').localeCompare(b.cat ?? ''),
      },
      {
        key: 'subcat',
        header: 'Subcat',
        width: 130,
        render: (r) => <span style={{ color: colors.muted }}>{r.subcat ?? '—'}</span>,
        sort: (a, b) => (a.subcat ?? '').localeCompare(b.subcat ?? ''),
      },
      {
        key: 'days',
        header: 'Days',
        width: 70,
        align: 'right',
        render: (r) => <span style={bigNum}>{r.days}</span>,
        sort: (a, b) => a.days - b.days,
      },
      {
        key: 'dur',
        header: 'Dur',
        width: 80,
        align: 'right',
        render: (r) => (
          <span style={bigNum}>{r.dur != null ? `${r.dur}m` : '—'}</span>
        ),
        sort: (a, b) => (a.dur ?? 0) - (b.dur ?? 0),
      },
      {
        key: 'diff',
        header: 'Diff',
        width: 110,
        render: (r) => (
          <span style={{ color: colors.muted, textTransform: 'capitalize' }}>{r.diff ?? '—'}</span>
        ),
        sort: (a, b) => (a.diff ?? '').localeCompare(b.diff ?? ''),
      },
      {
        key: 'status',
        header: 'Status',
        width: 110,
        render: (r) => <StatusChip status={r.status} />,
        sort: (a, b) => a.status.localeCompare(b.status),
      },
      {
        key: 'updated_at',
        header: 'Updated',
        width: 120,
        render: (r) => (
          <span style={{ color: colors.muted, fontSize: 12 }}>
            {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : '—'}
          </span>
        ),
        sort: (a, b) =>
          (a.updated_at ?? '').localeCompare(b.updated_at ?? ''),
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
            aria-label="Archive"
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
            Archive
          </button>
        ),
      },
    ],
    []
  );

  const publishedCount = rows.filter((r) => r.status === 'published').length;
  const daysNum = Math.max(1, Number(form.days) || 1);

  return (
    <div style={{ padding: 0 }}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={h1Style}>Programs</h1>
          <div style={statsStyle}>
            {loading ? 'Loading…' : `${rows.length} total · ${publishedCount} published`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button variant="primary" onClick={openCreate}>
            + Create Program
          </Button>
        </div>
      </div>

      {err && <div style={errorBannerStyle}>{err}</div>}

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={openEdit}
        emptyLabel={loading ? 'Loading…' : 'No programs yet — create one.'}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? `Edit: ${form.name || editingId}` : 'New program'}
        width={780}
      >
        <form onSubmit={handleSave}>
          {formErr && <div style={errorBannerStyle}>{formErr}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            <Field label="Name">
              <TextInput
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: f.slugTouched ? f.slug : slugify(name),
                  }));
                }}
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

          <Field label="Slug" hint="lowercase-with-dashes; auto-derived from name unless edited">
            <TextInput
              value={form.slug}
              onChange={(e) =>
                setForm((f) => ({ ...f, slug: slugify(e.target.value), slugTouched: true }))
              }
              required
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Field label="Category">
              <Select
                value={form.cat}
                onChange={(e) => setForm((f) => ({ ...f, cat: e.target.value as ProgramCat }))}
              >
                <option value="gym">Gym</option>
                <option value="home">Home</option>
                <option value="mobility">Mobility</option>
              </Select>
            </Field>
            <Field label="Subcategory">
              <TextInput
                value={form.subcat}
                onChange={(e) => setForm((f) => ({ ...f, subcat: e.target.value }))}
                placeholder="e.g. strength, hypertrophy"
              />
            </Field>
            <Field label="Difficulty">
              <Select
                value={form.diff}
                onChange={(e) =>
                  setForm((f) => ({ ...f, diff: e.target.value as FormState['diff'] }))
                }
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Field label="Duration / day (min)">
              <TextInput
                type="number"
                min={1}
                value={form.dur}
                onChange={(e) => setForm((f) => ({ ...f, dur: e.target.value }))}
                placeholder="45"
              />
            </Field>
            <Field label="Days">
              <TextInput
                type="number"
                min={1}
                value={form.days}
                onChange={(e) => {
                  const v = e.target.value;
                  const next = Math.max(1, Number(v) || 1);
                  setForm((f) => ({
                    ...f,
                    days: v,
                    blocks: rebuildBlocks(f.blocks, next),
                  }));
                }}
                required
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as 'draft' | 'published' }))
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </Field>
          </div>

          {/* Per-day blocks builder */}
          <div
            style={{
              marginTop: 18,
              padding: 14,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <h3
                style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: colors.text,
                }}
              >
                Schedule{' '}
                <span style={{ color: colors.dim, fontWeight: 400 }}>({daysNum} days)</span>
              </h3>
              <span style={{ fontSize: 11, color: colors.dim }}>
                Empty workout = rest day
              </span>
            </div>

            <datalist id="program-workout-options">
              {workouts.map((w) => (
                <option key={w.id} value={w.name} />
              ))}
            </datalist>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.blocks.slice(0, daysNum).map((block, i) => {
                const matched = block.workout_id
                  ? workouts.find((w) => w.id === block.workout_id) ?? null
                  : null;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr auto',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'Barlow Condensed, sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        fontWeight: 700,
                        color: colors.muted,
                        fontSize: 13,
                      }}
                    >
                      Day {i + 1}
                    </div>
                    <TextInput
                      list="program-workout-options"
                      placeholder="Pick workout, or leave blank for rest day"
                      value={block.workout_name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const found = workouts.find((w) => w.name === name) ?? null;
                        setForm((f) => ({
                          ...f,
                          blocks: f.blocks.map((b, idx) =>
                            idx === i
                              ? {
                                  workout_id: found?.id ?? null,
                                  workout_name: name,
                                }
                              : b,
                          ),
                        }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          blocks: f.blocks.map((b, idx) =>
                            idx === i ? { workout_id: null, workout_name: '' } : b,
                          ),
                        }))
                      }
                      aria-label="Clear day"
                      style={{
                        background: colors.bg3,
                        border: `1px solid ${colors.border}`,
                        color: colors.muted,
                        padding: '6px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {matched ? 'Clear' : block.workout_name ? 'Clear' : 'Rest'}
                    </button>
                  </div>
                );
              })}
            </div>

            {workouts.length === 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: colors.dim }}>
                No workouts in the canonical table yet — pick a name freely and it will be
                stored as an unresolved reference.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
            <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create program'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
