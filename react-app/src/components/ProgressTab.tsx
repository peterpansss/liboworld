import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { EmojiIcon } from './EmojiIcon';
import { BarChart3, Flame } from '../utils/icons';
import './ProgressTab.css';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return 'Just now';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKLY_GOAL = 300;

export default function ProgressTab() {
  const logs = useAppStore((s) => s.logs);
  const waterCount = useAppStore((s) => s.waterCount);
  const setWaterCount = useAppStore((s) => s.setWaterCount);

  const totalMins = useMemo(() => logs.reduce((a, l) => a + (l.dur || 0), 0), [logs]);
  const totalCal = useMemo(() => logs.reduce((a, l) => a + (l.cal || 0), 0), [logs]);
  const pct = Math.min(Math.round((totalMins / WEEKLY_GOAL) * 100), 100);

  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (circumference * pct) / 100;

  const today = new Date().getDay(); // 0=Sun

  const barData = useMemo(() => {
    return DAYS.map((d, i) => {
      const dayOfWeek = (i + 1) % 7; // Mon=1..Sun=0
      const count = logs.filter((l) => {
        const dd = new Date(l.date).getDay();
        return dd === dayOfWeek;
      }).length;
      const h = Math.min(count * 30 + 10, 80);
      const isToday = dayOfWeek === today;
      return { label: d, height: h, isToday };
    });
  }, [logs, today]);

  const waterMl = waterCount * 250;

  return (
    <div className="progress-tab">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">Progress</div>
        <div className="badge">{logs.length} sessions</div>
      </div>

      {/* Ring + Stats Hero */}
      <div className="progress-hero">
        <div className="progress-ring-wrap">
          <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="8"
            />
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="8"
              strokeDasharray={circumference.toFixed(1)}
              strokeDashoffset={dashOffset.toFixed(1)}
              strokeLinecap="round"
              className="progress-ring-fill"
            />
          </svg>
          <div className="progress-ring-label">
            <div className="progress-ring-value font-display">{totalMins}</div>
            <div className="progress-ring-unit">Minutes</div>
          </div>
        </div>
        <div className="progress-hero-right">
          <div className="progress-hero-title">Total Activity</div>
          <div className="progress-hero-pct">{pct}% of weekly goal</div>
          <div className="progress-stats-grid">
            <div className="progress-stat-box">
              <div className="progress-stat-val font-display">{totalCal}</div>
              <div className="progress-stat-lbl">Cal Burned</div>
            </div>
            <div className="progress-stat-box">
              <div className="progress-stat-val font-display">{logs.length}</div>
              <div className="progress-stat-lbl">Workouts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Bar Chart */}
      <div className="chart-wrap">
        <div className="chart-title">This Week</div>
        <div className="bar-chart">
          {barData.map((bar) => (
            <div className="bar-col" key={bar.label}>
              <div
                className={`bar${bar.isToday ? ' active' : ''}`}
                style={{ height: bar.height }}
              />
              <div className="bar-label">{bar.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Water Tracker */}
      <div className="water-header">
        <div className="section-label">Water Today</div>
        <div className="water-ml">
          {waterMl} ml <span className="water-ml-goal">/ 2000 ml</span>
        </div>
      </div>
      <div className="water-card">
        <div className="water-glasses">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="water-glass-col"
              onClick={() => setWaterCount(i + 1)}
            >
              <div
                className={`water-glass${i < waterCount ? ' filled' : ''}`}
              />
              {(i === 0 || i === 3 || i === 7) ? (
                <div className="water-glass-label">{(i + 1) * 250}ml</div>
              ) : (
                <div className="water-glass-spacer" />
              )}
            </div>
          ))}
        </div>
        <div className="water-controls">
          <button
            className="water-btn"
            onClick={() => setWaterCount(Math.max(0, waterCount - 1))}
          >
            −
          </button>
          <div className="water-count-display">
            <span className="water-count-num font-display">{waterCount}</span>
            <span className="water-count-label">/ 8 cups · 250 ml each</span>
          </div>
          <button
            className="water-btn"
            onClick={() => setWaterCount(Math.min(8, waterCount + 1))}
          >
            +
          </button>
        </div>
        {waterCount >= 8 && (
          <div className="water-complete">2 L reached — great work</div>
        )}
      </div>

      {/* Workout Log */}
      <div className="log-section-header">
        <div className="section-label">Workout Log</div>
      </div>
      <div className="log-list">
        {logs.length > 0 ? (
          logs.map((l) => (
            <div className="log-entry" key={l.id}>
              <div className="log-entry-icon">
                <EmojiIcon emoji={l.emoji} size={20} />
              </div>
              <div>
                <div className="log-entry-name">{l.name}</div>
                <div className="log-entry-meta">
                  {timeAgo(l.date)} · {l.dur} min
                </div>
              </div>
              <div className="log-entry-cal" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <EmojiIcon icon={Flame} size={14} color="#CAFF00" />
                {l.cal}
              </div>
            </div>
          ))
        ) : (
          <div className="log-empty">
            <div className="log-empty-icon">
              <EmojiIcon icon={BarChart3} size={40} />
            </div>
            <div className="log-empty-title">No workouts yet</div>
            <div className="log-empty-desc">
              Complete your first workout to see progress
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
