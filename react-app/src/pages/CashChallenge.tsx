/**
 * /cash-challenge — prize-led app-download funnel.
 *
 * NOT a checkout funnel — cash challenges have no per-cycle entry fee.
 * Entry = subscription tier + slot availability + 30 days of reps.
 *
 * On click, the RESERVE MY SLOT button:
 *   - Logs an anonymous click into funnel_signups (tier + UTM + UA)
 *   - Fires a Google Analytics event for conversion tracking
 *   - On mobile: UA-routes directly to App Store (iOS) or Play Store (Android)
 *   - On desktop: opens a QR-code overlay so the visitor can scan with
 *     their phone — see StoreRedirectOverlay component.
 *
 * The actual slot reservation happens *inside the Libo mobile app* (existing
 * enroll_in_cycle RPC). The web page is purely an acquisition surface.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SiteFooter from '../components/SiteFooter';
import SiteNav from '../components/SiteNav';
import { SeoHead } from '../components/SeoHead';
import FunnelHeader from '../components/funnel/FunnelHeader';
import PackageCard from '../components/funnel/PackageCard';
import FunnelFAQ from '../components/funnel/FunnelFAQ';
import StoreRedirectOverlay from '../components/funnel/StoreRedirectOverlay';
import { logFunnelClick, type ChallengeTierSlug } from '../lib/funnelSignups';
import { detectPlatform, redirectToStore } from '../utils/storeRedirect';
import { useInView, useCountUp, useRevealOnScroll } from '../utils/funnelAnimations';
import './Giveaway.css';

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

type ChallengeDef = {
  slug: ChallengeTierSlug;
  highlight: 'starter' | 'pro' | 'elite';
  badgeKey?: string;
};

// Elite is deferred at launch (mirrors VISIBLE_TIER_IDS in data/tiers.ts), so
// the public funnel shows the Free + Pro pools only. The €50/100 pool lives on
// in-app as a second Pro challenge; the Elite-branded marketing pool returns
// when the Elite tier relaunches — restore the entry below to bring it back.
const CHALLENGES: ChallengeDef[] = [
  { slug: 'starter',    highlight: 'starter' },
  { slug: 'pro_pool',   highlight: 'pro',     badgeKey: 'mostPopular' },
];

const FALLBACK_HERO_BG = '/images/marketing/cash-challenge-flagship-ai.jpg';

export default function CashChallengePage() {
  const { t } = useTranslation();
  const [overlayTier, setOverlayTier] = useState<string | null>(null);

  // Big-stats count-up on scroll
  const statsView = useInView<HTMLElement>(0.4);
  const statCompleters = useCountUp(312, statsView.inView);
  const statPaidOut = useCountUp(4680, statsView.inView);
  const statSlots = useCountUp(50, statsView.inView);

  // Reveal-on-scroll for [data-reveal]
  useRevealOnScroll();

  function handleReserveClick(c: ChallengeDef) {
    // 1. Anonymous click log (fire-and-forget, doesn't block redirect)
    void logFunnelClick({ funnel: 'cash_challenge', tierSlug: c.slug });

    // 2. Google Analytics event (gtag is loaded site-wide via index.html)
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'cash_challenge_app_redirect', {
        tier: c.slug,
        tier_name: t(`cashChallengeFunnel.tiers.${c.slug}.name`),
      });
    }

    // 3. Route by platform
    const platform = detectPlatform();
    if (platform === 'desktop') {
      setOverlayTier(c.slug);
    } else {
      redirectToStore(platform);
    }
  }

  return (
    <div className="funnel-page">
      <SiteNav />
      <SeoHead
        title={t('cashChallengeFunnel.seoTitle')}
        description={t('cashChallengeFunnel.seoDescription')}
        canonical="/cash-challenge"
      />

      <main id="main-content">
        {/* ── HERO (text left, training imagery right) ─────── */}
        <section className="funnel-hero">
          <FunnelHeader />
          <div className="funnel-hero__layout">
            <div className="funnel-hero__text">
              <div className="funnel-hero__brand-eyebrow">{t('cashChallengeFunnel.eyebrow')}</div>
              <h1 className="funnel-hero__headline font-display">
                {t('cashChallengeFunnel.headline1')}<br />
                <span className="funnel-hero__cash">{t('cashChallengeFunnel.headline2')}</span>
              </h1>
              <p className="funnel-hero__sub">{t('cashChallengeFunnel.heroSub')}</p>
            </div>
            <div className="funnel-hero__prize-image">
              <div
                className="funnel-hero__prize-bg"
                style={{ backgroundImage: `url(${FALLBACK_HERO_BG})` }}
                role="img"
                aria-label="Training imagery"
              />
            </div>
          </div>
        </section>

        {/* ── CHALLENGES (immediately under hero) ─────────── */}
        <section id="challenges" className="funnel-section">
          <header className="funnel-section__header" data-reveal>
            <a href="#challenges" className="funnel-hero__cta funnel-hero__cta--xl" style={{ marginBottom: 32 }}>
              {t('cashChallengeFunnel.heroCta')}
              <span className="funnel-hero__cta__arrow" aria-hidden="true">→</span>
            </a>
            <h2 className="funnel-section__title font-display">{t('cashChallengeFunnel.tiersTitle')}</h2>
            <p className="funnel-section__sub">{t('cashChallengeFunnel.tiersSub')}</p>
          </header>

          <div className="funnel-packages-grid funnel-packages-grid--3">
            {CHALLENGES.map((c) => (
              <PackageCard
                key={c.slug}
                name={t(`cashChallengeFunnel.tiers.${c.slug}.name`)}
                hero={t(`cashChallengeFunnel.tiers.${c.slug}.reward`)}
                heroLabel={t('cashChallengeFunnel.tiers.rewardHeroLabel')}
                price={t(`cashChallengeFunnel.tiers.${c.slug}.reps`) + ' / day'}
                priceSubline={t(`cashChallengeFunnel.tiers.${c.slug}.gating`)}
                badge={c.badgeKey ? t(`cashChallengeFunnel.badges.${c.badgeKey}`) : undefined}
                highlight={c.highlight}
                perks={[
                  { value: t(`cashChallengeFunnel.tiers.${c.slug}.days`), label: 'Days' },
                  { value: t(`cashChallengeFunnel.tiers.${c.slug}.freeze`), label: 'Freeze tokens' },
                ]}
                ctaLabel={t('cashChallengeFunnel.ctaReserve')}
                onSelect={() => handleReserveClick(c)}
              />
            ))}
          </div>

          <p className="funnel-amoe-line">
            {t('cashChallengeFunnel.scarcityLine')}
          </p>
        </section>

        {/* ── TRUST BADGES ─────────────────────────────────── */}
        <div className="funnel-trust-row">
          <div className="funnel-trust-badge">
            <span className="funnel-trust-badge__icon" aria-hidden="true">✓</span>
            {t('cashChallengeFunnel.trust1')}
          </div>
          <div className="funnel-trust-badge">
            <span className="funnel-trust-badge__icon" aria-hidden="true">€</span>
            {t('cashChallengeFunnel.trust2')}
          </div>
          <div className="funnel-trust-badge">
            <span className="funnel-trust-badge__icon" aria-hidden="true">🏆</span>
            {t('cashChallengeFunnel.trust3')}
          </div>
        </div>

        {/* ── HOW IT WORKS ────────────────────────────────── */}
        <section className="funnel-section funnel-section--narrow">
          <header className="funnel-section__header" data-reveal>
            <h2 className="funnel-section__title font-display">{t('cashChallengeFunnel.howItWorksTitle')}</h2>
            <p className="funnel-section__sub">{t('cashChallengeFunnel.howItWorksSub')}</p>
          </header>
          <div className="funnel-steps">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="funnel-step">
                <div className="funnel-step__num font-display">0{n}</div>
                <div className="funnel-step__title">{t(`cashChallengeFunnel.step${n}Title`)}</div>
                <p className="funnel-step__body">{t(`cashChallengeFunnel.step${n}Body`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── REPEAT CTA ───────────────────────────────────── */}
        <div className="funnel-repeat-cta" data-reveal>
          <h2 className="funnel-repeat-cta__title font-display">{t('cashChallengeFunnel.repeatCtaTitle')}</h2>
          <a href="#challenges" className="funnel-hero__cta">
            {t('cashChallengeFunnel.heroCta')}
            <span className="funnel-hero__cta__arrow" aria-hidden="true">→</span>
          </a>
        </div>

        {/* ── BIG STATS ────────────────────────────────────── */}
        <section className="funnel-stats" ref={statsView.ref}>
          <h2 className="funnel-stats__title font-display" data-reveal>{t('cashChallengeFunnel.statsTitle')}</h2>
          <div className="funnel-stats__sub" data-reveal data-reveal-delay="0.1">{t('cashChallengeFunnel.statsSub')}</div>
          <div className="funnel-stats__grid">
            <div className="funnel-stats__cell">
              <div className="funnel-stats__num">{statCompleters}</div>
              <div className="funnel-stats__label">{t('cashChallengeFunnel.statCompleters')}</div>
            </div>
            <div className="funnel-stats__cell">
              <div className="funnel-stats__num">€{statPaidOut.toLocaleString()}</div>
              <div className="funnel-stats__label">{t('cashChallengeFunnel.statPaidOut')}</div>
            </div>
            <div className="funnel-stats__cell">
              <div className="funnel-stats__num">{statSlots}</div>
              <div className="funnel-stats__label">{t('cashChallengeFunnel.statSlotsPerCycle')}</div>
            </div>
          </div>
        </section>

        {/* ── APP DOWNLOAD CTA ─────────────────────────────── */}
        <section className="funnel-section funnel-section--narrow funnel-section--tight">
          <div className="funnel-app">
            <h2 className="funnel-app__title">{t('cashChallengeFunnel.appTitle')}</h2>
            <p className="funnel-app__sub">{t('cashChallengeFunnel.appSub')}</p>
            <div className="funnel-app__badges">
              <a href="https://apps.apple.com" className="funnel-app__badge funnel-app__badge--img" aria-label="Download on the App Store">
                <img src="/store-badges/app-store.svg" alt="Download on the App Store" />
              </a>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section className="funnel-section funnel-section--narrow" id="faq">
          <header className="funnel-section__header" data-reveal>
            <h2 className="funnel-section__title font-display">{t('cashChallengeFunnel.faqTitle')}</h2>
          </header>
          <FunnelFAQ
            items={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
              q: t(`cashChallengeFunnel.faq.q${n}`),
              a: t(`cashChallengeFunnel.faq.a${n}`),
            }))}
          />
        </section>

        {/* ── FINAL CTA ────────────────────────────────────── */}
        <div className="funnel-repeat-cta" data-reveal style={{ paddingBottom: 48 }}>
          <h2 className="funnel-repeat-cta__title font-display">{t('cashChallengeFunnel.finalCtaTitle')}</h2>
          <a href="#challenges" className="funnel-hero__cta funnel-hero__cta--xl">
            {t('cashChallengeFunnel.finalCta')}
            <span className="funnel-hero__cta__arrow" aria-hidden="true">→</span>
          </a>
        </div>

        {/* ── DISCLAIMER ───────────────────────────────────── */}
        <div className="funnel-disclaimer">
          {t('cashChallengeFunnel.disclaimer')}
        </div>
      </main>

      <SiteFooter />

      {/* Desktop fallback when RESERVE is clicked — mobile visitors UA-route
          straight to the right store and never see this overlay. */}
      <StoreRedirectOverlay
        open={overlayTier !== null}
        tierSlug={overlayTier}
        copy={{
          title: t('cashChallengeFunnel.storeOverlay.title'),
          subtitle: t('cashChallengeFunnel.storeOverlay.subtitle'),
          qrAlt: t('cashChallengeFunnel.storeOverlay.qrAlt'),
          appStoreSmall: t('cashChallengeFunnel.storeOverlay.appStoreSmall'),
          googlePlaySmall: t('cashChallengeFunnel.storeOverlay.googlePlaySmall'),
          closeLabel: t('cashChallengeFunnel.storeOverlay.closeLabel'),
        }}
        onClose={() => setOverlayTier(null)}
      />
    </div>
  );
}
