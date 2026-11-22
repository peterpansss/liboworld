import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SeoHead } from '../components/SeoHead';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import {
  EarnHero, StepStrip, PremiumStrip, EarnNext, AppCta, RulesLink, PropImg, Band, Heading, BigNumber,
} from '../components/earn/EarnKit';
import { usePopIn } from '../utils/funnelAnimations';
import {
  REWARDS_CATALOG, REWARDS_ITEMS, REWARDS_DELIVERY_DAYS, itemCashEur, formatPoints,
} from '../data/rewardsCatalog';
import './Rewards.css';

/**
 * /rewards — the rewards shop, mirrored from the app's Rewards tab.
 *
 * UI rule (Noah, 14 Nov 2026): never show how many cards are left and no
 * condition note under the cards; the conditions live on /rewards-rules.
 *
 * /rewards is also the App Store in-app event path (see the AASA file). With
 * the app installed iOS opens the Rewards tab; without it, people land here,
 * so the cash challenge is linked right under the hero.
 */
export default function Rewards() {
  const { t } = useTranslation();
  usePopIn();
  const cheapest = REWARDS_CATALOG[0];

  return (
    <>
      <SeoHead
        title={t('earnPages.rewards.seo.title')}
        description={t('earnPages.rewards.seo.description')}
        canonical="/rewards"
      />
      <SiteNav />
      <main id="main-content" className="earn-page">
        <EarnHero
          eyebrow={t('earnPages.rewards.eyebrow')}
          title={[t('earnPages.rewards.title1'), t('earnPages.rewards.title2')]}
          sub={t('earnPages.rewards.sub')}
          props={['reward-cards-fan', 'cash-euro-stack']}
        >
          <Link to="/earn" className="btn-primary btn-primary--lg" viewTransition>
            {t('earnPages.rewards.ctaEarn')} <span aria-hidden="true">→</span>
          </Link>
          <Link to="/cash-challenges" className="rw-challenge-link" viewTransition>
            {t('earnPages.rewards.challengeLink')} <span aria-hidden="true">→</span>
          </Link>
        </EarnHero>

        {(['gift', 'cash'] as const).map((kind, idx) => (
          <Band key={kind} raised={idx === 0}>
            <Heading title={t(`earnPages.rewards.${kind}.heading`)} sub={t(`earnPages.rewards.${kind}.lead`)} />
            <ul className="rw-cards">
              {REWARDS_CATALOG.map((r) => (
                <li key={r.valueEur} className="rw-card" data-popin>
                  <img
                    className="rw-card__img"
                    src={`/reward-cards/${kind}-${r.valueEur}.webp?v=1`}
                    alt={t(`earnPages.rewards.${kind}.alt`, { value: r.valueEur })}
                    loading="lazy"
                    decoding="async"
                    width={600}
                    height={380}
                  />
                  <div className="rw-card__row">
                    <span className="rw-card__pts">
                      {formatPoints(r.points)} <span>{t('earnPages.common.points')}</span>
                    </span>
                    {r.minTier === 'premium' && (
                      <span className="rw-badge">{t('earnPages.common.premium')}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Band>
        ))}

        {REWARDS_ITEMS.length > 0 && (
          <Band raised>
            <Heading title={t('earnPages.rewards.items.heading')} />
            <ul className="rw-items">
              {REWARDS_ITEMS.map((it) => (
                <li key={it.title} className="rw-item" data-popin>
                  <span className="rw-item__stage"><PropImg name="iphone-duo" className="rw-item__prop" width={400} /></span>
                  <div className="rw-item__copy">
                    {/* Lowest plan that can redeem it (Free, Premium or Elite since 22 Nov 2026); the paid-months
                        condition lives on /rewards-rules, per the no-condition-note rule above. */}
                    {it.minTier !== 'free' && <span className="rw-badge">{t(`earnPages.common.${it.minTier}`)}</span>}
                    <span className="rw-item__title">{it.title}</span>
                    <span className="rw-card__pts">
                      {formatPoints(it.points)} <span>{t('earnPages.common.points')}</span>
                    </span>
                    <span className="rw-item__cash">
                      {t('earnPages.rewards.items.cash', { cash: itemCashEur(it.valueEur).toLocaleString('en-GB') })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="earn-fine">{t('earnPages.rewards.items.trademark')}</p>
          </Band>
        )}

        <BigNumber
          value={formatPoints(cheapest.points)}
          caption={t('earnPages.big.rewards', { value: cheapest.valueEur })}
          prop="libo-coin"
        />

        <StepStrip
          heading={t('earnPages.rewards.steps.heading')}
          steps={[
            { prop: 'libo-coin', title: t('earnPages.rewards.steps.s1.title'), text: t('earnPages.rewards.steps.s1.text') },
            { prop: 'reward-cards-fan', title: t('earnPages.rewards.steps.s2.title'), text: t('earnPages.rewards.steps.s2.text') },
            { prop: 'cash-euro-stack', title: t('earnPages.rewards.steps.s3.title'), text: t('earnPages.rewards.steps.s3.text', { days: REWARDS_DELIVERY_DAYS }) },
          ]}
        />

        <EarnNext current="rewards">
          <PremiumStrip text={t('earnPages.rewards.premiumText')} />
          <RulesLink to="/rewards-rules" label={t('earnPages.rewards.rules')} />
        </EarnNext>
        <AppCta title={t('earnPages.common.ctaTitle')} sub={t('earnPages.common.ctaSub')} />
      </main>
      <SiteFooter />
    </>
  );
}
