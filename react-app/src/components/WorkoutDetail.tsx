import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getExercises, getWorkouts, type Exercise, type Workout } from '../data/exercises';
import { EmojiIcon } from './EmojiIcon';
import { Clock, BarChart3, Hash, Dumbbell } from '../utils/icons';
import { buildNameToSlug, exerciseThumb } from '../utils/thumbnails';
import './WorkoutDetail.css';

function getEmojiForExercise(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('squat') || n.includes('leg') || n.includes('lunge')) return '🦵';
  if (n.includes('push') || n.includes('chest') || n.includes('bench')) return '💪';
  if (n.includes('pull') || n.includes('row') || n.includes('back')) return '🏋️';
  if (n.includes('curl') || n.includes('bicep') || n.includes('arm')) return '💪';
  if (n.includes('press') || n.includes('shoulder')) return '🏋️';
  if (n.includes('plank') || n.includes('core') || n.includes('ab') || n.includes('crunch')) return '🔥';
  if (n.includes('run') || n.includes('cardio') || n.includes('jump')) return '🏃';
  if (n.includes('stretch') || n.includes('yoga') || n.includes('mobility')) return '🧘';
  return '⚡';
}

function formatReps(reps: string, dur?: number): string {
  if (dur && dur > 0) return `${dur}s`;
  if (!reps || reps === '0') return '—';
  return reps;
}

function equipmentSummary(exercises: Exercise[]): string {
  if (!exercises || exercises.length === 0) return 'Bodyweight';
  const unique = new Set<string>();
  for (const ex of exercises) {
    if (ex.equipment && ex.equipment.toLowerCase() !== 'none' && ex.equipment.toLowerCase() !== 'bodyweight') {
      unique.add(ex.equipment);
    }
  }
  if (unique.size === 0) return 'Bodyweight';
  const arr = Array.from(unique);
  if (arr.length <= 2) return arr.join(', ');
  return `${arr.slice(0, 2).join(', ')} +${arr.length - 2}`;
}

function diffLabel(diff: string): string {
  const d = (diff || 'beginner').toLowerCase();
  if (d.startsWith('adv')) return 'Advanced';
  if (d.startsWith('int')) return 'Intermediate';
  return 'Beginner';
}

export default function WorkoutDetail() {
  const selectedWorkoutId = useAppStore((s) => s.selectedWorkoutId);
  const selectWorkout = useAppStore((s) => s.selectWorkout);

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exerciseDb, setExerciseDb] = useState<Exercise[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedWorkoutId) return;
    setLoading(true);
    Promise.all([getWorkouts(), getExercises()]).then(([wks, exs]) => {
      const found = wks.find((w) => w.id === selectedWorkoutId) || null;
      setWorkout(found);
      setExerciseDb(exs);
      setExpanded(new Set());
      setLoading(false);
    });
  }, [selectedWorkoutId]);

  // Build a lookup map for exercise matching
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const ex of exerciseDb) {
      map.set(ex.name.toLowerCase().trim(), ex);
    }
    return map;
  }, [exerciseDb]);

  const nameToSlug = useMemo(() => buildNameToSlug(exerciseDb), [exerciseDb]);

  const toggleExpand = useCallback((idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const handleBack = useCallback(() => {
    selectWorkout(null);
  }, [selectWorkout]);

  if (loading) {
    return (
      <div className="wd-container">
        <div className="wd-loading">Loading...</div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="wd-container">
        <div className="wd-loading">Workout not found</div>
      </div>
    );
  }

  const exercises = workout.exercises || [];

  return (
    <div className="wd-container">
      {/* Hero */}
      <div className="wd-hero">
        <div className="wd-hero-emoji-bg">
          <EmojiIcon emoji={workout.emoji} size={140} />
        </div>
        <div className="wd-hero-gradient" />
        <button className="wd-back-btn" onClick={handleBack} aria-label="Go back">
          ←
        </button>
        <div className="wd-hero-content">
          <span className="wd-category-tag">{workout.cat}</span>
          <h1 className="wd-workout-name">{workout.name}</h1>
        </div>
      </div>

      {/* Meta chips */}
      <div className="wd-meta-row">
        <span className="wd-meta-chip">
          <span className="wd-chip-icon"><EmojiIcon icon={Clock} size={14} /></span>
          {workout.dur} min
        </span>
        <span className="wd-meta-chip">
          <span className="wd-chip-icon"><EmojiIcon icon={BarChart3} size={14} /></span>
          {diffLabel(workout.diff)}
        </span>
        <span className="wd-meta-chip">
          <span className="wd-chip-icon"><EmojiIcon icon={Hash} size={14} /></span>
          {exercises.length} exercises
        </span>
        <span className="wd-meta-chip">
          <span className="wd-chip-icon"><EmojiIcon icon={Dumbbell} size={14} /></span>
          {equipmentSummary(exercises.map((ex) => exerciseMap.get(ex.name.toLowerCase().trim())).filter(Boolean) as Exercise[])}
        </span>
      </div>

      {/* Exercise blocks */}
      <div className="wd-blocks">
        <div className="wd-block">
          <div className="wd-block-header">
            <span className="wd-block-name">Main Set</span>
            <span className="wd-sets-badge">
              3 Sets <span className="wd-arrow">↻</span>
            </span>
          </div>
          {exercises.map((ex, idx) => {
            const isOpen = expanded.has(idx);
            const matched = exerciseMap.get(ex.name.toLowerCase().trim());
            const emoji = getEmojiForExercise(ex.name);
            const setupNotes = matched?.setupNotes || '';
            const instructions = setupNotes ? setupNotes.split('. ').filter((s) => s.trim()) : [];

            return (
              <div className="wd-exercise-row" key={idx}>
                <div
                  className="wd-exercise-header"
                  onClick={() => toggleExpand(idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(idx);
                    }
                  }}
                >
                  <span className="wd-reps-label">{formatReps(ex.reps, ex.dur)}</span>
                  <span className="wd-exercise-name">{ex.name}</span>
                  <div className="wd-exercise-thumb" style={{ position: 'relative', overflow: 'hidden' }}>
                    <span style={{ position: 'relative', zIndex: 0 }}>
                      <EmojiIcon emoji={emoji} size={22} />
                    </span>
                    {nameToSlug[ex.name] && exerciseThumb(nameToSlug[ex.name], matched?.cat) && (
                      <img
                        src={exerciseThumb(nameToSlug[ex.name], matched?.cat)!}
                        alt=""
                        loading="lazy"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
                      />
                    )}
                  </div>
                  <span className={`wd-chevron${isOpen ? ' wd-expanded' : ''}`}>▾</span>
                </div>
                <div className={`wd-exercise-detail${isOpen ? ' wd-open' : ''}`}>
                  <div className="wd-detail-inner">
                    <div className="wd-video-slot">
                      <EmojiIcon emoji={matched?.emoji || emoji} size={48} />
                    </div>
                    {instructions.length > 0 && (
                      <div className="wd-instructions">
                        {instructions.map((step, sIdx) => (
                          <div className="wd-instruction-step" key={sIdx}>
                            <span className="wd-step-num">{sIdx + 1}</span>
                            <span className="wd-step-text">{step.endsWith('.') ? step : `${step}.`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {instructions.length === 0 && (
                      <div className="wd-instructions">
                        <div className="wd-instruction-step">
                          <span className="wd-step-num">1</span>
                          <span className="wd-step-text">
                            Perform {ex.name} for {formatReps(ex.reps, ex.dur)}{ex.sets ? ` x ${ex.sets} sets` : ''}.
                            {ex.rest ? ` Rest ${ex.rest}s between sets.` : ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky start button */}
      <div className="wd-start-bar">
        <div className="wd-start-bar-inner">
          <button className="wd-start-btn">Start Workout</button>
        </div>
      </div>
    </div>
  );
}
