/**
 * /giveaway — LMCT+-style paid-package funnel.
 *
 * Sells BRONZE / SILVER / GOLD entry packages into the active common
 * giveaway. v1 captures email + tier_slug into `funnel_signups`. v2
 * will swap the SELECT button for Stripe Checkout.
 *
 * Uses SiteNav + SiteFooter for chrome (consistent with other pages
 * besides Landing).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import CountdownBanner from '../components/funnel/CountdownBanner';
import PackageCard from '../components/funnel/PackageCard';
import FunnelFAQ from '../components/funnel/FunnelFAQ';
import SocialProofCounter from '../components/funnel/SocialProofCounter';
import { submitFunnelInterest, type GiveawayTierSlug } from '../lib/funnelSignups';
import { listGiveaways, type Giveaway } from '../lib/adminApi';
import { colors } from '../theme';
import './Giveaway.css';

type PackageDef = {
  slug: GiveawayTierSlug;
  highlight: 'bronze' | 'silver' | 'gold';
  badgeKey?: string;
};

const PACKAGES: PackageDef[] = [
  { slug: 'bronze',  highlight: 'bronze' },
  { slug: 'silver',  highlight: 'silver', badgeKey: 'mostPopular' },
  { slug: 'gold',    highlight: 'gold',   badgeKey: 'bestValue' },
];

// Default countdown when no active giveaway is loaded — 7 days from now
function defaultCountdownTarget(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

export default function GiveawayPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Giveaway | null>(null);
  const [loadingActive, setLoadingActive] = useState(true);

  // Try to fetch the active giveaway from the existing admin endpoint.
  // It's RLS-restricted to admins, so this will silently fail for public
  // visitors — that's fine, we just fall back to placeholder copy.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listGiveaways();
        if (cancelled) return;
        const a = list.find(g => g.status === 'active') ?? list.find(g => g.status === 'upcoming') ?? null;
        setActive(a);
      } catch {
        // Public visitors can't read giveaways table — fall back silently
      } finally {
        if (!cancelled) setLoadingActive(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const endsAt = active?.ends_at ?? defaultCountdownTarget();
  const prizeName = active?.prize_description ?? t('giveawayFunnel.fallbackPrize');
  const prizeImage = active?.image_url ?? null;

  return (
    <div className="funnel-page">
      <SeoHead
        title={t('giveawayFunnel.seoTitle')}
        description={t('giveawayFunnel.seoDescription')}
        canonical="/giveaway"
      />

      <CountdownBanner
        endsAt={endsAt}
        label={t('giveawayFunnel.countdownLabel')}
      />

      <SiteNav />

      <main id="main-content">
        {/* Hero */}
        <section className="funnel-hero">
          <div className="funnel-hero__eyebrow">{t('giveawayFunnel.eyebrow')}</div>
          <h1 className="funnel-hero__headline font-display">
            {t('giveawayFunnel.headline1')}<br />
            <span className="funnel-hero__headline-accent">{t('giveawayFunnel.headline2')}</span>
          </h1>
          <p className="funnel-hero__sub">{t('giveawayFunnel.sub')}</p>

          <div className="funnel-hero__prize" aria-hidden={!prizeName}>
            {prizeImage && (
              <div
                className="funnel-hero__prize-img"
                style={{ backgroundImage: `url(${prizeImage})` }}
                aria-hidden="true"
              />
            )}
            <div className="funnel-hero__prize-text">
              <div className="funnel-hero__prize-label">{t('giveawayFunnel.currentPrize')}</div>
              <div className="funnel-hero__prize-name">{loadingActive ? '…' : prizeName}</div>
            </div>
          </div>

          <div>
            <a href="#packages" className="funnel-hero__cta">
              {t('giveawayFunnel.heroCta')}
            </a>
          </div>
        </section>

        {/* Social proof counters */}
        <SocialProofCounter
          counters={[
            { value: 2400, suffix: '+', label: t('giveawayFunnel.statEntries') },
            { value: 18,   prefix: '€', suffix: 'k', label: t('giveawayFunnel.statGivenAway') },
            { value: 47,   label: t('giveawayFunnel.statWinners') },
          ]}
        />

        {/* Packages */}
        <section id="packages" className="funnel-section">
          <header className="funnel-section__header">
            <div className="funnel-section__eyebrow">{t('giveawayFunnel.packagesEyebrow')}</div>
            <h2 className="funnel-section__title font-display">{t('giveawayFunnel.packagesTitle')}</h2>
            <p className="funnel-section__sub">{t('giveawayFunnel.packagesSub')}</p>
          </header>

          <div className="funnel-packages-grid">
            {PACKAGES.map(({ slug, highlight, badgeKey }) => (
              <PackageCard
                key={slug}
                name={t(`giveawayFunnel.packages.${slug}.name`)}
                price={t(`giveawayFunnel.packages.${slug}.price`)}
                priceSubline={t(`giveawayFunnel.packages.${slug}.priceSubline`)}
                badge={badgeKey ? t(`giveawayFunnel.badges.${badgeKey}`) : undefined}
                highlight={highlight}
                inclusions={[
                  { value: t(`giveawayFunnel.packages.${slug}.entries`), label: t('giveawayFunnel.entriesLabel') },
                  { value: t(`giveawayFunnel.packages.${slug}.points`),  label: t('giveawayFunnel.pointsLabel') },
                  { value: t(`giveawayFunnel.packages.${slug}.bonus`),   label: t('giveawayFunnel.bonusLabel') },
                ]}
                ctaLabel={t('giveawayFunnel.ctaSelect')}
                emailPlaceholder={t('giveawayFunnel.emailPlaceholder')}
                successMsg={t('giveawayFunnel.ctaSuccess')}
                duplicateMsg={t('giveawayFunnel.ctaDuplicate')}
                errorMsg={t('giveawayFunnel.ctaError')}
                footnote={t('giveawayFunnel.tierGatingNote')}
                onSubmit={async (email) => {
                  const r = await submitFunnelInterest({
                    email,
                    funnel: 'giveaway',
                    tierSlug: slug,
                    giveawayId: active?.id ?? null,
                  });
                  return r.ok ? { ok: true, duplicate: r.duplicate } : { ok: false, error: r.error };
                }}
              />
            ))}
          </div>

          {/* AMOE — free entry path */}
          <div className="funnel-amoe">
            <div className="funnel-amoe__title">{t('giveawayFunnel.amoeTitle')}</div>
            <div className="funnel-amoe__body">{t('giveawayFunnel.amoeBody')}</div>
          </div>
        </section>

        {/* Prize detail */}
        {(active || !loadingActive) && (
          <section className="funnel-section funnel-section--narrow">
            <div className="funnel-prize-detail">
              <div
                className="funnel-prize-detail__img"
                style={prizeImage ? { backgroundImage: `url(${prizeImage})` } : undefined}
                aria-hidden="true"
              />
              <div>
                <h3 className="funnel-prize-detail__title font-display">
                  {prizeName}
                </h3>
                <p className="funnel-prize-detail__sub">
                  {active?.description ?? t('giveawayFunnel.fallbackPrizeDescription')}
                </p>
                <div className="funnel-prize-detail__meta">
                  <span className="funnel-prize-detail__meta-item">
                    {t('giveawayFunnel.metaDrawDate', { date: active?.ends_at ? new Date(active.ends_at).toLocaleDateString() : t('giveawayFunnel.tba') })}
                  </span>
                  <span className="funnel-prize-detail__meta-item">
                    {t('giveawayFunnel.metaWinners', { count: active?.winner_count ?? 1 })}
                  </span>
                  <span className="funnel-prize-detail__meta-item">
                    {t('giveawayFunnel.metaTaxFree')}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="funnel-section funnel-section--narrow" id="faq">
          <header className="funnel-section__header">
            <div className="funnel-section__eyebrow">{t('giveawayFunnel.faqEyebrow')}</div>
            <h2 className="funnel-section__title font-display">{t('giveawayFunnel.faqTitle')}</h2>
          </header>
          <FunnelFAQ
            items={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
              q: t(`giveawayFunnel.faq.q${n}`),
              a: t(`giveawayFunnel.faq.a${n}`),
            }))}
          />
        </section>

        {/* Repeat CTA */}
        <section className="funnel-section funnel-section--narrow" style={{ textAlign: 'center', paddingTop: 0 }}>
          <h2 className="funnel-section__title font-display" style={{ marginBottom: 24 }}>
            {t('giveawayFunnel.repeatCtaTitle')}
          </h2>
          <a href="#packages" className="funnel-hero__cta">
            {t('giveawayFunnel.repeatCta')}
          </a>
        </section>

        {/* Disclaimer */}
        <div className="funnel-disclaimer" style={{ borderTop: '1px solid ' + colors.border }}>
          {t('giveawayFunnel.disclaimer')}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
