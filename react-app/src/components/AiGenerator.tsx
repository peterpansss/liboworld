import { useState, useEffect, useCallback, useRef } from 'react';
import { getExercises, type Exercise } from '../data/exercises';
import './AiGenerator.css';

// ── Types ──

interface GeneratedExercise {
  name: string;
  sets: string;
  reps: string;
  emoji: string;
}

interface GeneratedWorkout {
  id: string;
  name: string;
  emoji: string;
  diff: string;
  dur: number;
  cat: string;
  bodyFocusAreas: string[];
  equipmentList: string[];
  location: string;
  exercises: GeneratedExercise[];
  goal: string;
}

interface AiGeneratorProps {
  onClose: () => void;
  onStartWorkout: (workout: GeneratedWorkout) => void;
}

// ── Constants ──

const GOALS = [
  { id: 'lose-weight', label: 'Lose Weight', emoji: '🔥' },
  { id: 'build-muscle', label: 'Build Muscle', emoji: '💪' },
  { id: 'improve-mobility', label: 'Improve Mobility', emoji: '🧘' },
  { id: 'stay-active', label: 'Stay Active', emoji: '⚡' },
  { id: 'reduce-stress', label: 'Reduce Stress', emoji: '🫁' },
];

const EQUIPMENT = [
  { id: 'none', label: 'None (Bodyweight)', emoji: '🏃' },
  { id: 'dumbbells', label: 'Dumbbells', emoji: '🏋️' },
  { id: 'bands', label: 'Resistance Bands', emoji: '🪢' },
  { id: 'full-gym', label: 'Full Gym', emoji: '🏟️' },
];

const DURATIONS = [15, 30, 45, 60];

const FOCUS_OPTIONS = [
  { id: 'full-body', label: 'Full Body' },
  { id: 'upper-body', label: 'Upper Body' },
  { id: 'lower-body', label: 'Lower Body' },
  { id: 'core', label: 'Core' },
  { id: 'cardio', label: 'Cardio' },
];

// Muscle groups per focus
const FOCUS_MUSCLES: Record<string, string[]> = {
  'full-body': ['chest', 'back', 'legs', 'shoulders', 'core', 'glutes', 'arms', 'quads', 'hamstrings', 'triceps', 'biceps'],
  'upper-body': ['chest', 'back', 'shoulders', 'arms', 'triceps', 'biceps', 'traps', 'lats'],
  'lower-body': ['legs', 'glutes', 'quads', 'hamstrings', 'calves', 'hip flexors'],
  'core': ['core', 'abs', 'obliques', 'lower back'],
  'cardio': ['cardio', 'full body', 'legs', 'conditioning'],
};

// Equipment compatibility mapping
const EQUIP_FILTER: Record<string, (e: Exercise) => boolean> = {
  'none': (e) => {
    const eq = (e.equipment || '').toLowerCase();
    return !eq || eq.includes('bodyweight') || eq.includes('none') || eq.includes('mat');
  },
  'dumbbells': (e) => {
    const eq = (e.equipment || '').toLowerCase();
    return !eq || eq.includes('dumbbell') || eq.includes('bodyweight') || eq.includes('none');
  },
  'bands': (e) => {
    const eq = (e.equipment || '').toLowerCase();
    return !eq || eq.includes('band') || eq.includes('bodyweight') || eq.includes('none');
  },
  'full-gym': () => true,
};

// Rep schemes per goal
const REP_SCHEMES: Record<string, { sets: string; reps: string }> = {
  'lose-weight': { sets: '3', reps: '15' },
  'build-muscle': { sets: '4', reps: '8-10' },
  'improve-mobility': { sets: '2', reps: '45 sec' },
  'stay-active': { sets: '3', reps: '12' },
  'reduce-stress': { sets: '2', reps: '60 sec' },
};

// Workout name fragments
const WORKOUT_ADJECTIVES = ['Power', 'Iron', 'Flow', 'Burn', 'Pulse', 'Surge', 'Swift', 'Blitz', 'Forge', 'Prime'];
const WORKOUT_NOUNS: Record<string, string[]> = {
  'full-body': ['Circuit', 'Total Body', 'Full Burn', 'Fusion'],
  'upper-body': ['Upper Pump', 'Push & Pull', 'Arms & Shoulders', 'Upper Forge'],
  'lower-body': ['Leg Day', 'Lower Blitz', 'Glute Drive', 'Squat Session'],
  'core': ['Core Crusher', 'Ab Burner', 'Midline', 'Plank Flow'],
  'cardio': ['Cardio Blast', 'Sweat Session', 'Heart Rate', 'HIIT Rush'],
};


// ── Deterministic shuffle (seeded) ──

function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  let h = hashStr(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    h = (h * 16807 + 12345) & 0x7fffffff;
    const j = h % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── Component ──

export default function AiGenerator({ onClose, onStartWorkout }: AiGeneratorProps) {
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [goal, setGoal] = useState<string | null>(null);
  const [equip, setEquip] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [focus, setFocus] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const regenCounter = useRef(0);

  // Load exercises on mount
  useEffect(() => {
    getExercises().then(setExercises);
  }, []);

  const canGenerate = goal && equip && focus;

  const generateWorkout = useCallback(() => {
    if (!goal || !equip || !focus || exercises.length === 0) return;

    // Exercise count from duration
    let count: number;
    if (duration <= 15) count = 4;
    else if (duration <= 30) count = 6;
    else if (duration <= 45) count = 8;
    else count = 10;

    // Filter by equipment
    const equipFilter = EQUIP_FILTER[equip] || (() => true);
    let pool = exercises.filter(equipFilter);

    // Filter by muscle focus
    const targetMuscles = FOCUS_MUSCLES[focus] || [];
    if (targetMuscles.length > 0) {
      const musclePool = pool.filter(e => {
        const bodyFocus = (e.bodyFocus || '').toLowerCase();
        return targetMuscles.some(m => bodyFocus.includes(m));
      });
      // Fall back to full pool if too few matches
      if (musclePool.length >= count) {
        pool = musclePool;
      }
    }

    // Deterministic shuffle with seed
    const seed = `${goal}-${equip}-${focus}-${regenCounter.current}`;
    const shuffled = seededShuffle(pool, seed);
    const picked = shuffled.slice(0, count);

    // Rep scheme
    const scheme = REP_SCHEMES[goal] || { sets: '3', reps: '12' };

    // Build exercise list
    const genExercises: GeneratedExercise[] = picked.map(e => ({
      name: e.name,
      sets: scheme.sets,
      reps: scheme.reps,
      emoji: e.emoji || '⚡',
    }));

    // Workout name
    const nameHash = hashStr(seed);
    const adj = WORKOUT_ADJECTIVES[nameHash % WORKOUT_ADJECTIVES.length];
    const nounList = WORKOUT_NOUNS[focus] || ['Session'];
    const noun = nounList[(nameHash >> 4) % nounList.length];
    const wName = `${adj} ${noun}`;

    // Category
    const cat = equip === 'none' ? 'Home' : 'Gym';

    // Collect body focus areas and equipment from picked exercises
    const allBodyFocus = [...new Set(picked.map(e => e.bodyFocus).filter(Boolean))];
    const allEquipment = [...new Set(picked.map(e => e.equipment).filter(Boolean))];

    const generated: GeneratedWorkout = {
      id: `ai_${Date.now()}`,
      name: wName,
      emoji: '✨',
      diff: 'intermediate',
      dur: duration,
      cat,
      bodyFocusAreas: allBodyFocus,
      equipmentList: allEquipment,
      location: cat.toLowerCase(),
      exercises: genExercises,
      goal,
    };

    setWorkout(generated);
    setStep('result');
  }, [goal, equip, focus, duration, exercises]);

  const handleRegenerate = useCallback(() => {
    regenCounter.current += 1;
    generateWorkout();
  }, [generateWorkout]);

  const goalObj = GOALS.find(g => g.id === goal);

  // ── Form View ──
  if (step === 'form') {
    return (
      <div className="ai-container">
        {/* Header */}
        <div className="ai-header">
          <button className="ai-back-btn" onClick={onClose}>←</button>
          <span className="ai-header-title">AI Workout Generator</span>
          <div className="ai-header-spacer" />
        </div>

        <div className="ai-form-body">
          {/* Goal */}
          <div>
            <div className="ai-section-label">Your Goal</div>
            <div className="ai-chip-row">
              {GOALS.map(g => (
                <button
                  key={g.id}
                  className={`ai-chip${goal === g.id ? ' selected' : ''}`}
                  onClick={() => setGoal(goal === g.id ? null : g.id)}
                >
                  {g.emoji} {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <div className="ai-section-label">Equipment</div>
            <div className="ai-chip-row">
              {EQUIPMENT.map(e => (
                <button
                  key={e.id}
                  className={`ai-chip${equip === e.id ? ' selected' : ''}`}
                  onClick={() => setEquip(equip === e.id ? null : e.id)}
                >
                  {e.emoji} {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <div className="ai-section-label">Duration</div>
            <div className="ai-chip-row">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  className={`ai-dur-chip${duration === d ? ' selected' : ''}`}
                  onClick={() => setDuration(d)}
                >
                  {d}
                  <span className="ai-dur-sub">min</span>
                </button>
              ))}
            </div>
          </div>

          {/* Focus */}
          <div>
            <div className="ai-section-label">Focus</div>
            <div className="ai-chip-row">
              {FOCUS_OPTIONS.map(f => (
                <button
                  key={f.id}
                  className={`ai-chip${focus === f.id ? ' selected' : ''}`}
                  onClick={() => setFocus(focus === f.id ? null : f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <button
            className="ai-generate-btn"
            disabled={!canGenerate}
            onClick={generateWorkout}
          >
            ✨ Generate Workout
          </button>
        </div>
      </div>
    );
  }

  // ── Result View ──
  if (!workout) return null;

  const equipLabel = EQUIPMENT.find(e => e.id === equip)?.label || equip;

  return (
    <div className="ai-container">
      {/* Header */}
      <div className="ai-header">
        <button className="ai-back-btn" onClick={() => setStep('form')}>←</button>
        <span className="ai-header-title muted">AI Generated</span>
        <div className="ai-header-spacer" />
      </div>

      <div className="ai-result-body">
        {/* Workout info */}
        <div>
          <div className="ai-goal-tag">Generated for: {goalObj?.label || goal}</div>
          <div className="ai-workout-name">{workout.name}</div>
          <div className="ai-meta-row">
            <span className="ai-meta-chip">⏱ {duration} min</span>
            <span className="ai-meta-chip">🔢 {workout.exercises.length} exercises</span>
            <span className="ai-meta-chip">🏋️ {equipLabel}</span>
          </div>
        </div>

        {/* Exercise list */}
        <div className="ai-exercise-list">
          {workout.exercises.map((ex, i) => (
            <div className="ai-exercise-row" key={i}>
              <div className="ai-exercise-num">{i + 1}</div>
              <span className="ai-exercise-emoji">{ex.emoji}</span>
              <div className="ai-exercise-info">
                <div className="ai-exercise-name">{ex.name}</div>
                <div className="ai-exercise-detail">{ex.sets} sets · {ex.reps} reps</div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="ai-action-row">
          <button className="ai-save-btn" onClick={onClose}>Save</button>
          <button className="ai-start-btn" onClick={() => onStartWorkout(workout)}>
            Start Workout →
          </button>
        </div>
        <button className="ai-regen-btn" onClick={handleRegenerate}>
          ↻ Regenerate
        </button>
      </div>
    </div>
  );
}
