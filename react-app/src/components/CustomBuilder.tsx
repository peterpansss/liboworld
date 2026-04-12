import { useState, useEffect, useMemo, useCallback } from 'react';
import { getExercises, type Exercise } from '../data/exercises';
import './CustomBuilder.css';

const MUSCLE_FILTERS = [
  'All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Core', 'Arms', 'Cardio', 'Glutes', 'Mobility',
];


interface SelectedExercise {
  id: string;
  name: string;
  bodyFocus: string;
  equipment: string;
  emoji: string;
  sets: number;
  reps: number;
}

interface CustomBuilderProps {
  onClose: () => void;
  onStartWorkout: (workout: any) => void;
}

export default function CustomBuilder({ onClose, onStartWorkout }: CustomBuilderProps) {
  const [step, setStep] = useState<'pick' | 'configure'>('pick');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<SelectedExercise[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('My Workout');

  useEffect(() => {
    getExercises().then(setExercises);
  }, []);

  // Filter exercises
  const filtered = useMemo(() => {
    const q = searchQ.toLowerCase();
    const fl = filter.toLowerCase();
    return exercises.filter((e) => {
      const bodyFocus = (e.bodyFocus || '').toLowerCase();
      const cat = (e.cat || '').toLowerCase();
      const catMatch =
        fl === 'all' ||
        cat === fl ||
        bodyFocus.includes(fl) ||
        (fl === 'arms' && (bodyFocus.includes('bicep') || bodyFocus.includes('tricep') || bodyFocus.includes('forearm')));
      const qMatch = !q || e.name.toLowerCase().includes(q);
      return catMatch && qMatch;
    });
  }, [exercises, searchQ, filter]);

  // Cap at 80
  const displayed = useMemo(() => filtered.slice(0, 80), [filtered]);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  const toggleExercise = useCallback((ex: Exercise) => {
    setSelected((prev) => {
      if (prev.some((s) => s.id === ex.id)) {
        return prev.filter((s) => s.id !== ex.id);
      }
      return [...prev, {
        id: ex.id,
        name: ex.name,
        bodyFocus: ex.bodyFocus,
        equipment: ex.equipment,
        emoji: ex.emoji,
        sets: 3,
        reps: 12,
      }];
    });
  }, []);

  const removeExercise = useCallback((id: string) => {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateSets = useCallback((id: string, sets: number) => {
    setSelected((prev) => prev.map((s) => s.id === id ? { ...s, sets } : s));
  }, []);

  const updateReps = useCallback((id: string, reps: number) => {
    setSelected((prev) => prev.map((s) => s.id === id ? { ...s, reps } : s));
  }, []);

  const handleSave = useCallback(() => {
    const workout = {
      id: `custom-${Date.now()}`,
      name: workoutName || 'My Workout',
      emoji: '✏️',
      exercises: selected.map((s) => ({
        name: s.name,
        sets: String(s.sets),
        reps: String(s.reps),
      })),
    };
    // Save to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('libo_custom_workouts') || '[]');
      existing.push(workout);
      localStorage.setItem('libo_custom_workouts', JSON.stringify(existing));
    } catch { /* ignore */ }
    onClose();
  }, [workoutName, selected, onClose]);

  const handleSaveAndStart = useCallback(() => {
    const workout = {
      id: `custom-${Date.now()}`,
      name: workoutName || 'My Workout',
      emoji: '✏️',
      exercises: selected.map((s) => ({
        name: s.name,
        sets: String(s.sets),
        reps: String(s.reps),
      })),
    };
    // Save to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('libo_custom_workouts') || '[]');
      existing.push(workout);
      localStorage.setItem('libo_custom_workouts', JSON.stringify(existing));
    } catch { /* ignore */ }
    onStartWorkout(workout);
  }, [workoutName, selected, onStartWorkout]);

  // ── Step 1: Pick Exercises ──
  if (step === 'pick') {
    return (
      <div className="cb-overlay">
        {/* Header */}
        <div className="cb-header">
          <button className="cb-back" onClick={onClose} aria-label="Close">
            ←
          </button>
          <div className="cb-header-title">Build Custom Workout</div>
          {selected.length > 0 && (
            <div className="cb-header-count">{selected.length} added</div>
          )}
        </div>

        {/* Search */}
        <div className="cb-search-wrap">
          <input
            className="cb-search"
            placeholder="Search exercises..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            aria-label="Search exercises"
          />
        </div>

        {/* Filters */}
        <div className="cb-filters">
          {MUSCLE_FILTERS.map((f) => (
            <button
              key={f}
              className={`cb-chip${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Exercise list */}
        <div className="cb-exercise-list">
          {displayed.length === 0 ? (
            <div className="cb-empty">
              <div className="cb-empty-emoji">🔍</div>
              <div>No exercises found</div>
            </div>
          ) : (
            displayed.map((ex) => {
              const isAdded = selectedIds.has(ex.id);
              const isExpanded = expandedId === ex.id;
              const emoji = ex.emoji || '💪';

              return (
                <div
                  key={ex.id}
                  className={`cb-ex-item${isAdded ? ' selected' : ''}`}
                >
                  <div
                    className="cb-ex-row"
                    onClick={() => setExpandedId(isExpanded ? null : ex.id)}
                  >
                    <div className="cb-ex-thumb">{emoji}</div>
                    <div className="cb-ex-info">
                      <div className="cb-ex-name">{ex.name}</div>
                      <div className="cb-ex-meta">
                        {ex.bodyFocus}
                        {ex.equipment ? ` · ${ex.equipment}` : ''}
                      </div>
                    </div>
                    <span className={`cb-ex-chevron${isExpanded ? ' open' : ''}`}>
                      ▾
                    </span>
                    <button
                      className={`cb-add-btn${isAdded ? ' added' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExercise(ex);
                      }}
                      aria-label={isAdded ? 'Remove exercise' : 'Add exercise'}
                    >
                      {isAdded ? '✓' : '+'}
                    </button>
                  </div>

                  {/* Expandable detail */}
                  <div className={`cb-ex-detail${isExpanded ? ' open' : ''}`}>
                    <div className="cb-video-slot">{emoji}</div>
                    {ex.setupNotes && (
                      <div className="cb-instructions">
                        {ex.setupNotes.split('. ').filter(Boolean).map((inst, i) => (
                          <div className="cb-step" key={i}>
                            <div className="cb-step-num">{i + 1}</div>
                            <div className="cb-step-text">{inst}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom bar */}
        {selected.length > 0 && (
          <div className="cb-bottom-bar">
            <button
              className="cb-continue-btn"
              onClick={() => setStep('configure')}
            >
              Configure {selected.length} Exercise{selected.length !== 1 ? 's' : ''} →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Step 2: Configure ──
  return (
    <div className="cb-overlay">
      {/* Header */}
      <div className="cb-header">
        <button className="cb-back" onClick={() => setStep('pick')} aria-label="Back">
          ←
        </button>
        <div className="cb-header-title">Configure Workout</div>
        <div className="cb-spacer" />
      </div>

      {/* Configure content */}
      <div className="cb-configure">
        {/* Workout name */}
        <div className="cb-field">
          <div className="cb-label">Workout Name</div>
          <input
            className="cb-name-input"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="My Workout"
            aria-label="Workout name"
          />
        </div>

        {/* Exercise list */}
        <div className="cb-label">Exercises</div>
        <div className="cb-config-list">
          {selected.map((s) => {
            const emoji = s.emoji || '💪';
            return (
              <div className="cb-config-item" key={s.id}>
                <div className="cb-config-thumb">{emoji}</div>
                <div className="cb-config-info">
                  <div className="cb-config-name">{s.name}</div>
                  <div className="cb-config-inputs">
                    <div className="cb-config-field">
                      <label>Sets</label>
                      <input
                        type="number"
                        className="cb-num-input"
                        value={s.sets}
                        min={1}
                        max={20}
                        onChange={(e) => updateSets(s.id, parseInt(e.target.value) || 1)}
                        aria-label={`Sets for ${s.name}`}
                      />
                    </div>
                    <div className="cb-config-field">
                      <label>Reps</label>
                      <input
                        type="number"
                        className="cb-num-input"
                        value={s.reps}
                        min={1}
                        max={100}
                        onChange={(e) => updateReps(s.id, parseInt(e.target.value) || 1)}
                        aria-label={`Reps for ${s.name}`}
                      />
                    </div>
                  </div>
                </div>
                <button
                  className="cb-remove-btn"
                  onClick={() => removeExercise(s.id)}
                  aria-label={`Remove ${s.name}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {selected.length === 0 && (
          <div className="cb-empty">
            <div className="cb-empty-emoji">📋</div>
            <div>No exercises added yet</div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="cb-actions">
        <div className="cb-action-row">
          <button className="cb-save-btn" onClick={handleSave}>
            Save
          </button>
          <button className="cb-start-btn" onClick={handleSaveAndStart}>
            Save & Start →
          </button>
        </div>
        <button className="cb-add-more" onClick={() => setStep('pick')}>
          + Add More Exercises
        </button>
      </div>
    </div>
  );
}
