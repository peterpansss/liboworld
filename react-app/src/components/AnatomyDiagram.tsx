/**
 * Body anatomy diagram: front + back stylized SVG with primary/secondary
 * muscle highlighting derived from getMuscleGroups(bodyFocus).
 *
 * The SVG itself lives in BodyAnatomy.tsx; this component owns the legend +
 * the muscle-state lookup. Highlighted state is conveyed through the
 * `data-state` attribute, styled in AnatomyDiagram.css.
 */
import { getMuscleGroups, type MuscleGroup } from '../utils/exerciseInfo';
import { BodyAnatomy } from './BodyAnatomy';
import './AnatomyDiagram.css';

interface Props {
  bodyFocus: string;
  className?: string;
}

export function AnatomyDiagram({ bodyFocus, className = '' }: Props) {
  const muscles = getMuscleGroups(bodyFocus);
  const stateMap = new Map<string, 'primary' | 'secondary'>();
  for (const m of muscles) stateMap.set(m.name, m.intensity);

  const stateFor = (muscle: string): 'primary' | 'secondary' | 'off' =>
    stateMap.get(muscle) ?? 'off';

  const primary = muscles.filter((m) => m.intensity === 'primary');
  const secondary = muscles.filter((m) => m.intensity === 'secondary');

  return (
    <div className={`anatomy ${className}`.trim()}>
      <div className="anatomy__title">Target Muscle</div>

      <div className="anatomy__svg-wrap">
        <BodyAnatomy stateFor={stateFor} />
      </div>

      <div className="anatomy__legend">
        {primary.length > 0 && (
          <Legend label="Primary" muscles={primary} variant="primary" />
        )}
        {secondary.length > 0 && (
          <Legend label="Secondary" muscles={secondary} variant="secondary" />
        )}
      </div>
    </div>
  );
}

function Legend({
  label,
  muscles,
  variant,
}: {
  label: string;
  muscles: MuscleGroup[];
  variant: 'primary' | 'secondary';
}) {
  return (
    <div className="anatomy__legend-group">
      <div className="anatomy__legend-label">{label}</div>
      <div className="anatomy__legend-chips">
        {muscles.map((m) => (
          <span
            key={m.name}
            className={`anatomy__legend-chip anatomy__legend-chip--${variant}`}
          >
            {m.name}
          </span>
        ))}
      </div>
    </div>
  );
}
