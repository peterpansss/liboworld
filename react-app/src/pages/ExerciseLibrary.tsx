import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getExercises, type Exercise } from '../data/exercises';
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
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') || '';
  const muscle = searchParams.get('muscle') || 'All';
  const equip = searchParams.get('equip') || 'All';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  useEffect(() => {
    getExercises().then(data => {
      setExercises(data);
      setLoading(false);
    });
  }, []);

  // ── SEO: document title ──
  useEffect(() => {
    const parts = ['Exercise Library'];
    if (muscle !== 'All') parts.push(muscle);
    if (equip !== 'All') parts.push(equip);
    document.title = `${parts.join(' - ')} | Libo`;
    return () => { document.title = 'Libo'; };
  }, [muscle, equip]);

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
          <nav aria-label="Breadcrumb" className="el-breadcrumb">
            <Link to="/">Home</Link>
            <span className="el-breadcrumb-sep">&gt;</span>
            <span>Resources</span>
            <span className="el-breadcrumb-sep">&gt;</span>
            <span>Exercise Library</span>
          </nav>

          {/* Hero */}
          <div className="el-hero">
            <h1 className="font-display">Exercise Library</h1>
            <p>{loading ? 'Exercises' : `${exercises.length} exercises`}. Filter by muscle group, equipment, or search by name.</p>
          </div>

          {/* Search */}
          <div className="el-search-wrap">
            <span className="el-search-icon">&#128269;</span>
            <input
              type="text"
              className="el-search"
              placeholder="Search exercises..."
              aria-label="Search exercises"
              value={search}
              onChange={e => updateParam('q', e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="el-filters">
            <div className="el-filter-row">
              <span className="el-filter-label">Muscle Group</span>
              <div className="el-chips">
                {MUSCLE_GROUPS.map(m => (
                  <button
                    key={m}
                    className={`el-chip ${muscle === m ? 'active' : ''}`}
                    aria-pressed={muscle === m}
                    onClick={() => updateParam('muscle', m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="el-filter-row">
              <span className="el-filter-label">Equipment</span>
              <div className="el-chips">
                {EQUIPMENT_TYPES.map(e => (
                  <button
                    key={e}
                    className={`el-chip ${equip === e ? 'active' : ''}`}
                    aria-pressed={equip === e}
                    onClick={() => updateParam('equip', e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results count */}
          {!loading && (
            <div className="el-results-count" aria-live="polite">
              Showing <strong>{pageExercises.length}</strong> of <strong>{filtered.length}</strong> exercises
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="el-empty">
              <div className="el-empty-icon">&#9203;</div>
              <p className="el-empty-text">Loading exercises...</p>
            </div>
          ) : pageExercises.length === 0 ? (
            <div className="el-empty">
              <div className="el-empty-icon">&#128556;</div>
              <p className="el-empty-text">No exercises match this combination</p>
              <p className="el-empty-sub">
                {muscle !== 'All' && equip !== 'All'
                  ? `No ${equip.toLowerCase()} exercises target ${muscle.toLowerCase()}. Try a different equipment type or muscle group.`
                  : 'Try adjusting your search or clearing filters'}
              </p>
            </div>
          ) : (
            <div className="el-grid">
              {pageExercises.map(ex => (
                <Link key={ex.id} to={`/exercises/${ex.id}`} className="el-card">
                  <div className="el-card-emoji"><span role="img" aria-hidden="true">{ex.emoji}</span></div>
                  <div className="el-card-name">{ex.name}</div>
                  <div className="el-card-meta">
                    <span className="el-card-badge">{ex.bodyFocus}</span>
                    <span className="el-card-equip">{ex.equipment}</span>
                    <span className={`el-card-diff ${ex.diff}`}>{ex.diff}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && !loading && (
            <div className="el-pagination">
              <button
                className="el-page-btn"
                disabled={safePage <= 1}
                aria-label="Previous page"
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
                aria-label="Next page"
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
