import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getWorkouts, getExercises, type Exercise, type Workout } from '../data/exercises';
import { buildPlayableExerciseNames, filterPlayableWorkouts } from '../lib/playableWorkouts';
import { buildNameToSlug, workoutHeroThumb } from '../utils/thumbnails';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { EmojiIcon } from '../components/EmojiIcon';
import { Hourglass, Frown } from '../utils/icons';
import './ExerciseLibrary.css';
import './ProgramLibrary.css';

const GOAL_KEYS = ['All', 'Strength', 'Cardio', 'Mobility', 'Stretching', 'Recovery', 'Morning', 'Evening'] as const;
type GoalKey = typeof GOAL_KEYS[number];

const DURATION_KEYS = ['Any', 'Short', 'Medium', 'Long', 'XLong'] as const;
type DurationKey = typeof DURATION_KEYS[number];

const CAT_KEYS = ['All', 'Gym', 'Home'] as const;
type CatKey = typeof CAT_KEYS[number];

const PAGE_SIZE = 12;

function diffClass(diff: string): string {
  const d = (diff || 'beginner').toLowerCase();
  if (d.startsWith('adv')) return 'advanced';
  if (d.startsWith('int')) return 'intermediate';
  return 'beginner';
}

// Pagination helper — same shape as ExerciseLibrary.tsx so the el-pagination
// styles render identically (1 ... N).
function getPaginationRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

// Goal classifier — first match wins. Maps the existing cat/subcat fields
// onto the user-facing Goal axis. No data-schema changes; kept here so it's
// easy to retune without touching the source spreadsheet.
//
// Specific subcat signals are checked BEFORE broad cat fallbacks. Otherwise a
// workout correctly tagged subcat='Before Sleep' / 'Mobility' / 'Recovery'
// gets caught by the earlier cat === 'morning routine' / 'stretching' branch
// and ends up in the wrong bucket — leaving the Evening / Mobility / Recovery
// chips empty even though tagged content exists.
function classifyGoal(w: { cat: string; subcat?: string }): Exclude<GoalKey, 'All'> {
  const cat = (w.cat || '').toLowerCase();
  const sub = (w.subcat || '').toLowerCase();
  if (sub === 'before sleep') return 'Evening';
  if (sub === 'wake-up') return 'Morning';
  if (sub === 'mobility' || sub === 'dynamic mobility') return 'Mobility';
  if (sub === 'recovery' || sub.includes('rehab')) return 'Recovery';
  if (cat === 'cardio' || sub.includes('hiit') || sub.includes('cardio') || sub === 'steady-state') return 'Cardio';
  if (cat === 'morning routine') return 'Morning';
  if (cat === 'stretching') return 'Stretching';
  return 'Strength';
}

function matchesDuration(dur: number, key: DurationKey): boolean {
  switch (key) {
    case 'Any': return true;
    case 'Short': return dur <= 15;
    case 'Medium': return dur > 15 && dur <= 30;
    case 'Long': return dur > 30 && dur <= 45;
    case 'XLong': return dur > 45;
  }
}

export default function ProgramLibrary() {
  const { t, i18n } = useTranslation();

  const diffLabel = (diff: string): string => {
    const d = (diff || 'beginner').toLowerCase();
    if (d.startsWith('adv')) return t('programLibrary.difficulty.advanced');
    if (d.startsWith('int')) return t('programLibrary.difficulty.intermediate');
    return t('programLibrary.difficulty.beginner');
  };

  const goalLabel = (g: GoalKey): string =>
    t(`programLibrary.goals.${g.toLowerCase()}`, { defaultValue: g });

  const durationLabel = (d: DurationKey): string =>
    t(`programLibrary.durations.${d.toLowerCase()}`, {
      defaultValue: d === 'Any' ? 'Any' : d === 'Short' ? '≤15 min' : d === 'Medium' ? '15–30 min' : d === 'Long' ? '30–45 min' : '45+ min',
    });

  const categoryBadgeLabel = (c: string): string => {
    const map: Record<string, string> = {
      'Gym': t('programLibrary.categories.gym'),
      'Home': t('programLibrary.categories.home'),
      'Cardio': t('programLibrary.categories.cardio'),
      'Stretching': t('programLibrary.categories.stretching'),
      'Morning Routine': t('programLibrary.categories.morningRoutine'),
    };
    return map[c] ?? c;
  };

  // Static catalogs — workouts.json + exercises.json (build-time baseline).
  // The Supabase race-and-replace path used to live here via a useWorkouts
  // hook, but that hook was never committed; ship a simpler getWorkouts/
  // getExercises path so the page keeps working without it.
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const search = searchParams.get('q') || '';
  const goalParam = (searchParams.get('goal') || 'All') as GoalKey;
  const durationParam = (searchParams.get('dur') || 'Any') as DurationKey;
  const goal: GoalKey = (GOAL_KEYS as readonly string[]).includes(goalParam) ? goalParam : 'All';
  const duration: DurationKey = (DURATION_KEYS as readonly string[]).includes(durationParam) ? durationParam : 'Any';
  // ?cat=Gym|Home|Cardio|Stretching|Morning Routine — entry point used by the
  // footer's per-category links. Filters by w.cat directly (different axis from
  // ?goal which classifies intent like Strength/Mobility).
  const cat = searchParams.get('cat') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  useEffect(() => {
    let cancelled = false;
    Promise.all([getWorkouts(), getExercises(i18n.language)]).then(([w, e]) => {
      if (cancelled) return;
      // Drop workout blocks whose exercise has no playable video (and no
      // child fallback). Same predicate as the exercise library uses — when
      // animations ship, both inherit the wider rule. Workouts that end up
      // with zero blocks are dropped from the list entirely.
      const playableNames = buildPlayableExerciseNames(e);
      setWorkouts(filterPlayableWorkouts(w, playableNames));
      setExercises(e);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [i18n.language]);

  const nameToSlug = useMemo(() => buildNameToSlug(exercises), [exercises]);

  useEffect(() => {
    const base = t('programLibrary.documentTitle');
    document.title = goal !== 'All' ? `${goalLabel(goal)} ${base} | Libo` : `${base} | Libo`;
    return () => { document.title = 'Libo'; };
  }, [goal, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let result = workouts;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          (w.subcat && w.subcat.toLowerCase().includes(q)) ||
          w.cat.toLowerCase().includes(q)
      );
    }

    if (goal !== 'All') {
      result = result.filter((w) => classifyGoal(w) === goal);
    }

    if (duration !== 'Any') {
      result = result.filter((w) => matchesDuration(w.dur, duration));
    }

    if (cat) {
      result = result.filter((w) => w.cat === cat);
    }

    return result;
  }, [workouts, search, goal, duration, cat]);

  const filtersActive = !!search || goal !== 'All' || duration !== 'Any' || !!cat;
  const activeFilterCount =
    (goal !== 'All' ? 1 : 0) + (duration !== 'Any' ? 1 : 0) + (cat ? 1 : 0);

  const groupedByGoal = useMemo(() => {
    const groups: Record<Exclude<GoalKey, 'All'>, Workout[]> = {
      Strength: [], Cardio: [], Mobility: [], Stretching: [], Recovery: [], Morning: [], Evening: [],
    };
    workouts.forEach((w) => groups[classifyGoal(w)].push(w));
    return groups;
  }, [workouts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pageWorkouts = filtered.slice(pageStart, pageEnd);

  const updateParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const isDefault =
        (key === 'goal' && value === 'All') ||
        (key === 'dur' && value === 'Any') ||
        (key === 'cat' && value === '') ||
        (key === 'q' && value === '');
      if (isDefault) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setPage = useCallback((p: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (p <= 1) next.delete('page'); else next.set('page', String(p));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSearchParams]);

  function clearAll() {
    setSearchParams({}, { replace: true });
  }

  function renderCard(w: Workout) {
    const heroThumb = workoutHeroThumb(w, nameToSlug, exercises);
    return (
      <Link key={w.id} to={`/workouts/${w.id}`} className="el-card">
        <div className="el-card-emoji" style={{ position: 'relative', overflow: 'hidden' }}>
          <span aria-hidden="true" style={{ position: 'relative', zIndex: 0 }}>
            <EmojiIcon emoji={w.emoji || '🏋️'} size={28} />
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
        </div>
        <div className="el-card-name">{w.name}</div>
        <div className="el-card-meta">
          <span className="el-card-badge">{categoryBadgeLabel(w.cat)}</span>
          <span className="el-card-equip">{t('programLibrary.card.minutes', { count: w.dur })}</span>
          <span className={`el-card-diff ${diffClass(w.diff)}`}>
            {diffLabel(w.diff)}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <>
      <SiteNav />

      <main className="el-page">
        <div className="el-container">
          <nav aria-label={t('programLibrary.breadcrumbAria')} className="el-breadcrumb">
            <Link to="/">{t('programLibrary.breadcrumb.home')}</Link>
            <span className="el-breadcrumb-sep">&gt;</span>
            <span>{t('programLibrary.breadcrumb.resources')}</span>
            <span className="el-breadcrumb-sep">&gt;</span>
            <span>{t('programLibrary.breadcrumb.workouts')}</span>
          </nav>

          <div className="el-hero">
            <h1 className="font-display">{t('programLibrary.title')}</h1>
            <p>{t('programLibrary.subtitleAll', { count: workouts.length, defaultValue: '{{count}} guided workouts. Pick by goal, by time, or just browse.' })}</p>
          </div>

          {/* Generate-workout CTA — routes to the Fitbod-style picker page.
              Sits above the chips so it's the first thing visitors see. */}
          <div className="el-generate-cta">
            <div>
              <div className="el-generate-cta__title">
                {t('programLibrary.generateTitle', { defaultValue: 'Generate your next workout' })}
              </div>
              <div className="el-generate-cta__sub">
                {t('programLibrary.generateSub', { defaultValue: 'Pick your focus and get a matching routine in seconds.' })}
              </div>
            </div>
            <Link to="/workouts/generate" className="el-generate-cta__btn">
              {t('programLibrary.generateBtn', { defaultValue: 'Generate →' })}
            </Link>
          </div>

          <div className="el-filter-row el-filter-row--primary">
            <div className="el-chips">
              {CAT_KEYS.map((c: CatKey) => {
                const isActive = (cat || 'All') === c;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`el-chip ${isActive ? 'active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => updateParam('cat', c === 'All' ? '' : c)}
                  >
                    {c === 'All'
                      ? t('programLibrary.filters.catAll', { defaultValue: 'All' })
                      : categoryBadgeLabel(c)}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="el-filters-toggle"
            aria-expanded={filtersOpen}
            aria-controls="el-filters"
            onClick={() => setFiltersOpen(o => !o)}
          >
            <span>
              {t('exerciseLibrary.filtersToggle', { defaultValue: 'Filters' })}
              {activeFilterCount > 0 && (
                <span className="el-filters-toggle__count" aria-label="active filter count">
                  {activeFilterCount}
                </span>
              )}
            </span>
            <span className="el-filters-toggle__chev" aria-hidden>▾</span>
          </button>

          <div id="el-filters" className={`el-filters ${filtersOpen ? 'el-filters--open' : ''}`}>
            <div className="el-filter-row">
              <span className="el-filter-label">{t('programLibrary.filters.goal', { defaultValue: 'Goal' })}</span>
              <div className="el-chips">
                {GOAL_KEYS.map((g) => (
                  <button
                    key={g}
                    className={`el-chip ${goal === g ? 'active' : ''}`}
                    aria-pressed={goal === g}
                    onClick={() => updateParam('goal', goal === g ? 'All' : g)}
                  >
                    {goalLabel(g)}
                  </button>
                ))}
              </div>
            </div>
            <div className="el-filter-row">
              <span className="el-filter-label">{t('programLibrary.filters.duration', { defaultValue: 'Duration' })}</span>
              <div className="el-chips">
                {DURATION_KEYS.map((d) => (
                  <button
                    key={d}
                    className={`el-chip ${duration === d ? 'active' : ''}`}
                    aria-pressed={duration === d}
                    onClick={() => updateParam('dur', duration === d ? 'Any' : d)}
                  >
                    {durationLabel(d)}
                  </button>
                ))}
              </div>
            </div>
            {filtersActive && (
              <button type="button" className="wk-clear-filters" onClick={clearAll}>
                {t('common.clearFilters', { defaultValue: 'Clear filters' })}
              </button>
            )}
          </div>

          {loading && (
            <div className="el-empty">
              <div className="el-empty-icon" aria-hidden="true">
                <EmojiIcon icon={Hourglass} size={40} />
              </div>
              <p className="el-empty-text">{t('programLibrary.loading')}</p>
            </div>
          )}

          {!loading && !filtersActive && (
            <div className="wk-groups">
              {(Object.keys(groupedByGoal) as Array<keyof typeof groupedByGoal>).map((g) => {
                const items = groupedByGoal[g];
                if (items.length === 0) return null;
                return (
                  <section key={g} className="wk-group" aria-labelledby={`wk-group-${g}`}>
                    <header className="wk-group-header">
                      <h2 id={`wk-group-${g}`} className="wk-group-title font-display">{goalLabel(g)}</h2>
                    </header>
                    <div className="wk-group-grid">
                      {items.slice(0, 3).map(renderCard)}
                    </div>
                    {items.length > 3 && (
                      <Link to="/get-app" className="wk-group-more">
                        {t('programLibrary.moreInApp', {
                          count: items.length - 3,
                          goal: goalLabel(g),
                          defaultValue: '+ {{count}} more {{goal}} workouts in the Libo app →',
                        })}
                      </Link>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {!loading && filtersActive && (
            <>
              <div className="el-results-count" aria-live="polite" role="status">
                {t('programLibrary.resultsCountPrefix')} <strong>{Math.min(pageStart + 1, filtered.length)}–{Math.min(pageEnd, filtered.length)}</strong> {t('programLibrary.resultsCountOf')} <strong>{filtered.length}</strong> {t('programLibrary.resultsCountSuffix')}
              </div>

              {filtered.length === 0 ? (
                <div className="el-empty">
                  <div className="el-empty-icon" aria-hidden="true">
                    <EmojiIcon icon={Frown} size={40} />
                  </div>
                  <p className="el-empty-text">{t('programLibrary.empty.title')}</p>
                  <p className="el-empty-sub">{t('programLibrary.empty.subtitle')}</p>
                  <button className="el-empty-clear" onClick={clearAll}>
                    {t('common.clearFilters', { defaultValue: 'Clear filters' })}
                  </button>
                </div>
              ) : (
                <div className="el-grid">
                  {pageWorkouts.map(renderCard)}
                </div>
              )}

              {totalPages > 1 && (
                <div className="el-pagination">
                  <button
                    className="el-page-btn"
                    disabled={safePage <= 1}
                    aria-label={t('exerciseLibrary.previousPage', { defaultValue: 'Previous page' })}
                    onClick={() => setPage(safePage - 1)}
                  >
                    &#8249;
                  </button>
                  {getPaginationRange(safePage, totalPages).map((item, i) =>
                    item === 'ellipsis' ? (
                      <span key={`e${i}`} className="el-page-ellipsis">&hellip;</span>
                    ) : (
                      <button
                        key={item}
                        className={`el-page-btn ${safePage === item ? 'active' : ''}`}
                        {...(safePage === item ? { 'aria-current': 'page' as const } : {})}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    )
                  )}
                  <button
                    className="el-page-btn"
                    disabled={safePage >= totalPages}
                    aria-label={t('exerciseLibrary.nextPage', { defaultValue: 'Next page' })}
                    onClick={() => setPage(safePage + 1)}
                  >
                    &#8250;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
