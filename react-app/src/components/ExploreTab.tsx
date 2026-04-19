import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getExercises, getWorkouts, type Exercise, type Workout } from '../data/exercises';
import { EmojiIcon } from './EmojiIcon';
import { Pencil, Bot } from '../utils/icons';
import { buildNameToSlug, exerciseThumb, workoutHeroThumb } from '../utils/thumbnails';
import './ExploreTab.css';

const WORKOUT_CATS = ['All', 'Gym', 'Home', 'Cardio', 'Stretching', 'Challenge', 'Morning Routine'];
const EXERCISE_CATS = ['All', 'Gym', 'Home', 'Mobility', 'Chest', 'Back', 'Legs', 'Shoulders', 'Core', 'Cardio', 'Glutes', 'Arms'];

function diffLabel(diff: string): string {
  const d = diff || 'beginner';
  return d.charAt(0).toUpperCase() + d.slice(1, 3);
}

function diffClass(diff: string): string {
  const d = (diff || 'beginner').toLowerCase();
  if (d.startsWith('adv')) return 'diff-advanced';
  if (d.startsWith('int')) return 'diff-intermediate';
  return 'diff-beginner';
}

interface ExploreTabProps {
  onOpenBuilder?: () => void;
  onOpenAiGen?: () => void;
}

export default function ExploreTab({ onOpenBuilder, onOpenAiGen }: ExploreTabProps) {
  const exploreTab = useAppStore((s) => s.exploreTab);
  const exploreFilter = useAppStore((s) => s.exploreFilter);
  const searchQ = useAppStore((s) => s.searchQ);
  const exploreLimit = useAppStore((s) => s.exploreLimit);
  const setExploreTab = useAppStore((s) => s.setExploreTab);
  const setExploreFilter = useAppStore((s) => s.setExploreFilter);
  const setSearchQ = useAppStore((s) => s.setSearchQ);
  const loadMoreExplore = useAppStore((s) => s.loadMoreExplore);
  const selectWorkout = useAppStore((s) => s.selectWorkout);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    Promise.all([getExercises(), getWorkouts()]).then(([ex, wk]) => {
      setExercises(ex);
      setWorkouts(wk);
    });
  }, []);

  const isWorkouts = exploreTab === 'workouts';
  const q = searchQ.toLowerCase();
  const filter = exploreFilter;

  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      const catMatch = !filter || filter === 'all' || filter === 'All' || w.cat.toLowerCase() === filter.toLowerCase();
      const qMatch = !q || w.name.toLowerCase().includes(q);
      return catMatch && qMatch;
    });
  }, [workouts, filter, q]);

  const filteredExercises = useMemo(() => {
    return exercises.filter((e) => {
      const fl = filter.toLowerCase();
      const bodyFocus = (e.bodyFocus || '').toLowerCase();
      const cat = (e.cat || '').toLowerCase();
      const catMatch =
        fl === 'all' || fl === '' ||
        cat === fl ||
        bodyFocus.includes(fl) ||
        (fl === 'arms' && (bodyFocus.includes('bicep') || bodyFocus.includes('tricep') || bodyFocus.includes('forearm')));
      const qMatch = !q || e.name.toLowerCase().includes(q);
      return catMatch && qMatch;
    });
  }, [exercises, filter, q]);

  const pagedWorkouts = useMemo(() => filteredWorkouts.slice(0, exploreLimit), [filteredWorkouts, exploreLimit]);
  const pagedExercises = useMemo(() => filteredExercises.slice(0, exploreLimit), [filteredExercises, exploreLimit]);

  const nameToSlug = useMemo(() => buildNameToSlug(exercises), [exercises]);

  const currentCats = isWorkouts ? WORKOUT_CATS : EXERCISE_CATS;
  const totalCount = isWorkouts ? workouts.length : exercises.length;
  const remainingCount = isWorkouts
    ? filteredWorkouts.length - pagedWorkouts.length
    : filteredExercises.length - pagedExercises.length;

  const handleTabSwitch = useCallback(
    (tab: 'workouts' | 'exercises') => {
      setExploreTab(tab);
      setExploreFilter('All');
      setSearchQ('');
    },
    [setExploreTab, setExploreFilter, setSearchQ]
  );

  return (
    <div className="explore-tab">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">Explore</div>
        <div className="badge">
          {totalCount} {isWorkouts ? 'workouts' : 'exercises'}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="tab-switcher">
        <button
          className={`tab-btn${exploreTab === 'workouts' ? ' active' : ''}`}
          onClick={() => handleTabSwitch('workouts')}
        >
          Workouts
        </button>
        <button
          className={`tab-btn${exploreTab === 'exercises' ? ' active' : ''}`}
          onClick={() => handleTabSwitch('exercises')}
        >
          Exercises
        </button>
      </div>

      {/* Search */}
      <div className="search-wrap">
        <input
          className="search-input"
          placeholder={`Search ${isWorkouts ? 'workouts' : 'exercises'}...`}
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          aria-label={`Search ${isWorkouts ? 'workouts' : 'exercises'}`}
        />
      </div>

      {/* Filter Chips */}
      <div className="filter-row">
        {currentCats.map((c) => {
          const isActive =
            filter === c ||
            filter.toLowerCase() === c.toLowerCase() ||
            (!filter && c === 'All') ||
            (filter === 'all' && c === 'All');
          return (
            <button
              key={c}
              className={`filter-chip${isActive ? ' active' : ''}`}
              onClick={() => setExploreFilter(c)}
              aria-label={`Filter by ${c}`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isWorkouts ? (
        <>
          {/* Builder Cards */}
          <div className="builder-row">
            <div className="builder-card builder-custom" onClick={onOpenBuilder}>
              <div className="builder-emoji">
                <EmojiIcon icon={Pencil} size={28} />
              </div>
              <div>
                <div className="builder-title font-display">Build<br />Custom</div>
                <div className="builder-sub">Pick your exercises</div>
              </div>
            </div>
            <div className="builder-card builder-ai" onClick={onOpenAiGen}>
              <div className="builder-emoji">
                <EmojiIcon icon={Bot} size={28} />
              </div>
              <div>
                <div className="builder-title font-display">AI<br />Generate</div>
                <div className="builder-sub">Auto-build for your goal</div>
              </div>
            </div>
          </div>

          {/* Workout Grid */}
          <div className="explore-section-label">
            <div className="section-label">All Workouts</div>
          </div>
          <div className="workout-grid">
            {pagedWorkouts.map((w) => {
              const mainCount = w.exercises?.length ?? 0;
              const heroThumb = workoutHeroThumb(w, nameToSlug, exercises);
              return (
                <div
                  className="wcard"
                  key={w.id}
                  onClick={() => selectWorkout(w.id)}
                  style={heroThumb ? { position: 'relative', overflow: 'hidden', minHeight: 140, color: '#fff' } : undefined}
                >
                  {heroThumb && (
                    <>
                      <img
                        src={heroThumb}
                        alt=""
                        loading="lazy"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                      />
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 100%)',
                          zIndex: 1,
                        }}
                      />
                    </>
                  )}
                  <div style={heroThumb ? { position: 'relative', zIndex: 2 } : undefined}>
                    <span className="wcard-emoji">
                      <EmojiIcon emoji={w.emoji || '🏋️'} size={24} />
                    </span>
                    <div className="wcard-name" style={heroThumb ? { color: '#fff' } : undefined}>{w.name}</div>
                    <div className="wcard-meta" style={heroThumb ? { color: 'rgba(255,255,255,0.8)' } : undefined}>
                      {w.dur}min · {w.diff}
                      {mainCount > 0 && ` · ${mainCount} ex`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {remainingCount > 0 && (
            <div className="load-more-wrap">
              <button className="load-more-btn" onClick={loadMoreExplore}>
                Load more ({remainingCount} left)
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Exercise List */}
          <div className="exercise-list">
            {pagedExercises.map((e) => (
              <div className="exercise-item" key={e.id}>
                <div className="exercise-emoji" style={{ position: 'relative', overflow: 'hidden' }}>
                  <span style={{ position: 'relative', zIndex: 0 }}>
                    <EmojiIcon emoji={e.emoji || '💪'} size={22} />
                  </span>
                  {exerciseThumb(e.id, e.cat) && (
                    <img
                      src={exerciseThumb(e.id, e.cat)!}
                      alt=""
                      loading="lazy"
                      onError={(ev) => (ev.currentTarget.style.display = 'none')}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
                    />
                  )}
                </div>
                <div className="exercise-info">
                  <div className="exercise-name">{e.name}</div>
                  <div className="exercise-meta">
                    {e.bodyFocus || ''}
                    {e.equipment && e.equipment.toLowerCase() !== 'bodyweight' && e.equipment.toLowerCase() !== 'none' ? ` · ${e.equipment}` : ''}
                  </div>
                </div>
                <div className={`diff-badge ${diffClass(e.diff)}`}>
                  {diffLabel(e.diff)}
                </div>
              </div>
            ))}
          </div>

          {remainingCount > 0 && (
            <div className="load-more-wrap">
              <button className="load-more-btn" onClick={loadMoreExplore}>
                Load more ({remainingCount} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
