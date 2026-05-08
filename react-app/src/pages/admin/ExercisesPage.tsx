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
  createExercise,
  deleteExercise,
  listExercises,
  updateExercise,
  uploadExerciseVideoRaw,
  createMediaJob,
  type ExerciseOverride,
  type ExerciseRow,
  type ContentStatus,
} from '../../lib/adminApi';
import { errMessage } from '../../lib/errors';
import { VideoUpload, MediaJobStatus } from '../../components/admin/VideoUpload';
import { StatusChip } from '../../components/admin/StatusChip';

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
  status?: ContentStatus;
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
  | 'thumbnailUrl'
  | 'status';

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
  'status',
];

type FormState = Record<EditableKey, string>;

// OpenAI tts-1 voices supported by the voiceover worker.
type TtsVoice = 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer';
const TTS_VOICES: TtsVoice[] = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'];

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

const bilateralBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  marginLeft: 8,
  padding: '2px 7px',
  borderRadius: 6,
  background: 'rgba(80, 200, 120, 0.15)',
  color: '#3ec97a',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  verticalAlign: 'middle',
};

// Save-path indicator pills shown at the top of the Edit modal so the admin
// knows whether Save will write to the canonical `exercises` table or fall
// back to the legacy `exercise_overrides` patch layer.
const canonicalPillStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 8,
  background: colors.accentDim,
  color: colors.accent,
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
};

const legacyPillStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 8,
  background: 'transparent',
  color: colors.muted,
  border: `1px solid ${colors.border}`,
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
};

const savePathRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 14,
  fontSize: 12,
  color: colors.muted,
};

const childNoteStyle: React.CSSProperties = {
  fontSize: 11,
  color: colors.muted,
  fontStyle: 'italic',
  marginTop: 2,
};

const bilateralInfoBoxStyle: React.CSSProperties = {
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: '10px 12px',
  marginBottom: 14,
  fontSize: 12,
  color: colors.text,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const bilateralPreviewStyle: React.CSSProperties = {
  background: colors.bg,
  border: `1px dashed ${colors.border}`,
  borderRadius: 10,
  padding: 12,
  marginTop: 8,
  marginBottom: 14,
  fontSize: 12,
  color: colors.text,
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

// ── Bilateral helpers (mirrors libo-app-v2/src/utils/bilateral.ts regex) ───
//
// Kept in sync with `SIDE_SUFFIX_RE` in libo-app-v2/src/utils/bilateral.ts.
// Don't edit one without editing the other.
const SIDE_SUFFIX_RE = /\s*[—–-]\s*(Left|Right)(\s+(Leg|Arm|Side|Hip|Shoulder))?\s*$/i;

type BilateralSideLabel = 'Arm' | 'Leg' | 'Side' | 'Hip' | 'Shoulder' | '';

const BILATERAL_SIDE_LABELS: { value: BilateralSideLabel; label: string }[] = [
  { value: 'Arm', label: 'Arm' },
  { value: 'Leg', label: 'Leg' },
  { value: 'Side', label: 'Side' },
  { value: 'Hip', label: 'Hip' },
  { value: 'Shoulder', label: 'Shoulder' },
  { value: '', label: '(none)' },
];

function parentNameOfClient(name: string): string {
  return name.replace(SIDE_SUFFIX_RE, '').trim();
}

function isChildNameClient(name: string): boolean {
  return SIDE_SUFFIX_RE.test(name);
}

function sideOfClient(name: string): 'L' | 'R' | null {
  const m = name.match(SIDE_SUFFIX_RE);
  if (!m) return null;
  return m[1].toLowerCase() === 'left' ? 'L' : 'R';
}

function bilateralChildName(parent: string, side: 'Left' | 'Right', label: BilateralSideLabel): string {
  const trimmed = parent.trim();
  if (!trimmed) return '';
  const tail = label ? ` ${label}` : '';
  return `${trimmed} — ${side}${tail}`;
}

/**
 * Build a `Set<parentName>` of names that have at least one Left and one Right
 * child in `rows` (matching the runtime regex). Used to flag rows in the table.
 */
function computeBilateralParents(rows: { name?: string }[]): Set<string> {
  const groups = new Map<string, { L: number; R: number }>();
  for (const r of rows) {
    const name = r.name ?? '';
    const side = sideOfClient(name);
    if (!side) continue;
    const parent = parentNameOfClient(name);
    const g = groups.get(parent) ?? { L: 0, R: 0 };
    if (side === 'L') g.L += 1;
    else g.R += 1;
    groups.set(parent, g);
  }
  const out = new Set<string>();
  for (const [parent, g] of groups) {
    if (g.L >= 1 && g.R >= 1) out.add(parent);
  }
  return out;
}

// ── Create form (canonical exercises) ─────────────────────────────────────

type ExerciseCat = 'gym' | 'home' | 'mobility';
type ExerciseDiff = 'beginner' | 'intermediate' | 'advanced';
type ExerciseStatus = 'draft' | 'published';

type CreateFormState = {
  name: string;
  slug: string;
  slugTouched: boolean;
  cat: ExerciseCat;
  primary_cat: string;
  subcat: string;
  environment: string;
  body_focus: string;
  equipment: string;
  machine_required: boolean;
  diff: ExerciseDiff;
  variation: string;
  emoji: string;
  setup_notes: string;
  parent_id: string;
  parent_name: string;
  video_url: string;
  status: ExerciseStatus;
  // Bilateral pair fields (only used when `bilateral` is true)
  bilateral: boolean;
  bilateral_side_label: BilateralSideLabel;
  bilateral_left_video_url: string;
  bilateral_right_video_url: string;
};

const EMPTY_CREATE_FORM: CreateFormState = {
  name: '',
  slug: '',
  slugTouched: false,
  cat: 'gym',
  primary_cat: '',
  subcat: '',
  environment: '',
  body_focus: '',
  equipment: '',
  machine_required: false,
  diff: 'beginner',
  variation: '',
  emoji: '',
  setup_notes: '',
  parent_id: '',
  parent_name: '',
  video_url: '',
  status: 'draft',
  bilateral: false,
  bilateral_side_label: 'Arm',
  bilateral_left_video_url: '',
  bilateral_right_video_url: '',
};

function slugifyExercise(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function createFormToPayload(f: CreateFormState): Partial<ExerciseRow> {
  return {
    name: f.name.trim(),
    slug: (f.slug || slugifyExercise(f.name)).trim(),
    cat: f.cat,
    primary_cat: f.primary_cat.trim() || null,
    subcat: f.subcat.trim() || null,
    environment: f.environment.trim() || null,
    body_focus: f.body_focus.trim() || null,
    equipment: f.equipment.trim() || null,
    machine_required: f.machine_required,
    diff: f.diff,
    variation: f.variation.trim(),
    emoji: f.emoji.trim(),
    setup_notes: f.setup_notes.trim(),
    parent_id: f.parent_id.trim(),
    parent_name: f.parent_name.trim(),
    video_url: f.video_url.trim() || null,
    status: f.status,
  };
}

function isValidHttpUrl(s: string): boolean {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

type FailedChild = {
  side: 'L' | 'R';
  payload: Partial<ExerciseRow>;
  error: string;
};

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
  const [fStatus, setFStatus] = useState<'' | 'published' | 'draft' | 'archived'>('');
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

  // Voiceover-job state (lives inside the Edit modal)
  const [voiceoverJobId, setVoiceoverJobId] = useState<number | null>(null);
  const [voiceoverVoice, setVoiceoverVoice] = useState<TtsVoice>('onyx');
  const [voiceoverStatusVisible, setVoiceoverStatusVisible] = useState(false);
  const [voiceoverErr, setVoiceoverErr] = useState<string | null>(null);
  const [voiceoverQueuing, setVoiceoverQueuing] = useState(false);

  // Delete-video-job state (lives inside the Edit modal)
  const [deleteVideoJobId, setDeleteVideoJobId] = useState<number | null>(null);
  const [deleteVideoStatusVisible, setDeleteVideoStatusVisible] = useState(false);
  const [deleteVideoErr, setDeleteVideoErr] = useState<string | null>(null);
  const [deleteVideoQueuing, setDeleteVideoQueuing] = useState(false);

  // Create modal state (canonical exercises table)
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [canonicalRows, setCanonicalRows] = useState<ExerciseRow[]>([]);
  // When a bilateral parent insert succeeds but a child fails, hold onto the
  // failed payload so admin can retry just that one without recreating parent.
  // The failed child's payload already carries parent_id, so we don't need to
  // track the parent id separately.
  const [failedChild, setFailedChild] = useState<FailedChild | null>(null);
  const [retrying, setRetrying] = useState(false);
  // Toast (lightweight inline)
  const [toast, setToast] = useState<string | null>(null);

  // Video upload state. The widgets hold a File until create completes, then
  // the upload+job runs and `mediaJobId` is set so the widget subscribes.
  const [singleVideoFile, setSingleVideoFile] = useState<File | null>(null);
  const [singleMediaJobId, setSingleMediaJobId] = useState<number | null>(null);
  const [leftVideoFile, setLeftVideoFile] = useState<File | null>(null);
  const [leftMediaJobId, setLeftMediaJobId] = useState<number | null>(null);
  const [rightVideoFile, setRightVideoFile] = useState<File | null>(null);
  const [rightMediaJobId, setRightMediaJobId] = useState<number | null>(null);

  function resetVideoState() {
    setSingleVideoFile(null);
    setSingleMediaJobId(null);
    setLeftVideoFile(null);
    setLeftMediaJobId(null);
    setRightVideoFile(null);
    setRightMediaJobId(null);
  }

  async function uploadAndQueue(
    exerciseId: string,
    slug: string,
    file: File,
  ): Promise<number | null> {
    try {
      const { storage_path } = await uploadExerciseVideoRaw(file, slug);
      const res = await createMediaJob(exerciseId, 'process_video', storage_path);
      if (!res.ok || !res.job) {
        setCreateErr(`Video upload failed for ${slug}: ${res.error ?? 'unknown'}`);
        return null;
      }
      return res.job.id;
    } catch (e) {
      setCreateErr(`Video upload failed for ${slug}: ${errMessage(e)}`);
      return null;
    }
  }

  // Normalize hyphens/em-dashes/punctuation/underscores → spaces, collapse
  // whitespace, lowercase. Lets "single arm" match "Single-Arm" AND
  // single_arm_*, "iso lateral low" match "Iso-Lateral Low Row" AND
  // iso_lateral_low_row, etc. Underscore is included because admin search
  // runs over slugs/ids too (admins regularly look up exercises by slug),
  // unlike the public-site search which doesn't expose slugs to users.
  const normSearch = (s: string) =>
    s.toLowerCase().replace(/[—–\-'/.,()_]/g, ' ').replace(/\s+/g, ' ').trim();

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearch(normSearch(searchRaw)), 250);
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
        setErr(errMessage(e));
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
      setErr(errMessage(e));
    }
  }

  // Load canonical rows (admin-created, plus excel-baseline imports) on mount
  // so the list shows rows that don't exist in the bundled exercises.json.
  useEffect(() => {
    void refreshCanonical();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map a snake_case canonical row to the camelCase Exercise shape the list expects.
  function canonicalToExercise(r: ExerciseRow): Exercise {
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      cat: r.cat ?? '',
      bodyFocus: r.body_focus ?? '',
      equipment: r.equipment ?? '',
      primaryCat: r.primary_cat ?? '',
      subcat: r.subcat ?? '',
      environment: r.environment ?? '',
      diff: r.diff ?? '',
      emoji: r.emoji ?? '',
      setupNotes: r.setup_notes ?? '',
      videoUrl: r.video_url ?? '',
      thumbnailUrl: r.thumbnail_url ?? undefined,
      machineRequired: r.machine_required,
      parentId: r.parent_id ?? '',
      parentName: r.parent_name ?? '',
      status: r.status,
    };
  }

  // Merged view: base (exercises.json) + legacy patch overrides + canonical rows.
  // Canonical rows take precedence (they're admin-created or the explicit table
  // version). Dedupe is keyed on `slug` — not `id` — because the bundled JSON
  // and Supabase use different id conventions (e.g. bundled `zercher_squat` vs
  // canonical `gym_162`) for the same exercise. Slug has a UNIQUE constraint
  // in Supabase and is present on every bundled row, so it's the stable key.
  // Rows missing a slug fall back to id so they still appear once.
  const merged = useMemo<Exercise[]>(() => {
    const keyOf = (e: { id: string; slug?: string }) => e.slug ?? e.id;
    const bySlug = new Map<string, Exercise>();
    for (const b of base) {
      const o = overridesById.get(b.id);
      const row = o ? { ...b, ...(o.patch as Partial<Exercise>) } : b;
      bySlug.set(keyOf(row), row);
    }
    for (const r of canonicalRows) {
      const row = canonicalToExercise(r);
      bySlug.set(keyOf(row), row);
    }
    return Array.from(bySlug.values());
  }, [base, overridesById, canonicalRows]);

  // Bilateral lookups (computed off the merged dataset so renamed rows pick up).
  const bilateralParentNames = useMemo(
    () => computeBilateralParents(merged.map((e) => ({ name: e.name }))),
    [merged],
  );
  const bilateralChildrenByParent = useMemo(() => {
    const map = new Map<string, { L?: Exercise; R?: Exercise }>();
    for (const ex of merged) {
      const side = sideOfClient(ex.name ?? '');
      if (!side) continue;
      const parent = parentNameOfClient(ex.name ?? '');
      if (!bilateralParentNames.has(parent)) continue;
      const cur = map.get(parent) ?? {};
      if (side === 'L' && !cur.L) cur.L = ex;
      else if (side === 'R' && !cur.R) cur.R = ex;
      map.set(parent, cur);
    }
    return map;
  }, [merged, bilateralParentNames]);

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
      if (fStatus && e.status !== fStatus) return false;
      if (fHasOverride && !overridesById.has(e.id)) return false;
      if (search) {
        const hay = normSearch(
          `${e.name ?? ''} ${e.slug ?? ''} ${e.id ?? ''} ${e.bodyFocus ?? ''} ${e.equipment ?? ''}`,
        );
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [merged, search, fBodyFocus, fEquipment, fEnvironment, fDiff, fStatus, fHasOverride, overridesById]);

  const overrideCount = overridesById.size;
  const publishedCount = canonicalRows.filter((r) => r.status === 'published').length;
  const draftCount = canonicalRows.filter((r) => r.status === 'draft').length;

  // Open edit modal: use BASE for the exercise (so diff is computed against base) but
  // prefill the form with merged (base + override) values so admin sees current state.
  function openEdit(row: Exercise) {
    // Bundled JSON uses slug-as-id while Supabase uses gym_*/home_* ids, so
    // a strict id lookup misses any row whose canonical Supabase id differs
    // from its bundled-JSON id. Try id first, then slug, then fall back to
    // the merged row itself (which is what the table is already rendering).
    const baseRow =
      base.find((b) => b.id === row.id) ??
      (row.slug ? base.find((b) => b.slug === row.slug) : undefined) ??
      row;
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
    setVoiceoverJobId(null);
    setVoiceoverStatusVisible(false);
    setVoiceoverErr(null);
    setVoiceoverQueuing(false);
    setDeleteVideoJobId(null);
    setDeleteVideoStatusVisible(false);
    setDeleteVideoErr(null);
    setDeleteVideoQueuing(false);
  }

  async function handleGenerateVoiceover() {
    if (!editing || !form) return;
    if (!form.videoUrl || !form.setupNotes.trim()) {
      setVoiceoverErr('Voiceover requires a video and setupNotes.');
      return;
    }
    const canonical = findCanonicalForEditing(editing);
    if (!canonical) {
      setVoiceoverErr('No canonical row for this exercise — save it once before generating voiceover.');
      return;
    }
    try {
      setVoiceoverQueuing(true);
      setVoiceoverErr(null);
      const res = await createMediaJob(canonical.id, 'generate_voiceover', null, voiceoverVoice);
      if (!res.ok || !res.job) {
        setVoiceoverErr(res.error ?? 'Failed to queue voiceover job');
        return;
      }
      setVoiceoverJobId(res.job.id);
      setVoiceoverStatusVisible(true);
    } catch (e) {
      setVoiceoverErr(errMessage(e));
    } finally {
      setVoiceoverQueuing(false);
    }
  }

  function handleVoiceoverDone() {
    // Refresh canonical rows so any updated voiceover_url is reflected.
    void refreshCanonical();
    // Auto-dismiss the status display after 5s.
    setTimeout(() => {
      setVoiceoverStatusVisible(false);
      setVoiceoverJobId(null);
    }, 5000);
  }

  function handleVoiceoverError(job: { error_message: string | null }) {
    setVoiceoverErr(job.error_message ?? 'Voiceover job failed');
  }

  async function handleDeleteVideo() {
    if (!editing || !form) return;
    if (!form.videoUrl) {
      setDeleteVideoErr('No video to delete.');
      return;
    }
    const canonical = findCanonicalForEditing(editing);
    if (!canonical) {
      setDeleteVideoErr('No canonical row for this exercise — save it once before deleting the video.');
      return;
    }
    if (
      !confirm(
        "Delete this exercise's video and thumbnail? The MP4 will be removed from R2 and the thumbnail from Supabase Storage. This cannot be undone.",
      )
    ) {
      return;
    }
    try {
      setDeleteVideoQueuing(true);
      setDeleteVideoErr(null);
      const res = await createMediaJob(canonical.id, 'delete_video');
      if (!res.ok || !res.job) {
        setDeleteVideoErr(res.error ?? 'Failed to queue delete-video job');
        return;
      }
      setDeleteVideoJobId(res.job.id);
      setDeleteVideoStatusVisible(true);
    } catch (e) {
      setDeleteVideoErr(errMessage(e));
    } finally {
      setDeleteVideoQueuing(false);
    }
  }

  function handleDeleteVideoDone() {
    void refreshCanonical();
    setForm((prev) => (prev ? { ...prev, videoUrl: '', thumbnailUrl: '' } : prev));
    setTimeout(() => {
      setDeleteVideoStatusVisible(false);
      setDeleteVideoJobId(null);
    }, 4000);
  }

  function handleDeleteVideoError(job: { error_message: string | null }) {
    setDeleteVideoErr(job.error_message ?? 'Delete-video job failed');
  }

  async function handleSave() {
    if (!editing || !form) return;

    // Detect path: if a canonical row exists for this exercise (slug match,
    // falling back to id match), Save writes directly to the `exercises`
    // table via updateExercise. Otherwise we keep the legacy override-patch
    // path so base-only rows from the bundled JSON still work.
    const canonical = findCanonicalForEditing(editing);

    if (canonical) {
      // Canonical-update path: diff form against the canonical row's current
      // values and send only the changed columns.
      //
      // Edge case: if a row exists in canonical but its `setup_notes` is empty
      // and the form was preloaded from the bundled JSON (via openEdit's
      // mergedRow), saving here will push that bundled value into the
      // canonical row — which is the same content the merged view would show
      // either way, so it's a benign first-write. Admin retains full control:
      // they can clear the field before saving if they don't want it
      // persisted.
      let patch = diffCanonical(canonical, form);

      // Auto-link bilateral children: when the name pattern says this is
      // "X — Left" / "X — Right" and there's a canonical parent row "X" with
      // its own id, but THIS row has no parent_id yet, include parent_id +
      // parent_name in the save patch. This back-fills legacy data that was
      // imported as 3 independent parent rows instead of parent + 2 children.
      const editingName = str(editing.name);
      if (isChildNameClient(editingName) && !canonical.parent_id) {
        const parentName = parentNameOfClient(editingName);
        const parentRow = canonicalRows.find(
          (r) => r.name === parentName && !r.parent_id,
        );
        if (parentRow) {
          patch = {
            ...patch,
            parent_id: parentRow.id,
            parent_name: parentName,
          };
        }
      }

      if (Object.keys(patch).length === 0) {
        setModalErr('No changes');
        return;
      }
      try {
        setSaving(true);
        setModalErr(null);
        const res = await updateExercise(canonical.id, patch);
        if (!res.ok || !res.row) {
          setModalErr(
            typeof res.error === 'string' && res.error
              ? res.error
              : res.error
                ? errMessage(res.error)
                : 'Update failed',
          );
          return;
        }
        await refreshCanonical();
        const savedName = res.row.name;
        closeEdit();
        showToast(`Saved ${savedName}`);
      } catch (e) {
        setModalErr(errMessage(e));
      } finally {
        setSaving(false);
      }
      return;
    }

    // Legacy override-patch path (unchanged): for base-only rows from the
    // bundled exercises.json that don't have a canonical row yet.
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
      setModalErr(errMessage(e));
    } finally {
      setSaving(false);
    }
  }

  /** Look up the canonical row for an editing target by slug, then by id. */
  function findCanonicalForEditing(ex: Exercise): ExerciseRow | null {
    const slug = str(ex.slug);
    if (slug) {
      const bySlug = canonicalRows.find((r) => r.slug === slug);
      if (bySlug) return bySlug;
    }
    const byId = canonicalRows.find((r) => r.id === ex.id);
    return byId ?? null;
  }

  /**
   * Diff form state against a canonical row's current values, returning a
   * `Partial<ExerciseRow>` patch with snake_case columns. Only includes fields
   * whose form value differs from the canonical row. Empty string `""` means
   * "clear" — we send `""` (not null) so the column is set to empty.
   *
   * `animationUrl` from FormState has no canonical column and is intentionally
   * skipped.
   */
  function diffCanonical(row: ExerciseRow, f: FormState): Partial<ExerciseRow> {
    const patch: Partial<ExerciseRow> = {};
    const setIfChanged = <K extends keyof ExerciseRow>(
      key: K,
      formVal: string,
      rowVal: ExerciseRow[K] | null,
    ) => {
      const current = rowVal === null || rowVal === undefined ? '' : String(rowVal);
      if (formVal !== current) {
        patch[key] = formVal as ExerciseRow[K];
      }
    };
    setIfChanged('name', f.name, row.name);
    setIfChanged('setup_notes', f.setupNotes, row.setup_notes);
    setIfChanged('body_focus', f.bodyFocus, row.body_focus);
    setIfChanged('equipment', f.equipment, row.equipment);
    setIfChanged('primary_cat', f.primaryCat, row.primary_cat);
    setIfChanged('subcat', f.subcat, row.subcat);
    setIfChanged('environment', f.environment, row.environment);
    setIfChanged('diff', f.diff, row.diff);
    setIfChanged('emoji', f.emoji, row.emoji);
    setIfChanged('video_url', f.videoUrl, row.video_url);
    setIfChanged('thumbnail_url', f.thumbnailUrl, row.thumbnail_url);
    setIfChanged('status', f.status, row.status);
    return patch;
  }

  async function handleDeleteExercise() {
    if (!editing) return;
    const canonical = findCanonicalForEditing(editing);
    if (!canonical) {
      setModalErr('No canonical row to delete.');
      return;
    }
    if (
      !confirm(
        `Permanently delete "${canonical.name}"? It will disappear from web + app immediately. This cannot be undone — to hide without deleting, set Visibility to Archived instead.`,
      )
    ) {
      return;
    }
    try {
      setSaving(true);
      setModalErr(null);
      const res = await deleteExercise(canonical.id);
      if (!res.ok) {
        setModalErr(
          typeof res.error === 'string' && res.error
            ? res.error
            : res.error
              ? errMessage(res.error)
              : 'Delete failed',
        );
        return;
      }
      await refreshCanonical();
      const deletedName = canonical.name;
      closeEdit();
      showToast(`Deleted ${deletedName}`);
    } catch (e) {
      setModalErr(errMessage(e));
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
      setModalErr(errMessage(e));
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
      setModalErr(errMessage(e));
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
      setModalErr(errMessage(e));
    } finally {
      setUploadingThumb(false);
    }
  }

  // ── Create flow (canonical exercises) ────────────────────────────────────

  async function refreshCanonical() {
    try {
      const rows = await listExercises();
      setCanonicalRows(rows);
    } catch (e) {
      // Don't block opening the modal if list fails — just leave canonical
      // empty so uniqueness check is best-effort.
      // eslint-disable-next-line no-console
      console.warn('listExercises failed:', e);
    }
  }

  async function openCreate() {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateErr(null);
    setFailedChild(null);
    resetVideoState();
    setCreateOpen(true);
    await refreshCanonical();
  }

  function closeCreate() {
    if (creating || retrying) return;
    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateErr(null);
    setFailedChild(null);
    resetVideoState();
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 3500);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = createForm.name.trim();
    if (!name) {
      setCreateErr('Name is required.');
      return;
    }

    // Branch on bilateral toggle.
    if (createForm.bilateral) {
      await handleCreateBilateral(name);
      return;
    }

    const slug = (createForm.slug || slugifyExercise(name)).trim();
    if (!slug) {
      setCreateErr('Slug is required.');
      return;
    }
    if (canonicalRows.some((r) => r.slug === slug)) {
      setCreateErr(`Slug "${slug}" is already in use — pick another.`);
      return;
    }
    setCreating(true);
    setCreateErr(null);
    try {
      const payload = createFormToPayload({ ...createForm, slug });
      const res = await createExercise(payload);
      if (!res.ok || !res.row) {
        setCreateErr(res.error ?? 'Create failed');
        return;
      }
      await refreshCanonical();
      // If a file was selected, upload it and queue the processing job. Keep
      // the drawer open so the VideoUpload widget can show job progress.
      if (singleVideoFile) {
        const jobId = await uploadAndQueue(res.row.id, slug, singleVideoFile);
        if (jobId != null) {
          setSingleMediaJobId(jobId);
          showToast(`Created ${createForm.name.trim()} — processing video…`);
        }
        return; // leave drawer open
      }
      closeCreate();
    } catch (e2) {
      setCreateErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setCreating(false);
    }
  }

  function buildBilateralPayloads(parentName: string, parentSlug: string, parentId: string | null) {
    const label = createForm.bilateral_side_label;
    const leftName = bilateralChildName(parentName, 'Left', label);
    const rightName = bilateralChildName(parentName, 'Right', label);

    // Children inherit most parent metadata but override name/slug/video and
    // get their parent_id wired up.
    const childBase = createFormToPayload({
      ...createForm,
      name: parentName,
      slug: parentSlug,
      video_url: '', // children get their own video URL
    });

    const leftPayload: Partial<ExerciseRow> = {
      ...childBase,
      name: leftName,
      slug: `${parentSlug}_left`,
      parent_id: parentId ?? '',
      parent_name: parentName,
      video_url: createForm.bilateral_left_video_url.trim() || null,
    };
    const rightPayload: Partial<ExerciseRow> = {
      ...childBase,
      name: rightName,
      slug: `${parentSlug}_right`,
      parent_id: parentId ?? '',
      parent_name: parentName,
      video_url: createForm.bilateral_right_video_url.trim() || null,
    };
    return { leftPayload, rightPayload, leftName, rightName };
  }

  async function handleCreateBilateral(parentName: string) {
    const parentSlug = (createForm.slug || slugifyExercise(parentName)).trim();
    if (!parentSlug) {
      setCreateErr('Slug is required.');
      return;
    }
    const leftSlug = `${parentSlug}_left`;
    const rightSlug = `${parentSlug}_right`;

    // Slug uniqueness against existing canonical rows.
    const taken = new Set(canonicalRows.map((r) => r.slug));
    for (const s of [parentSlug, leftSlug, rightSlug]) {
      if (taken.has(s)) {
        setCreateErr(`Slug "${s}" is already in use — pick another base name.`);
        return;
      }
    }

    // Video URL validation: both empty OR both valid http(s).
    const leftU = createForm.bilateral_left_video_url.trim();
    const rightU = createForm.bilateral_right_video_url.trim();
    const bothEmpty = !leftU && !rightU;
    const bothFilled = !!leftU && !!rightU;
    if (!bothEmpty && !bothFilled) {
      setCreateErr('Provide BOTH Left and Right video URLs, or leave both blank.');
      return;
    }
    if (bothFilled && (!isValidHttpUrl(leftU) || !isValidHttpUrl(rightU))) {
      setCreateErr('Video URLs must start with http:// or https://.');
      return;
    }

    setCreating(true);
    setCreateErr(null);
    setFailedChild(null);
    try {
      // 1. Create parent first to get its id.
      const parentPayload: Partial<ExerciseRow> = {
        ...createFormToPayload({ ...createForm, slug: parentSlug }),
        name: parentName,
      };
      const parentRes = await createExercise(parentPayload);
      if (!parentRes.ok || !parentRes.row) {
        setCreateErr(parentRes.error ?? 'Parent create failed');
        return;
      }
      const parentId = parentRes.row.id;

      // 2. Create both children in parallel.
      const { leftPayload, rightPayload, leftName, rightName } =
        buildBilateralPayloads(parentName, parentSlug, parentId);

      const [leftRes, rightRes] = await Promise.all([
        createExercise(leftPayload).catch((err) => ({
          ok: false as const,
          error: err instanceof Error ? err.message : String(err),
        })),
        createExercise(rightPayload).catch((err) => ({
          ok: false as const,
          error: err instanceof Error ? err.message : String(err),
        })),
      ]);

      const leftOk = 'ok' in leftRes && leftRes.ok;
      const rightOk = 'ok' in rightRes && rightRes.ok;

      if (leftOk && rightOk) {
        await refreshCanonical();
        const leftRow = 'row' in leftRes ? leftRes.row : undefined;
        const rightRow = 'row' in rightRes ? rightRes.row : undefined;
        // Kick off video uploads for whichever sides have a file picked.
        let queuedAny = false;
        if (leftVideoFile && leftRow) {
          const jid = await uploadAndQueue(leftRow.id, leftRow.slug, leftVideoFile);
          if (jid != null) {
            setLeftMediaJobId(jid);
            queuedAny = true;
          }
        }
        if (rightVideoFile && rightRow) {
          const jid = await uploadAndQueue(rightRow.id, rightRow.slug, rightVideoFile);
          if (jid != null) {
            setRightMediaJobId(jid);
            queuedAny = true;
          }
        }
        if (queuedAny) {
          showToast(`Created bilateral pair: ${parentName} — processing videos…`);
          return; // leave drawer open
        }
        showToast(`Created bilateral pair: ${parentName}`);
        closeCreate();
        return;
      }

      // Surface which child failed; keep modal open with retry button.
      await refreshCanonical();
      if (!leftOk) {
        setFailedChild({
          side: 'L',
          payload: leftPayload,
          error: ('error' in leftRes && leftRes.error) || `Left child (${leftName}) failed`,
        });
        setCreateErr(
          `Parent created. Left child failed: ${('error' in leftRes && leftRes.error) || 'unknown error'}`,
        );
      } else if (!rightOk) {
        setFailedChild({
          side: 'R',
          payload: rightPayload,
          error: ('error' in rightRes && rightRes.error) || `Right child (${rightName}) failed`,
        });
        setCreateErr(
          `Parent created. Right child failed: ${('error' in rightRes && rightRes.error) || 'unknown error'}`,
        );
      }
    } catch (e2) {
      setCreateErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setCreating(false);
    }
  }

  async function handleRetryFailedChild() {
    if (!failedChild) return;
    setRetrying(true);
    setCreateErr(null);
    try {
      const res = await createExercise(failedChild.payload);
      if (!res.ok) {
        setCreateErr(res.error ?? `Retry failed for ${failedChild.side === 'L' ? 'Left' : 'Right'} child`);
        return;
      }
      await refreshCanonical();
      const parentName = createForm.name.trim();
      showToast(`Created bilateral pair: ${parentName}`);
      setFailedChild(null);
      // Close inline (don't go through closeCreate, which guards on `retrying`).
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);
      setCreateErr(null);
    } catch (e2) {
      setCreateErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setRetrying(false);
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
      render: (r) => {
        const name = r.name ?? '';
        const isParent = bilateralParentNames.has(name);
        const childParentName = isChildNameClient(name) ? parentNameOfClient(name) : null;
        const isChild = childParentName !== null && bilateralParentNames.has(childParentName);
        return (
          <div>
            <div style={{ fontWeight: 600, color: colors.text }}>
              {name || r.id}
              {isParent && <span style={bilateralBadgeStyle}>Bilateral</span>}
            </div>
            {isChild && childParentName && (
              <div style={childNoteStyle}>child of {childParentName}</div>
            )}
            <div style={{ fontSize: 11, color: colors.dim }}>{r.id}</div>
          </div>
        );
      },
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
      key: 'status',
      header: 'Status',
      width: 110,
      sort: (a, b) => (a.status ?? '').localeCompare(b.status ?? ''),
      render: (r) =>
        r.status ? <StatusChip status={r.status} /> : <span style={{ color: colors.dim }}>—</span>,
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
            {loading
              ? 'Loading…'
              : `${base.length} exercises · ${publishedCount} published · ${draftCount} draft · ${overrideCount} with overrides`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={refreshOverrides} disabled={loading}>
            Refresh
          </Button>
          <Button variant="primary" onClick={() => void openCreate()}>
            + Create Exercise
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
        <Select
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value as typeof fStatus)}
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
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
        open={createOpen}
        onClose={closeCreate}
        title="New exercise"
        width={780}
      >
        <form onSubmit={handleCreate}>
          {createErr && (
            <div style={errorBannerStyle}>
              {createErr}
              {failedChild && (
                <div style={{ marginTop: 8 }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleRetryFailedChild()}
                    disabled={retrying}
                  >
                    {retrying
                      ? 'Retrying…'
                      : `Retry just the failed ${failedChild.side === 'L' ? 'Left' : 'Right'} child`}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/*
            Misnamed in code: this models *unilateral* exercises (one side at a
            time, separate L/R recordings — e.g. Bulgarian split squat). True
            bilateral lifts (squat, deadlift) need only one row and don't use
            this toggle. UI label was corrected; full code rename deferred —
            see memory `project_pending_unilateral_rename.md`.
          */}
          <div style={bilateralInfoBoxStyle}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={createForm.bilateral}
                onChange={(e) => {
                  const bilateral = e.target.checked;
                  setCreateForm((f) => ({
                    ...f,
                    bilateral,
                    // Clear single-mode video when switching to L/R variants.
                    video_url: bilateral ? '' : f.video_url,
                  }));
                  setFailedChild(null);
                  setCreateErr(null);
                }}
              />
              <span>Unilateral — create Left + Right variants</span>
            </label>
            <span style={{ color: colors.muted, fontSize: 11 }}>
              For exercises trained one side at a time (e.g. Bulgarian split squat). Submits
              parent + Left + Right rows in one go. Names guaranteed to match the app&rsquo;s
              pairing regex.
            </span>
          </div>

          <datalist id="exercise-parent-options">
            {canonicalRows.map((r) => (
              <option key={r.id} value={r.name} />
            ))}
          </datalist>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            <Field label={createForm.bilateral ? 'Parent base name' : 'Name'}>
              <TextInput
                value={createForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setCreateForm((f) => ({
                    ...f,
                    name,
                    slug: f.slugTouched ? f.slug : slugifyExercise(name),
                  }));
                }}
                required
                placeholder={createForm.bilateral ? 'One Arm PullSlide' : ''}
              />
            </Field>
            <Field label="Emoji">
              <TextInput
                value={createForm.emoji}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, emoji: e.target.value }))
                }
                maxLength={4}
                placeholder="💪"
              />
            </Field>
          </div>

          <Field label="Slug" hint="lowercase_with_underscores; auto-derived unless edited">
            <TextInput
              value={createForm.slug}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  slug: slugifyExercise(e.target.value),
                  slugTouched: true,
                }))
              }
              required
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Field label="Category">
              <Select
                value={createForm.cat}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, cat: e.target.value as ExerciseCat }))
                }
              >
                <option value="gym">Gym</option>
                <option value="home">Home</option>
                <option value="mobility">Mobility</option>
              </Select>
            </Field>
            <Field label="Primary Category">
              <TextInput
                value={createForm.primary_cat}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, primary_cat: e.target.value }))
                }
                placeholder="e.g. Strength, Cardio"
              />
            </Field>
            <Field label="Subcategory">
              <TextInput
                value={createForm.subcat}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, subcat: e.target.value }))
                }
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Field label="Environment">
              <TextInput
                value={createForm.environment}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, environment: e.target.value }))
                }
                placeholder="Gym, Home, Both"
              />
            </Field>
            <Field label="Body Focus">
              <TextInput
                value={createForm.body_focus}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, body_focus: e.target.value }))
                }
                placeholder="e.g. Chest"
              />
            </Field>
            <Field label="Equipment">
              <TextInput
                value={createForm.equipment}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, equipment: e.target.value }))
                }
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Field label="Difficulty">
              <Select
                value={createForm.diff}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, diff: e.target.value as ExerciseDiff }))
                }
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </Field>
            <Field label="Variation">
              <TextInput
                value={createForm.variation}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, variation: e.target.value }))
                }
                placeholder="optional"
              />
            </Field>
            <Field label="Status">
              <Select
                value={createForm.status}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    status: e.target.value as ExerciseStatus,
                  }))
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </Field>
          </div>

          <Field label="Machine Required">
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                background: colors.bg,
                color: colors.text,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={createForm.machine_required}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, machine_required: e.target.checked }))
                }
              />
              <span>Requires a machine</span>
            </label>
          </Field>

          <Field
            label="Setup Notes"
            hint="Imperative voice. ~25–40 words. Cue posture and key form points."
          >
            <TextArea
              value={createForm.setup_notes}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, setup_notes: e.target.value }))
              }
              rows={3}
              style={{ minHeight: 80 }}
            />
          </Field>

          <Field label="Parent exercise" hint="Pick existing exercise; auto-fills parent name">
            <TextInput
              list="exercise-parent-options"
              value={createForm.parent_name}
              onChange={(e) => {
                const name = e.target.value;
                const found = canonicalRows.find((r) => r.name === name);
                setCreateForm((f) => ({
                  ...f,
                  parent_name: name,
                  parent_id: found?.id ?? '',
                }));
              }}
              placeholder="optional"
            />
          </Field>

          {createForm.bilateral ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                <Field
                  label="Side label"
                  hint='Appears after "Left"/"Right" in the child name; must be one of these to match the app&rsquo;s regex.'
                >
                  <Select
                    value={createForm.bilateral_side_label}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        bilateral_side_label: e.target.value as BilateralSideLabel,
                      }))
                    }
                  >
                    {BILATERAL_SIDE_LABELS.map((o) => (
                      <option key={o.value || 'none'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <VideoUpload
                    label="Left video (upload)"
                    selectedFile={leftVideoFile}
                    onFileSelected={setLeftVideoFile}
                    jobId={leftMediaJobId}
                    disabled={creating}
                  />
                  <Field label="…or paste a Left video URL" hint="Optional; pre-hosted MP4">
                    <TextInput
                      value={createForm.bilateral_left_video_url}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, bilateral_left_video_url: e.target.value }))
                      }
                      placeholder="https://…"
                    />
                  </Field>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <VideoUpload
                    label="Right video (upload)"
                    selectedFile={rightVideoFile}
                    onFileSelected={setRightVideoFile}
                    jobId={rightMediaJobId}
                    disabled={creating}
                  />
                  <Field label="…or paste a Right video URL" hint="Optional; pre-hosted MP4">
                    <TextInput
                      value={createForm.bilateral_right_video_url}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, bilateral_right_video_url: e.target.value }))
                      }
                      placeholder="https://…"
                    />
                  </Field>
                </div>
              </div>
              <Field label="Parent video URL (optional)" hint="Some pairs have a parent demo; many don't">
                <TextInput
                  value={createForm.video_url}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, video_url: e.target.value }))
                  }
                  placeholder="https://… (optional)"
                />
              </Field>

              {/* Live preview */}
              <div style={bilateralPreviewStyle}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  Will create 3 rows:
                </div>
                <BilateralPreview form={createForm} />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <VideoUpload
                label="Exercise video (upload)"
                selectedFile={singleVideoFile}
                onFileSelected={setSingleVideoFile}
                jobId={singleMediaJobId}
                disabled={creating}
              />
              <Field label="…or paste a video URL" hint="Optional; pre-hosted MP4">
                <TextInput
                  value={createForm.video_url}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, video_url: e.target.value }))
                  }
                  placeholder="https://…"
                />
              </Field>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
              marginTop: 18,
              paddingTop: 18,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            {(singleMediaJobId !== null ||
              leftMediaJobId !== null ||
              rightMediaJobId !== null) ? (
              // Post-create: row exists, video is uploading/processing/done.
              // Re-submitting would try to create a duplicate, so swap to a
              // "Done" button that just closes the drawer.
              <Button
                type="button"
                variant="primary"
                onClick={async () => {
                  await refreshCanonical();
                  closeCreate();
                }}
              >
                Done
              </Button>
            ) : (
              <>
                <Button type="button" variant="ghost" onClick={closeCreate} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={creating || retrying}>
                  {creating
                    ? createForm.bilateral
                      ? 'Creating pair…'
                      : 'Creating…'
                    : createForm.bilateral
                    ? 'Create bilateral pair'
                    : 'Create exercise'}
                </Button>
              </>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={closeEdit}
        title={editing ? `Edit · ${str(editing.name) || editing.id}` : 'Edit'}
        width={900}
      >
        {editing &&
          form &&
          (() => {
            // Determine bilateral relationship info for the info row.
            const editingName = str(editing.name);
            const isParent = bilateralParentNames.has(editingName);
            const childParent = isChildNameClient(editingName)
              ? parentNameOfClient(editingName)
              : null;
            const isChild =
              childParent !== null && bilateralParentNames.has(childParent);
            const pair = isParent ? bilateralChildrenByParent.get(editingName) : null;
            let bilateralInfo: BilateralInfo | null = null;
            if (isParent && pair) {
              bilateralInfo = {
                kind: 'parent',
                leftName: pair.L?.name ?? '(missing)',
                rightName: pair.R?.name ?? '(missing)',
              };
            } else if (isChild && childParent) {
              bilateralInfo = { kind: 'child', parentName: childParent };
            }
            const isCanonical = findCanonicalForEditing(editing) !== null;
            return (
              <EditForm
                base={editing}
                form={form}
                setForm={setForm}
                modalErr={modalErr}
                saving={saving}
                uploadingVideo={uploadingVideo}
                uploadingThumb={uploadingThumb}
                hasOverride={overridesById.has(editing.id)}
                isCanonical={isCanonical}
                videoInputRef={videoInputRef}
                thumbInputRef={thumbInputRef}
                onVideoFile={handleVideoFile}
                onThumbFile={handleThumbFile}
                onSave={handleSave}
                onClearOverride={handleClearOverride}
                onDeleteExercise={handleDeleteExercise}
                onCancel={closeEdit}
                bilateralInfo={bilateralInfo}
                voiceoverVoice={voiceoverVoice}
                onVoiceoverVoiceChange={setVoiceoverVoice}
                voiceoverJobId={voiceoverJobId}
                voiceoverStatusVisible={voiceoverStatusVisible}
                voiceoverErr={voiceoverErr}
                voiceoverQueuing={voiceoverQueuing}
                onGenerateVoiceover={handleGenerateVoiceover}
                onVoiceoverDone={handleVoiceoverDone}
                onVoiceoverError={handleVoiceoverError}
                deleteVideoJobId={deleteVideoJobId}
                deleteVideoStatusVisible={deleteVideoStatusVisible}
                deleteVideoErr={deleteVideoErr}
                deleteVideoQueuing={deleteVideoQueuing}
                onDeleteVideo={handleDeleteVideo}
                onDeleteVideoDone={handleDeleteVideoDone}
                onDeleteVideoError={handleDeleteVideoError}
              />
            );
          })()}
      </Modal>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: colors.text,
            color: colors.bg,
            padding: '12px 18px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 6px 22px rgba(0,0,0,0.25)',
            zIndex: 1000,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// Read-only bilateral relationship descriptor passed into EditForm.
type BilateralInfo =
  | { kind: 'parent'; leftName: string; rightName: string }
  | { kind: 'child'; parentName: string };

// ── Bilateral live preview ────────────────────────────────────────────────

function BilateralPreview({ form }: { form: CreateFormState }) {
  const parentName = form.name.trim() || '<parent name>';
  const baseSlug = (form.slug || slugifyExercise(form.name)).trim() || '<slug>';
  const label = form.bilateral_side_label;
  const leftName = form.name.trim() ? bilateralChildName(parentName, 'Left', label) : `<parent name> — Left${label ? ` ${label}` : ''}`;
  const rightName = form.name.trim() ? bilateralChildName(parentName, 'Right', label) : `<parent name> — Right${label ? ` ${label}` : ''}`;
  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '24px 1fr auto',
    gap: 10,
    padding: '4px 0',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    color: colors.text,
  };
  const numStyle: React.CSSProperties = { color: colors.muted, textAlign: 'right' };
  const tagStyle: React.CSSProperties = { color: colors.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 };
  return (
    <div>
      <div style={rowStyle}>
        <span style={numStyle}>1.</span>
        <span>
          <strong>{parentName}</strong>{' '}
          <span style={{ color: colors.dim, fontSize: 10 }}>({baseSlug})</span>
        </span>
        <span style={tagStyle}>parent</span>
      </div>
      <div style={rowStyle}>
        <span style={numStyle}>2.</span>
        <span>
          {leftName}{' '}
          <span style={{ color: colors.dim, fontSize: 10 }}>({baseSlug}_left)</span>
        </span>
        <span style={tagStyle}>child · L</span>
      </div>
      <div style={rowStyle}>
        <span style={numStyle}>3.</span>
        <span>
          {rightName}{' '}
          <span style={{ color: colors.dim, fontSize: 10 }}>({baseSlug}_right)</span>
        </span>
        <span style={tagStyle}>child · R</span>
      </div>
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
  isCanonical,
  videoInputRef,
  thumbInputRef,
  onVideoFile,
  onThumbFile,
  onSave,
  onClearOverride,
  onDeleteExercise,
  onCancel,
  bilateralInfo,
  voiceoverVoice,
  onVoiceoverVoiceChange,
  voiceoverJobId,
  voiceoverStatusVisible,
  voiceoverErr,
  voiceoverQueuing,
  onGenerateVoiceover,
  onVoiceoverDone,
  onVoiceoverError,
  deleteVideoJobId,
  deleteVideoStatusVisible,
  deleteVideoErr,
  deleteVideoQueuing,
  onDeleteVideo,
  onDeleteVideoDone,
  onDeleteVideoError,
}: {
  base: Exercise;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState | null>>;
  modalErr: string | null;
  saving: boolean;
  uploadingVideo: boolean;
  uploadingThumb: boolean;
  hasOverride: boolean;
  isCanonical: boolean;
  videoInputRef: React.MutableRefObject<HTMLInputElement | null>;
  thumbInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onVideoFile: (f: File) => void;
  onThumbFile: (f: File) => void;
  onSave: () => void;
  onClearOverride: () => void;
  onDeleteExercise: () => void;
  onCancel: () => void;
  bilateralInfo: BilateralInfo | null;
  voiceoverVoice: TtsVoice;
  onVoiceoverVoiceChange: (v: TtsVoice) => void;
  voiceoverJobId: number | null;
  voiceoverStatusVisible: boolean;
  voiceoverErr: string | null;
  voiceoverQueuing: boolean;
  onGenerateVoiceover: () => void;
  onVoiceoverDone: (job: import('../../lib/adminApi').MediaJobRow) => void;
  onVoiceoverError: (job: import('../../lib/adminApi').MediaJobRow) => void;
  deleteVideoJobId: number | null;
  deleteVideoStatusVisible: boolean;
  deleteVideoErr: string | null;
  deleteVideoQueuing: boolean;
  onDeleteVideo: () => void;
  onDeleteVideoDone: (job: import('../../lib/adminApi').MediaJobRow) => void;
  onDeleteVideoError: (job: import('../../lib/adminApi').MediaJobRow) => void;
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
      <div style={savePathRowStyle}>
        {isCanonical ? (
          <>
            <span style={canonicalPillStyle}>Canonical</span>
            <span>Save writes to the <code>exercises</code> table.</span>
          </>
        ) : (
          <>
            <span style={legacyPillStyle}>Legacy override</span>
            <span>
              Save writes via <code>exercise_overrides</code> patch layer.
            </span>
          </>
        )}
      </div>

      {modalErr && (
        <div style={errorBannerStyle} role="alert">
          {modalErr}
        </div>
      )}

      {bilateralInfo && (
        <div
          style={{
            background: 'rgba(80, 200, 120, 0.08)',
            border: '1px solid rgba(80, 200, 120, 0.35)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 14,
            fontSize: 13,
            color: colors.text,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span style={bilateralBadgeStyle}>Bilateral</span>
          {bilateralInfo.kind === 'parent' ? (
            <span>
              Bilateral parent — children:{' '}
              <strong>{bilateralInfo.leftName}</strong>,{' '}
              <strong>{bilateralInfo.rightName}</strong>
            </span>
          ) : (
            <span>
              Bilateral child of <strong>{bilateralInfo.parentName}</strong>
            </span>
          )}
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

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
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
            {form.videoUrl && (
              <Button
                variant="danger"
                onClick={onDeleteVideo}
                disabled={isUploading || saving || deleteVideoQueuing || deleteVideoJobId !== null}
              >
                {deleteVideoQueuing ? 'Queuing…' : 'Delete video'}
              </Button>
            )}
          </div>

          {deleteVideoErr && (
            <div style={{ ...errorBannerStyle, marginBottom: 12 }} role="alert">
              {deleteVideoErr}
            </div>
          )}
          {deleteVideoStatusVisible && deleteVideoJobId !== null && (
            <div style={{ marginBottom: 16 }}>
              <MediaJobStatus
                jobId={deleteVideoJobId}
                onDone={onDeleteVideoDone}
                onError={onDeleteVideoError}
              />
            </div>
          )}

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

          <VoiceoverPanel
            hasVideo={Boolean(form.videoUrl)}
            hasSetupNotes={form.setupNotes.trim().length > 0}
            voice={voiceoverVoice}
            onVoiceChange={onVoiceoverVoiceChange}
            jobId={voiceoverJobId}
            statusVisible={voiceoverStatusVisible}
            err={voiceoverErr}
            queuing={voiceoverQueuing}
            onGenerate={onGenerateVoiceover}
            onDone={onVoiceoverDone}
            onError={onVoiceoverError}
            disabled={saving || isUploading}
          />

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

          <Field
            label="Visibility"
            hint="Draft or Archived hides this exercise on web + app (soft hide); Published makes it visible. Use Delete exercise below for a permanent removal."
          >
            <Select value={form.status || 'draft'} onChange={(e) => update('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>

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
          {isCanonical && (
            <Button variant="danger" onClick={onDeleteExercise} disabled={saving || isUploading}>
              Delete exercise
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

// ── Voiceover panel (sits inside EditForm) ────────────────────────────────

function VoiceoverPanel({
  hasVideo,
  hasSetupNotes,
  voice,
  onVoiceChange,
  jobId,
  statusVisible,
  err,
  queuing,
  onGenerate,
  onDone,
  onError,
  disabled,
}: {
  hasVideo: boolean;
  hasSetupNotes: boolean;
  voice: TtsVoice;
  onVoiceChange: (v: TtsVoice) => void;
  jobId: number | null;
  statusVisible: boolean;
  err: string | null;
  queuing: boolean;
  onGenerate: () => void;
  onDone: (job: import('../../lib/adminApi').MediaJobRow) => void;
  onError: (job: import('../../lib/adminApi').MediaJobRow) => void;
  disabled: boolean;
}) {
  const eligible = hasVideo && hasSetupNotes;

  const wrapperStyle: React.CSSProperties = {
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  };

  const headerStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  };

  const errorStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#fca5a5',
    background: 'rgba(220, 38, 38, 0.08)',
    border: '1px solid rgba(220, 38, 38, 0.4)',
    borderRadius: 8,
    padding: '6px 10px',
  };

  const hintStyle: React.CSSProperties = {
    fontSize: 11,
    color: colors.muted,
    fontStyle: 'italic',
  };

  return (
    <div style={wrapperStyle}>
      <span style={headerStyle}>Voiceover</span>
      <div style={rowStyle}>
        <Select
          value={voice}
          onChange={(e) => onVoiceChange(e.target.value as TtsVoice)}
          disabled={disabled || queuing || !eligible}
          style={{ width: 110 }}
        >
          {TTS_VOICES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          onClick={onGenerate}
          disabled={disabled || queuing || !eligible}
        >
          {queuing ? 'Queuing…' : 'Generate voiceover'}
        </Button>
        {!eligible && (
          <span style={hintStyle}>
            Voiceover requires a video and setupNotes.
          </span>
        )}
      </div>
      {err && <div style={errorStyle}>{err}</div>}
      {statusVisible && jobId != null && (
        <MediaJobStatus jobId={jobId} onDone={onDone} onError={onError} />
      )}
    </div>
  );
}
