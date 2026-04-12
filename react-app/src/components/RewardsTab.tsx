import './RewardsTab.css';

interface Badge {
  emoji: string;
  name: string;
  locked: boolean;
}

const BADGES: Badge[] = [
  { emoji: '🎯', name: 'First Rep', locked: false },
  { emoji: '🔥', name: '10 Workouts', locked: false },
  { emoji: '📅', name: '7-Day Streak', locked: false },
  { emoji: '⏱️', name: 'First Hour', locked: false },
  { emoji: '⚡', name: '25 Workouts', locked: true },
  { emoji: '💎', name: '14-Day Streak', locked: true },
  { emoji: '🏆', name: '50 Workouts', locked: true },
  { emoji: '🌟', name: '30-Day Streak', locked: true },
];

const STEPS = [
  {
    icon: '💪',
    title: 'Do your reps',
    desc: '50 pushups daily, split however you want',
  },
  {
    icon: '📲',
    title: 'Record & share',
    desc: 'Log in-app, post to your stories',
  },
  {
    icon: '💶',
    title: 'Get paid',
    desc: '30 days straight = cash to your account',
  },
];

const EARN_WAYS = [
  { icon: '🏋️', action: 'Complete a workout', points: '+50' },
  { icon: '📅', action: 'Daily login streak', points: '+10/day' },
  { icon: '🎯', action: 'Finish a program', points: '+500' },
  { icon: '💧', action: 'Hit water goal', points: '+15' },
  { icon: '🔥', action: '7-day streak bonus', points: '+200' },
];

export default function RewardsTab() {
  return (
    <div className="rewards-tab">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">Rewards</div>
      </div>

      {/* Points Balance Card */}
      <div className="rw-points-card">
        <div className="rw-points-label">Your Balance</div>
        <div className="rw-points-value font-display">1,250</div>
        <div className="rw-points-unit">Points</div>
        <div className="rw-points-rank">
          <span className="rw-points-rank-icon">⚡</span>
          <span>Silver Tier</span>
          <span className="rw-points-rank-next">750 pts to Gold</span>
        </div>
      </div>

      {/* Hero Prize Card */}
      <div className="rw-hero">
        <div className="rw-hero-label">Money Challenge</div>
        <div className="rw-hero-amount font-display">&euro;15</div>
        <div className="rw-hero-title">50 Pushups x 30 Days</div>
        <div className="rw-hero-sub">
          Complete the challenge. Get paid. No strings.
        </div>
        <div className="rw-spots">
          <div className="rw-spots-bar">
            <div className="rw-spots-fill" style={{ width: '74%' }} />
          </div>
          <span>37/50 spots filled</span>
        </div>
      </div>

      {/* Earn Points */}
      <div className="rw-section-label">Earn Points</div>
      <div className="rw-earn-list">
        {EARN_WAYS.map((way) => (
          <div className="rw-earn-row" key={way.action}>
            <div className="rw-earn-icon">{way.icon}</div>
            <div className="rw-earn-action">{way.action}</div>
            <div className="rw-earn-points">{way.points}</div>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div className="rw-section-label">How it works</div>
      <div className="rw-steps">
        {STEPS.map((step) => (
          <div className="rw-step" key={step.title}>
            <div className="rw-step-icon">{step.icon}</div>
            <div className="rw-step-title">{step.title}</div>
            <div className="rw-step-desc">{step.desc}</div>
          </div>
        ))}
      </div>

      {/* Achievement Badges */}
      <div className="rw-badges-header">
        <div className="rw-section-label">Achievements</div>
        <div className="rw-badges-count">4 of 8</div>
      </div>
      <div className="rw-badges">
        {BADGES.map((badge) => (
          <div className="rw-badge-item" key={badge.name}>
            <div className={`rw-badge-icon${badge.locked ? ' locked' : ''}`}>
              {badge.emoji}
            </div>
            <div className="rw-badge-name">{badge.name}</div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="rw-cta">
        <div className="rw-cta-text">
          Miss a day? Streak resets.
          <br />
          No excuses. Real money. Real discipline.
        </div>
        <div className="rw-cta-sub">Limited spots per challenge. Join early.</div>
      </div>
    </div>
  );
}
