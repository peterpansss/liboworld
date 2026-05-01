import { useEffect, useState } from 'react';
import { colors } from '../../theme';

type Props = {
  /** ISO timestamp the countdown counts down to */
  endsAt: string;
  /** Label prefix, e.g. "GIVEAWAY ENDS IN" */
  label: string;
  /** Switch to a more urgent visual style in the final hour */
  urgentBelowSeconds?: number;
};

function pad2(n: number) { return n < 10 ? '0' + n : String(n); }

function diffParts(target: number, now: number) {
  const diff = Math.max(0, target - now);
  const sec = Math.floor(diff / 1000);
  return {
    totalSec: sec,
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    minutes: Math.floor((sec % 3600) / 60),
    seconds: sec % 60,
  };
}

export default function CountdownBanner({ endsAt, label, urgentBelowSeconds = 3600 }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const target = new Date(endsAt).getTime();
  const parts = diffParts(target, now);
  const urgent = parts.totalSec > 0 && parts.totalSec < urgentBelowSeconds;
  const ended = parts.totalSec === 0;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const bg = urgent
    ? 'linear-gradient(90deg, #C84A4A 0%, #E05A5A 50%, #C84A4A 100%)'
    : 'linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: bg,
        color: '#fff',
        textAlign: 'center',
        padding: '10px 16px',
        fontSize: 13,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        fontWeight: 700,
        borderBottom: '1px solid ' + colors.border,
        animation: urgent ? 'libo-countdown-pulse 1.4s ease-in-out infinite' : undefined,
      }}
    >
      {ended ? (
        <span>{label.replace(/IN$/i, '')} CLOSED</span>
      ) : (
        <>
          <span style={{ marginRight: 12 }}>{label}</span>
          <span
            className="font-display"
            style={{
              display: 'inline-flex',
              gap: 4,
              fontVariantNumeric: 'tabular-nums',
              color: urgent ? '#fff' : colors.accent,
              fontSize: 15,
            }}
          >
            {parts.days > 0 && <span>{pad2(parts.days)}d</span>}
            <span>{pad2(parts.hours)}</span>
            <span style={{ animation: 'libo-blink 1s steps(2, start) infinite' }}>:</span>
            <span>{pad2(parts.minutes)}</span>
            <span style={{ animation: 'libo-blink 1s steps(2, start) infinite' }}>:</span>
            <span>{pad2(parts.seconds)}</span>
          </span>
        </>
      )}
      <style>{`
        @keyframes libo-blink { 50% { opacity: 0.35; } }
        @keyframes libo-countdown-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(200,74,74,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(200,74,74,0); }
        }
      `}</style>
    </div>
  );
}
