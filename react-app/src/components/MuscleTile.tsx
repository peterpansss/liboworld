import './MuscleTile.css';

// Gradient token per body-focus. Unknown falls back to the neutral slate gradient.
const GRADIENTS: Record<string, string> = {
  chest: 'linear-gradient(135deg, #2b1a1f 0%, #0e0e0e 100%)',
  back: 'linear-gradient(135deg, #1a2330 0%, #0e0e0e 100%)',
  shoulders: 'linear-gradient(135deg, #1d2a2a 0%, #0e0e0e 100%)',
  shoulder: 'linear-gradient(135deg, #1d2a2a 0%, #0e0e0e 100%)',
  biceps: 'linear-gradient(135deg, #2a2015 0%, #0e0e0e 100%)',
  triceps: 'linear-gradient(135deg, #2a1a22 0%, #0e0e0e 100%)',
  arms: 'linear-gradient(135deg, #2a1d17 0%, #0e0e0e 100%)',
  forearms: 'linear-gradient(135deg, #26201a 0%, #0e0e0e 100%)',
  core: 'linear-gradient(135deg, #2a2612 0%, #0e0e0e 100%)',
  abs: 'linear-gradient(135deg, #2a2612 0%, #0e0e0e 100%)',
  legs: 'linear-gradient(135deg, #21192b 0%, #0e0e0e 100%)',
  quads: 'linear-gradient(135deg, #21192b 0%, #0e0e0e 100%)',
  hamstrings: 'linear-gradient(135deg, #1f1b2a 0%, #0e0e0e 100%)',
  calves: 'linear-gradient(135deg, #1c1f27 0%, #0e0e0e 100%)',
  glutes: 'linear-gradient(135deg, #2b1a25 0%, #0e0e0e 100%)',
  traps: 'linear-gradient(135deg, #1f2226 0%, #0e0e0e 100%)',
  cardio: 'linear-gradient(135deg, #2b1a1a 0%, #0e0e0e 100%)',
  'full body': 'linear-gradient(135deg, #1e2520 0%, #0e0e0e 100%)',
  mobility: 'linear-gradient(135deg, #1d2325 0%, #0e0e0e 100%)',
};

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #1a1c20 0%, #0e0e0e 100%)';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  muscle: string;
  size?: Size;
  className?: string;
}

export function MuscleTile({ muscle, size = 'md', className = '' }: Props) {
  const key = (muscle || '').toLowerCase();
  const background = GRADIENTS[key] ?? DEFAULT_GRADIENT;
  const label = (muscle || 'Exercise').toUpperCase();
  return (
    <div className={`muscle-tile muscle-tile--${size} ${className}`.trim()} style={{ background }} aria-hidden="true">
      <span className="muscle-tile__label">{label}</span>
    </div>
  );
}
