import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getWorkouts, getExercises, type Workout, type WorkoutExercise, type Exercise } from '../data/exercises';
import { buildPlayableExerciseNames, filterPlayableWorkouts } from '../lib/playableWorkouts';
import { buildNameToSlug, workoutHeroThumbSet } from '../utils/thumbnails';
import { ThumbPicture } from '../components/ThumbPicture';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import FreeTrialCta from '../components/FreeTrialCta';
import './BestWorkouts.css';

interface FacetEntry {
  label: string;
  axis: 'muscle' | 'equipment' | 'setting' | 'duration' | 'goal';
  workoutIds: string[];
}

interface FacetData {
  generatedAt: string;
  totalWorkouts: number;
  facets: Record<string, FacetEntry>;
}

const AXIS_LABEL: Record<FacetEntry['axis'], string> = {
  muscle: 'By Muscle',
  equipment: 'By Equipment',
  setting: 'By Setting',
  duration: 'By Duration',
  goal: 'By Goal',
};

// Inlined from ProgramDetail (see ProgramDetail.tsx:18-30) — kept local so this
// page can ship without refactoring ProgramDetail's working code.
function diffClass(diff: string): string {
  const d = (diff || 'beginner').toLowerCase();
  if (d.startsWith('adv')) return 'advanced';
  if (d.startsWith('int')) return 'intermediate';
  return 'beginner';
}

function diffLabel(diff: string): string {
  const d = (diff || 'beginner').toLowerCase();
  if (d.startsWith('adv')) return 'Advanced';
  if (d.startsWith('int')) return 'Intermediate';
  return 'Beginner';
}

function formatSetsReps(ex: WorkoutExercise): string {
  const sets = ex.sets && ex.sets !== '0' ? ex.sets : null;
  const reps = ex.reps && ex.reps !== '0' ? ex.reps : null;
  const dur = ex.dur && ex.dur > 0 ? `${ex.dur}s` : null;
  if (sets && (reps || dur)) return `${sets} × ${dur || reps}`;
  if (dur) return dur;
  if (reps) return reps;
  if (sets) return `${sets} sets`;
  return '—';
}

const PREVIEW_EXERCISES = 6; // exercises shown per workout card before the "+ N more" line

export default function BestWorkouts() {
  const { facet } = useParams<{ facet: string }>();
  const [facetData, setFacetData] = useState<FacetData | null>(null);
  const [intros, setIntros] = useState<Record<string, string>>({});
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exerciseDb, setExerciseDb] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/workout-facets.json').then((r) => r.json() as Promise<FacetData>),
      fetch('/workout-facet-copy.json').then((r) => r.json() as Promise<Record<string, string>>),
      getWorkouts(),
      getExercises('en'),
    ]).then(([fd, copy, w, e]) => {
      if (cancelled) return;
      const playableNames = buildPlayableExerciseNames(e);
      setFacetData(fd);
      setIntros(copy);
      setWorkouts(filterPlayableWorkouts(w, playableNames));
      setExerciseDb(e);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const entry = facet && facetData ? facetData.facets[facet] : null;
  const intro = facet ? intros[facet] : undefined;
  const nameToSlug = useMemo(() => buildNameToSlug(exerciseDb), [exerciseDb]);

  // Resolve workout IDs to actual workout records (preserving facet order).
  const facetWorkouts = useMemo(() => {
    if (!entry) return [];
    const byId = new Map(workouts.map((w) => [w.id, w]));
    const out: Workout[] = [];
    for (const id of entry.workoutIds) {
      const w = byId.get(id);
      if (w) out.push(w);
      if (out.length >= 5) break;
    }
    return out;
  }, [entry, workouts]);

  // Sibling facets in the same axis — for the chip row at the top.
  const siblings = useMemo(() => {
    if (!entry || !facetData) return [];
    return Object.entries(facetData.facets)
      .filter(([, e]) => e.axis === entry.axis)
      .map(([slug, e]) => ({ slug, label: e.label }));
  }, [entry, facetData]);

  // Cross-axis suggestions for the "Explore other workouts" footer row —
  // pick a top facet from each other axis so crawlers see the full hub net.
  const crossLinks = useMemo(() => {
    if (!entry || !facetData) return [];
    const out: Array<{ slug: string; label: string; axis: FacetEntry['axis'] }> = [];
    const axes: FacetEntry['axis'][] = ['muscle', 'equipment', 'setting', 'duration', 'goal'];
    for (const axis of axes) {
      if (axis === entry.axis) continue;
      const top = Object.entries(facetData.facets)
        .filter(([, e]) => e.axis === axis)
        .sort((a, b) => b[1].workoutIds.length - a[1].workoutIds.length)
        .slice(0, 2)
        .map(([slug, e]) => ({ slug, label: e.label, axis }));
      out.push(...top);
    }
    return out;
  }, [entry, facetData]);

  // Per-page <title>. Prerender-meta.mjs writes the same value into the static
  // HTML; this client-side update keeps it correct after SPA navigation.
  useEffect(() => {
    if (!entry) return;
    document.title = `Best ${entry.label} Workouts — ${facetWorkouts.length} Free Routines | Libo`;
    return () => { document.title = 'Libo'; };
  }, [entry, facetWorkouts.length]);

  if (loading) {
    return (
      <>
        <SiteNav />
        <div className="bw-loading"><div>Loading…</div></div>
        <SiteFooter />
      </>
    );
  }

  // Unknown / suppressed facet → bounce to the workouts library.
  if (!entry) return <Navigate to="/workouts" replace />;

  return (
    <>
      <SiteNav />

      <main className="bw-container">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="pd-breadcrumb">
          <Link to="/">Home</Link>
          <span className="pd-breadcrumb-sep">&gt;</span>
          <Link to="/workouts">Workouts</Link>
          <span className="pd-breadcrumb-sep">&gt;</span>
          <span>{entry.label}</span>
        </nav>

        {/* Hero */}
        <header className="bw-hero">
          <h1>Best {entry.label} Workouts</h1>
          <p className="bw-subtitle">
            {facetWorkouts.length} free routines, ready to follow along in the Libo app.
          </p>
        </header>

        {/* Sibling-axis chips (internal hub network) */}
        {siblings.length > 1 && (
          <div className="bw-facet-row">
            <div className="el-filter-label">{AXIS_LABEL[entry.axis]}</div>
            <div className="el-chips">
              {siblings.map((s) => (
                <Link
                  key={s.slug}
                  to={`/best-workouts/${s.slug}`}
                  className={`el-chip ${s.slug === facet ? 'active' : ''}`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* About paragraph */}
        {intro && <p className="bw-intro">{intro}</p>}

        {/* Workout cards */}
        <section className="bw-cards">
          {facetWorkouts.map((w, idx) => {
            const heroThumb = workoutHeroThumbSet(w, nameToSlug, exerciseDb);
            const main = w.exercises.filter((e) => (e.phase || 'main') === 'main');
            const visible = main.slice(0, PREVIEW_EXERCISES);
            const more = main.length - visible.length;

            return (
              <article key={w.id} className="bw-card">
                <Link to={`/workouts/${w.id}`} className="bw-card-thumb" aria-label={w.name}>
                  <span className="bw-card-thumb-emoji" aria-hidden="true">{w.emoji}</span>
                  <ThumbPicture
                    thumb={heroThumb}
                    loading={idx < 2 ? 'eager' : 'lazy'}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </Link>

                <div className="bw-card-body">
                  <div className="bw-card-num">Workout {idx + 1}</div>
                  <Link to={`/workouts/${w.id}`} className="bw-card-name">
                    <h2>{w.name}</h2>
                  </Link>

                  <div className="bw-card-meta">
                    <span className="pd-meta-chip">
                      <span className="pd-meta-chip-icon" aria-hidden="true">&#x23F1;</span>
                      {w.dur} min
                    </span>
                    <span className={`pd-meta-diff ${diffClass(w.diff)}`}>
                      {diffLabel(w.diff)}
                    </span>
                    <span className="pd-meta-chip">
                      <span className="pd-meta-chip-icon" aria-hidden="true">&#x1F4CB;</span>
                      {w.exercises.length} exercises
                    </span>
                  </div>

                  <ol className="bw-ex-list">
                    {visible.map((ex, i) => {
                      const exMeta = exerciseDb.find((d) => d.name.toLowerCase().trim() === ex.name.toLowerCase().trim());
                      const exSlug = exMeta?.slug ?? exMeta?.id;
                      return (
                        <li key={i}>
                          <span className="bw-ex-name">
                            {exSlug ? <Link to={`/exercises/${exSlug}`}>{ex.name}</Link> : ex.name}
                          </span>
                          <span className="bw-ex-sets">{formatSetsReps(ex)}</span>
                        </li>
                      );
                    })}
                    {more > 0 && (
                      <li className="bw-ex-more">
                        <Link to={`/workouts/${w.id}`}>+ {more} more exercise{more === 1 ? '' : 's'}</Link>
                      </li>
                    )}
                  </ol>

                  <Link to={`/workouts/${w.id}`} className="bw-card-cta">
                    View full workout &rarr;
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <FreeTrialCta />

        {/* Cross-axis cross-links for crawlers + curious users */}
        {crossLinks.length > 0 && (
          <section className="bw-explore">
            <h3>Explore other workout collections</h3>
            <div className="el-chips">
              {crossLinks.map((l) => (
                <Link key={l.slug} to={`/best-workouts/${l.slug}`} className="el-chip">
                  {l.label} workouts
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
