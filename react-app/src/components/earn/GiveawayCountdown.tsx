import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { diffParts, pad2 } from '../../utils/countdown';
import { countdownTarget, type GiveawayRound } from '../../data/giveawayRounds';

/**
 * Live DD / HH / MM / SS countdown for a giveaway round (/giveaway).
 *
 * `until="auto"` (the hero): before the round opens it counts to the opening
 * ("Opens in"), while it is open it counts to the close ("Closes in"), and
 * after the close it renders nothing. `until="open"` (the "Opening next"
 * card) only ever counts to the opening.
 *
 * Times come from the round's Berlin calendar dates (giveawayRounds.ts):
 * opens 00:00 on `opens`, closes at the end of 23:59 on `closes`. The phase is
 * worked out on every tick, so the block flips from "Opens in" to "Closes in"
 * at midnight without a reload.
 *
 * Reduced motion: there is no animation on the digits at all; the numbers
 * simply update once a second. The digits are aria-hidden and a single
 * sr-only sentence carries the content, so screen readers are not spammed.
 */
type Props = {
  round: GiveawayRound;
  until?: 'auto' | 'open';
  className?: string;
};

export default function GiveawayCountdown({ round, until = 'auto', className = '' }: Props) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const tgt = countdownTarget(round, now, until);
  if (!tgt) return null;
  const parts = diffParts(tgt.target, now);
  const label = t(tgt.phase === 'opens' ? 'earnPages.giveaway.countdown.opensIn' : 'earnPages.giveaway.countdown.closesIn');
  const units = [
    { key: 'd', value: pad2(parts.days), cap: t('countdown.unitDays') },
    { key: 'h', value: pad2(parts.hours), cap: t('countdown.unitHours') },
    { key: 'm', value: pad2(parts.minutes), cap: t('countdown.unitMinutes') },
    { key: 's', value: pad2(parts.seconds), cap: t('countdown.unitSeconds') },
  ];

  return (
    <div className={`gw-count ${className}`.trim()} role="timer" aria-live="off">
      <span className="gw-count__label" aria-hidden="true">{label}</span>
      <span className="gw-count__units" aria-hidden="true">
        {units.map((u) => (
          <span className="gw-count__unit" key={u.key}>
            <span className="gw-count__num">{u.value}</span>
            <span className="gw-count__cap">{u.cap}</span>
          </span>
        ))}
      </span>
      <span className="sr-only">{`${label}: ${units.map((u) => `${u.value} ${u.cap}`).join(', ')}`}</span>
    </div>
  );
}
