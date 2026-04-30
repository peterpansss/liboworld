/**
 * Body anatomy diagram — front + back muscle highlighting via
 * react-body-highlighter. Mirrors libo-app-v2's BodyMap so the web
 * exercise detail uses the same Fitbod-style visualization as mobile.
 */
import Model, { type IExerciseData, type Muscle } from 'react-body-highlighter';
import { getMuscleGroups, type MuscleGroup } from '../utils/exerciseInfo';
import './AnatomyDiagram.css';

interface Props {
  bodyFocus: string;
  className?: string;
}

type Side = 'anterior' | 'posterior';

// Map our internal muscle names → react-body-highlighter slugs.
// `sides` filters the slug to a specific view when the muscle is one-sided
// (e.g. Front Delts only on anterior, Lats only on posterior).
const SLUG_MAP: Record<string, { slug: Muscle; sides?: Side[] }[]> = {
  'Chest':       [{ slug: 'chest' }],
  'Front Delts': [{ slug: 'front-deltoids' }],
  'Side Delts':  [{ slug: 'front-deltoids' }],
  'Rear Delts':  [{ slug: 'back-deltoids' }],
  'Shoulders':   [{ slug: 'front-deltoids' }, { slug: 'back-deltoids' }],
  'Biceps':      [{ slug: 'biceps' }],
  'Triceps':     [{ slug: 'triceps' }],
  'Forearms':    [{ slug: 'forearm' }],
  'Abs':         [{ slug: 'abs' }],
  'Obliques':    [{ slug: 'obliques' }],
  'Core':        [{ slug: 'abs' }, { slug: 'obliques' }],
  'Hip Flexors': [{ slug: 'adductor', sides: ['anterior'] }],
  'Quads':       [{ slug: 'quadriceps' }],
  'Hamstrings':  [{ slug: 'hamstring' }],
  'Calves':      [{ slug: 'calves' }],
  'Glutes':      [{ slug: 'gluteal' }],
  'Traps':       [{ slug: 'trapezius' }],
  'Lats':        [{ slug: 'upper-back', sides: ['posterior'] }],
  'Rhomboids':   [{ slug: 'upper-back', sides: ['posterior'] }],
  'Lower Back':  [{ slug: 'lower-back' }],
  'Back':        [{ slug: 'upper-back' }, { slug: 'lower-back' }],
};

function buildBodyData(muscles: MuscleGroup[], side: Side): IExerciseData[] {
  const primary: Muscle[] = [];
  const secondary: Muscle[] = [];
  const seen = new Set<string>();

  for (const m of muscles) {
    const mappings = SLUG_MAP[m.name];
    if (!mappings) continue;
    for (const mapping of mappings) {
      if (mapping.sides && !mapping.sides.includes(side)) continue;
      const dedupeKey = `${m.intensity}:${mapping.slug}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      (m.intensity === 'primary' ? primary : secondary).push(mapping.slug);
    }
  }

  // frequency = how many times the muscle appears in `data`.
  // We push primary muscles twice so they paint with highlightedColors[1]
  // (lime), secondaries once so they paint with highlightedColors[0] (dim lime).
  return [
    { name: 'secondary', muscles: secondary },
    { name: 'primary', muscles: [...primary, ...primary] },
  ];
}

export function AnatomyDiagram({ bodyFocus, className = '' }: Props) {
  const muscles = getMuscleGroups(bodyFocus);
  const primary = muscles.filter((m) => m.intensity === 'primary');
  const secondary = muscles.filter((m) => m.intensity === 'secondary');

  const anteriorData = buildBodyData(muscles, 'anterior');
  const posteriorData = buildBodyData(muscles, 'posterior');

  // Body palette — neutral dark figure, lime on activated muscles.
  const bodyColor = '#2a2c30';
  const highlightedColors = ['#7a8a00', '#caff00']; // [secondary, primary]

  return (
    <div className={`anatomy ${className}`.trim()}>
      <div className="anatomy__title">Target Muscle</div>

      <div className="anatomy__bodies">
        <div className="anatomy__body">
          <div className="anatomy__body-label">Front</div>
          <Model
            data={anteriorData}
            type="anterior"
            bodyColor={bodyColor}
            highlightedColors={highlightedColors}
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
        <div className="anatomy__body">
          <div className="anatomy__body-label">Back</div>
          <Model
            data={posteriorData}
            type="posterior"
            bodyColor={bodyColor}
            highlightedColors={highlightedColors}
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
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
