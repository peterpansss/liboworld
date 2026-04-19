import { useState, useEffect } from 'react';
import { getWorkouts, type Workout } from '../data/exercises';
import { EmojiIcon } from './EmojiIcon';
import { Calendar, Moon, Sunrise } from '../utils/icons';
import './ProgramsTab.css';

interface FeaturedProgram {
  id: string;
  emoji: string;
  name: string;
  duration: string;
  difficulty: string;
  description: string;
}

const FEATURED_PROGRAMS: FeaturedProgram[] = [
  {
    id: 'fp-1',
    emoji: '💥',
    name: '30 Day Push-Up Challenge',
    duration: '30 days',
    difficulty: 'All Levels',
    description:
      'Progressive push-up program from 10 to 100. Build chest, shoulders, and triceps with daily targets.',
  },
  {
    id: 'fp-2',
    emoji: '🧘',
    name: 'Mobility Essentials',
    duration: '4 weeks',
    difficulty: 'Beginner',
    description:
      'Unlock your range of motion with daily 15-minute flows targeting hips, shoulders, and spine.',
  },
  {
    id: 'fp-3',
    emoji: '🔥',
    name: 'Full Body Transformation',
    duration: '8 weeks',
    difficulty: 'Intermediate',
    description:
      'Complete strength and conditioning program. 4 sessions per week combining resistance and HIIT.',
  },
  {
    id: 'fp-4',
    emoji: '🏃',
    name: 'Couch to 5K',
    duration: '6 weeks',
    difficulty: 'Beginner',
    description:
      'Run your first 5K with a structured walk-to-run program. 3 sessions per week, progressive overload.',
  },
];

export default function ProgramsTab() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    getWorkouts().then(setWorkouts);
  }, []);

  const programs = workouts
    .filter((w) => w.cat === 'Challenge')
    .map((w) => ({ ...w, weeksDone: 0, totalWeeks: 4 }));

  const routines = workouts.filter((w) => w.cat === 'Morning Routine');

  return (
    <div className="programs-tab">
      <div className="page-header">
        <div className="page-title">Programs</div>
      </div>

      {/* Featured Programs */}
      <div className="programs-section-header">
        <div className="section-label">Featured Programs</div>
        <p className="section-desc">
          Structured multi-week plans to build strength, mobility, and discipline.
        </p>
      </div>

      <div className="programs-list">
        {FEATURED_PROGRAMS.map((fp) => (
          <div className="program-card" key={fp.id}>
            <div className="program-card-top">
              <div className="program-card-header">
                <span className="program-emoji">
                  <EmojiIcon emoji={fp.emoji} size={28} />
                </span>
                <div className="program-card-info">
                  <div className="program-name font-display">{fp.name}</div>
                  <div className="program-meta">
                    {fp.duration} · {fp.difficulty}
                  </div>
                </div>
              </div>
              <span className="program-badge-soon">Coming Soon</span>
            </div>
            <div className="program-desc">{fp.description}</div>
            <div className="program-diff-badge">{fp.difficulty}</div>
          </div>
        ))}
      </div>

      {/* 30-Day Challenges */}
      <div className="programs-section-header" style={{ paddingTop: 24 }}>
        <div className="section-label">30-Day Challenges</div>
        <p className="section-desc">
          Structured programs with daily progressions. All you need to do is show up.
        </p>
      </div>

      <div className="programs-list">
        {programs.map((p) => {
          const mainCount = p.exercises?.length ?? 0;
          return (
            <div className="program-card" key={p.id}>
              <div className="program-card-top">
                <div className="program-card-header">
                  <span className="program-emoji">
                    <EmojiIcon emoji={p.emoji || '🎯'} size={28} />
                  </span>
                  <div className="program-card-info">
                    <div className="program-name font-display">{p.name}</div>
                    <div className="program-meta">
                      30 days · {p.diff} · {p.dur}min/day
                      {mainCount > 0 && ` · ${mainCount} exercises`}
                    </div>
                  </div>
                </div>
              </div>
              <button className="btn-full program-start-btn">Start Challenge</button>
            </div>
          );
        })}

        {programs.length === 0 && (
          <div className="programs-empty">
            <div className="programs-empty-icon">
              <EmojiIcon icon={Calendar} size={40} />
            </div>
            <div className="programs-empty-title">No challenges yet</div>
            <div className="programs-empty-desc">Challenge programs will appear here</div>
          </div>
        )}
      </div>

      {/* Morning & Evening Routines */}
      <div className="programs-section-header" style={{ paddingTop: 24 }}>
        <div className="section-label">Morning &amp; Evening Routines</div>
        <p className="section-desc">
          Short daily habits to start or end your day right.
        </p>
      </div>

      <div className="routines-list">
        {routines.map((r) => {
          const mainCount = r.exercises?.length ?? 0;
          const isEvening = r.name.toLowerCase().includes('evening');
          return (
            <div className="routine-item" key={r.id}>
              <div className="routine-icon">
                <EmojiIcon icon={isEvening ? Moon : Sunrise} size={24} />
              </div>
              <div className="routine-info">
                <div className="routine-name">{r.name}</div>
                <div className="routine-meta">
                  {r.dur}min · {r.diff}
                  {mainCount > 0 && ` · ${mainCount} exercises`}
                </div>
              </div>
              <div className="routine-arrow">›</div>
            </div>
          );
        })}

        {routines.length === 0 && (
          <div className="programs-empty" style={{ padding: '24px 16px' }}>
            <div className="programs-empty-desc">No routines available</div>
          </div>
        )}
      </div>
    </div>
  );
}
