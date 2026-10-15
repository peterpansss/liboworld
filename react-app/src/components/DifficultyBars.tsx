/** Difficulty as three bars (filled = accent). Used on the cover cards in /workouts and /exercises. */
export type DiffLevel = 'beginner' | 'intermediate' | 'advanced';

export function DifficultyBars({ level, label }: { level: DiffLevel; label: string }) {
  const filled = level === 'beginner' ? 1 : level === 'intermediate' ? 2 : 3;
  return (
    <span className={`wk-card-diff wk-card-diff--${level}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`wk-card-diff-dot${i < filled ? ' is-filled' : ''}`} aria-hidden="true" />
      ))}
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
