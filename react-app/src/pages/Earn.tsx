import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SeoHead } from '../components/SeoHead';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import {
  EarnHero, StepStrip, PremiumStrip, EarnNext, PhoneShot, AppCta, RulesLink, PropImg,
} from '../components/earn/EarnKit';
import { POINTS_ACTIONS, STREAK_MILESTONES, POINTS_MULTIPLIER } from '../data/pointsTable';
import { POINTS_EXPIRY_DAYS, formatPoints } from '../data/rewardsCatalog';
import './Earn.css';

/**
 * /earn — how Libo points work, visually and with very little text
 * (Noah, 18 Nov 2026). Train → earn → spend, the points table with a
 * Free/Premium toggle, then links to what points are for.
 * Numbers: data/pointsTable.ts (canon §6) and data/rewardsCatalog.ts.
 */
export default function Earn() {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<'free' | 'premium'>('free');
  const mult = POINTS_MULTIPLIER[plan];

  return (
    <>
      <SeoHead
        title={t('earnPages.earn.seo.title')}
        description={t('earnPages.earn.seo.description')}
        canonical="/earn"
      />
      <SiteNav />
      <main id="main-content" className="earn-page">
        <EarnHero
          eyebrow={t('earnPages.earn.eyebrow')}
          title={<>{t('earnPages.earn.title1')} <span className="accent">{t('earnPages.earn.title2')}</span></>}
          sub={t('earnPages.earn.sub')}
          props={['libo-coin', 'coin-stack']}
        >
          <Link to="/rewards" className="btn-primary" viewTransition>
            {t('earnPages.earn.ctaRewards')} <span aria-hidden="true">→</span>
          </Link>
        </EarnHero>

        <StepStrip
          heading={t('earnPages.earn.steps.heading')}
          steps={[
            { prop: 'kettlebell-lime', title: t('earnPages.earn.steps.s1.title'), text: t('earnPages.earn.steps.s1.text') },
            { prop: 'libo-coin', title: t('earnPages.earn.steps.s2.title'), text: t('earnPages.earn.steps.s2.text') },
            { prop: 'reward-cards-fan', title: t('earnPages.earn.steps.s3.title'), text: t('earnPages.earn.steps.s3.text') },
          ]}
        />

        <section className="earn-section">
          <h2 className="earn-h2 font-display">{t('earnPages.earn.table.heading')}</h2>
          <div className="earn-center">
            <div className="earn-toggle" role="group" aria-label={t('earnPages.earn.table.toggleLabel')}>
              <button type="button" aria-pressed={plan === 'free'} onClick={() => setPlan('free')}>
                {t('earnPages.common.free')}
              </button>
              <button type="button" aria-pressed={plan === 'premium'} onClick={() => setPlan('premium')}>
                {t('earnPages.common.premium')} · 2×
              </button>
            </div>
          </div>

          <div className="ep-table-wrap">
            <div className="ep-table">
              <ul className="ep-rows" aria-live="polite">
                {POINTS_ACTIONS.map((a) => (
                  <li key={a.id} className="ep-row">
                    <PropImg name={a.prop} className="ep-row__prop" width={64} />
                    <span className="ep-row__label">{t(`earnPages.earn.actions.${a.id}`)}</span>
                    <span className="ep-row__pts font-display">+{formatPoints(a.base * mult)}</span>
                  </li>
                ))}
              </ul>

              <div className="ep-streak">
                <div className="ep-streak__head">
                  <PropImg name="streak-freeze" className="ep-row__prop" width={64} />
                  <span className="ep-row__label">{t('earnPages.earn.actions.streak')}</span>
                </div>
                <ol className="ep-streak__chips">
                  {STREAK_MILESTONES.map((m) => (
                    <li key={m.days} className="ep-chip">
                      <span className="ep-chip__days">{t('earnPages.earn.streakDays', { count: m.days })}</span>
                      <span className="ep-chip__pts font-display">+{formatPoints(m.base * mult)}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="ep-expiry">
                <PropImg name="padlock-lime" className="ep-expiry__prop" width={48} />
                <span>{t('earnPages.earn.expiry', { days: POINTS_EXPIRY_DAYS[plan] })}</span>
              </p>
              <p className="earn-fine">{t('earnPages.earn.table.fine')}</p>
            </div>
            <PhoneShot src="points" alt={t('earnPages.earn.table.screenAlt')} className="ep-table__phone" />
          </div>
          <PremiumStrip />
        </section>

        <EarnNext current="earn" />
        <RulesLink to="/rewards-rules" label={t('earnPages.earn.rules')} />
        <AppCta title={t('earnPages.common.ctaTitle')} sub={t('earnPages.common.ctaSub')} />
      </main>
      <SiteFooter />
    </>
  );
}
