import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getWorkouts, getExercises, type Workout, type Exercise } from '../data/exercises';
import { EmojiIcon } from './EmojiIcon';
import { Flame, HandMetal } from '../utils/icons';
import { buildNameToSlug, workoutHeroThumb } from '../utils/thumbnails';
import './HomeTab.css';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const FEATURED_IMAGES = [
  'ReferenceImagesReal/8ee1370056b3d2132deac27ce992a93d.jpg',
  'ReferenceImagesReal/3888964e334eac66760016434935572e.jpg',
  'ReferenceImagesReal/4d2d6f35aaa3192a75bb1d865a1ec584.jpg',
  'ReferenceImagesReal/e64b6bf3121062bba39727d191b390cc.jpg',
];

export default function HomeTab() {
  const user = useAppStore((s) => s.user);
  const logs = useAppStore((s) => s.logs);
  const selectWorkout = useAppStore((s) => s.selectWorkout);
  const setTab = useAppStore((s) => s.setTab);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    getWorkouts().then(setWorkouts);
    getExercises().then(setExercises);
  }, []);

  const nameToSlug = useMemo(() => buildNameToSlug(exercises), [exercises]);

  const rec = workouts[0];
  const recExCount = rec?.exercises?.length ?? 0;
  const totalCals = useMemo(() => logs.reduce((a, l) => a + l.cal, 0), [logs]);

  return (
    <div className="home-tab">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="greeting" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {getGreeting()}
            <EmojiIcon icon={HandMetal} size={18} />
          </div>
          <div className="greeting-name">{user?.name || 'Athlete'}</div>
        </div>
        <div className="avatar">{user?.name?.charAt(0) || 'A'}</div>
      </div>

      {/* Hero */}
      {rec && (
        <div className="home-hero">
          <div className="hero-label">Today's Workout</div>
          <div className="hero-title font-display">{rec.name}</div>
          <div className="hero-meta">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <EmojiIcon emoji={rec.emoji} size={16} />
              {rec.dur} min
            </span>
            <span className="dot" />
            <span>{recExCount} exercises</span>
            <span className="dot" />
            <span className="capitalize">{rec.diff}</span>
          </div>
          <button className="hero-cta" onClick={() => rec && selectWorkout(rec.id)}>Start Now →</button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-val">{logs.length}</div>
          <div className="stat-lbl">Workouts</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{logs.length}</div>
          <div className="stat-lbl">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{totalCals}</div>
          <div className="stat-lbl">Calories</div>
        </div>
      </div>

      {/* Featured */}
      <div className="section-header">
        <div className="section-label">Featured</div>
      </div>
      <div className="featured-grid">
        {workouts.slice(0, 4).map((w, i) => {
          const heroThumb = workoutHeroThumb(w, nameToSlug, exercises);
          const imgSrc = heroThumb ?? FEATURED_IMAGES[i % 4];
          return (
          <div className="featured-card" key={w.id} onClick={() => selectWorkout(w.id)}>
            <img
              src={imgSrc}
              alt={w.cat}
              className="featured-img"
              loading="lazy"
              onError={(e) => {
                // Fall back to stock image if the thumbnail 404s
                if (e.currentTarget.src.indexOf(FEATURED_IMAGES[i % 4]) === -1) {
                  e.currentTarget.src = FEATURED_IMAGES[i % 4];
                }
              }}
            />
            <div className="featured-overlay" />
            <div className="featured-content">
              <div className="featured-cat">{w.cat}</div>
              <div>
                <div className="featured-name font-display">{w.name}</div>
                <div className="featured-meta">{w.dur}min · {w.diff}</div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      {logs.length > 0 && (
        <>
          <div className="section-header" style={{ paddingTop: 12 }}>
            <div className="section-label">Recent Activity</div>
          </div>
          <div className="activity-list">
            {logs.slice(0, 3).map((l, i) => (
              <div className="log-entry" key={`${l.id}-${i}`}>
                <div className="log-entry-icon">
                  <EmojiIcon emoji={l.emoji} size={20} />
                </div>
                <div>
                  <div className="log-entry-name">{l.name}</div>
                  <div className="log-entry-meta">{timeAgo(l.date)} · {l.dur} min</div>
                </div>
                <div className="log-entry-cal" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <EmojiIcon icon={Flame} size={14} color="#CAFF00" />
                  {l.cal}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
