import { useEffect, useMemo, useState } from 'react';
import {
  listWorkoutOverrides,
  replaceWorkoutOverride,
  deleteWorkoutOverride,
  createWorkout,
  updateWorkout,
  listWorkouts,
  listExercises,
  type WorkoutOverride,
  type WorkoutRow,
  type WorkoutBlockEntry,
  type ExerciseRow,
  type ContentStatus,
} from '../../lib/adminApi';
import { errMessage } from '../../lib/errors';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { Field, TextInput, Select, Button } from '../../components/admin/FormField';
import { Modal } from '../../components/admin/Modal';
import { StatusChip } from '../../components/admin/StatusChip';
import { colors } from '../../theme';

// ── Types ────────────────────────────────────────────────────────────────

type WorkoutStep = { exercise: string; sets: string; reps: string };

type Workout = {
  id: string;
  name: string;
  cat: string;
  subcat: string;
  dur: number;
  diff: string;
  emoji: string;
  warmup: WorkoutStep[];
  main: WorkoutStep[];
  cooldown: WorkoutStep[];
};

type ExerciseLite = { id: string; name: string };

type Phase = 'warmup' | 'main' | 'cooldown';

type DurationBucket = 'all' | 'short' | 'medium' | 'long';

// ── Helpers ──────────────────────────────────────────────────────────────

const BARLOW: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

function mergeWorkout(base: Workout, patch: Record<string, unknown> | undefined): Workout {
  if (!patch) return base;
  return { ...base, ...(patch as Partial<Workout>) };
}

function computeDiff(base: Workout, edited: Workout): Record<string, unknown> {
  const diff: Record<string, unknown> = {};
  const scalarKeys: (keyof Workout)[] = ['name', 'cat', 'subcat', 'dur', 'diff', 'emoji'];
  for (const k of scalarKeys) {
    if (base[k] !== edited[k]) diff[k] = edited[k];
  }
  const arrayKeys: Phase[] = ['warmup', 'main', 'cooldown'];
  for (const k of arrayKeys) {
    if (JSON.stringify(base[k] ?? []) !== JSON.stringify(edited[k] ?? [])) {
      diff[k] = edited[k];
    }
  }
  return diff;
}

// ── Create form (canonical workouts) ─────────────────────────────────────

type CreateCat =
  | 'gym'
  | 'home'
  | 'mobility'
  | 'cardio'
  | 'stretching'
  | 'morning routine';

type CreateDiff = 'beginner' | 'intermediate' | 'advanced';
type CreateStatus = 'draft' | 'published';

type CreateBlockEntry = {
  exercise_id: string | null;
  exercise_name: string;
  sets: string;
  reps: string;
};

type CreateFormState = {
  name: string;
  slug: string;
  slugTouched: boolean;
  cat: CreateCat;
  subcat: string;
  dur: string;
  diff: CreateDiff;
  emoji: string;
  status: CreateStatus;
  warmup: CreateBlockEntry[];
  main: CreateBlockEntry[];
  cooldown: CreateBlockEntry[];
};

const EMPTY_CREATE_FORM: CreateFormState = {
  name: '',
  slug: '',
  slugTouched: false,
  cat: 'gym',
  subcat: '',
  dur: '',
  diff: 'beginner',
  emoji: '🏋️',
  status: 'draft',
  warmup: [],
  main: [],
  cooldown: [],
};

function slugifyWorkout(input: string): string {
  const core = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  if (!core) return '';
  return core.startsWith('wk_') ? core : `wk_${core}`;
}

function toBlockEntries(rows: CreateBlockEntry[]): WorkoutBlockEntry[] {
  return rows.map((r) => ({
    exercise_id: r.exercise_id,
    exercise_name: r.exercise_name,
    sets: r.sets,
    reps: r.reps,
  }));
}

function createFormToPayload(f: CreateFormState): Partial<WorkoutRow> {
  return {
    name: f.name.trim(),
    slug: (f.slug || slugifyWorkout(f.name)).trim(),
    cat: f.cat,
    subcat: f.subcat.trim() || null,
    dur: f.dur.trim() ? Number(f.dur) : null,
    diff: f.diff,
    emoji: f.emoji.trim() || '🏋️',
    warmup: toBlockEntries(f.warmup),
    main: toBlockEntries(f.main),
    cooldown: toBlockEntries(f.cooldown),
    status: f.status,
  };
}

function EditedChip() {
  return (
    <span
      style={{
        ...BARLOW,
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        background: colors.accentDim,
        color: colors.accent,
      }}
    >
      Edited
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export function WorkoutsPage() {
  const [baseWorkouts, setBaseWorkouts] = useState<Workout[]>([]);
  const [overrides, setOverrides] = useState<WorkoutOverride[]>([]);
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [diffFilter, setDiffFilter] = useState<string>('all');
  const [durFilter, setDurFilter] = useState<DurationBucket>('all');
  const [overrideOnly, setOverrideOnly] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Create modal state (canonical workouts table)
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [canonicalWorkouts, setCanonicalWorkouts] = useState<WorkoutRow[]>([]);
  const [canonicalExercises, setCanonicalExercises] = useState<ExerciseRow[]>([]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Initial parallel fetch
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [workoutsRes, ovs, exRes] = await Promise.all([
          fetch('/workouts.json').then((r) => {
            if (!r.ok) throw new Error(`workouts.json: ${r.status}`);
            return r.json() as Promise<Workout[]>;
          }),
          listWorkoutOverrides(),
          fetch('/exercises.json')
            .then((r) => (r.ok ? (r.json() as Promise<ExerciseLite[]>) : []))
            .catch(() => [] as ExerciseLite[]),
        ]);
        if (!alive) return;
        setBaseWorkouts(workoutsRes);
        setOverrides(ovs);
        setExerciseNames(Array.from(new Set(exRes.map((e) => e.name))).sort());
      } catch (e) {
        if (alive) setError(errMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const refreshOverrides = async () => {
    try {
      const ovs = await listWorkoutOverrides();
      setOverrides(ovs);
    } catch (e) {
      setError(errMessage(e));
    }
  };

  // Create flow (canonical workouts) ────────────────────────────────────────
  const refreshCanonical = async () => {
    try {
      const [wks, exs] = await Promise.all([listWorkouts(), listExercises()]);
      setCanonicalWorkouts(wks);
      setCanonicalExercises(exs);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('refreshCanonical failed:', e);
    }
  };

  const openCreate = async () => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateErr(null);
    setCreateOpen(true);
    await refreshCanonical();
  };

  const closeCreate = () => {
    if (creating) return;
    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateErr(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = createForm.name.trim();
    if (!name) {
      setCreateErr('Name is required.');
      return;
    }
    const slug = (createForm.slug || slugifyWorkout(name)).trim();
    if (!slug) {
      setCreateErr('Slug is required.');
      return;
    }
    if (canonicalWorkouts.some((w) => w.slug === slug)) {
      setCreateErr(`Slug "${slug}" is already in use — pick another.`);
      return;
    }
    if (createForm.dur.trim()) {
      const n = Number(createForm.dur);
      if (!Number.isFinite(n) || n < 0) {
        setCreateErr('Duration must be a non-negative number.');
        return;
      }
    }
    setCreating(true);
    setCreateErr(null);
    try {
      const payload = createFormToPayload({ ...createForm, slug });
      const res = await createWorkout(payload);
      if (!res.ok) {
        setCreateErr(res.error ?? 'Create failed');
        return;
      }
      await refreshCanonical();
      closeCreate();
    } catch (e2) {
      setCreateErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setCreating(false);
    }
  };

  const overrideMap = useMemo(() => {
    const m = new Map<string, WorkoutOverride>();
    for (const o of overrides) m.set(o.id, o);
    return m;
  }, [overrides]);

  // Lookup canonical workouts by id and slug for status display + status edits.
  // Bundled `workouts.json` and Supabase use different id conventions, so check
  // both id and slug like ExercisesPage does.
  const canonicalByKey = useMemo(() => {
    const byId = new Map<string, WorkoutRow>();
    const bySlug = new Map<string, WorkoutRow>();
    for (const r of canonicalWorkouts) {
      byId.set(r.id, r);
      if (r.slug) bySlug.set(r.slug, r);
    }
    return { byId, bySlug };
  }, [canonicalWorkouts]);

  function findCanonical(w: Workout): WorkoutRow | null {
    return canonicalByKey.byId.get(w.id) ?? canonicalByKey.bySlug.get(w.id) ?? null;
  }

  // Refresh canonical workouts on mount so the status column populates without
  // forcing the user to open the create modal first.
  useEffect(() => {
    void refreshCanonical();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Merged list
  const mergedWorkouts = useMemo<Workout[]>(() => {
    return baseWorkouts.map((w) => mergeWorkout(w, overrideMap.get(w.id)?.patch));
  }, [baseWorkouts, overrideMap]);

  // Filtered
  const filtered = useMemo(() => {
    return mergedWorkouts.filter((w) => {
      if (overrideOnly && !overrideMap.has(w.id)) return false;
      if (catFilter !== 'all' && w.cat !== catFilter) return false;
      if (diffFilter !== 'all' && w.diff !== diffFilter) return false;
      if (durFilter === 'short' && !(w.dur <= 20)) return false;
      if (durFilter === 'medium' && !(w.dur > 20 && w.dur <= 45)) return false;
      if (durFilter === 'long' && !(w.dur > 45)) return false;
      if (debouncedSearch) {
        const hay = `${w.name} ${w.subcat}`.toLowerCase();
        if (!hay.includes(debouncedSearch)) return false;
      }
      return true;
    });
  }, [mergedWorkouts, overrideMap, catFilter, diffFilter, durFilter, overrideOnly, debouncedSearch]);

  const editingBase = useMemo(
    () => (editingId ? baseWorkouts.find((w) => w.id === editingId) ?? null : null),
    [editingId, baseWorkouts]
  );

  const editingMerged = useMemo(
    () => (editingId ? mergedWorkouts.find((w) => w.id === editingId) ?? null : null),
    [editingId, mergedWorkouts]
  );

  // Columns
  const columns: Column<Workout>[] = [
    {
      key: 'emoji',
      header: '',
      width: 52,
      render: (r) => <span style={{ fontSize: 22 }}>{r.emoji || '•'}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span>,
      sort: (a, b) => a.name.localeCompare(b.name),
    },
    {
      key: 'cat',
      header: 'Cat',
      width: 90,
      render: (r) => <span style={{ color: colors.muted }}>{r.cat}</span>,
      sort: (a, b) => a.cat.localeCompare(b.cat),
    },
    {
      key: 'subcat',
      header: 'Subcat',
      width: 120,
      render: (r) => <span style={{ color: colors.muted }}>{r.subcat}</span>,
      sort: (a, b) => a.subcat.localeCompare(b.subcat),
    },
    {
      key: 'dur',
      header: 'Duration',
      width: 90,
      align: 'right',
      render: (r) => (
        <span style={{ ...BARLOW, fontSize: 15, fontWeight: 700 }}>{r.dur} min</span>
      ),
      sort: (a, b) => a.dur - b.dur,
    },
    {
      key: 'diff',
      header: 'Difficulty',
      width: 110,
      render: (r) => <span style={{ color: colors.muted, textTransform: 'capitalize' }}>{r.diff}</span>,
      sort: (a, b) => a.diff.localeCompare(b.diff),
    },
    {
      key: 'count',
      header: 'Exercises',
      width: 90,
      align: 'right',
      render: (r) => (
        <span style={{ color: colors.muted }}>
          {(r.warmup?.length ?? 0) + (r.main?.length ?? 0) + (r.cooldown?.length ?? 0)}
        </span>
      ),
      sort: (a, b) =>
        (a.warmup?.length ?? 0) + (a.main?.length ?? 0) + (a.cooldown?.length ?? 0) -
        ((b.warmup?.length ?? 0) + (b.main?.length ?? 0) + (b.cooldown?.length ?? 0)),
    },
    {
      key: 'status',
      header: 'Status',
      width: 110,
      render: (r) => {
        const c = findCanonical(r);
        return c ? <StatusChip status={c.status} /> : <span style={{ color: colors.dim }}>—</span>;
      },
      sort: (a, b) =>
        (findCanonical(a)?.status ?? '').localeCompare(findCanonical(b)?.status ?? ''),
    },
    {
      key: 'override',
      header: 'Override',
      width: 90,
      render: (r) => (overrideMap.has(r.id) ? <EditedChip /> : <span style={{ color: colors.dim }}>—</span>),
    },
    {
      key: 'actions',
      header: '',
      width: 90,
      align: 'right',
      render: () => (
        <span style={{ color: colors.accent, fontWeight: 700, fontSize: 12 }}>Edit →</span>
      ),
    },
  ];

  const overrideCount = overrides.length;
  const publishedCount = canonicalWorkouts.filter((r) => r.status === 'published').length;
  const draftCount = canonicalWorkouts.filter((r) => r.status === 'draft').length;

  return (
    <div style={{ padding: '24px 28px', color: colors.text }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              ...BARLOW,
              margin: 0,
              fontSize: 36,
              fontWeight: 700,
              color: colors.text,
            }}
          >
            Workouts
          </h1>
          <div style={{ marginTop: 6, color: colors.muted, fontSize: 13 }}>
            {baseWorkouts.length} workouts · {publishedCount} published · {draftCount} draft · {overrideCount} with overrides
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={refreshOverrides} disabled={loading}>
            Refresh
          </Button>
          <Button variant="primary" onClick={() => void openCreate()}>
            + Create Workout
          </Button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            background: colors.errorDim,
            border: `1px solid ${colors.error}`,
            color: colors.error,
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
          gap: 12,
          marginBottom: 16,
          alignItems: 'center',
        }}
      >
        <TextInput
          placeholder="Search name or subcat…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="all">All cats</option>
          <option value="Gym">Gym</option>
          <option value="Home">Home</option>
          <option value="Mobility">Mobility</option>
        </Select>
        <Select value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)}>
          <option value="all">All difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>
        <Select value={durFilter} onChange={(e) => setDurFilter(e.target.value as DurationBucket)}>
          <option value="all">Any duration</option>
          <option value="short">≤ 20 min</option>
          <option value="medium">20–45 min</option>
          <option value="long">&gt; 45 min</option>
        </Select>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: colors.muted,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <input
            type="checkbox"
            checked={overrideOnly}
            onChange={(e) => setOverrideOnly(e.target.checked)}
          />
          Has override
        </label>
      </div>

      {/* Table */}
      <DataTable<Workout>
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => setEditingId(r.id)}
        emptyLabel={loading ? 'Loading…' : 'No workouts match those filters.'}
      />

      {/* Create modal (canonical workouts) */}
      <Modal
        open={createOpen}
        onClose={closeCreate}
        title="New workout"
        width={900}
      >
        <form onSubmit={handleCreate}>
          {createErr && (
            <div
              style={{
                padding: '10px 14px',
                background: colors.errorDim,
                border: `1px solid ${colors.error}`,
                color: colors.error,
                borderRadius: 10,
                marginBottom: 16,
                fontSize: 13,
              }}
              role="alert"
            >
              {createErr}
            </div>
          )}

          <datalist id="workout-create-exercise-options">
            {canonicalExercises.map((ex) => (
              <option key={ex.id} value={ex.name} />
            ))}
          </datalist>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            <Field label="Name">
              <TextInput
                value={createForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setCreateForm((f) => ({
                    ...f,
                    name,
                    slug: f.slugTouched ? f.slug : slugifyWorkout(name),
                  }));
                }}
                required
              />
            </Field>
            <Field label="Emoji">
              <TextInput
                value={createForm.emoji}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, emoji: e.target.value }))
                }
                maxLength={4}
              />
            </Field>
          </div>

          <Field label="Slug" hint="auto-prefixed wk_…; editable">
            <TextInput
              value={createForm.slug}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  slug: slugifyWorkout(e.target.value),
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
                  setCreateForm((f) => ({ ...f, cat: e.target.value as CreateCat }))
                }
              >
                <option value="gym">Gym</option>
                <option value="home">Home</option>
                <option value="mobility">Mobility</option>
                <option value="cardio">Cardio</option>
                <option value="stretching">Stretching</option>
                <option value="morning routine">Morning Routine</option>
              </Select>
            </Field>
            <Field label="Subcategory">
              <TextInput
                value={createForm.subcat}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, subcat: e.target.value }))
                }
              />
            </Field>
            <Field label="Duration (min)">
              <TextInput
                type="number"
                min={0}
                value={createForm.dur}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, dur: e.target.value }))
                }
                placeholder="30"
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Difficulty">
              <Select
                value={createForm.diff}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, diff: e.target.value as CreateDiff }))
                }
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={createForm.status}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    status: e.target.value as CreateStatus,
                  }))
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </Field>
          </div>

          <CreateBlockSection
            label="Warmup"
            rows={createForm.warmup}
            exercises={canonicalExercises}
            onChange={(rows) => setCreateForm((f) => ({ ...f, warmup: rows }))}
            datalistId="workout-create-exercise-options"
          />
          <CreateBlockSection
            label="Main"
            rows={createForm.main}
            exercises={canonicalExercises}
            onChange={(rows) => setCreateForm((f) => ({ ...f, main: rows }))}
            datalistId="workout-create-exercise-options"
          />
          <CreateBlockSection
            label="Cooldown"
            rows={createForm.cooldown}
            exercises={canonicalExercises}
            onChange={(rows) => setCreateForm((f) => ({ ...f, cooldown: rows }))}
            datalistId="workout-create-exercise-options"
          />

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
            <Button type="button" variant="ghost" onClick={closeCreate} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create workout'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      {editingBase && editingMerged && (
        <EditWorkoutModal
          open={true}
          base={editingBase}
          initial={editingMerged}
          hasOverride={overrideMap.has(editingBase.id)}
          canonical={findCanonical(editingBase)}
          exerciseNames={exerciseNames}
          onClose={() => setEditingId(null)}
          onSaved={async () => {
            await Promise.all([refreshOverrides(), refreshCanonical()]);
            setEditingId(null);
          }}
          onClearOverride={async () => {
            await deleteWorkoutOverride(editingBase.id);
            await refreshOverrides();
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

// ── Edit modal ───────────────────────────────────────────────────────────

function EditWorkoutModal({
  open,
  base,
  initial,
  hasOverride,
  canonical,
  exerciseNames,
  onClose,
  onSaved,
  onClearOverride,
}: {
  open: boolean;
  base: Workout;
  initial: Workout;
  hasOverride: boolean;
  canonical: WorkoutRow | null;
  exerciseNames: string[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onClearOverride: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<Workout>(initial);
  const [status, setStatus] = useState<ContentStatus>(canonical?.status ?? 'published');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Reset form whenever the workout being edited changes
  useEffect(() => {
    setForm(initial);
    setStatus(canonical?.status ?? 'published');
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);

  const setField = <K extends keyof Workout>(k: K, v: Workout[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const setPhase = (phase: Phase, rows: WorkoutStep[]) =>
    setForm((prev) => ({ ...prev, [phase]: rows }));

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      const diff = computeDiff(base, form);
      const overrideHasChanges = Object.keys(diff).length > 0;
      const statusChanged = canonical !== null && status !== canonical.status;

      if (overrideHasChanges) {
        await replaceWorkoutOverride(base.id, diff);
      }
      if (statusChanged && canonical) {
        const res = await updateWorkout(canonical.id, { status });
        if (!res.ok) {
          setErr(res.error ?? 'Status update failed');
          return;
        }
      }
      await onSaved();
    } catch (e) {
      setErr(errMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const clearOv = async () => {
    setSaving(true);
    setErr(null);
    try {
      await onClearOverride();
    } catch (e) {
      setErr(errMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const datalistId = 'exercise-names-datalist';

  return (
    <Modal open={open} onClose={onClose} title={`Edit · ${base.name}`} width={900}>
      {/* Shared datalist for exercise name suggestions */}
      <datalist id={datalistId}>
        {exerciseNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {err && (
        <div
          style={{
            padding: '10px 14px',
            background: colors.errorDim,
            border: `1px solid ${colors.error}`,
            color: colors.error,
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {err}
        </div>
      )}

      {/* Top fields grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div style={{ gridColumn: 'span 6' }}>
          <Field label="Name">
            <TextInput value={form.name} onChange={(e) => setField('name', e.target.value)} />
          </Field>
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <Field label="Category">
            <Select value={form.cat} onChange={(e) => setField('cat', e.target.value)}>
              <option value="Gym">Gym</option>
              <option value="Home">Home</option>
              <option value="Mobility">Mobility</option>
            </Select>
          </Field>
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <Field label="Subcategory">
            <TextInput value={form.subcat} onChange={(e) => setField('subcat', e.target.value)} />
          </Field>
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <Field label="Duration (min)">
            <TextInput
              type="number"
              value={form.dur}
              onChange={(e) => setField('dur', Number(e.target.value) || 0)}
            />
          </Field>
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <Field label="Difficulty">
            <Select value={form.diff} onChange={(e) => setField('diff', e.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </Field>
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <Field label="Emoji">
            <TextInput value={form.emoji} onChange={(e) => setField('emoji', e.target.value)} />
          </Field>
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <Field
            label="Visibility"
            hint={
              canonical
                ? 'Draft hides this workout on web + app.'
                : 'Bundled-only — save another change first to make it editable.'
            }
          >
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContentStatus)}
              disabled={!canonical}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
        </div>
        <div style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 12, color: colors.dim, marginBottom: 20 }}>
            ID: <span style={{ color: colors.muted }}>{base.id}</span>
          </div>
        </div>
      </div>

      {/* Phase sections */}
      <PhaseSection
        label="Warmup"
        rows={form.warmup ?? []}
        onChange={(rows) => setPhase('warmup', rows)}
        datalistId={datalistId}
      />
      <PhaseSection
        label="Main"
        rows={form.main ?? []}
        onChange={(rows) => setPhase('main', rows)}
        datalistId={datalistId}
      />
      <PhaseSection
        label="Cooldown"
        rows={form.cooldown ?? []}
        onChange={(rows) => setPhase('cooldown', rows)}
        datalistId={datalistId}
      />

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          marginTop: 20,
          paddingTop: 16,
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        {hasOverride && (
          <Button variant="danger" onClick={clearOv} disabled={saving}>
            Clear override
          </Button>
        )}
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  );
}

// ── Phase section ────────────────────────────────────────────────────────

function PhaseSection({
  label,
  rows,
  onChange,
  datalistId,
}: {
  label: string;
  rows: WorkoutStep[];
  onChange: (rows: WorkoutStep[]) => void;
  datalistId: string;
}) {
  const addRow = () => onChange([...rows, { exercise: '', sets: '', reps: '' }]);
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<WorkoutStep>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
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
            ...BARLOW,
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: colors.text,
          }}
        >
          {label} <span style={{ color: colors.dim, fontWeight: 400 }}>({rows.length})</span>
        </h3>
        <Button variant="secondary" onClick={addRow} style={{ padding: '6px 12px', fontSize: 12 }}>
          + Add row
        </Button>
      </div>

      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: colors.dim, padding: '8px 2px' }}>
          No {label.toLowerCase()} exercises. Click “+ Add row” to add one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 80px auto',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <div>
                <TextInput
                  list={datalistId}
                  placeholder="Exercise name"
                  value={row.exercise}
                  onChange={(e) => updateRow(i, { exercise: e.target.value })}
                />
              </div>
              <TextInput
                placeholder="Sets"
                value={row.sets}
                onChange={(e) => updateRow(i, { sets: e.target.value })}
              />
              <TextInput
                placeholder="Reps"
                value={row.reps}
                onChange={(e) => updateRow(i, { reps: e.target.value })}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <IconBtn
                  label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  glyph="↑"
                />
                <IconBtn
                  label="Move down"
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                  glyph="↓"
                />
                <IconBtn label="Remove" onClick={() => removeRow(i)} glyph="✕" danger />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 11, color: colors.dim }}>
        Must match an exercise name from the library exactly.
      </div>
    </div>
  );
}

// ── Create-mode block section (resolves picks to {id, name}) ─────────────

function CreateBlockSection({
  label,
  rows,
  exercises,
  onChange,
  datalistId,
}: {
  label: string;
  rows: CreateBlockEntry[];
  exercises: ExerciseRow[];
  onChange: (rows: CreateBlockEntry[]) => void;
  datalistId: string;
}) {
  const addRow = () =>
    onChange([
      ...rows,
      { exercise_id: null, exercise_name: '', sets: '', reps: '' },
    ]);
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<CreateBlockEntry>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
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
            ...BARLOW,
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: colors.text,
          }}
        >
          {label}{' '}
          <span style={{ color: colors.dim, fontWeight: 400 }}>({rows.length})</span>
        </h3>
        <Button
          type="button"
          variant="secondary"
          onClick={addRow}
          style={{ padding: '6px 12px', fontSize: 12 }}
        >
          + Add exercise
        </Button>
      </div>

      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: colors.dim, padding: '8px 2px' }}>
          No {label.toLowerCase()} exercises. Click “+ Add exercise” to add one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 100px auto',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <TextInput
                list={datalistId}
                placeholder="Exercise name"
                value={row.exercise_name}
                onChange={(e) => {
                  const name = e.target.value;
                  const found = exercises.find((ex) => ex.name === name) ?? null;
                  updateRow(i, {
                    exercise_name: name,
                    exercise_id: found?.id ?? null,
                  });
                }}
              />
              <TextInput
                placeholder="3"
                value={row.sets}
                onChange={(e) => updateRow(i, { sets: e.target.value })}
              />
              <TextInput
                placeholder="8 reps"
                value={row.reps}
                onChange={(e) => updateRow(i, { reps: e.target.value })}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <IconBtn
                  label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  glyph="↑"
                />
                <IconBtn
                  label="Move down"
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                  glyph="↓"
                />
                <IconBtn
                  label="Remove"
                  onClick={() => removeRow(i)}
                  glyph="✕"
                  danger
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 11, color: colors.dim }}>
        Pick from existing exercises; unmatched names are stored as unresolved
        references.
      </div>
    </div>
  );
}

function IconBtn({
  label,
  glyph,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  glyph: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 32,
        height: 36,
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        background: danger ? colors.errorDim : colors.bg3,
        color: danger ? colors.error : colors.text,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontSize: 14,
        lineHeight: 1,
      }}
    >
      {glyph}
    </button>
  );
}
