import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getWorkouts, type Workout } from '../data/exercises';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './ExerciseLibrary.css';
import './ProgramLibrary.css';

const CATEGORIES = ['All', 'Gym', 'Home', 'Cardio', 'Stretching', 'Morning Routine'];
const MAX_VISIBLE = 6;

function diffClass(diff: string): string {
  const d = (diff || 'beginner').toLowerCase();
  if (d.startsWith('adv')) return 'advanced';
  if (d.startsWith('int')) return 'intermediate';
  return 'beginner';
}

function diffLabel(diff: string): string {
  const d = (diff || 'beginner').toLowerCase();
  if (d.startsWith('adv')) return 'Advanced';
  if (d.startsWith('int')) return 'Intermediate';
  return 'Beginner';
}

export default function ProgramLibrary() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') || '';
  const cat = searchParams.get('cat') || 'All';

  useEffect(() => {
    getWorkouts().then((wks) => {
      setWorkouts(wks);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    document.title = cat !== 'All' ? `${cat} Workouts | Libo` : 'Workouts | Libo';
    return () => { document.title = 'Libo'; };
  }, [cat]);

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
          <nav aria-label="Breadcrumb" className="el-breadcrumb">
            <Link to="/">Home</Link>
            <span className="el-breadcrumb-sep">&gt;</span>
            <span>Resources</span>
            <span className="el-breadcrumb-sep">&gt;</span>
            <span>Workouts</span>
          </nav>

          {/* Hero */}
          <div className="el-hero">
            <h1 className="font-display">Workouts</h1>
            <p>{workouts.length} guided workouts. Preview a selection — unlock the full library in the app.</p>
          </div>

          {/* Search */}
          <div className="el-search-wrap">
            <span className="el-search-icon" aria-hidden="true">&#128269;</span>
            <input
              type="text"
              className="el-search"
              placeholder="Search workouts..."
              aria-label="Search workouts"
              value={search}
              onChange={(e) => updateParam('q', e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="el-filters">
            <div className="el-filter-row">
              <span className="el-filter-label">Category</span>
              <div className="el-chips">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    className={`el-chip ${cat === c ? 'active' : ''}`}
                    aria-pressed={cat === c}
                    onClick={() => updateParam('cat', c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results count */}
          {!loading && (
            <div className="el-results-count" aria-live="polite" role="status">
              Showing <strong>{visible.length}</strong> of <strong>{filtered.length}</strong> workouts
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="el-empty">
              <div className="el-empty-icon" aria-hidden="true">&#9203;</div>
              <p className="el-empty-text">Loading workouts...</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="el-empty">
              <div className="el-empty-icon" aria-hidden="true">&#128556;</div>
              <p className="el-empty-text">No workouts match your filters</p>
              <p className="el-empty-sub">Try adjusting your search or clearing filters</p>
            </div>
          ) : (
            <div className="el-grid">
              {visible.map((w) => (
                <Link key={w.id} to={`/workouts/${w.id}`} className="el-card">
                  <div className="el-card-emoji"><span aria-hidden="true">{w.emoji || '🏋️'}</span></div>
                  <div className="el-card-name">{w.name}</div>
                  <div className="el-card-meta">
                    <span className="el-card-badge">{w.cat}</span>
                    <span className="el-card-equip">{w.dur} min</span>
                    <span className={`el-card-diff ${diffClass(w.diff)}`}>
                      {diffLabel(w.diff)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* More in app CTA */}
          {moreCount > 0 && (
            <div className="wk-more-cta">
              <p className="wk-more-text">
                +{moreCount} more workouts available in the app
              </p>
              <Link to="/onboarding" className="wk-more-btn">
                Get the App
              </Link>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
