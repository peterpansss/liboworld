import { useEffect, useMemo, useRef, useState } from 'react';
import { colors } from '../../theme';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, TextArea, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import {
  listExerciseOverrides,
  replaceExerciseOverride,
  deleteExerciseOverride,
  uploadExerciseVideo,
  uploadExerciseThumbnail,
  type ExerciseOverride,
} from '../../lib/adminApi';

// ── Types ──────────────────────────────────────────────────────────────────

type Exercise = {
  id: string;
  name?: string;
  slug?: string;
  cat?: string;
  bodyFocus?: string;
  equipment?: string;
  primaryCat?: string;
  subcat?: string;
  environment?: string;
  diff?: string;
  emoji?: string;
  setupNotes?: string;
  videoUrl?: string;
  animationUrl?: string;
  thumbnailUrl?: string;
  machineRequired?: boolean;
  parentId?: string;
  parentName?: string;
  [k: string]: unknown;
};

type EditableKey =
  | 'name'
  | 'setupNotes'
  | 'bodyFocus'
  | 'equipment'
  | 'primaryCat'
  | 'subcat'
  | 'environment'
  | 'diff'
  | 'emoji'
  | 'videoUrl'
  | 'animationUrl'
  | 'thumbnailUrl';

const EDITABLE_KEYS: EditableKey[] = [
  'name',
  'setupNotes',
  'bodyFocus',
  'equipment',
  'primaryCat',
  'subcat',
  'environment',
  'diff',
  'emoji',
  'videoUrl',
  'animationUrl',
  'thumbnailUrl',
];

type FormState = Record<EditableKey, string>;

// ── Styles ─────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  padding: 28,
  maxWidth: 1400,
  margin: '0 auto',
};

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
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  marginBottom: 20,
  gap: 16,
};

const statsStyle: React.CSSProperties = {
  fontSize: 13,
  color: colors.muted,
  marginTop: 6,
};

const editedChipStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 8,
  background: colors.accentDim,
  color: colors.accent,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const filterBarStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.6fr repeat(4, 1fr) auto',
  gap: 10,
  marginBottom: 16,
  alignItems: 'center',
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

const thumbCellStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 8,
  background: colors.bg3,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
  overflow: 'hidden',
  border: `1px solid ${colors.border}`,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  return String(v);
}

function buildForm(merged: Exercise): FormState {
  const out = {} as FormState;
  for (const k of EDITABLE_KEYS) {
    out[k] = str(merged[k]);
  }
  return out;
}

function diffAgainstBase(base: Exercise, form: FormState): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const k of EDITABLE_KEYS) {
    const baseVal = str(base[k]);
    const formVal = form[k];
    if (formVal !== baseVal) {
      // Empty string means "clear" — persist as empty string so override wins over base
      patch[k] = formVal;
    }
  }
  return patch;
}

function uniqueSorted(vals: (string | undefined)[]): string[] {
  const set = new Set<string>();
  for (const v of vals) {
    if (v && v.trim()) set.add(v.trim());
  }
  return Array.from(set).sort();
}

// ── Component ──────────────────────────────────────────────────────────────

export function ExercisesPage() {
  const [base, setBase] = useState<Exercise[]>([]);
  const [overridesById, setOverridesById] = useState<Map<string, ExerciseOverride>>(new Map());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filters
  const [searchRaw, setSearchRaw] = useState('');
  const [search, setSearch] = useState('');
  const [fBodyFocus, setFBodyFocus] = useState('');
  const [fEquipment, setFEquipment] = useState('');
  const [fEnvironment, setFEnvironment] = useState('');
  const [fDiff, setFDiff] = useState('');
  const [fHasOverride, setFHasOverride] = useState(false);

  // Modal state
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchRaw.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [searchRaw]);

  // Initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [bRes, oRes] = await Promise.all([
          fetch('/exercises.json').then((r) => {
            if (!r.ok) throw new Error(`Failed to load exercises.json (${r.status})`);
            return r.json() as Promise<Exercise[]>;
          }),
          listExerciseOverrides(),
        ]);
        if (!alive) return;
        setBase(Array.isArray(bRes) ? bRes : []);
        setOverridesById(new Map(oRes.map((o) => [o.id, o])));
        setErr(null);
      } catch (e) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function refreshOverrides() {
    try {
      const oRes = await listExerciseOverrides();
      setOverridesById(new Map(oRes.map((o) => [o.id, o])));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  // Merged view
  const merged = useMemo<Exercise[]>(() => {
    return base.map((b) => {
      const o = overridesById.get(b.id);
      if (!o) return b;
      return { ...b, ...(o.patch as Partial<Exercise>) };
    });
  }, [base, overridesById]);

  // Filter options
  const bodyFocusOpts = useMemo(() => uniqueSorted(merged.map((e) => e.bodyFocus)), [merged]);
  const equipmentOpts = useMemo(() => uniqueSorted(merged.map((e) => e.equipment)), [merged]);
  const environmentOpts = useMemo(() => uniqueSorted(merged.map((e) => e.environment)), [merged]);
  const diffOpts = useMemo(() => uniqueSorted(merged.map((e) => e.diff)), [merged]);

  // Filtered rows
  const rows = useMemo(() => {
    return merged.filter((e) => {
      if (fBodyFocus && e.bodyFocus !== fBodyFocus) return false;
      if (fEquipment && e.equipment !== fEquipment) return false;
      if (fEnvironment && e.environment !== fEnvironment) return false;
      if (fDiff && e.diff !== fDiff) return false;
      if (fHasOverride && !overridesById.has(e.id)) return false;
      if (search) {
        const hay = `${e.name ?? ''} ${e.bodyFocus ?? ''} ${e.equipment ?? ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [merged, search, fBodyFocus, fEquipment, fEnvironment, fDiff, fHasOverride, overridesById]);

  const overrideCount = overridesById.size;

  // Open edit modal: use BASE for the exercise (so diff is computed against base) but
  // prefill the form with merged (base + override) values so admin sees current state.
  function openEdit(row: Exercise) {
    const baseRow = base.find((b) => b.id === row.id);
    if (!baseRow) return;
    const o = overridesById.get(row.id);
    const mergedRow: Exercise = o ? { ...baseRow, ...(o.patch as Partial<Exercise>) } : baseRow;
    setEditing(baseRow);
    setForm(buildForm(mergedRow));
    setModalErr(null);
  }

  function closeEdit() {
    setEditing(null);
    setForm(null);
    setModalErr(null);
    setUploadingVideo(false);
    setUploadingThumb(false);
  }

  async function handleSave() {
    if (!editing || !form) return;
    const patch = diffAgainstBase(editing, form);
    if (Object.keys(patch).length === 0 && !overridesById.has(editing.id)) {
      setModalErr('No changes');
      return;
    }
    try {
      setSaving(true);
      setModalErr(null);
      await replaceExerciseOverride(editing.id, patch);
      await refreshOverrides();
      closeEdit();
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleClearOverride() {
    if (!editing) return;
    try {
      setSaving(true);
      setModalErr(null);
      await deleteExerciseOverride(editing.id);
      await refreshOverrides();
      closeEdit();
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleVideoFile(f: File) {
    try {
      setUploadingVideo(true);
      setModalErr(null);
      const url = await uploadExerciseVideo(f);
      setForm((prev) => (prev ? { ...prev, videoUrl: url } : prev));
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleThumbFile(f: File) {
    try {
      setUploadingThumb(true);
      setModalErr(null);
      const url = await uploadExerciseThumbnail(f);
      setForm((prev) => (prev ? { ...prev, thumbnailUrl: url } : prev));
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingThumb(false);
    }
  }

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns: Column<Exercise>[] = [
    {
      key: 'thumb',
      header: '',
      width: 60,
      render: (r) => (
        <div style={thumbCellStyle}>
          {r.thumbnailUrl ? (
            <img
              src={r.thumbnailUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span>{r.emoji || '💪'}</span>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sort: (a, b) => str(a.name).localeCompare(str(b.name)),
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: colors.text }}>{r.name || r.id}</div>
          <div style={{ fontSize: 11, color: colors.dim }}>{r.id}</div>
        </div>
      ),
    },
    {
      key: 'bodyFocus',
      header: 'Body Focus',
      sort: (a, b) => str(a.bodyFocus).localeCompare(str(b.bodyFocus)),
      render: (r) => str(r.bodyFocus) || '—',
    },
    {
      key: 'equipment',
      header: 'Equipment',
      sort: (a, b) => str(a.equipment).localeCompare(str(b.equipment)),
      render: (r) => str(r.equipment) || '—',
    },
    {
      key: 'environment',
      header: 'Env',
      sort: (a, b) => str(a.environment).localeCompare(str(b.environment)),
      render: (r) => str(r.environment) || '—',
    },
    {
      key: 'diff',
      header: 'Diff',
      sort: (a, b) => str(a.diff).localeCompare(str(b.diff)),
      render: (r) => str(r.diff) || '—',
    },
    {
      key: 'video',
      header: 'Video',
      align: 'center',
      render: (r) =>
        r.videoUrl ? (
          <span style={{ color: colors.accent, fontWeight: 700 }}>✓</span>
        ) : (
          <span style={{ color: colors.dim }}>—</span>
        ),
    },
    {
      key: 'override',
      header: 'Override',
      render: (r) => (overridesById.has(r.id) ? <span style={editedChipStyle}>Edited</span> : <span style={{ color: colors.dim }}>—</span>),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: () => <span style={{ color: colors.muted, fontSize: 12 }}>Edit ›</span>,
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={h1Style}>Exercises</h1>
          <div style={statsStyle}>
            {loading ? 'Loading…' : `${base.length} exercises, ${overrideCount} with overrides`}
          </div>
        </div>
        <div>
          <Button variant="secondary" onClick={refreshOverrides} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {err && <div style={errorBannerStyle}>{err}</div>}

      <div style={filterBarStyle}>
        <TextInput
          placeholder="Search name, body focus, equipment…"
          value={searchRaw}
          onChange={(e) => setSearchRaw(e.target.value)}
        />
        <Select value={fBodyFocus} onChange={(e) => setFBodyFocus(e.target.value)}>
          <option value="">All body focus</option>
          {bodyFocusOpts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <Select value={fEquipment} onChange={(e) => setFEquipment(e.target.value)}>
          <option value="">All equipment</option>
          {equipmentOpts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <Select value={fEnvironment} onChange={(e) => setFEnvironment(e.target.value)}>
          <option value="">All environments</option>
          {environmentOpts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <Select value={fDiff} onChange={(e) => setFDiff(e.target.value)}>
          <option value="">All levels</option>
          {diffOpts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            background: colors.bg,
            color: colors.text,
            fontSize: 13,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <input
            type="checkbox"
            checked={fHasOverride}
            onChange={(e) => setFHasOverride(e.target.checked)}
          />
          Has override
        </label>
      </div>

      <DataTable<Exercise>
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={openEdit}
        emptyLabel={loading ? 'Loading…' : 'No exercises match filters'}
        dense
      />

      <Modal
        open={editing !== null}
        onClose={closeEdit}
        title={editing ? `Edit · ${str(editing.name) || editing.id}` : 'Edit'}
        width={900}
      >
        {editing && form && (
          <EditForm
            base={editing}
            form={form}
            setForm={setForm}
            modalErr={modalErr}
            saving={saving}
            uploadingVideo={uploadingVideo}
            uploadingThumb={uploadingThumb}
            hasOverride={overridesById.has(editing.id)}
            videoInputRef={videoInputRef}
            thumbInputRef={thumbInputRef}
            onVideoFile={handleVideoFile}
            onThumbFile={handleThumbFile}
            onSave={handleSave}
            onClearOverride={handleClearOverride}
            onCancel={closeEdit}
          />
        )}
      </Modal>
    </div>
  );
}

// ── Edit form subcomponent ────────────────────────────────────────────────

function EditForm({
  base,
  form,
  setForm,
  modalErr,
  saving,
  uploadingVideo,
  uploadingThumb,
  hasOverride,
  videoInputRef,
  thumbInputRef,
  onVideoFile,
  onThumbFile,
  onSave,
  onClearOverride,
  onCancel,
}: {
  base: Exercise;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState | null>>;
  modalErr: string | null;
  saving: boolean;
  uploadingVideo: boolean;
  uploadingThumb: boolean;
  hasOverride: boolean;
  videoInputRef: React.MutableRefObject<HTMLInputElement | null>;
  thumbInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onVideoFile: (f: File) => void;
  onThumbFile: (f: File) => void;
  onSave: () => void;
  onClearOverride: () => void;
  onCancel: () => void;
}) {
  const update = (k: EditableKey, v: string) =>
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));

  const diff = diffAgainstBase(base, form);
  const diffCount = Object.keys(diff).length;
  const isUploading = uploadingVideo || uploadingThumb;

  const readOnlyFields: { label: string; value: string }[] = [
    { label: 'ID', value: str(base.id) },
    { label: 'Slug', value: str(base.slug) },
    { label: 'Cat', value: str(base.cat) },
    { label: 'Machine Required', value: base.machineRequired ? 'Yes' : 'No' },
    { label: 'Parent ID', value: str(base.parentId) },
    { label: 'Parent Name', value: str(base.parentName) },
  ];

  return (
    <div>
      {modalErr && (
        <div style={errorBannerStyle} role="alert">
          {modalErr}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }}>
        {/* Left: media previews + uploads */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Video preview
          </div>
          <div
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: 10,
              marginBottom: 12,
              minHeight: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {form.videoUrl ? (
              <video
                key={form.videoUrl}
                src={form.videoUrl}
                controls
                style={{ width: '100%', maxHeight: 300, borderRadius: 10, background: '#000' }}
              />
            ) : (
              <div style={{ color: colors.dim, fontSize: 13 }}>No video</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onVideoFile(f);
                e.currentTarget.value = '';
              }}
            />
            <Button
              variant="secondary"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploading || saving}
            >
              {uploadingVideo ? 'Uploading…' : 'Upload new video'}
            </Button>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Thumbnail preview
          </div>
          <div
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: 10,
              marginBottom: 12,
              minHeight: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {form.thumbnailUrl ? (
              <img
                src={form.thumbnailUrl}
                alt="Thumbnail"
                style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 10 }}
              />
            ) : (
              <div style={{ fontSize: 48 }}>{form.emoji || '💪'}</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onThumbFile(f);
                e.currentTarget.value = '';
              }}
            />
            <Button
              variant="secondary"
              onClick={() => thumbInputRef.current?.click()}
              disabled={isUploading || saving}
            >
              {uploadingThumb ? 'Uploading…' : 'Upload thumbnail'}
            </Button>
          </div>

          {/* Read-only metadata */}
          <div
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Read-only
            </div>
            {readOnlyFields.map((f) => (
              <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: colors.dim }}>{f.label}</span>
                <span style={{ color: colors.text, fontFamily: 'monospace', marginLeft: 8, textAlign: 'right', wordBreak: 'break-all' }}>
                  {f.value || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: editable fields */}
        <div>
          <Field label="Name">
            <TextInput value={form.name} onChange={(e) => update('name', e.target.value)} />
          </Field>

          <Field label="Setup Notes" hint="The most commonly edited field.">
            <TextArea
              value={form.setupNotes}
              onChange={(e) => update('setupNotes', e.target.value)}
              rows={6}
              style={{ minHeight: 140 }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Body Focus">
              <TextInput value={form.bodyFocus} onChange={(e) => update('bodyFocus', e.target.value)} />
            </Field>
            <Field label="Equipment">
              <TextInput value={form.equipment} onChange={(e) => update('equipment', e.target.value)} />
            </Field>
            <Field label="Primary Category">
              <TextInput value={form.primaryCat} onChange={(e) => update('primaryCat', e.target.value)} />
            </Field>
            <Field label="Subcategory">
              <TextInput value={form.subcat} onChange={(e) => update('subcat', e.target.value)} />
            </Field>
            <Field label="Environment">
              <Select value={form.environment} onChange={(e) => update('environment', e.target.value)}>
                <option value="">—</option>
                <option value="Gym">Gym</option>
                <option value="Home">Home</option>
                <option value="Both">Both</option>
              </Select>
            </Field>
            <Field label="Difficulty">
              <Select value={form.diff} onChange={(e) => update('diff', e.target.value)}>
                <option value="">—</option>
                <option value="beginner">beginner</option>
                <option value="intermediate">intermediate</option>
                <option value="advanced">advanced</option>
              </Select>
            </Field>
            <Field label="Emoji">
              <TextInput value={form.emoji} onChange={(e) => update('emoji', e.target.value)} />
            </Field>
          </div>

          <Field label="Video URL">
            <TextInput value={form.videoUrl} onChange={(e) => update('videoUrl', e.target.value)} placeholder="https://…" />
          </Field>

          <Field label="Animation URL">
            <TextInput value={form.animationUrl} onChange={(e) => update('animationUrl', e.target.value)} placeholder="https://…" />
          </Field>

          <Field label="Thumbnail URL">
            <TextInput value={form.thumbnailUrl} onChange={(e) => update('thumbnailUrl', e.target.value)} placeholder="https://…" />
          </Field>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 18,
          paddingTop: 18,
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ fontSize: 12, color: colors.muted }}>
          {diffCount === 0
            ? hasOverride
              ? 'Form matches base — saving will clear the override.'
              : 'No changes'
            : `${diffCount} field${diffCount === 1 ? '' : 's'} changed vs base`}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {hasOverride && (
            <Button variant="danger" onClick={onClearOverride} disabled={saving || isUploading}>
              Clear override
            </Button>
          )}
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || isUploading}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
