import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getWorkouts, getExercises, type Workout, type WorkoutExercise, type Exercise } from '../data/exercises';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './ProgramDetail.css';

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

function phaseLabel(phase?: string): string {
  if (phase === 'warmup') return 'Warm-Up';
  if (phase === 'cooldown') return 'Cool-Down';
  return 'Main Workout';
}

function formatSetsReps(ex: WorkoutExercise): string {
  const sets = ex.sets && ex.sets !== '0' ? ex.sets : null;
  const reps = ex.reps && ex.reps !== '0' ? ex.reps : null;
  const dur = ex.dur && ex.dur > 0 ? `${ex.dur}s` : null;

  if (sets && (reps || dur)) {
    return `${sets} \u00d7 ${dur || reps}`;
  }
  if (dur) return dur;
  if (reps) return reps;
  if (sets) return `${sets} sets`;
  return '\u2014';
}

function findExerciseId(name: string, exerciseDb: Exercise[]): string | null {
  const normalized = name.toLowerCase().trim();
  const match = exerciseDb.find((e) => e.name.toLowerCase().trim() === normalized);
  return match ? match.id : null;
}

function findExerciseEquipment(name: string, exerciseDb: Exercise[]): string | null {
  const normalized = name.toLowerCase().trim();
  const match = exerciseDb.find((e) => e.name.toLowerCase().trim() === normalized);
  if (!match) return null;
  if (!match.equipment || match.equipment.toLowerCase() === 'none' || match.equipment.toLowerCase() === 'bodyweight') return null;
  return match.equipment;
}

interface PhaseGroup {
  phase: string;
  label: string;
  exercises: WorkoutExercise[];
}

function groupByPhase(exercises: WorkoutExercise[]): PhaseGroup[] {
  const groups: PhaseGroup[] = [];
  const phaseOrder = ['warmup', 'main', 'cooldown'];

  for (const p of phaseOrder) {
    const exs = exercises.filter((e) => (e.phase || 'main') === p);
    if (exs.length > 0) {
      groups.push({ phase: p, label: phaseLabel(p), exercises: exs });
    }
  }

  return groups;
}

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [exerciseDb, setExerciseDb] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getWorkouts(), getExercises()]).then(([wks, exs]) => {
      setAllWorkouts(wks);
      setExerciseDb(exs);
      const found = wks.find((w) => w.id === id) || null;
      setWorkout(found);
      setLoading(false);
    });
  }, [id]);

  const phases = useMemo(() => {
    if (!workout) return [];
    return groupByPhase(workout.exercises);
  }, [workout]);

  const related = useMemo(() => {
    if (!workout) return [];
    return allWorkouts
      .filter((w) => w.id !== workout.id && w.cat === workout.cat)
      .slice(0, 4);
  }, [workout, allWorkouts]);

  let exerciseCounter = 0;

  if (loading) {
    return (
      <>
        <SiteNav />
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading workout...</div>
        </div>
        <SiteFooter />
      </>
    );
  }

  if (!workout) {
    return (
      <>
        <SiteNav />
        <div className="pd-container">
          <div className="pd-not-found">
            <div className="pd-not-found-icon" aria-hidden="true">&#x1F3CB;&#xFE0F;</div>
            <h2>Workout Not Found</h2>
            <p>This workout program doesn't exist or may have been removed.</p>
            <Link to="/workouts" className="pd-not-found-link">
              &larr; Back to all workouts
            </Link>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteNav />

      <main className="pd-container">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="pd-breadcrumb">
          <Link to="/">Home</Link>
          <span className="pd-breadcrumb-sep">&gt;</span>
          <Link to="/workouts">Workouts</Link>
          <span className="pd-breadcrumb-sep">&gt;</span>
          <Link to={`/workouts?cat=${encodeURIComponent(workout.cat)}`}>{workout.cat}</Link>
          <span className="pd-breadcrumb-sep">&gt;</span>
          <span>{workout.name}</span>
        </nav>

        {/* Hero */}
        <div className="pd-hero">
          <div className="pd-hero-bg" aria-hidden="true">{workout.emoji}</div>
          <div className="pd-hero-content">
            <span className="pd-hero-emoji" aria-hidden="true">{workout.emoji}</span>
            <span className="pd-hero-cat">
              {workout.cat}{workout.subcat ? ` \u2014 ${workout.subcat}` : ''}
            </span>
            <h1>{workout.name}</h1>
          </div>
        </div>

        {/* Meta chips */}
        <div className="pd-meta">
          <span className="pd-meta-chip">
            <span className="pd-meta-chip-icon" aria-hidden="true">&#x23F1;</span>
            {workout.dur} min
          </span>
          <span className={`pd-meta-diff ${diffClass(workout.diff)}`}>
            {diffLabel(workout.diff)}
          </span>
          <span className="pd-meta-chip">
            <span className="pd-meta-chip-icon" aria-hidden="true">&#x1F4CB;</span>
            {workout.exercises.length} exercises
          </span>
          <span className="pd-meta-chip">
            <span className="pd-meta-chip-icon" aria-hidden="true">&#x1F3F7;</span>
            {workout.cat}
          </span>
        </div>

        {/* Exercise list grouped by phase */}
        {phases.map((group) => (
          <div key={group.phase} className="pd-phase">
            <div className="pd-phase-header">
              <h2 className="pd-phase-label">{group.label}</h2>
              <span className="pd-phase-count">{group.exercises.length} exercises</span>
            </div>
            <div className="pd-exercises">
              {group.exercises.map((ex, i) => {
                exerciseCounter++;
                const exId = findExerciseId(ex.name, exerciseDb);
                const equipment = findExerciseEquipment(ex.name, exerciseDb);

                return (
                  <div key={`${group.phase}-${i}`} className="pd-ex-row">
                    <div className="pd-ex-num">{exerciseCounter}</div>
                    <div className="pd-ex-info">
                      <div className="pd-ex-name">
                        {exId ? (
                          <Link to={`/exercises/${exId}`} className="pd-ex-name-link">
                            {ex.name}
                          </Link>
                        ) : (
                          ex.name
                        )}
                      </div>
                      {equipment && <div className="pd-ex-equip">{equipment}</div>}
                    </div>
                    <div className="pd-ex-sets">{formatSetsReps(ex)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* CTA Banner */}
        <div className="pd-cta">
          <h3>Try this workout in the Libo app</h3>
          <p>
            Follow along with guided timers, rest periods, and exercise demonstrations.
            Track your progress and build consistency.
          </p>
          <Link to="/onboarding" className="pd-cta-btn">Get the App</Link>
        </div>

        {/* Related Workouts */}
        {related.length > 0 && (
          <div className="pd-related">
            <h2>More {workout.cat} Workouts</h2>
            <div className="pd-related-grid">
              {related.map((w) => (
                <Link key={w.id} to={`/workouts/${w.id}`} className="pd-related-card">
                  <span className="pd-related-emoji" aria-hidden="true">{w.emoji}</span>
                  <span className="pd-related-name">{w.name}</span>
                  <span className="pd-related-meta">
                    {w.dur} min &middot; {diffLabel(w.diff)} &middot; {w.exercises.length} ex
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
