/**
 * Horizontal scrolling strip of muscle-group cards. Each card renders a
 * mini front/back body silhouette with the relevant muscle highlighted in
 * lime — same `react-body-highlighter` library used in AnatomyDiagram, so
 * the visual language stays consistent across the page.
 *
 * Used on ExerciseDetail and ExerciseLibrary as a visual entry point into
 * the catalog (Befit-style).
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Model, { type IExerciseData, type Muscle } from 'react-body-highlighter';
import { MUSCLE_GROUP_KEYS } from '../utils/exerciseInfo';
import { MUSCLE_NAME_I18N_KEYS } from '../utils/i18nKeys';
import './MuscleGroupStrip.css';

interface Props {
  /** Currently active muscle (highlighted card). */
  activeMuscle?: string;
  title?: string;
}

type Side = 'anterior' | 'posterior';

// Per-muscle preview configuration: which view to show + which slugs to light up.
const PREVIEW_MAP: Record<string, { side: Side; muscles: Muscle[] }> = {
  Chest: { side: 'anterior', muscles: ['chest'] },
  Back: { side: 'posterior', muscles: ['upper-back', 'lower-back'] },
  Shoulders: { side: 'anterior', muscles: ['front-deltoids'] },
  Biceps: { side: 'anterior', muscles: ['biceps'] },
  Triceps: { side: 'posterior', muscles: ['triceps'] },
  Forearms: { side: 'anterior', muscles: ['forearm'] },
  Core: { side: 'anterior', muscles: ['abs', 'obliques'] },
  Legs: { side: 'anterior', muscles: ['quadriceps', 'calves'] },
  Quads: { side: 'anterior', muscles: ['quadriceps'] },
  Hamstrings: { side: 'posterior', muscles: ['hamstring'] },
  Calves: { side: 'posterior', muscles: ['calves'] },
  Glutes: { side: 'posterior', muscles: ['gluteal'] },
  Traps: { side: 'posterior', muscles: ['trapezius'] },
  'Full Body': { side: 'anterior', muscles: ['chest', 'abs', 'quadriceps', 'biceps'] },
};

// Body needs strong contrast against the dark tile bg or the silhouette
// disappears. #4a4e58 is the darkest mid-gray that still reads as a body
// shape on top of var(--bg3).
const BODY_COLOR = '#4a4e58';
// react-body-highlighter requires a 2-element tuple.
// Both slots are lime so any frequency the muscle picks up paints the same color.
const HIGHLIGHTED_COLORS: [string, string] = ['#caff00', '#caff00'];

export function MuscleGroupStrip({ activeMuscle, title }: Props) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('exerciseLibrary.exploreByMuscleGroup');
  return (
    <section className="mgs">
      <h2 className="mgs__title">{resolvedTitle}</h2>
      <div className="mgs__scroll">
        {MUSCLE_GROUP_KEYS.map((muscle) => {
          const isActive = activeMuscle === muscle;
          const preview = PREVIEW_MAP[muscle];
          const data: IExerciseData[] = preview
            ? [{ name: muscle, muscles: preview.muscles }]
            : [];
          const label = t(`exerciseLibrary.muscles.${MUSCLE_NAME_I18N_KEYS[muscle] ?? 'all'}`).toUpperCase();
          return (
            <Link
              key={muscle}
              to={isActive ? '/exercises' : `/exercises?muscle=${encodeURIComponent(muscle)}`}
              className={`mgs__item ${isActive ? 'mgs__item--active' : ''}`}
              aria-current={isActive ? 'true' : undefined}
            >
              <div className="mgs__tile">
                {preview ? (
                  <Model
                    data={data}
                    type={preview.side}
                    bodyColor={BODY_COLOR}
                    highlightedColors={HIGHLIGHTED_COLORS}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : null}
              </div>
              <div className="mgs__label">{label}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
