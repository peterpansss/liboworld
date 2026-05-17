/**
 * Three-card grid of alternative exercises, scored by getRecommended().
 * Replaces the old 4-card "related by bodyFocus" list. Always renders the
 * Befit-style title pattern: "Alternative Exercises to replace X".
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Exercise } from '../data/exercises';
import { getRecommended } from '../utils/exerciseAlternatives';
import { exerciseThumbSet } from '../utils/thumbnails';
import { ThumbPicture } from './ThumbPicture';
import { MuscleTile } from './MuscleTile';
import './AlternativesGrid.css';

interface Props {
  current: Exercise;
  allExercises: Exercise[];
  limit?: number;
  equipmentLabel?: (e: string) => string;
  difficultyLabel?: (d: string) => string;
}

export function AlternativesGrid({
  current,
  allExercises,
  limit = 3,
  equipmentLabel = (e) => e,
  difficultyLabel = (d) => d,
}: Props) {
  const { t } = useTranslation();
  const alternatives = getRecommended(current.id, allExercises, limit);
  if (alternatives.length === 0) return null;

  return (
    <section className="alts">
      <h2 className="alts__title">
        {t('exerciseDetail.alternativeExercisesTitle', {
          name: current.name,
          defaultValue: 'Alternative Exercises to replace {{name}}',
        })}
      </h2>
      <div className="alts__grid">
        {alternatives.map((alt) => {
          const thumb = exerciseThumbSet(alt);
          return (
            <Link key={alt.id} to={`/exercises/${alt.slug ?? alt.id}`} className="alts__card">
              <div className="alts__media">
                <MuscleTile muscle={alt.bodyFocus} size="md" />
                <ThumbPicture
                  thumb={thumb}
                  loading="lazy"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                  className="alts__thumb"
                />
              </div>
              <div className="alts__body">
                <div className="alts__name">{alt.name}</div>
                <div className="alts__meta">
                  {equipmentLabel(alt.equipment)} · {difficultyLabel(alt.diff)}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
