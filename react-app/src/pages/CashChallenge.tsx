/**
 * /cash-challenge — prize-led app-download funnel.
 *
 * NOT a checkout funnel — cash challenges have no per-cycle entry fee.
 * Entry = subscription tier + slot availability + 30 days of reps.
 * This page surfaces the existing in-app challenge tiers (STARTER /
 * PRO POOL / ELITE POOL) as marketing creative to drive App Store
 * installs. CTAs capture email + tier interest, then route to the
 * mobile app via App Store/Play Store badges.
 */
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import CountdownBanner from '../components/funnel/CountdownBanner';
import PackageCard from '../components/funnel/PackageCard';
import FunnelFAQ from '../components/funnel/FunnelFAQ';
import SocialProofCounter from '../components/funnel/SocialProofCounter';
import { submitFunnelInterest, type ChallengeTierSlug } from '../lib/funnelSignups';
import { colors } from '../theme';
import './Giveaway.css';

type ChallengeDef = {
  slug: ChallengeTierSlug;
  highlight: 'starter' | 'pro' | 'elite';
  badgeKey?: string;
};

const CHALLENGES: ChallengeDef[] = [
  { slug: 'starter',    highlight: 'starter' },
  { slug: 'pro_pool',   highlight: 'pro',     badgeKey: 'mostPopular' },
  { slug: 'elite_pool', highlight: 'elite',   badgeKey: 'biggestPayout' },
];

// Default countdown — next cycle opens 14 days from now (placeholder
// until challenge_cycles is queried directly from a public RPC).
function defaultCycleStart(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString();
}

export default function CashChallengePage() {
  const { t } = useTranslation();
  const cycleStart = defaultCycleStart();

  return (
    <div className="funnel-page">
      <SeoHead
        title={t('cashChallengeFunnel.seoTitle')}
        description={t('cashChallengeFunnel.seoDescription')}
        canonical="/cash-challenge"
      />

      <CountdownBanner
        endsAt={cycleStart}
        label={t('cashChallengeFunnel.countdownLabel')}
      />

      <SiteNav />

      <main id="main-content">
        {/* Hero */}
        <section className="funnel-hero">
          <div className="funnel-hero__eyebrow">{t('cashChallengeFunnel.eyebrow')}</div>
          <h1 className="funnel-hero__headline font-display">
            {t('cashChallengeFunnel.headline1')}<br />
            <span className="funnel-hero__headline-accent">{t('cashChallengeFunnel.headline2')}</span>
          </h1>
          <p className="funnel-hero__sub">{t('cashChallengeFunnel.sub')}</p>

          <div>
            <a href="#challenges" className="funnel-hero__cta">
              {t('cashChallengeFunnel.heroCta')}
            </a>
          </div>
        </section>

        {/* Social proof counters */}
        <SocialProofCounter
          counters={[
            { value: 312,  label: t('cashChallengeFunnel.statCompleters') },
            { value: 4680, prefix: '€', label: t('cashChallengeFunnel.statPaidOut') },
            { value: 50,   label: t('cashChallengeFunnel.statSlotsPerCycle') },
          ]}
        />

        {/* How it works */}
        <section className="funnel-section funnel-section--narrow">
          <header className="funnel-section__header">
            <div className="funnel-section__eyebrow">{t('cashChallengeFunnel.howItWorksEyebrow')}</div>
            <h2 className="funnel-section__title font-display">{t('cashChallengeFunnel.howItWorksTitle')}</h2>
            <p className="funnel-section__sub">{t('cashChallengeFunnel.howItWorksSub')}</p>
          </header>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginTop: 24,
            }}
          >
            {[1, 2, 3, 4].map(n => (
              <div
                key={n}
                style={{
                  padding: 20,
                  background: colors.bg2,
                  border: '1px solid ' + colors.border,
                  borderRadius: 12,
                }}
              >
                <div
                  className="font-display"
                  style={{ fontSize: 32, color: colors.accent, lineHeight: 1, marginBottom: 12 }}
                >
                  {n.toString().padStart(2, '0')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: colors.text }}>
                  {t(`cashChallengeFunnel.step${n}Title`)}
                </div>
                <p style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5, margin: 0 }}>
                  {t(`cashChallengeFunnel.step${n}Body`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Challenge tiers */}
        <section id="challenges" className="funnel-section">
          <header className="funnel-section__header">
            <div className="funnel-section__eyebrow">{t('cashChallengeFunnel.tiersEyebrow')}</div>
            <h2 className="funnel-section__title font-display">{t('cashChallengeFunnel.tiersTitle')}</h2>
            <p className="funnel-section__sub">{t('cashChallengeFunnel.tiersSub')}</p>
          </header>

          <div className="funnel-packages-grid">
            {CHALLENGES.map(({ slug, highlight, badgeKey }) => (
              <PackageCard
                key={slug}
                name={t(`cashChallengeFunnel.tiers.${slug}.name`)}
                price={t(`cashChallengeFunnel.tiers.${slug}.reward`)}
                priceSubline={t(`cashChallengeFunnel.tiers.${slug}.rewardSubline`)}
                badge={badgeKey ? t(`cashChallengeFunnel.badges.${badgeKey}`) : undefined}
                highlight={highlight}
                inclusions={[
                  { value: t(`cashChallengeFunnel.tiers.${slug}.reps`),    label: t('cashChallengeFunnel.repsLabel') },
                  { value: t(`cashChallengeFunnel.tiers.${slug}.days`),    label: t('cashChallengeFunnel.daysLabel') },
                  { value: t(`cashChallengeFunnel.tiers.${slug}.freeze`),  label: t('cashChallengeFunnel.freezeLabel') },
                  { value: t(`cashChallengeFunnel.tiers.${slug}.gating`),  label: t('cashChallengeFunnel.gatingLabel') },
                ]}
                ctaLabel={t('cashChallengeFunnel.ctaReserve')}
                emailPlaceholder={t('cashChallengeFunnel.emailPlaceholder')}
                successMsg={t('cashChallengeFunnel.ctaSuccess')}
                duplicateMsg={t('cashChallengeFunnel.ctaDuplicate')}
                errorMsg={t('cashChallengeFunnel.ctaError')}
                footnote={t(`cashChallengeFunnel.tiers.${slug}.footnote`)}
                onSubmit={async (email) => {
                  const r = await submitFunnelInterest({
                    email,
                    funnel: 'cash_challenge',
                    tierSlug: slug,
                  });
                  return r.ok ? { ok: true, duplicate: r.duplicate } : { ok: false, error: r.error };
                }}
              />
            ))}
          </div>

          {/* Scarcity / cohort note */}
          <div className="funnel-amoe">
            <div className="funnel-amoe__title">{t('cashChallengeFunnel.scarcityTitle')}</div>
            <div className="funnel-amoe__body">{t('cashChallengeFunnel.scarcityBody')}</div>
          </div>
        </section>

        {/* FAQ */}
        <section className="funnel-section funnel-section--narrow" id="faq">
          <header className="funnel-section__header">
            <div className="funnel-section__eyebrow">{t('cashChallengeFunnel.faqEyebrow')}</div>
            <h2 className="funnel-section__title font-display">{t('cashChallengeFunnel.faqTitle')}</h2>
          </header>
          <FunnelFAQ
            items={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
              q: t(`cashChallengeFunnel.faq.q${n}`),
              a: t(`cashChallengeFunnel.faq.a${n}`),
            }))}
          />
        </section>

        {/* Repeat CTA */}
        <section className="funnel-section funnel-section--narrow" style={{ textAlign: 'center', paddingTop: 0 }}>
          <h2 className="funnel-section__title font-display" style={{ marginBottom: 24 }}>
            {t('cashChallengeFunnel.repeatCtaTitle')}
          </h2>
          <a href="#challenges" className="funnel-hero__cta">
            {t('cashChallengeFunnel.repeatCta')}
          </a>
        </section>

        {/* Disclaimer */}
        <div className="funnel-disclaimer" style={{ borderTop: '1px solid ' + colors.border }}>
          {t('cashChallengeFunnel.disclaimer')}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
