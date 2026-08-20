import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LAUNCH_DATE } from '../config/launchMode';
import { diffParts } from '../utils/countdown';
import './LaunchCountdown.css';

/**
 * Inline countdown to launch day, sized to sit INSIDE a pricing card
 * (/membership, /join, /cash-challenges/:tier) rather than as a sticky bar —
 * see CountdownBanner for that one.
 *
 * Days/hours/minutes only, ticking every 30s: seconds on a card three weeks
 * out are noise, and a 1s interval on three mounted cards is pure churn.
 * At zero the whole block collapses to the closed-state line, which is what
 * makes the founding offer visibly expire without a deploy.
 */

// Inline sr-only style — visually hidden, still announced by screen readers.
// Mirrors the pattern used in src/components/funnel/CountdownBanner.tsx.
const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
};

const TICK_MS = 30_000;

type Props = {
  /** Extra class for per-page spacing; the block owns its own look. */
  className?: string;
};

export default function LaunchCountdown({ className }: Props) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  const target = new Date(LAUNCH_DATE).getTime();
  const parts = diffParts(target, now);
  const closed = parts.totalSec === 0;

  const closedLabel = t('countdown.foundingClosed', {
    defaultValue: 'Founding closed — Premium is €79.99/yr',
  });

  // As in CountdownBanner: the ticking digits are NOT a live region — a polite
  // announcement fires once, on the transition into the closed state, so a
  // screen-reader user sitting on the page learns the offer just expired.
  const [announcement, setAnnouncement] = useState('');
  const lastClosedRef = useRef(closed);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // The ref latches the transition, so this enqueues exactly one setState the
  // first time the clock crosses zero — no cascading re-render.
  useEffect(() => {
    if (closed && !lastClosedRef.current) {
      lastClosedRef.current = true;
      setAnnouncement(closedLabel);
    }
  }, [closed, closedLabel]);

  const units = [
    { key: 'd', value: parts.days, cap: t('countdown.unitDays', { defaultValue: 'DAYS' }) },
    { key: 'h', value: parts.hours, cap: t('countdown.unitHours', { defaultValue: 'HRS' }) },
    { key: 'm', value: parts.minutes, cap: t('countdown.unitMinutes', { defaultValue: 'MIN' }) },
  ];

  const label = t('countdown.founderLabel', {
    defaultValue: 'Founder pricing ends when we launch — 3 September',
  });

  return (
    <div
      role="status"
      className={`launch-countdown${closed ? ' launch-countdown--closed' : ''}${className ? ' ' + className : ''}`}
    >
      {closed ? (
        <span className="launch-countdown__label">{closedLabel}</span>
      ) : (
        <>
          <span className="launch-countdown__label" aria-hidden="true">{label}</span>
          <span className="launch-countdown__units" aria-hidden="true">
            {units.map((u) => (
              <span className="launch-countdown__unit" key={u.key}>
                <span
                  className="launch-countdown__num font-display"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {u.value}
                </span>
                <span className="launch-countdown__cap">{u.cap}</span>
              </span>
            ))}
          </span>
          {/* Visually hidden full sentence so AT users landing on the block get
              the whole thing at once instead of three orphaned numbers. */}
          <span style={srOnly}>
            {label + ' — ' + units.map((u) => u.value + ' ' + u.cap).join(', ')}
          </span>
        </>
      )}

      {/* Off-screen, aria-live=polite — fires only on the transition to closed.
          Empty otherwise so the 30s tick stays silent. */}
      <span aria-live="polite" aria-atomic="true" style={srOnly}>
        {announcement}
      </span>
    </div>
  );
}
