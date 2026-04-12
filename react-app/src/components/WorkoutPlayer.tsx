import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getWorkouts } from '../data/exercises';
import './WorkoutPlayer.css';

function getExerciseEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('squat') || n.includes('lunge') || n.includes('leg')) return '🦵';
  if (n.includes('push') || n.includes('bench') || n.includes('chest') || n.includes('fly')) return '🫁';
  if (n.includes('pull') || n.includes('row') || n.includes('lat') || n.includes('back')) return '🔙';
  if (n.includes('shoulder') || n.includes('press') || n.includes('delt')) return '🏋️';
  if (n.includes('curl') || n.includes('tricep') || n.includes('arm') || n.includes('bicep')) return '💪';
  if (n.includes('crunch') || n.includes('plank') || n.includes('ab') || n.includes('core')) return '🧱';
  if (n.includes('run') || n.includes('jump') || n.includes('burpee') || n.includes('cardio')) return '❤️‍🔥';
  if (n.includes('stretch') || n.includes('yoga') || n.includes('mobility')) return '🧘';
  if (n.includes('glute') || n.includes('hip thrust')) return '🍑';
  return '🔥';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Categorize exercises into phases based on position
function getPhase(index: number, total: number): string | null {
  if (total <= 3) return null;
  if (index === 0) return 'Warm-Up';
  if (index === Math.ceil(total * 0.15)) return 'Main Set';
  if (index === total - Math.max(1, Math.floor(total * 0.15))) return 'Cool-Down';
  return null;
}

/** Minimal workout shape the player needs — works for both catalog and custom workouts */
export interface PlayerWorkout {
  id: string;
  name: string;
  emoji: string;
  cat?: string;
  exercises: Array<{
    name: string;
    sets: string;
    reps: string;
    dur?: number;
    rest?: number;
  }>;
}

interface WorkoutPlayerProps {
  workoutId: string;
  /** Pre-loaded workout data (custom/AI workouts). Skips catalog lookup when provided. */
  initialWorkout?: PlayerWorkout;
  onClose?: () => void;
}

export default function WorkoutPlayer({ workoutId, initialWorkout, onClose }: WorkoutPlayerProps) {
  const addLog = useAppStore((s) => s.addLog);
  const selectWorkout = useAppStore((s) => s.selectWorkout);
  const setTab = useAppStore((s) => s.setTab);

  const [workout, setWorkout] = useState<PlayerWorkout | null>(initialWorkout ?? null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<Record<number, number>>({});
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loggedRef = useRef(false);

  // Load workout data from catalog (only if no initialWorkout was provided)
  useEffect(() => {
    if (initialWorkout) return;
    getWorkouts().then((wks) => {
      const found = wks.find((w) => w.id === workoutId);
      if (found) setWorkout(found);
    });
  }, [workoutId, initialWorkout]);

  // Timer
  useEffect(() => {
    if (done || paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [done, paused]);

  const exercises = workout?.exercises ?? [];
  const totalExercises = exercises.length;

  // Parse sets count from string like "3" or "3-4"
  const getSetsCount = useCallback((setsStr: string): number => {
    const n = parseInt(setsStr, 10);
    return isNaN(n) || n <= 0 ? 1 : n;
  }, []);

  // Check if an exercise is fully completed
  const isExerciseDone = useCallback(
    (index: number): boolean => {
      if (!exercises[index]) return false;
      const needed = getSetsCount(exercises[index].sets);
      return (completedSets[index] ?? 0) >= needed;
    },
    [exercises, completedSets, getSetsCount]
  );

  // Mark a set as done
  const handleDoneSet = useCallback(() => {
    if (!exercises[currentIndex]) return;
    const needed = getSetsCount(exercises[currentIndex].sets);
    const current = completedSets[currentIndex] ?? 0;
    const next = current + 1;

    setCompletedSets((prev) => ({ ...prev, [currentIndex]: next }));

    if (next >= needed) {
      // Find next incomplete exercise
      let nextIdx = -1;
      for (let i = currentIndex + 1; i < totalExercises; i++) {
        const iNeeded = getSetsCount(exercises[i].sets);
        if ((completedSets[i] ?? 0) < iNeeded) {
          nextIdx = i;
          break;
        }
      }
      if (nextIdx >= 0) {
        setCurrentIndex(nextIdx);
      } else {
        // Check if all done
        const allDone = exercises.every((_, i) => {
          if (i === currentIndex) return next >= getSetsCount(exercises[i].sets);
          return (completedSets[i] ?? 0) >= getSetsCount(exercises[i].sets);
        });
        if (allDone) {
          setDone(true);
        }
      }
    }
  }, [currentIndex, completedSets, exercises, totalExercises, getSetsCount]);

  // Log workout on completion
  useEffect(() => {
    if (done && workout && !loggedRef.current) {
      loggedRef.current = true;
      const minutes = Math.max(1, Math.round(elapsed / 60));
      addLog({
        id: `${workout.id}-${Date.now()}`,
        name: workout.name,
        emoji: workout.emoji,
        date: new Date().toISOString(),
        dur: minutes,
        cal: Math.round(minutes * 7.5),
      });
    }
  }, [done, workout, elapsed, addLog]);

  // Scroll active exercise into view
  useEffect(() => {
    const el = document.getElementById(`pv-ex-${currentIndex}`);
    if (el && listRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex]);

  const handleBackHome = useCallback(() => {
    selectWorkout(null);
    setTab('home');
    onClose?.();
  }, [selectWorkout, setTab, onClose]);

  const handleViewProgress = useCallback(() => {
    selectWorkout(null);
    setTab('progress');
    onClose?.();
  }, [selectWorkout, setTab, onClose]);

  const handleStop = useCallback(() => {
    // End the workout early, go home
    selectWorkout(null);
    setTab('home');
    onClose?.();
  }, [selectWorkout, setTab, onClose]);

  const minutes = Math.max(1, Math.round(elapsed / 60));
  const calories = Math.round(minutes * 7.5);

  // Phase labels memoized
  const phaseLabels = useMemo(() => {
    const labels: Record<number, string> = {};
    exercises.forEach((_, i) => {
      const phase = getPhase(i, totalExercises);
      if (phase) labels[i] = phase;
    });
    return labels;
  }, [exercises, totalExercises]);

  if (!workout) {
    return (
      <div className="pv-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading workout...</div>
      </div>
    );
  }

  // ── Complete View ──
  if (done) {
    return (
      <div className="pv-complete">
        <div className="pv-complete-label">Session Complete</div>
        <div className="pv-trophy">🏆</div>
        <div className="pv-complete-title">
          GREAT <span>WORK!</span>
        </div>
        <div className="pv-complete-sub">{workout.name}</div>

        <div className="pv-stats-row">
          <div className="pv-stat-card">
            <div className="pv-stat-value">{minutes}</div>
            <div className="pv-stat-label">Minutes</div>
          </div>
          <div className="pv-stat-card">
            <div className="pv-stat-value">{totalExercises}</div>
            <div className="pv-stat-label">Exercises</div>
          </div>
          <div className="pv-stat-card">
            <div className="pv-stat-value">{calories}</div>
            <div className="pv-stat-label">Calories</div>
          </div>
        </div>

        <div className="pv-complete-actions">
          <button className="pv-btn-home" onClick={handleBackHome}>
            Back to Home &rarr;
          </button>
          <button className="pv-btn-progress" onClick={handleViewProgress}>
            View My Progress
          </button>
        </div>
      </div>
    );
  }

  // ── Player View ──
  return (
    <div className="pv-container">
      {/* Header */}
      <div className="pv-header">
        <button className="pv-close-btn" onClick={handleStop} title="End workout">
          ✕
        </button>
        <div className="pv-timer">{formatTime(elapsed)}</div>
        <div className="pv-workout-name">{workout.name}</div>
        <button
          className="pv-pause-btn"
          onClick={() => setPaused(true)}
          title="Pause"
        >
          ⏸
        </button>
      </div>

      {/* Exercise list */}
      <div className="pv-list" ref={listRef}>
        {exercises.map((ex, i) => {
          const exDone = isExerciseDone(i);
          const isActive = i === currentIndex && !exDone;
          const emoji = getExerciseEmoji(ex.name);
          const setsNeeded = getSetsCount(ex.sets);
          const setsDone = completedSets[i] ?? 0;
          const phaseLabel = phaseLabels[i];

          return (
            <div key={i}>
              {phaseLabel && <div className="pv-phase">{phaseLabel}</div>}

              {isActive ? (
                /* ── Expanded active exercise ── */
                <div className="pv-active" id={`pv-ex-${i}`}>
                  <div className="pv-active-header">
                    <div className="pv-thumb">{emoji}</div>
                    <div>
                      <div className="pv-active-name">{ex.name}</div>
                      <div className="pv-active-meta">
                        {ex.sets}&times;{ex.reps}
                        {workout.cat ? ` · ${workout.cat}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="pv-video">{emoji}</div>

                  <div className="pv-sets-row">
                    {Array.from({ length: setsNeeded }).map((_, si) => (
                      <div
                        key={si}
                        className={`pv-dot${si < setsDone ? ' pv-dot--filled' : ''}`}
                      />
                    ))}
                    <span className="pv-sets-label">
                      {setsDone}/{setsNeeded} sets
                    </span>
                  </div>

                  <button className="pv-done-set-btn" onClick={handleDoneSet}>
                    Done Set ✓
                  </button>
                </div>
              ) : (
                /* ── Collapsed row ── */
                <div
                  className={`pv-row${exDone ? ' pv-row--done' : ''}`}
                  id={`pv-ex-${i}`}
                  onClick={() => {
                    if (!exDone) setCurrentIndex(i);
                  }}
                >
                  <div className="pv-thumb">{emoji}</div>
                  <div className="pv-row-info">
                    <div className="pv-row-name">{ex.name}</div>
                    <div className="pv-row-meta">
                      {ex.sets}&times;{ex.reps}
                    </div>
                  </div>
                  {exDone && (
                    <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 700 }}>
                      ✓
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pause overlay */}
      {paused && (
        <div className="pv-overlay">
          <div className="pv-overlay-card">
            <div className="pv-overlay-icon">⏸</div>
            <div className="pv-overlay-title">Workout Paused</div>
            <div className="pv-overlay-timer">{formatTime(elapsed)}</div>
            <div className="pv-overlay-buttons">
              <button className="pv-btn-stop" onClick={handleStop} title="Stop workout">
                ■
              </button>
              <button
                className="pv-btn-play"
                onClick={() => setPaused(false)}
                title="Resume"
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
