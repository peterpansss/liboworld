import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getWorkouts, getExercises, type Workout, type Exercise } from '../data/exercises';
import { buildNameToSlug, workoutHeroThumb } from '../utils/thumbnails';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { EmojiIcon } from '../components/EmojiIcon';
import { Search, Hourglass, Frown } from '../utils/icons';
import './ExerciseLibrary.css';
import './ProgramLibrary.css';

const CATEGORY_KEYS = ['All', 'Gym', 'Home', 'Cardio', 'Stretching', 'Morning Routine'];
const MAX_VISIBLE = 6;

function diffClass(diff: string): string {
  const d = (diff || 'beginner').toLowerCase();
  if (d.startsWith('adv')) return 'advanced';
  if (d.startsWith('int')) return 'intermediate';
  return 'beginner';
}

export default function ProgramLibrary() {
  const { t } = useTranslation();

  const diffLabel = (diff: string): string => {
    const d = (diff || 'beginner').toLowerCase();
    if (d.startsWith('adv')) return t('programLibrary.difficulty.advanced');
    if (d.startsWith('int')) return t('programLibrary.difficulty.intermediate');
    return t('programLibrary.difficulty.beginner');
  };

  const categoryLabel = (c: string): string => {
    const map: Record<string, string> = {
      'All': t('programLibrary.categories.all'),
      'Gym': t('programLibrary.categories.gym'),
      'Home': t('programLibrary.categories.home'),
      'Cardio': t('programLibrary.categories.cardio'),
      'Stretching': t('programLibrary.categories.stretching'),
      'Morning Routine': t('programLibrary.categories.morningRoutine'),
    };
    return map[c] ?? c;
  };

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') || '';
  const cat = searchParams.get('cat') || 'All';

  useEffect(() => {
    Promise.all([getWorkouts(), getExercises()]).then(([wks, exs]) => {
      setWorkouts(wks);
      setExercises(exs);
      setLoading(false);
    });
  }, []);

  const nameToSlug = useMemo(() => buildNameToSlug(exercises), [exercises]);

  useEffect(() => {
    const base = t('programLibrary.documentTitle');
    document.title = cat !== 'All' ? `${cat} ${base} | Libo` : `${base} | Libo`;
    return () => { document.title = 'Libo'; };
  }, [cat, t]);

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

    if (cat !== 'All') {
      result = result.filter((w) => w.cat.toLowerCase() === cat.toLowerCase());
    }

    return result;
  }, [workouts, search, cat]);

  const visible = filtered.slice(0, MAX_VISIBLE);
  const moreCount = Math.max(0, filtered.length - MAX_VISIBLE);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === 'All' || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  }

  return (
    <>
      <SiteNav />

      <main className="el-page">
        <div className="el-container">
          {/* Breadcrumb */}
          <nav aria-label={t('programLibrary.breadcrumbAria')} className="el-breadcrumb">
            <Link to="/">{t('programLibrary.breadcrumb.home')}</Link>
            <span className="el-breadcrumb-sep">&gt;</span>
            <span>{t('programLibrary.breadcrumb.resources')}</span>
            <span className="el-breadcrumb-sep">&gt;</span>
            <span>{t('programLibrary.breadcrumb.workouts')}</span>
          </nav>

          {/* Hero */}
          <div className="el-hero">
            <h1 className="font-display">{t('programLibrary.title')}</h1>
            <p>{t('programLibrary.subtitle', { count: workouts.length })}</p>
          </div>

          {/* Search */}
          <div className="el-search-wrap">
            <span className="el-search-icon" aria-hidden="true">
              <EmojiIcon icon={Search} size={16} />
            </span>
            <input
              type="text"
              className="el-search"
              placeholder={t('programLibrary.searchPlaceholder')}
              aria-label={t('programLibrary.searchAria')}
              value={search}
              onChange={(e) => updateParam('q', e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="el-filters">
            <div className="el-filter-row">
              <span className="el-filter-label">{t('programLibrary.filters.category')}</span>
              <div className="el-chips">
                {CATEGORY_KEYS.map((c) => (
                  <button
                    key={c}
                    className={`el-chip ${cat === c ? 'active' : ''}`}
                    aria-pressed={cat === c}
                    onClick={() => updateParam('cat', c)}
                  >
                    {categoryLabel(c)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results count */}
          {!loading && (
            <div className="el-results-count" aria-live="polite" role="status">
              {t('programLibrary.resultsCountPrefix')} <strong>{visible.length}</strong> {t('programLibrary.resultsCountOf')} <strong>{filtered.length}</strong> {t('programLibrary.resultsCountSuffix')}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="el-empty">
              <div className="el-empty-icon" aria-hidden="true">
                <EmojiIcon icon={Hourglass} size={40} />
              </div>
              <p className="el-empty-text">{t('programLibrary.loading')}</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="el-empty">
              <div className="el-empty-icon" aria-hidden="true">
                <EmojiIcon icon={Frown} size={40} />
              </div>
              <p className="el-empty-text">{t('programLibrary.empty.title')}</p>
              <p className="el-empty-sub">{t('programLibrary.empty.subtitle')}</p>
            </div>
          ) : (
            <div className="el-grid">
              {visible.map((w) => {
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
                    <span className="el-card-badge">{categoryLabel(w.cat)}</span>
                    <span className="el-card-equip">{t('programLibrary.card.minutes', { count: w.dur })}</span>
                    <span className={`el-card-diff ${diffClass(w.diff)}`}>
                      {diffLabel(w.diff)}
                    </span>
                  </div>
                </Link>
                );
              })}
            </div>
          )}

          {/* More in app CTA */}
          {moreCount > 0 && (
            <div className="wk-more-cta">
              <p className="wk-more-text">
                {t('programLibrary.moreCta.text', { count: moreCount })}
              </p>
              <Link to="/onboarding" className="wk-more-btn">
                {t('programLibrary.moreCta.button')}
              </Link>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
