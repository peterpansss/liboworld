import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getExercises, type Exercise } from '../data/exercises';
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
      document.title = `${exercise.name} - How to Perform | Libo`;
    }
    return () => { document.title = 'Libo'; };
  }, [exercise]);

  if (loading) {
    return (
      <>
        <SiteNav />
        <main className="ed-loading">Loading...</main>
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
              <h2 className="font-display">Exercise Not Found</h2>
              <p>The exercise you're looking for doesn't exist or has been removed.</p>
              <Link to="/exercises">Browse all exercises</Link>
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
          <nav aria-label="Breadcrumb" className="ed-breadcrumb">
            <Link to="/">Home</Link>
            <span className="ed-breadcrumb-sep">&gt;</span>
            <Link to="/exercises">Exercises</Link>
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

          {/* Demo placeholder */}
          <div className="ed-demo"><span role="img" aria-hidden="true">{exercise.emoji}</span></div>

          {/* Info cards */}
          <div className="ed-info-row">
            <div className="ed-info-card">
              <span className="ed-info-icon">&#128170;</span>
              <span className="ed-info-label">Muscle Group</span>
              <span className="ed-info-value">{exercise.bodyFocus}</span>
            </div>
            <div className="ed-info-card">
              <span className="ed-info-icon">&#127947;</span>
              <span className="ed-info-label">Equipment</span>
              <span className="ed-info-value">{exercise.equipment}</span>
            </div>
            <div className="ed-info-card">
              <span className="ed-info-icon">&#9889;</span>
              <span className="ed-info-label">Difficulty</span>
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
                  <h2 className="ed-section-title">How to Perform</h2>
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
                <div className="ed-facts-title">Quick Facts</div>
                <div className="ed-fact">
                  <span className="ed-fact-label">Equipment</span>
                  <span className="ed-fact-value">{exercise.equipment}</span>
                </div>
                <div className="ed-fact">
                  <span className="ed-fact-label">Machine Required</span>
                  <span className="ed-fact-value">{exercise.machineRequired ? 'Yes' : 'No'}</span>
                </div>
                <div className="ed-fact">
                  <span className="ed-fact-label">Category</span>
                  <span className="ed-fact-value">{capitalize(exercise.cat)}</span>
                </div>
                {exercise.variation && (
                  <div className="ed-fact">
                    <span className="ed-fact-label">Variation</span>
                    <span className="ed-fact-value">{exercise.variation}</span>
                  </div>
                )}
                <div className="ed-fact">
                  <span className="ed-fact-label">Difficulty</span>
                  <span className={`ed-fact-value ed-diff-tag ${exercise.diff}`}>
                    {capitalize(exercise.diff)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="ed-cta">
            <h3>Track this exercise in the Libo app</h3>
            <p>Log sets, reps, and weight. See your progress over time.</p>
            <Link to="/onboarding" className="ed-cta-btn">Join Waitlist</Link>
          </div>

          {/* Related exercises */}
          {related.length > 0 && (
            <div className="ed-related">
              <h2 className="ed-section-title">Related {exercise.bodyFocus} Exercises</h2>
              <div className="ed-related-grid">
                {related.map(rel => (
                  <Link key={rel.id} to={`/exercises/${rel.id}`} className="ed-related-card">
                    <div className="ed-related-emoji">{rel.emoji}</div>
                    <div className="ed-related-name">{rel.name}</div>
                    <div className="ed-related-meta">{rel.equipment} &middot; {capitalize(rel.diff)}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
