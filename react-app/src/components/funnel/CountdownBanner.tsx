import { useEffect, useRef, useState } from 'react';
import { colors } from '../../theme';

// Inline sr-only style — visually hidden, still announced by screen readers.
// Mirrors the pattern used in src/pages/Landing.tsx.
const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
};

function partsToSentence(label: string, parts: { days: number; hours: number; minutes: number; seconds: number }) {
  const segs: string[] = [];
  if (parts.days > 0) segs.push(parts.days === 1 ? '1 day' : parts.days + ' days');
  if (parts.hours > 0) segs.push(parts.hours === 1 ? '1 hour' : parts.hours + ' hours');
  if (parts.minutes > 0) segs.push(parts.minutes === 1 ? '1 minute' : parts.minutes + ' minutes');
  if (parts.seconds > 0 || segs.length === 0) segs.push(parts.seconds === 1 ? '1 second' : parts.seconds + ' seconds');
  return label + ' ' + segs.join(', ') + ' remaining';
}

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

  // We do NOT mark the visual countdown as a live region — announcing every
  // second is hostile to screen-reader users. Instead, a separate
  // aria-live="assertive" span fires only when the user crosses a meaningful
  // threshold (urgent kicks in, less than a minute, expired). The refs latch
  // the last-seen state so we only announce once per transition.
  const [announcement, setAnnouncement] = useState('');
  const lastUrgentRef = useRef(urgent);
  const lastSubMinuteRef = useRef(parts.totalSec > 0 && parts.totalSec < 60);
  const lastEndedRef = useRef(ended);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Synchronize an external concern (screen-reader announcements) with the
  // ticking timer. Each branch is gated by a ref so we only enqueue one
  // setState per real transition - the cascading-render warning does not
  // apply here because the next tick will not re-trigger the same branch.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (ended && !lastEndedRef.current) {
      lastEndedRef.current = true;
      setAnnouncement(label.replace(/IN$/i, '').trim() + ' closed');
      return;
    }
    if (!ended) {
      const subMinute = parts.totalSec > 0 && parts.totalSec < 60;
      if (subMinute && !lastSubMinuteRef.current) {
        lastSubMinuteRef.current = true;
        setAnnouncement('Less than 1 minute remaining');
        return;
      }
      if (urgent && !lastUrgentRef.current) {
        lastUrgentRef.current = true;
        setAnnouncement('Less than 1 hour remaining');
      }
    }
  }, [ended, urgent, parts.totalSec, label]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const bg = urgent
    ? 'linear-gradient(90deg, #C84A4A 0%, #E05A5A 50%, #C84A4A 100%)'
    : 'linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)';

  return (
    <div
      role="status"
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
          <span style={{ marginRight: 12 }} aria-hidden="true">{label}</span>
          <span
            className="font-display"
            aria-hidden="true"
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
          {/* Visually hidden full-sentence label so AT users get context
              if they navigate onto the banner directly (not a live region). */}
          <span style={srOnly}>{partsToSentence(label, parts)}</span>
        </>
      )}

      {/* Off-screen, aria-live=assertive — fires only on threshold transitions
          (urgent kicks in, sub-minute, expired). Empty on render keeps SRs
          quiet between transitions. */}
      <span aria-live="assertive" aria-atomic="true" style={srOnly}>
        {announcement}
      </span>

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
