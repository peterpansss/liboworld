import './MuscleTile.css';

const NEUTRAL_GRADIENT = 'linear-gradient(135deg, #1a1c20 0%, #0e0e0e 100%)';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  muscle: string;
  size?: Size;
  className?: string;
  showLabel?: boolean;
}

export function MuscleTile({ muscle, size = 'md', className = '', showLabel = true }: Props) {
  const label = (muscle || 'Exercise').toUpperCase();
  return (
    <div
      className={`muscle-tile muscle-tile--${size} ${className}`.trim()}
      style={{ background: NEUTRAL_GRADIENT }}
      aria-hidden="true"
    >
      {showLabel && <span className="muscle-tile__label">{label}</span>}
    </div>
  );
}
