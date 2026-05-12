import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useExercises } from '../hooks/useExercises';
import { exerciseThumbSet, isMediaHidden } from '../utils/thumbnails';
import { ThumbPicture } from '../components/ThumbPicture';
import { MuscleTile } from '../components/MuscleTile';
import { MuscleGroupStrip } from '../components/MuscleGroupStrip';
import { ActiveFilters, type ActiveFilter } from '../components/ActiveFilters';
import { SeoHead } from '../components/SeoHead';
import { libraryCanonicalUrl } from '../utils/schema';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { Search, ICON_STROKE } from '../utils/icons';
import { useDebouncedValue } from '../utils/useDebouncedValue';
import {
  MUSCLE_I18N_KEYS,
  EQUIPMENT_I18N_KEYS,
  SETTING_I18N_KEYS,
  TYPE_I18N_KEYS,
} from '../utils/i18nKeys';
import './ExerciseLibrary.css';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Constants ──
const PER_PAGE = 30;

const EQUIPMENT_TYPES = [
  'All', 'Bodyweight', 'Barbell', 'Dumbbell', 'Cable',
  'Machine', 'Kettlebell', 'Resistance Bands', 'Bar', 'Swiss Ball',
];

// Where the exercise is performed. Maps to the `environment` field in the
// underlying data ("Gym" | "Home" | "Both").
const SETTINGS = ['All', 'Gym', 'Home'];

// Training-style buckets. Each label maps to one or more `primaryCat` values
// from the data — keeps the chip count manageable while covering the whole
// catalog (Mobility merges Mobility + Cool-Down + Recovery; Strength includes
// Accessory; Pelvic Floor stands alone since it's a real distinct category).
const TYPES = [
  'All', 'Strength', 'Cardio', 'HIIT', 'Power',
  'Mobility', 'Stretching', 'Core', 'Pelvic Floor', 'Warm-Up',
];

const TYPE_TO_PRIMARY_CATS: Record<string, string[]> = {
  Strength: ['Strength', 'Accessory'],
  Cardio: ['Cardio'],
  HIIT: ['HIIT / Functional'],
  Power: ['Power'],
  Mobility: ['Mobility', 'Recovery'],
  Stretching: ['Cool-Down'],
  Core: ['Core Stability'],
  'Pelvic Floor': ['Pelvic Floor & Breathing'],
  'Warm-Up': ['Warm-Up'],
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
  const settingLabel = (s: string) => t(`exerciseLibrary.setting.${SETTING_I18N_KEYS[s] ?? 'all'}`);
  const typeLabel = (typ: string) => t(`exerciseLibrary.type.${TYPE_I18N_KEYS[typ] ?? 'all'}`);
  // Phase 4: public catalog now flows through useExercises(). The hook paints
  // /exercises.json first (build-time SEO baseline) then swaps in the canonical
  // Supabase rows once they arrive — so admin-published changes show up live.
  // Locale overlay (setupNotes translations) doesn't apply on the listing page;
  // detail pages still go through getExercises() in src/data/exercises.ts.
  const { exercises, loading } = useExercises();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = searchParams.get('q') || '';
  const muscle = searchParams.get('muscle') || 'All';
  const equip = searchParams.get('equip') || 'All';
  const setting = searchParams.get('setting') || 'All';
  const trainingType = searchParams.get('type') || 'All';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput, 150);
  const [filtersOpen, setFiltersOpen] = useState(() => {
    const s = searchParams.get('setting') || 'All';
    const t = searchParams.get('type') || 'All';
    const e = searchParams.get('equip') || 'All';
    return s !== 'All' || t !== 'All' || e !== 'All';
  });

  // ── SEO meta ──
  const seoTitle = useMemo(() => {
    const parts = [t('exerciseLibrary.title')];
    if (muscle !== 'All') parts.push(muscle);
    if (equip !== 'All') parts.push(equip);
    return `${parts.join(' · ')} | Libo`;
  }, [muscle, equip, t]);

  const seoDescription = useMemo(() => {
    if (muscle !== 'All' && equip !== 'All') {
      return `Browse ${muscle.toLowerCase()} exercises using ${equip.toLowerCase()} — full demo videos, instructions, and tips for every move.`;
    }
    if (muscle !== 'All') {
      return `Browse ${muscle.toLowerCase()} exercises with full demo videos, step-by-step instructions, and form tips.`;
    }
    if (equip !== 'All') {
      return `Browse ${equip.toLowerCase()} exercises across every muscle group — demo videos, instructions, and form tips.`;
    }
    return 'Browse 600+ exercises with demo videos, step-by-step instructions, and form tips. Filter by muscle group or equipment.';
  }, [muscle, equip]);

  const canonical = useMemo(() => {
    const params = new URLSearchParams();
    if (muscle !== 'All') params.set('muscle', muscle);
    if (equip !== 'All') params.set('equip', equip);
    const qs = params.toString();
    return libraryCanonicalUrl(qs || undefined);
  }, [muscle, equip]);

  // ── Parent-only baseline ──
  // The library never displays bilateral L/R children — they're shown via the
  // parent's detail page. Kept as a separate memo so the header counter and
  // the filtered grid agree on what "exercise" means.
  const parentExercises = useMemo(
    () => exercises.filter(e => !e.parentId && !/[—–-]\s*(Left|Right)\b/i.test(e.name)),
    [exercises],
  );

  // Map each parent's id → first child with a video URL set. Lets the card
  // grid fall back to a child's thumbnail when the parent canonical itself
  // has no own demo (common pattern for ~110 single-arm parents we
  // restructured: parent has no video, L/R children carry the demos).
  const childThumbDonorByParent = useMemo(() => {
    const map = new Map<string, typeof exercises[number]>();
    for (const e of exercises) {
      const pid = e.parentId;
      if (!pid) continue;
      if (!e.videoUrl) continue;
      if (!map.has(pid)) map.set(pid, e);
    }
    return map;
  }, [exercises]);

  // ── Filter logic ──
  const filtered = useMemo(() => {
    let result = parentExercises;

    if (urlSearch) {
      // Normalize hyphens / em-dashes to spaces (then collapse runs of
      // whitespace) on both query and candidate text. This way searches
      // like "iso la" match "Iso-Lateral", "single arm" matches "Single-Arm",
      // and "world s" matches "World's". Case-insensitive throughout.
      const norm = (s: string) =>
        s.toLowerCase().replace(/[—–\-']/g, ' ').replace(/\s+/g, ' ').trim();
      const q = norm(urlSearch);
      result = result.filter(e =>
        norm(e.name).includes(q) ||
        norm(e.bodyFocus).includes(q) ||
        norm(e.equipment).includes(q)
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

    if (setting !== 'All') {
      // environment is "Gym" | "Home" | "Both" — Both shows up under either chip.
      result = result.filter(e => {
        const env = (e.environment || '').toLowerCase();
        return env === setting.toLowerCase() || env === 'both';
      });
    }

    if (trainingType !== 'All') {
      const cats = TYPE_TO_PRIMARY_CATS[trainingType];
      if (cats) {
        result = result.filter(e => cats.includes(e.primaryCat || ''));
      }
    }

    result = [...result].sort((a, b) => {
      const aHas = isMediaHidden(a.cat, a.equipment) ? 0 : 1;
      const bHas = isMediaHidden(b.cat, b.equipment) ? 0 : 1;
      return bHas - aHas;
    });

    return result;
  }, [parentExercises, urlSearch, muscle, equip, setting, trainingType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(safePage * PER_PAGE, filtered.length);
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

  // Sync URL when debounced input changes.
  // Guard: only push when the debounce has settled to the current input —
  // otherwise an external urlSearch clear (e.g. ActiveFilters × on the search
  // chip) races against a stale debouncedSearch and immediately re-pushes the
  // old query.
  useEffect(() => {
    if (debouncedSearch !== searchInput) return;
    if (debouncedSearch !== urlSearch) {
      updateParam('q', debouncedSearch);
    }
  }, [debouncedSearch, searchInput, urlSearch, updateParam]);

  // Sync input from URL when external nav changes it (e.g. ActiveFilters clear)
  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  // ── Active filters ──
  const activeFilters: ActiveFilter[] = [];
  if (muscle !== 'All') activeFilters.push({ key: 'muscle', label: muscleLabel(muscle), value: muscle });
  if (setting !== 'All') activeFilters.push({ key: 'setting', label: settingLabel(setting), value: setting });
  if (trainingType !== 'All') activeFilters.push({ key: 'type', label: typeLabel(trainingType), value: trainingType });
  if (equip !== 'All') activeFilters.push({ key: 'equip', label: equipmentLabel(equip), value: equip });
  if (urlSearch) activeFilters.push({ key: 'q', label: `"${urlSearch}"`, value: urlSearch });

  // ── Adaptive results filter context ──
  // Built from the new filterContext.* i18n keys so the result-count line
  // reads naturally in every locale. Setting + Type join into the muscle
  // slot when present so we can keep the grammar working across languages.
  const filterContext = useMemo(() => {
    const muscleParts: string[] = [];
    if (muscle !== 'All') muscleParts.push(muscleLabel(muscle).toLowerCase());
    if (setting !== 'All') muscleParts.push(settingLabel(setting).toLowerCase());
    if (trainingType !== 'All') muscleParts.push(typeLabel(trainingType).toLowerCase());
    const muscleStr = muscleParts.join(' ');
    const equipStr = equip !== 'All' ? equipmentLabel(equip).toLowerCase() : '';

    if (muscleStr && equipStr) {
      return t('exerciseLibrary.filterContext.muscleAndEquipment', {
        muscle: muscleStr,
        equipment: equipStr,
      });
    }
    if (muscleStr) {
      return t('exerciseLibrary.filterContext.muscle', { muscle: muscleStr });
    }
    if (equipStr) {
      return t('exerciseLibrary.filterContext.equipment', { equipment: equipStr });
    }
    return '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muscle, setting, trainingType, equip, i18n.language]);

  return (
    <>
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        canonical={canonical}
      />
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
            <p>{loading ? t('exerciseLibrary.exercisesWord') : t('exerciseLibrary.exerciseCount', { count: parentExercises.length })}</p>
          </div>

          {/* Muscle group strip */}
          <MuscleGroupStrip activeMuscle={muscle !== 'All' ? muscle : undefined} />

          {/* Search */}
          <div className="el-search-wrap">
            <Search className="el-search-icon" strokeWidth={ICON_STROKE} aria-hidden />
            <input
              type="text"
              className="el-search"
              placeholder={t('exerciseLibrary.searchPlaceholder')}
              aria-label={t('exerciseLibrary.searchAriaLabel')}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>

          {/* Mobile filters toggle — collapses Setting/Type/Equipment into one tap */}
          <button
            type="button"
            className="el-filters-toggle"
            aria-expanded={filtersOpen}
            aria-controls="el-filters"
            onClick={() => setFiltersOpen(o => !o)}
          >
            <span>
              {t('exerciseLibrary.filtersToggle')}
              {(activeFilters.length - (urlSearch ? 1 : 0)) > 0 && (
                <span className="el-filters-toggle__count" aria-label="active filter count">
                  {activeFilters.length - (urlSearch ? 1 : 0)}
                </span>
              )}
            </span>
            <span className="el-filters-toggle__chev" aria-hidden>▾</span>
          </button>

          {/* Filters (muscle group is the visual strip above) */}
          <div id="el-filters" className={`el-filters ${filtersOpen ? 'el-filters--open' : ''}`}>
            <div className="el-filter-row">
              <span className="el-filter-label">{t('exerciseLibrary.settingLabel')}</span>
              <div className="el-chips">
                {SETTINGS.map(s => (
                  <button
                    key={s}
                    className={`el-chip ${setting === s ? 'active' : ''}`}
                    aria-pressed={setting === s}
                    onClick={() => updateParam('setting', setting === s ? 'All' : s)}
                  >
                    {settingLabel(s)}
                  </button>
                ))}
              </div>
            </div>
            <div className="el-filter-row">
              <span className="el-filter-label">{t('exerciseLibrary.typeLabel')}</span>
              <div className="el-chips">
                {TYPES.map(typ => (
                  <button
                    key={typ}
                    className={`el-chip ${trainingType === typ ? 'active' : ''}`}
                    aria-pressed={trainingType === typ}
                    onClick={() => updateParam('type', trainingType === typ ? 'All' : typ)}
                  >
                    {typeLabel(typ)}
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
                    onClick={() => updateParam('equip', equip === e ? 'All' : e)}
                  >
                    {equipmentLabel(e)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active filters */}
          <ActiveFilters
            filters={activeFilters}
            onRemove={(key) => {
              // Clear searchInput synchronously alongside the URL so the
              // debounce-sync effect sees matching state on the next render
              // and doesn't re-push the stale query.
              if (key === 'q') setSearchInput('');
              updateParam(key, key === 'q' ? '' : 'All');
            }}
            onClearAll={() => {
              setSearchInput('');
              setSearchParams({});
            }}
          />

          {/* Results count */}
          {!loading && (
            <div className="el-results-count" aria-live="polite">
              {filterContext ? (
                <Trans
                  i18nKey="exerciseLibrary.showingResultsFiltered"
                  values={{
                    from: rangeStart,
                    to: rangeEnd,
                    total: filtered.length,
                    context: filterContext,
                  }}
                />
              ) : (
                <Trans
                  i18nKey="exerciseLibrary.showingResults"
                  values={{
                    from: rangeStart,
                    to: rangeEnd,
                    total: filtered.length,
                  }}
                />
              )}
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
              <button className="el-empty-clear" onClick={() => setSearchParams({})}>
                {t('common.clearFilters')}
              </button>
            </div>
          ) : (
            <div className="el-grid">
              {pageExercises.map(ex => {
                // If the parent canonical has no own video, derive its
                // library-card thumbnail from a child's video so the grid
                // doesn't fall back to the muscle-tile placeholder.
                const thumb =
                  exerciseThumbSet(ex) ??
                  exerciseThumbSet(childThumbDonorByParent.get(ex.id));
                return (
                <Link key={ex.id} to={`/exercises/${ex.slug ?? ex.id}`} className="el-card">
                  <div className="el-card-media">
                    <MuscleTile muscle={ex.bodyFocus} />
                    {thumb ? (
                      <ThumbPicture
                        thumb={thumb}
                        loading="lazy"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                        className="el-card-thumb"
                      />
                    ) : ex.videoUrl ? (
                      <video
                        src={ex.videoUrl}
                        preload="metadata"
                        muted
                        playsInline
                        className="el-card-thumb"
                      />
                    ) : null}
                  </div>
                  <div className="el-card-name">{ex.name}</div>
                  <div className="el-card-meta">
                    <span className={`el-card-diff el-card-diff--${ex.diff}`}>{capitalize(ex.diff)}</span>
                    <span className="el-card-meta-text">{ex.equipment}</span>
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
