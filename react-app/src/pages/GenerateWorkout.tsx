import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './GenerateWorkout.css';

// Each chip carries the slug of the facet page to route to.
// Chips that don't have a dedicated SEO page (e.g. specific isolation
// muscles) fall back to the closest broader facet — better than a 404.
//
// `slug` matches a key in /workout-facets.json. If the slug doesn't
// exist in that JSON the page handler bounces to /workouts as a
// graceful fallback.

type Chip = { label: string; slug: string };

const MUSCLE_CHIPS: Chip[] = [
  { label: 'Upper Body',   slug: 'upper-body' },
  { label: 'Lower Body',   slug: 'lower-body' },
  { label: 'Full Body',    slug: 'full-body' },
  { label: 'Push Day',     slug: 'chest' },        // closest existing hub
  { label: 'Pull Day',     slug: 'back' },         // closest existing hub
  { label: 'Chest',        slug: 'chest' },
  { label: 'Back',         slug: 'back' },
  { label: 'Shoulders',    slug: 'shoulders' },
  { label: 'Arms',         slug: 'arms' },
  { label: 'Biceps',       slug: 'arms' },
  { label: 'Triceps',      slug: 'arms' },
  { label: 'Forearms',     slug: 'arms' },
  { label: 'Legs',         slug: 'legs' },
  { label: 'Quads',        slug: 'legs' },
  { label: 'Hamstrings',   slug: 'legs' },
  { label: 'Glutes',       slug: 'glutes' },
  { label: 'Calves',       slug: 'legs' },
  { label: 'Core',         slug: 'core' },
  { label: 'Abs',          slug: 'core' },
  { label: 'Lower Back',   slug: 'back' },
];

const EQUIPMENT_CHIPS: Chip[] = [
  { label: 'Bodyweight',       slug: 'bodyweight' },
  { label: 'Dumbbell',         slug: 'dumbbell' },
  { label: 'Barbell',          slug: 'barbell' },
  { label: 'Resistance Bands', slug: 'resistance-band' },
  { label: 'Cable Machine',    slug: 'machine' },
  { label: 'Machine',          slug: 'machine' },
  { label: 'EZ-Bar',           slug: 'barbell' },
  { label: 'Pull-Up Bar',      slug: 'bodyweight' },
  { label: 'Kettlebell',       slug: 'bodyweight' },     // suppressed facet — 1 workout
  { label: 'Swiss Ball',       slug: 'bodyweight' },
  { label: 'Foam Roller',      slug: 'bodyweight' },
  { label: 'Medicine Ball',    slug: 'bodyweight' },
];

const SETTING_CHIPS: Chip[] = [
  { label: 'Home Workout', slug: 'home' },
  { label: 'Gym Workout',  slug: 'gym' },
];

const DURATION_CHIPS: Chip[] = [
  { label: '15 Minutes',   slug: '15-minute' },
  { label: '30 Minutes',   slug: '30-minute' },
  { label: '45 Minutes',   slug: '45-minute' },
];

const GOAL_CHIPS: Chip[] = [
  { label: 'Build Muscle Mass',     slug: 'strength' },
  { label: 'Build Strength',        slug: 'strength' },
  { label: 'Olympic Lift',          slug: 'strength' },
  { label: 'Power Lift',            slug: 'strength' },
  { label: 'Get Lean & Burn Fat',   slug: 'cardio' },
  { label: 'Mobility',              slug: 'stretching' },
  { label: 'Recovery',              slug: 'stretching' },
];

const EXPERIENCE_CHIPS: Chip[] = [
  { label: 'Beginner',     slug: '' },
  { label: 'Intermediate', slug: '' },
  { label: 'Advanced',     slug: '' },
];

// Priority order if user picks chips in multiple axes — the first non-empty
// slug wins. Muscle ranks highest because it's the keyword that drives the
// best-workouts SEO page. Experience never routes anywhere on its own.
const AXIS_PRIORITY: Array<keyof Selection> = ['muscle', 'equipment', 'setting', 'duration', 'goal'];

interface Selection {
  muscle: string;
  equipment: string;
  setting: string;
  duration: string;
  goal: string;
  experience: string;
}

const EMPTY: Selection = { muscle: '', equipment: '', setting: '', duration: '', goal: '', experience: '' };

function ChipGroup({
  title,
  chips,
  value,
  onChange,
}: {
  title: string;
  chips: Chip[];
  value: string;
  onChange: (label: string) => void;
}) {
  return (
    <section className="gw-section">
      <h2 className="gw-section-title">{title}</h2>
      <div className="gw-chips">
        {chips.map((chip) => {
          const active = value === chip.label;
          return (
            <button
              key={chip.label}
              type="button"
              className={`gw-chip ${active ? 'active' : ''}`}
              onClick={() => onChange(active ? '' : chip.label)}
              aria-pressed={active}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function GenerateWorkout() {
  const navigate = useNavigate();
  const [sel, setSel] = useState<Selection>(EMPTY);

  useEffect(() => {
    document.title = 'Generate Your Next Workout — Pick Your Focus | Libo';
    return () => { document.title = 'Libo'; };
  }, []);

  const update = (key: keyof Selection) => (label: string) =>
    setSel((s) => ({ ...s, [key]: label }));

  // Map a chip label back to its slug for the relevant axis.
  function slugFor(axis: keyof Selection, label: string): string {
    const list =
      axis === 'muscle' ? MUSCLE_CHIPS :
      axis === 'equipment' ? EQUIPMENT_CHIPS :
      axis === 'setting' ? SETTING_CHIPS :
      axis === 'duration' ? DURATION_CHIPS :
      axis === 'goal' ? GOAL_CHIPS :
      EXPERIENCE_CHIPS;
    return list.find((c) => c.label === label)?.slug ?? '';
  }

  function onGenerate() {
    for (const axis of AXIS_PRIORITY) {
      const label = sel[axis];
      if (!label) continue;
      const slug = slugFor(axis, label);
      if (slug) {
        navigate(`/best-workouts/${slug}`);
        return;
      }
    }
    // Nothing selected → just open the library.
    navigate('/workouts');
  }

  function clearAll() {
    setSel(EMPTY);
  }

  const hasAny = AXIS_PRIORITY.some((a) => sel[a]) || !!sel.experience;

  return (
    <>
      <SiteNav />

      <main className="gw-container">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="pd-breadcrumb">
          <Link to="/">Home</Link>
          <span className="pd-breadcrumb-sep">&gt;</span>
          <Link to="/workouts">Workouts</Link>
          <span className="pd-breadcrumb-sep">&gt;</span>
          <span>Generate</span>
        </nav>

        <header className="gw-hero">
          <h1>Generate Your Next Workout</h1>
          <p className="gw-subtitle">
            Pick a focus area and we'll route you to the best matching routines from the library.
          </p>
        </header>

        <ChipGroup title="Muscle Groups" chips={MUSCLE_CHIPS}     value={sel.muscle}     onChange={update('muscle')} />
        <ChipGroup title="Equipment"     chips={EQUIPMENT_CHIPS}  value={sel.equipment}  onChange={update('equipment')} />
        <ChipGroup title="Setting"       chips={SETTING_CHIPS}    value={sel.setting}    onChange={update('setting')} />
        <ChipGroup title="Duration"      chips={DURATION_CHIPS}   value={sel.duration}   onChange={update('duration')} />
        <ChipGroup title="Fitness Goal"  chips={GOAL_CHIPS}       value={sel.goal}       onChange={update('goal')} />
        <ChipGroup title="Experience"    chips={EXPERIENCE_CHIPS} value={sel.experience} onChange={update('experience')} />

        <div className="gw-cta-row">
          <button type="button" className="gw-cta" onClick={onGenerate} disabled={!hasAny}>
            Generate Workout &rarr;
          </button>
          {hasAny && (
            <button type="button" className="gw-clear" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>

        <p className="gw-hint">
          Or browse the full catalog at <Link to="/workouts">/workouts</Link>.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
