import { useTranslation } from 'react-i18next';
import { nextRound, type GiveawayRound } from '../../data/giveawayRounds';
import { PropImg } from './EarnKit';
import GiveawayCountdown from './GiveawayCountdown';

/**
 * "Opening next" card on /giveaway: the next round in GIVEAWAY_ROUNDS after
 * the featured one, with a countdown to its opening. Renders nothing when no
 * later round is scheduled, so adding a round to giveawayRounds.ts is all it
 * takes to show it.
 */
export default function GiveawayNextCard({ featured, now }: { featured: GiveawayRound | undefined; now?: Date }) {
  const { t, i18n } = useTranslation();
  const next = nextRound(featured, now);
  if (!next) return null;
  const opens = new Intl.DateTimeFormat(i18n.language || 'en', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${next.opens}T12:00:00Z`));
  return (
    <article className="gw-next" data-popin>
      <PropImg name={next.prop} className="gw-next__prop" width={160} />
      <div className="gw-next__body">
        <p className="earn-eyebrow">{t('earnPages.giveaway.next.eyebrow')}</p>
        <h3 className="gw-next__title">{next.prizeName}</h3>
        <p className="gw-next__meta">
          {t('earnPages.giveaway.next.meta', { opens })}
        </p>
        <GiveawayCountdown round={next} until="open" className="gw-count--small" />
      </div>
    </article>
  );
}
