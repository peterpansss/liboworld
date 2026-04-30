/**
 * Horizontal scrolling strip of muscle-group chips. Each chip links to
 * /exercises?muscle=<group>. Used on ExerciseDetail and ExerciseLibrary
 * to give users a visual entry point into the catalog.
 */
import { Link } from 'react-router-dom';
import { MUSCLE_GROUP_KEYS } from '../utils/exerciseInfo';
import { MuscleTile } from './MuscleTile';
import './MuscleGroupStrip.css';

interface Props {
  /** Currently active muscle (highlighted chip). */
  activeMuscle?: string;
  title?: string;
}

export function MuscleGroupStrip({ activeMuscle, title = 'Explore by Muscle Group' }: Props) {
  return (
    <section className="mgs">
      <h2 className="mgs__title">{title}</h2>
      <div className="mgs__scroll">
        {MUSCLE_GROUP_KEYS.map((muscle) => {
          const isActive = activeMuscle === muscle;
          return (
            <Link
              key={muscle}
              to={`/exercises?muscle=${encodeURIComponent(muscle)}`}
              className={`mgs__item ${isActive ? 'mgs__item--active' : ''}`}
            >
              <div className="mgs__tile">
                <MuscleTile muscle={muscle} size="sm" showLabel={false} />
              </div>
              <div className="mgs__label">{muscle.toUpperCase()}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
