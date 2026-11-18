import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ScrollRevealText from '../ScrollRevealText';
import { PropImg } from './EarnKit';
import { POINTS_ACTIONS } from '../../data/pointsTable';
import { REWARDS_CATALOG, formatPoints } from '../../data/rewardsCatalog';
import { featuredRound } from '../../data/giveawayRounds';
import { CHALLENGE_TIERS } from '../../data/challengeTiers';
import { CountUp, ScrollCoin } from '../motion/Motion';
import './HomeEarn.css';

/**
 * Home: "Train and earn" — the four ways Libo pays training back, right under
 * the hero (Noah, 18 Nov 2026: Home only talked about training). Every number
 * comes from the same data files as /earn, /rewards, /giveaway and
 * /cash-challenges, never typed here. Cash copy states amount + condition
 * (canon); no winners, no casino imagery.
 */
export default function HomeEarn() {
  const { t } = useTranslation();
  const workout = POINTS_ACTIONS.find((a) => a.id === 'workout') ?? POINTS_ACTIONS[0];
  const round = featuredRound();
  const maxPayout = Math.max(...CHALLENGE_TIERS.map((c) => c.payout));

  const cards = [
    { id: 'points', to: '/earn', prop: 'libo-coin', text: t('homeEarn.points.text', { n: workout.base }) },
    { id: 'rewards', to: '/rewards', prop: 'reward-cards-fan', text: t('homeEarn.rewards.text', { pts: formatPoints(REWARDS_CATALOG[0].points) }) },
    {
      id: 'giveaway',
      to: '/giveaway',
      prop: round?.prop ?? 'trophy-lime',
      text: round ? t('homeEarn.giveaway.text', { prize: round.prizeName }) : t('homeEarn.giveaway.textNone'),
    },
    { id: 'challenges', to: '/cash-challenges', prop: 'cash-euro-stack', text: t('homeEarn.challenges.text', { max: maxPayout }) },
  ];

  const stats = [
    { value: '820+', label: t('homeEarn.stats.l1') },
    { value: '140', label: t('homeEarn.stats.l2') },
    { value: `€${maxPayout}`, label: t('homeEarn.stats.l3') },
    { value: `+${workout.base}`, label: t('homeEarn.stats.l4') },
  ];

  return (
    <section className="rh-earn band-lime" aria-labelledby="rh-earn-h2">
      <div className="rh-earn-inner">
        <p className="rh-eyebrow rh-eyebrow--center">{t('homeEarn.eyebrow')}</p>
        <h2 id="rh-earn-h2" className="rh-h2 rh-h2--lg rh-h2--center">
          <ScrollRevealText as="span" className="rh-h2-line">{t('homeEarn.h2a')}</ScrollRevealText>
          <span className="rh-h2-line"><ScrollRevealText as="span" className="rh-earn-pill">{t('homeEarn.h2b')}</ScrollRevealText></span>
        </h2>
        <p className="rh-earn-sub">{t('homeEarn.sub')}</p>

        <ul className="rh-earn-grid">
          {cards.map((c) => (
            <li key={c.id} data-popin>
              <Link to={c.to} className="rh-earn-card band-dark" viewTransition>
                <span className="rh-earn-stage">
                  <PropImg name={c.prop} className="rh-earn-prop" width={200} />
                </span>
                <span className="rh-earn-title">{t(`homeEarn.${c.id}.title`)}</span>
                <span className="rh-earn-text">{c.text}</span>
                <span className="rh-earn-link">
                  {t(`homeEarn.${c.id}.link`)} <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <dl className="rh-earn-stats">
          {stats.map((s) => (
            <div key={s.label} className="rh-earn-stat">
              <dt className="rh-earn-stat__value"><CountUp value={s.value} /></dt>
              <dd className="rh-earn-stat__label">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
      <ScrollCoin className="rh-earn-coin" />
    </section>
  );
}
