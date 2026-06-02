import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';
import SiteFooter from '../components/SiteFooter';
import AppStoreBadge from '../components/AppStoreBadge';
import { BodyAnatomy } from '../components/BodyAnatomy';
import { useSharedWorkout } from '../hooks/useSharedWorkout';
import { useExercises, type ExerciseDisplay } from '../hooks/useExercises';
import { exerciseThumb } from '../utils/thumbnails';
import type {
  SharedItem,
  SharedMuscleSummaryEntry,
} from '../types/sharedWorkout';
import './SharedRoutine.css';

/**
 * Maps a `muscleSummary` muscle name (free-text, possibly compound "X / Y") to
 * the discrete BodyAnatomy muscle keys it should light up. Lookups are
 * case-insensitive; compound names are split on "/" and each part resolved.
 */
const MUSCLE_KEY_MAP: Record<string, string[]> = {
  chest: ['Chest'],
  back: ['Back', 'Lats'],
  lats: ['Lats'],
  shoulders: ['Shoulders', 'Front Delts', 'Side Delts', 'Rear Delts'],
  biceps: ['Biceps'],
  triceps: ['Triceps'],
  forearms: ['Forearms'],
  abs: ['Abs'],
  core: ['Core', 'Abs', 'Obliques'],
  obliques: ['Obliques'],
  glutes: ['Glutes'],
  hamstrings: ['Hamstrings'],
  quads: ['Quads'],
  calves: ['Calves'],
  legs: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
  traps: ['Traps'],
  'full body': ['Chest', 'Back', 'Lats', 'Shoulders', 'Quads', 'Hamstrings', 'Glutes', 'Core'],
  'lower back': ['Lower Back'],
  'hip flexors': ['Hip Flexors'],
};

// Every distinct muscle key BodyAnatomy can render — used for the fallback
// direct case-insensitive match when a summary name isn't in MUSCLE_KEY_MAP.
const ANATOMY_KEYS = [
  'Front Delts', 'Side Delts', 'Rear Delts', 'Traps', 'Chest', 'Biceps',
  'Forearms', 'Abs', 'Obliques', 'Hip Flexors', 'Quads', 'Calves', 'Core',
  'Shoulders', 'Rhomboids', 'Lats', 'Back', 'Triceps', 'Lower Back',
  'Glutes', 'Hamstrings',
];

function resolveMuscleKeys(name: string): string[] {
  const parts = name.split('/').map((p) => p.trim()).filter(Boolean);
  const keys: string[] = [];
  for (const part of parts) {
    const mapped = MUSCLE_KEY_MAP[part.toLowerCase()];
    if (mapped) {
      keys.push(...mapped);
      continue;
    }
    const direct = ANATOMY_KEYS.find((k) => k.toLowerCase() === part.toLowerCase());
    if (direct) keys.push(direct);
  }
  return keys;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function ExerciseThumb({ ex, muscle }: { ex: ExerciseDisplay | undefined; muscle: string }) {
  const thumb = exerciseThumb(ex);
  if (thumb) {
    return <img className="sr-row__thumb" src={thumb} alt="" loading="lazy" />;
  }
  const initial = muscle?.trim().charAt(0).toUpperCase();
  return (
    <div className="sr-row__thumb sr-row__thumb--placeholder" aria-hidden>
      {initial ? <span className="sr-row__thumb-initial">{initial}</span> : <Dumbbell size={20} />}
    </div>
  );
}

export default function SharedRoutine() {
  const { id } = useParams();
  const { workout, loading, notFound } = useSharedWorkout(id);
  const { exercises } = useExercises();

  const exercisesById = useMemo(() => {
    const m = new Map<string, ExerciseDisplay>();
    for (const ex of exercises) m.set(ex.id, ex);
    return m;
  }, [exercises]);

  const totals = useMemo(() => {
    const sessions = workout?.snapshot.sessions ?? [];
    const totalExercises = sessions.reduce((acc, s) => acc + s.items.length, 0);
    const totalSets = sessions.reduce((acc, s) => acc + (s.sets || 0), 0);
    return { totalExercises, totalSets };
  }, [workout]);

  if (loading) {
    return (
      <div className="sr-state">
        <div className="sr-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (notFound || !workout) {
    return (
      <div className="sr-state">
        <div className="sr-notfound">
          <Link to="/" className="sr-brand font-display">LIBO</Link>
          <h1 className="sr-notfound__title font-display">Link expired</h1>
          <p className="sr-notfound__body">This link expired or doesn&apos;t exist.</p>
          <AppStoreBadge className="sr-notfound__badge" />
          <a href="https://liboworld.com" className="sr-notfound__home">Go to liboworld.com</a>
        </div>
      </div>
    );
  }

  const { totalExercises, totalSets } = totals;
  const kindLabel = workout.kind === 'plan' ? 'Plan' : 'Workout';

  // Estimated duration: prefer authored, else rough ~3 min/set fallback.
  const estDuration = workout.meta.durationMin != null
    ? `${workout.meta.durationMin} min`
    : `~${Math.max(1, Math.round(totalSets * 3))}m`;

  // Worked muscle keys for the silhouette.
  const workedKeys = new Set<string>();
  for (const entry of workout.muscleSummary) {
    for (const key of resolveMuscleKeys(entry.muscle)) workedKeys.add(key);
  }
  const stateFor = (muscle: string): 'primary' | 'secondary' | 'off' =>
    workedKeys.has(muscle) ? 'primary' : 'off';

  // Defensive desc sort of the muscle summary for the volume bars.
  const sortedMuscles: SharedMuscleSummaryEntry[] = [...workout.muscleSummary].sort(
    (a, b) => b.sets - a.sets,
  );
  const maxMuscleSets = sortedMuscles.reduce((m, e) => Math.max(m, e.sets), 0) || 1;

  // Meta chips (only those that exist).
  const chips: string[] = [];
  if (workout.meta.weeks != null) chips.push(`${workout.meta.weeks} weeks`);
  if (workout.meta.frequency != null) chips.push(`${workout.meta.frequency}×/week`);
  if (workout.meta.difficulty) chips.push(capitalize(workout.meta.difficulty));
  if (workout.meta.durationMin != null) chips.push(`${workout.meta.durationMin} min`);

  const renderRow = (item: SharedItem, key: string) => {
    const subParts = [item.equipment, item.muscle].filter(Boolean);
    return (
      <div className="sr-row" key={key}>
        <ExerciseThumb ex={exercisesById.get(item.exerciseId)} muscle={item.muscle} />
        <div className="sr-row__main">
          <div className="sr-row__name">{item.name}</div>
          {subParts.length > 0 && (
            <div className="sr-row__sub">{subParts.join(' · ')}</div>
          )}
        </div>
        <div className="sr-row__right">
          <div className="sr-row__setsreps font-display">
            {item.sets} × {item.reps}
          </div>
          {item.restSeconds != null && (
            <div className="sr-row__rest">{item.restSeconds}s rest</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <SeoHead
        title={workout.title}
        description={`${kindLabel} · ${totalExercises} exercises · ${totalSets} sets · Made with Libo`}
        canonical={`https://liboworld.com/w/${workout.id}`}
        ogType="article"
      />

      <main className="sr-page">
        <div className="sr-grid">
          {/* MAIN */}
          <div className="sr-main">
            <Link to="/" className="sr-brand font-display">LIBO</Link>

            <h1 className="sr-title font-display">{workout.title}</h1>

            <p className="sr-subline">
              <span className="sr-subline__kind">{kindLabel}</span>
              {workout.creatorUsername && (
                <span className="sr-subline__by"> · Created by {workout.creatorUsername}</span>
              )}
            </p>

            {chips.length > 0 && (
              <div className="sr-chips">
                {chips.map((c) => (
                  <div className="sr-chip" key={c}>{c}</div>
                ))}
              </div>
            )}

            <div className="sr-sessions">
              {workout.snapshot.sessions.map((session, si) => {
                const showHeader = workout.kind === 'plan' || session.label.trim().length > 0;
                return (
                  <section className="sr-session" key={si}>
                    {showHeader && (
                      <div className="sr-session__head">
                        <h2 className="sr-session__label font-display">
                          {session.label || `Session ${si + 1}`}
                        </h2>
                        <div className="sr-session__meta">
                          {session.items.length} exercises · {session.sets} sets
                        </div>
                      </div>
                    )}
                    <div className="sr-rows">
                      {session.items.map((item, ii) => renderRow(item, `${si}-${ii}`))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className="sr-sidebar">
            <div className="sr-card sr-card--app">
              <h3 className="sr-card__title font-display">Open in the app</h3>
              <p className="sr-card__body">Get the full guided experience</p>
              <AppStoreBadge className="sr-card__badge" />
            </div>

            <div className="sr-card">
              <h3 className="sr-card__title font-display">Routine Summary</h3>
              <div className="sr-stats">
                <div className="sr-stat">
                  <div className="sr-stat__value font-display">{totalExercises}</div>
                  <div className="sr-stat__label">Exercises</div>
                </div>
                <div className="sr-stat">
                  <div className="sr-stat__value font-display">{totalSets}</div>
                  <div className="sr-stat__label">Total Sets</div>
                </div>
                <div className="sr-stat">
                  <div className="sr-stat__value font-display">{estDuration}</div>
                  <div className="sr-stat__label">Est. Duration</div>
                </div>
              </div>
            </div>

            {sortedMuscles.length > 0 && (
              <div className="sr-card">
                <h3 className="sr-card__title font-display">Muscle Volume</h3>
                <div className="sr-bars">
                  {sortedMuscles.map((entry) => (
                    <div className="sr-bar-row" key={entry.muscle}>
                      <div className="sr-bar-row__name">{entry.muscle}</div>
                      <div className="sr-bar-row__track">
                        <div
                          className="sr-bar-row__fill"
                          style={{ width: `${(entry.sets / maxMuscleSets) * 100}%` }}
                        />
                      </div>
                      <div className="sr-bar-row__count">{entry.sets}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="sr-card sr-card--anatomy">
              <BodyAnatomy stateFor={stateFor} />
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
