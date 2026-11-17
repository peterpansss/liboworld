import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SeoHead } from '../components/SeoHead';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import {
  EarnHero, StepStrip, PremiumStrip, EarnNext, AppCta, RulesLink, PropImg,
} from '../components/earn/EarnKit';
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
          title={<>{t('earnPages.rewards.title1')} <span className="accent">{t('earnPages.rewards.title2')}</span></>}
          sub={t('earnPages.rewards.sub')}
          props={['reward-cards-fan', 'cash-euro-stack']}
        >
          <Link to="/earn" className="btn-primary" viewTransition>
            {t('earnPages.rewards.ctaEarn')} <span aria-hidden="true">→</span>
          </Link>
        </EarnHero>
        <p className="rw-challenge-link">
          <Link to="/cash-challenges" viewTransition>
            {t('earnPages.rewards.challengeLink')} <span aria-hidden="true">→</span>
          </Link>
        </p>

        {(['gift', 'cash'] as const).map((kind) => (
          <section key={kind} className="earn-section">
            <h2 className="earn-h2 font-display">{t(`earnPages.rewards.${kind}.heading`)}</h2>
            <p className="earn-lead">{t(`earnPages.rewards.${kind}.lead`)}</p>
            <ul className="rw-cards">
              {REWARDS_CATALOG.map((r) => (
                <li key={r.valueEur} className="rw-card">
                  <img
                    className="rw-card__img"
                    src={`/rewards/${kind}-${r.valueEur}.webp?v=1`}
                    alt={t(`earnPages.rewards.${kind}.alt`, { value: r.valueEur })}
                    loading="lazy"
                    decoding="async"
                    width={600}
                    height={380}
                  />
                  <div className="rw-card__row">
                    <span className="rw-card__pts font-display">
                      {formatPoints(r.points)} <span>{t('earnPages.common.points')}</span>
                    </span>
                    {r.minTier === 'premium' && (
                      <span className="rw-badge">{t('earnPages.common.premium')}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {REWARDS_ITEMS.length > 0 && (
          <section className="earn-section">
            <h2 className="earn-h2 font-display">{t('earnPages.rewards.items.heading')}</h2>
            <ul className="rw-items">
              {REWARDS_ITEMS.map((it) => (
                <li key={it.title} className="rw-item">
                  <PropImg name="iphone" className="rw-item__prop" width={160} />
                  <div className="rw-item__copy">
                    <span className="rw-item__title font-display">{it.title}</span>
                    <span className="rw-card__pts font-display">
                      {formatPoints(it.points)} <span>{t('earnPages.common.points')}</span>
                    </span>
                    <span className="rw-item__cash">
                      {t('earnPages.rewards.items.cash', { cash: itemCashEur(it.valueEur).toLocaleString('en-GB') })}
                    </span>
                  </div>
                  {it.minTier === 'premium' && <span className="rw-badge rw-item__badge">{t('earnPages.common.premium')}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <StepStrip
          heading={t('earnPages.rewards.steps.heading')}
          steps={[
            { prop: 'libo-coin', title: t('earnPages.rewards.steps.s1.title'), text: t('earnPages.rewards.steps.s1.text') },
            { prop: 'reward-cards-fan', title: t('earnPages.rewards.steps.s2.title'), text: t('earnPages.rewards.steps.s2.text') },
            { prop: 'cash-euro-stack', title: t('earnPages.rewards.steps.s3.title'), text: t('earnPages.rewards.steps.s3.text', { days: REWARDS_DELIVERY_DAYS }) },
          ]}
        />

        <PremiumStrip text={t('earnPages.rewards.premiumText')} />
        <EarnNext current="rewards" />
        <RulesLink to="/rewards-rules" label={t('earnPages.rewards.rules')} />
        <AppCta title={t('earnPages.common.ctaTitle')} sub={t('earnPages.common.ctaSub')} />
      </main>
      <SiteFooter />
    </>
  );
}
