import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getExercises, type Exercise } from '../data/exercises';
import { exerciseThumb, isMediaHidden } from '../utils/thumbnails';
import { MuscleTile } from '../components/MuscleTile';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './ExerciseLibrary.css';

// ── Constants ──
const PER_PAGE = 30;

const MUSCLE_GROUPS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Core', 'Legs', 'Glutes', 'Cardio', 'Full Body', 'Forearms', 'Traps',
];

const EQUIPMENT_TYPES = [
  'All', 'Bodyweight', 'Barbell', 'Dumbbell', 'Cable',
  'Machine', 'Kettlebell', 'Resistance Bands', 'Bar', 'Swiss Ball',
];

const MUSCLE_I18N_KEYS: Record<string, string> = {
  'All': 'all', 'Chest': 'chest', 'Back': 'back', 'Shoulders': 'shoulders',
  'Biceps': 'biceps', 'Triceps': 'triceps', 'Core': 'core', 'Legs': 'legs',
  'Glutes': 'glutes', 'Cardio': 'cardio', 'Full Body': 'fullBody',
  'Forearms': 'forearms', 'Traps': 'traps',
};

const EQUIPMENT_I18N_KEYS: Record<string, string> = {
  'All': 'all', 'Bodyweight': 'bodyweight', 'Barbell': 'barbell',
  'Dumbbell': 'dumbbell', 'Cable': 'cable', 'Machine': 'machine',
  'Kettlebell': 'kettlebell', 'Resistance Bands': 'resistanceBands',
  'Bar': 'bar', 'Swiss Ball': 'swissBall',
};

// ── Pagination helpers ──
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

// ── Main Component ──
export default function ExerciseLibrary() {
  const { t, i18n } = useTranslation();
  const muscleLabel = (m: string) => t(`exerciseLibrary.muscles.${MUSCLE_I18N_KEYS[m] ?? 'all'}`);
  const equipmentLabel = (e: string) => t(`exerciseLibrary.equipment.${EQUIPMENT_I18N_KEYS[e] ?? 'all'}`);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') || '';
  const muscle = searchParams.get('muscle') || 'All';
  const equip = searchParams.get('equip') || 'All';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  useEffect(() => {
    getExercises(i18n.language).then(data => {
      setExercises(data);
      setLoading(false);
    });
  }, [i18n.language]);

  // ── SEO: document title ──
  useEffect(() => {
    const parts = [t('exerciseLibrary.title')];
    if (muscle !== 'All') parts.push(muscle);
    if (equip !== 'All') parts.push(equip);
    document.title = `${parts.join(' - ')} | Libo`;
    return () => { document.title = 'Libo'; };
  }, [muscle, equip, t]);

  // ── Filter logic ──
  const filtered = useMemo(() => {
    let result = exercises;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.bodyFocus.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q)
      );
    }

    if (muscle !== 'All') {
      const m = muscle.toLowerCase();
      result = result.filter(e => {
        const bf = e.bodyFocus.toLowerCase();
        // Match "Shoulder" or "Shoulders" for the "Shoulders" chip
        if (m === 'shoulders') return bf.includes('shoulder');
        return bf.includes(m);
      });
    }

    if (equip !== 'All') {
      const eq = equip.toLowerCase();
      result = result.filter(e => {
        const eqVal = e.equipment.toLowerCase();
        // "Cable" matches both "Cable" and "Cable Machine"
        if (eq === 'cable') return eqVal.includes('cable');
        // "Bar" should match "Bar" and "Pull-Up Bar" but not "Barbell"
        if (eq === 'bar') return eqVal === 'bar' || eqVal === 'pull-up bar' || eqVal === 'ez-bar' || eqVal === 'trap bar';
        return eqVal.includes(eq);
      });
    }

    result = [...result].sort((a, b) => {
      const aHas = isMediaHidden(a.cat, a.equipment) ? 0 : 1;
      const bHas = isMediaHidden(b.cat, b.equipment) ? 0 : 1;
      return bHas - aHas;
    });

    return result;
  }, [exercises, search, muscle, equip]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageExercises = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // ── Param setters ──
  const updateParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === 'All' || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      next.delete('page'); // reset page on filter change
      return next;
    });
  }, [setSearchParams]);

  const setPage = useCallback((p: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (p <= 1) {
        next.delete('page');
      } else {
        next.set('page', String(p));
      }
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSearchParams]);

  return (
    <>
      <SiteNav />

      <main className="el-page">
        <div className="el-container">
          {/* Breadcrumb */}
          <nav aria-label={t('exerciseLibrary.breadcrumbLabel')} className="el-breadcrumb">
            <Link to="/">{t('exerciseLibrary.breadcrumbHome')}</Link>
            <span className="el-breadcrumb-sep">&gt;</span>
            <span>{t('exerciseLibrary.breadcrumbResources')}</span>
            <span className="el-breadcrumb-sep">&gt;</span>
            <span>{t('exerciseLibrary.title')}</span>
          </nav>

          {/* Hero */}
          <div className="el-hero">
            <h1 className="font-display">{t('exerciseLibrary.title')}</h1>
            <p>{loading ? t('exerciseLibrary.exercisesWord') : t('exerciseLibrary.exerciseCount', { count: exercises.length })}. {t('exerciseLibrary.heroSubtitle')}</p>
          </div>

          {/* Search */}
          <div className="el-search-wrap">
            <span className="el-search-icon">&#128269;</span>
            <input
              type="text"
              className="el-search"
              placeholder={t('exerciseLibrary.searchPlaceholder')}
              aria-label={t('exerciseLibrary.searchAriaLabel')}
              value={search}
              onChange={e => updateParam('q', e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="el-filters">
            <div className="el-filter-row">
              <span className="el-filter-label">{t('exerciseLibrary.muscleGroupLabel')}</span>
              <div className="el-chips">
                {MUSCLE_GROUPS.map(m => (
                  <button
                    key={m}
                    className={`el-chip ${muscle === m ? 'active' : ''}`}
                    aria-pressed={muscle === m}
                    onClick={() => updateParam('muscle', m)}
                  >
                    {muscleLabel(m)}
                  </button>
                ))}
              </div>
            </div>
            <div className="el-filter-row">
              <span className="el-filter-label">{t('exerciseLibrary.equipmentLabel')}</span>
              <div className="el-chips">
                {EQUIPMENT_TYPES.map(e => (
                  <button
                    key={e}
                    className={`el-chip ${equip === e ? 'active' : ''}`}
                    aria-pressed={equip === e}
                    onClick={() => updateParam('equip', e)}
                  >
                    {equipmentLabel(e)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results count */}
          {!loading && (
            <div className="el-results-count" aria-live="polite">
              {t('exerciseLibrary.showingPrefix')} <strong>{pageExercises.length}</strong> {t('exerciseLibrary.showingOf')} <strong>{filtered.length}</strong> {t('exerciseLibrary.showingSuffix')}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="el-empty">
              <div className="el-empty-icon">&#9203;</div>
              <p className="el-empty-text">{t('exerciseLibrary.loading')}</p>
            </div>
          ) : pageExercises.length === 0 ? (
            <div className="el-empty">
              <div className="el-empty-icon">&#128556;</div>
              <p className="el-empty-text">{t('exerciseLibrary.emptyState.title')}</p>
              <p className="el-empty-sub">
                {muscle !== 'All' && equip !== 'All'
                  ? t('exerciseLibrary.emptyState.descriptionCombo', { equipment: equipmentLabel(equip).toLowerCase(), muscle: muscleLabel(muscle).toLowerCase() })
                  : t('exerciseLibrary.emptyState.description')}
              </p>
            </div>
          ) : (
            <div className="el-grid">
              {pageExercises.map(ex => {
                const thumb = exerciseThumb(ex);
                return (
                <Link key={ex.id} to={`/exercises/${ex.id}`} className="el-card">
                  <div className="el-card-media">
                    <MuscleTile muscle={ex.bodyFocus} />
                    {thumb && (
                      <img
                        src={thumb}
                        alt=""
                        loading="lazy"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                        className="el-card-thumb"
                      />
                    )}
                  </div>
                  <div className="el-card-name">{ex.name}</div>
                  <div className="el-card-meta">
                    <span className="el-card-badge">{ex.bodyFocus}</span>
                    <span className="el-card-equip">{ex.equipment}</span>
                    <span className={`el-card-diff ${ex.diff}`}>{ex.diff}</span>
                  </div>
                </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && !loading && (
            <div className="el-pagination">
              <button
                className="el-page-btn"
                disabled={safePage <= 1}
                aria-label={t('exerciseLibrary.previousPage')}
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
                aria-label={t('exerciseLibrary.nextPage')}
                onClick={() => setPage(safePage + 1)}
              >
                &#8250;
              </button>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
