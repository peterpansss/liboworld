/**
 * Stylized front/back body anatomy with 13 muscle paths matching the keys in
 * BODY_FOCUS_MUSCLE_MAP. Each muscle is a separate <path>/<g> with a `data-muscle`
 * attribute; the parent <AnatomyDiagram> sets `data-state="primary|secondary|off"`
 * on each one based on getMuscleGroups(bodyFocus).
 *
 * Hand-authored simplified silhouette — recognizable but not anatomically detailed,
 * ~6KB inline. Coordinate system: each view is 140 wide × 320 tall.
 */
import { type SVGProps } from 'react';

interface MuscleProps extends SVGProps<SVGGElement> {
  muscle: string;
  state: 'primary' | 'secondary' | 'off';
}

function Muscle({ muscle, state, children, ...rest }: MuscleProps) {
  return (
    <g data-muscle={muscle} data-state={state} className="anatomy__muscle" {...rest}>
      {children}
    </g>
  );
}

type StateFn = (muscle: string) => 'primary' | 'secondary' | 'off';

export function BodyAnatomy({ stateFor }: { stateFor: StateFn }) {
  return (
    <svg
      viewBox="0 0 320 340"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Muscle activation diagram"
      className="anatomy__svg"
    >
      {/* ─────────────── FRONT VIEW (x: 0-140) ─────────────── */}
      <g transform="translate(20 10)">
        {/* Body outline (neutral) */}
        <path
          className="anatomy__outline"
          d="
            M50 4 C58 4 64 10 64 22 C64 34 58 42 50 42
            C42 42 36 34 36 22 C36 10 42 4 50 4 Z
            M50 42 L50 50
            M30 56 L70 56 C82 60 88 70 88 90 L88 130
            L80 132 L84 178 L78 180
            L72 220 L66 280 L64 312 L56 312 L52 280 L52 220
            L48 220 L48 280 L44 312 L36 312 L34 280 L28 220
            L22 180 L16 178 L20 132 L12 130 L12 90
            C12 70 18 60 30 56 Z
          "
          fill="currentColor"
          opacity="0.08"
        />

        {/* Front Delts */}
        <Muscle muscle="Front Delts" state={stateFor('Front Delts')}>
          <ellipse cx="20" cy="64" rx="8" ry="9" />
          <ellipse cx="80" cy="64" rx="8" ry="9" />
        </Muscle>

        {/* Side Delts */}
        <Muscle muscle="Side Delts" state={stateFor('Side Delts')}>
          <ellipse cx="14" cy="74" rx="6" ry="9" />
          <ellipse cx="86" cy="74" rx="6" ry="9" />
        </Muscle>

        {/* Traps (visible from front, neck base) */}
        <Muscle muscle="Traps" state={stateFor('Traps')}>
          <path d="M34 52 Q50 48 66 52 L62 60 Q50 56 38 60 Z" />
        </Muscle>

        {/* Chest */}
        <Muscle muscle="Chest" state={stateFor('Chest')}>
          <path d="M28 66 Q40 62 48 70 L48 92 Q38 98 28 92 Q24 80 28 66 Z" />
          <path d="M72 66 Q60 62 52 70 L52 92 Q62 98 72 92 Q76 80 72 66 Z" />
        </Muscle>

        {/* Biceps */}
        <Muscle muscle="Biceps" state={stateFor('Biceps')}>
          <path d="M10 88 Q4 100 8 122 Q14 124 18 122 Q20 100 16 90 Z" />
          <path d="M90 88 Q96 100 92 122 Q86 124 82 122 Q80 100 84 90 Z" />
        </Muscle>

        {/* Forearms (front) */}
        <Muscle muscle="Forearms" state={stateFor('Forearms')}>
          <path d="M8 130 Q4 152 12 174 Q18 174 22 172 Q22 150 18 130 Z" />
          <path d="M92 130 Q96 152 88 174 Q82 174 78 172 Q78 150 82 130 Z" />
        </Muscle>

        {/* Abs */}
        <Muscle muscle="Abs" state={stateFor('Abs')}>
          <rect x="40" y="98" width="20" height="14" rx="3" />
          <rect x="40" y="116" width="20" height="14" rx="3" />
          <rect x="40" y="134" width="20" height="14" rx="3" />
        </Muscle>

        {/* Obliques */}
        <Muscle muscle="Obliques" state={stateFor('Obliques')}>
          <path d="M28 100 Q24 120 30 148 L38 146 L38 100 Z" />
          <path d="M72 100 Q76 120 70 148 L62 146 L62 100 Z" />
        </Muscle>

        {/* Hip Flexors */}
        <Muscle muscle="Hip Flexors" state={stateFor('Hip Flexors')}>
          <path d="M30 152 Q40 158 48 156 L48 168 Q38 170 30 164 Z" />
          <path d="M70 152 Q60 158 52 156 L52 168 Q62 170 70 164 Z" />
        </Muscle>

        {/* Quads */}
        <Muscle muscle="Quads" state={stateFor('Quads')}>
          <path d="M22 174 Q18 200 28 232 L46 232 L48 188 Q40 178 22 174 Z" />
          <path d="M78 174 Q82 200 72 232 L54 232 L52 188 Q60 178 78 174 Z" />
        </Muscle>

        {/* Calves (front view of lower leg) */}
        <Muscle muscle="Calves" state={stateFor('Calves')}>
          <path d="M30 240 Q26 268 32 296 L42 296 Q44 268 42 240 Z" />
          <path d="M70 240 Q74 268 68 296 L58 296 Q56 268 58 240 Z" />
        </Muscle>

        {/* Core fallback (entire midsection) - drawn under abs/obliques */}
        <Muscle muscle="Core" state={stateFor('Core')}>
          <path d="M30 100 Q26 130 32 152 L68 152 Q74 130 70 100 Z" opacity="0.5" />
        </Muscle>

        {/* Shoulders fallback */}
        <Muscle muscle="Shoulders" state={stateFor('Shoulders')}>
          <ellipse cx="16" cy="68" rx="10" ry="12" opacity="0.5" />
          <ellipse cx="84" cy="68" rx="10" ry="12" opacity="0.5" />
        </Muscle>

        <text x="50" y="332" textAnchor="middle" className="anatomy__view-label">FRONT</text>
      </g>

      {/* ─────────────── BACK VIEW (x: 160-300) ─────────────── */}
      <g transform="translate(180 10)">
        {/* Body outline (neutral) */}
        <path
          className="anatomy__outline"
          d="
            M50 4 C58 4 64 10 64 22 C64 34 58 42 50 42
            C42 42 36 34 36 22 C36 10 42 4 50 4 Z
            M50 42 L50 50
            M30 56 L70 56 C82 60 88 70 88 90 L88 130
            L80 132 L84 178 L78 180
            L72 220 L66 280 L64 312 L56 312 L52 280 L52 220
            L48 220 L48 280 L44 312 L36 312 L34 280 L28 220
            L22 180 L16 178 L20 132 L12 130 L12 90
            C12 70 18 60 30 56 Z
          "
          fill="currentColor"
          opacity="0.08"
        />

        {/* Traps (back) */}
        <Muscle muscle="Traps" state={stateFor('Traps')}>
          <path d="M28 50 Q50 44 72 50 L66 70 Q50 64 34 70 Z" />
        </Muscle>

        {/* Rear Delts */}
        <Muscle muscle="Rear Delts" state={stateFor('Rear Delts')}>
          <ellipse cx="18" cy="68" rx="8" ry="9" />
          <ellipse cx="82" cy="68" rx="8" ry="9" />
        </Muscle>

        {/* Rhomboids (mid-upper back) */}
        <Muscle muscle="Rhomboids" state={stateFor('Rhomboids')}>
          <path d="M36 70 L64 70 L62 92 L38 92 Z" />
        </Muscle>

        {/* Lats (broad back wings) */}
        <Muscle muscle="Lats" state={stateFor('Lats')}>
          <path d="M30 76 Q22 100 28 128 L42 130 L42 96 Q38 84 30 76 Z" />
          <path d="M70 76 Q78 100 72 128 L58 130 L58 96 Q62 84 70 76 Z" />
        </Muscle>

        {/* Back fallback */}
        <Muscle muscle="Back" state={stateFor('Back')}>
          <path d="M32 90 L68 90 L68 130 L32 130 Z" opacity="0.5" />
        </Muscle>

        {/* Triceps */}
        <Muscle muscle="Triceps" state={stateFor('Triceps')}>
          <path d="M10 86 Q4 102 8 124 Q14 126 18 124 Q20 102 16 88 Z" />
          <path d="M90 86 Q96 102 92 124 Q86 126 82 124 Q80 102 84 88 Z" />
        </Muscle>

        {/* Forearms (back) */}
        <Muscle muscle="Forearms" state={stateFor('Forearms')}>
          <path d="M8 130 Q4 152 12 174 Q18 174 22 172 Q22 150 18 130 Z" />
          <path d="M92 130 Q96 152 88 174 Q82 174 78 172 Q78 150 82 130 Z" />
        </Muscle>

        {/* Lower Back */}
        <Muscle muscle="Lower Back" state={stateFor('Lower Back')}>
          <path d="M36 132 L64 132 L62 158 L38 158 Z" />
        </Muscle>

        {/* Glutes */}
        <Muscle muscle="Glutes" state={stateFor('Glutes')}>
          <path d="M26 162 Q22 188 32 200 L48 200 L48 168 Q40 162 26 162 Z" />
          <path d="M74 162 Q78 188 68 200 L52 200 L52 168 Q60 162 74 162 Z" />
        </Muscle>

        {/* Hamstrings */}
        <Muscle muscle="Hamstrings" state={stateFor('Hamstrings')}>
          <path d="M24 204 Q22 232 28 258 L46 258 L48 212 Q40 206 24 204 Z" />
          <path d="M76 204 Q78 232 72 258 L54 258 L52 212 Q60 206 76 204 Z" />
        </Muscle>

        {/* Calves (back view) */}
        <Muscle muscle="Calves" state={stateFor('Calves')}>
          <path d="M28 264 Q24 292 30 320 L44 320 Q46 292 44 264 Z" />
          <path d="M72 264 Q76 292 70 320 L56 320 Q54 292 56 264 Z" />
        </Muscle>

        <text x="50" y="332" textAnchor="middle" className="anatomy__view-label">BACK</text>
      </g>
    </svg>
  );
}
