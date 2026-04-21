import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getWorkouts, getExercises, type Workout, type WorkoutExercise, type Exercise } from '../data/exercises';
import { buildNameToSlug, workoutHeroThumb } from '../utils/thumbnails';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './ProgramDetail.css';

function diffClass(diff: string): string {
  const d = (diff || 'beginner').toLowerCase();
  if (d.startsWith('adv')) return 'advanced';
  if (d.startsWith('int')) return 'intermediate';
  return 'beginner';
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

function groupByPhase(
  exercises: WorkoutExercise[],
  phaseLabel: (phase?: string) => string,
): PhaseGroup[] {
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
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [exerciseDb, setExerciseDb] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const diffLabel = (diff: string): string => {
    const d = (diff || 'beginner').toLowerCase();
    if (d.startsWith('adv')) return t('programDetail.difficulty.advanced');
    if (d.startsWith('int')) return t('programDetail.difficulty.intermediate');
    return t('programDetail.difficulty.beginner');
  };

  const phaseLabel = (phase?: string): string => {
    if (phase === 'warmup') return t('programDetail.phases.warmup');
    if (phase === 'cooldown') return t('programDetail.phases.cooldown');
    return t('programDetail.phases.main');
  };

  useEffect(() => {
    Promise.all([getWorkouts(), getExercises(i18n.language)]).then(([wks, exs]) => {
      setAllWorkouts(wks);
      setExerciseDb(exs);
      const found = wks.find((w) => w.id === id) || null;
      setWorkout(found);
      setLoading(false);
    });
  }, [id, i18n.language]);

  const phases = useMemo(() => {
    if (!workout) return [];
    return groupByPhase(workout.exercises, phaseLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout, t]);

  const related = useMemo(() => {
    if (!workout) return [];
    return allWorkouts
      .filter((w) => w.id !== workout.id && w.cat === workout.cat)
      .slice(0, 4);
  }, [workout, allWorkouts]);

  const nameToSlug = useMemo(() => buildNameToSlug(exerciseDb), [exerciseDb]);

  let exerciseCounter = 0;

  if (loading) {
    return (
      <>
        <SiteNav />
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>{t('programDetail.loading')}</div>
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
            <h2>{t('programDetail.notFound.title')}</h2>
            <p>{t('programDetail.notFound.description')}</p>
            <Link to="/workouts" className="pd-not-found-link">
              {t('programDetail.notFound.backLink')}
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
        <nav aria-label={t('programDetail.breadcrumbAria')} className="pd-breadcrumb">
          <Link to="/">{t('programDetail.breadcrumb.home')}</Link>
          <span className="pd-breadcrumb-sep">&gt;</span>
          <Link to="/workouts">{t('programDetail.breadcrumb.workouts')}</Link>
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
            {t('programDetail.meta.minutes', { count: workout.dur })}
          </span>
          <span className={`pd-meta-diff ${diffClass(workout.diff)}`}>
            {diffLabel(workout.diff)}
          </span>
          <span className="pd-meta-chip">
            <span className="pd-meta-chip-icon" aria-hidden="true">&#x1F4CB;</span>
            {t('programDetail.meta.exercisesCount', { count: workout.exercises.length })}
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
              <span className="pd-phase-count">
                {t('programDetail.meta.exercisesCount', { count: group.exercises.length })}
              </span>
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
          <h3>{t('programDetail.cta.title')}</h3>
          <p>{t('programDetail.cta.description')}</p>
          <Link to="/onboarding" className="pd-cta-btn">{t('programDetail.cta.button')}</Link>
        </div>

        {/* Related Workouts */}
        {related.length > 0 && (
          <div className="pd-related">
            <h2>{t('programDetail.related.title', { category: workout.cat })}</h2>
            <div className="pd-related-grid">
              {related.map((w) => {
                const heroThumb = workoutHeroThumb(w, nameToSlug, exerciseDb);
                return (
                <Link key={w.id} to={`/workouts/${w.id}`} className="pd-related-card">
                  <span
                    className="pd-related-emoji"
                    aria-hidden="true"
                    style={{ position: 'relative', overflow: 'hidden', display: 'block', width: '100%', height: 120, borderRadius: 12, background: 'var(--bg3)' }}
                  >
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, zIndex: 0 }}>
                      {w.emoji}
                    </span>
                    {heroThumb && (
                      <img
                        src={heroThumb}
                        alt=""
                        loading="lazy"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
                      />
                    )}
                  </span>
                  <span className="pd-related-name">{w.name}</span>
                  <span className="pd-related-meta">
                    {t('programDetail.related.cardMeta', {
                      duration: w.dur,
                      difficulty: diffLabel(w.diff),
                      count: w.exercises.length,
                    })}
                  </span>
                </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
