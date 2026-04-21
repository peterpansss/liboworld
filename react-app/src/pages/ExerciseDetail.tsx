import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getExercises, type Exercise } from '../data/exercises';
import { exerciseThumb, publicVideoUrl } from '../utils/thumbnails';
import { MuscleTile } from '../components/MuscleTile';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './ExerciseDetail.css';

// ── Parse setup notes into steps ──
function parseSteps(notes: string): string[] {
  if (!notes) return [];
  const raw = notes.split(/\.\s+/).filter(Boolean);
  return raw.map(s => s.endsWith('.') ? s : s + '.');
}

// ── Capitalize first letter ──
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Main Component ──
export default function ExerciseDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExercises().then(data => {
      setExercises(data);
      setLoading(false);
    });
  }, []);

  const exercise = useMemo(
    () => exercises.find(e => e.id === id) || null,
    [exercises, id]
  );

  const related = useMemo(() => {
    if (!exercise) return [];
    return exercises
      .filter(e => e.bodyFocus === exercise.bodyFocus && e.id !== exercise.id)
      .slice(0, 4);
  }, [exercises, exercise]);

  const steps = useMemo(
    () => exercise ? parseSteps(exercise.setupNotes) : [],
    [exercise]
  );

  // ── SEO: document title ──
  useEffect(() => {
    if (exercise) {
      document.title = `${exercise.name} - ${t('exerciseDetail.howToPerformTitle')} | Libo`;
    }
    return () => { document.title = 'Libo'; };
  }, [exercise, t]);

  if (loading) {
    return (
      <>
        <SiteNav />
        <main className="ed-loading">{t('exerciseDetail.loading')}</main>
        <SiteFooter />
      </>
    );
  }

  if (!exercise) {
    return (
      <>
        <SiteNav />
        <main className="ed-page">
          <div className="ed-container">
            <div className="ed-not-found">
              <h2 className="font-display">{t('exerciseDetail.notFoundTitle')}</h2>
              <p>{t('exerciseDetail.notFoundDescription')}</p>
              <Link to="/exercises">{t('exerciseDetail.browseAll')}</Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteNav />

      <main className="ed-page">
        <div className="ed-container">
          {/* Breadcrumb */}
          <nav aria-label={t('exerciseDetail.breadcrumbLabel')} className="ed-breadcrumb">
            <Link to="/">{t('exerciseDetail.breadcrumbHome')}</Link>
            <span className="ed-breadcrumb-sep">&gt;</span>
            <Link to="/exercises">{t('exerciseDetail.breadcrumbExercises')}</Link>
            <span className="ed-breadcrumb-sep">&gt;</span>
            <Link to={`/exercises?muscle=${exercise.bodyFocus}`}>{exercise.bodyFocus}</Link>
            <span className="ed-breadcrumb-sep">&gt;</span>
            <span>{exercise.name}</span>
          </nav>

          {/* Hero */}
          <div className="ed-hero">
            <h1 className="font-display">{exercise.name}</h1>
            <div className="ed-hero-sub">
              <span>{exercise.bodyFocus}</span>
              <span className="ed-hero-dot">&middot;</span>
              <span>{exercise.equipment}</span>
              <span className="ed-hero-dot">&middot;</span>
              <span className={`ed-diff-tag ${exercise.diff}`}>{capitalize(exercise.diff)}</span>
            </div>
          </div>

          {/* Demo video (falls back to gradient tile when no videoUrl / hidden category) */}
          <div className="ed-demo">
            {publicVideoUrl(exercise) ? (
              <video
                src={publicVideoUrl(exercise)}
                poster={exerciseThumb(exercise) ?? undefined}
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
              />
            ) : (
              <MuscleTile muscle={exercise.bodyFocus} size="lg" />
            )}
          </div>

          {/* Info cards */}
          <div className="ed-info-row">
            <div className="ed-info-card">
              <span className="ed-info-icon">&#128170;</span>
              <span className="ed-info-label">{t('exerciseDetail.muscleGroup')}</span>
              <span className="ed-info-value">{exercise.bodyFocus}</span>
            </div>
            <div className="ed-info-card">
              <span className="ed-info-icon">&#127947;</span>
              <span className="ed-info-label">{t('exerciseDetail.equipment')}</span>
              <span className="ed-info-value">{exercise.equipment}</span>
            </div>
            <div className="ed-info-card">
              <span className="ed-info-icon">&#9889;</span>
              <span className="ed-info-label">{t('exerciseDetail.difficulty')}</span>
              <span className={`ed-info-value ed-diff-tag ${exercise.diff}`}>
                {capitalize(exercise.diff)}
              </span>
            </div>
          </div>

          {/* Main + Sidebar layout */}
          <div className="ed-layout">
            {/* Main content */}
            <div>
              {/* Setup Notes */}
              {steps.length > 0 && (
                <div>
                  <h2 className="ed-section-title">{t('exerciseDetail.howToPerform')}</h2>
                  <div className="ed-steps">
                    {steps.map((step, i) => (
                      <div key={i} className="ed-step">
                        <div className="ed-step-num">{i + 1}</div>
                        <p className="ed-step-text">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="ed-sidebar">
              <div className="ed-facts">
                <div className="ed-facts-title">{t('exerciseDetail.quickFacts')}</div>
                <div className="ed-fact">
                  <span className="ed-fact-label">{t('exerciseDetail.equipment')}</span>
                  <span className="ed-fact-value">{exercise.equipment}</span>
                </div>
                <div className="ed-fact">
                  <span className="ed-fact-label">{t('exerciseDetail.machineRequired')}</span>
                  <span className="ed-fact-value">{exercise.machineRequired ? t('exerciseDetail.yes') : t('exerciseDetail.no')}</span>
                </div>
                <div className="ed-fact">
                  <span className="ed-fact-label">{t('exerciseDetail.category')}</span>
                  <span className="ed-fact-value">{capitalize(exercise.cat)}</span>
                </div>
                {exercise.variation && (
                  <div className="ed-fact">
                    <span className="ed-fact-label">{t('exerciseDetail.variation')}</span>
                    <span className="ed-fact-value">{exercise.variation}</span>
                  </div>
                )}
                <div className="ed-fact">
                  <span className="ed-fact-label">{t('exerciseDetail.difficulty')}</span>
                  <span className={`ed-fact-value ed-diff-tag ${exercise.diff}`}>
                    {capitalize(exercise.diff)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="ed-cta">
            <h3>{t('exerciseDetail.ctaTitle')}</h3>
            <p>{t('exerciseDetail.ctaDescription')}</p>
            <Link to="/onboarding" className="ed-cta-btn">{t('exerciseDetail.ctaButton')}</Link>
          </div>

          {/* Related exercises */}
          {related.length > 0 && (
            <div className="ed-related">
              <h2 className="ed-section-title">{t('exerciseDetail.relatedTitle', { muscle: exercise.bodyFocus })}</h2>
              <div className="ed-related-grid">
                {related.map(rel => {
                  const relThumb = exerciseThumb(rel);
                  return (
                  <Link key={rel.id} to={`/exercises/${rel.id}`} className="ed-related-card">
                    <div className="ed-related-media">
                      <MuscleTile muscle={rel.bodyFocus} size="sm" />
                      {relThumb && (
                        <img
                          src={relThumb}
                          alt=""
                          loading="lazy"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                          className="ed-related-thumb"
                        />
                      )}
                    </div>
                    <div className="ed-related-name">{rel.name}</div>
                    <div className="ed-related-meta">{rel.equipment} &middot; {capitalize(rel.diff)}</div>
                  </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
