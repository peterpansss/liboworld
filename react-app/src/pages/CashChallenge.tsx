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

const CHALLENGES: ChallengeDef[] = [
  { slug: 'starter',    highlight: 'starter' },
  { slug: 'pro_pool',   highlight: 'pro',     badgeKey: 'mostPopular' },
  { slug: 'elite_pool', highlight: 'elite',   badgeKey: 'biggestPayout' },
];

const FALLBACK_HERO_BG = '/ReferenceImagesReal/3888964e334eac66760016434935572e.jpg';

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
              <a href="https://apps.apple.com" className="funnel-app__badge" aria-label="Download on the App Store">
                <svg width="18" height="22" viewBox="0 0 20 24" fill="none" aria-hidden="true">
                  <path d="M16.47 12.2c-.03-3.1 2.53-4.59 2.64-4.66-1.44-2.1-3.68-2.39-4.47-2.42-1.9-.19-3.72 1.12-4.69 1.12-.97 0-2.46-1.1-4.05-1.07-2.08.03-4 1.21-5.08 3.08-2.17 3.76-.55 9.33 1.56 12.38 1.03 1.5 2.27 3.17 3.89 3.11 1.56-.06 2.15-1.01 4.03-1.01 1.88 0 2.42 1.01 4.07.98 1.68-.03 2.74-1.52 3.76-3.03 1.19-1.74 1.68-3.42 1.71-3.51-.04-.02-3.28-1.26-3.31-4.97h-.06z" fill="currentColor"/>
                  <path d="M13.4 3.27C14.24 2.24 14.82.87 14.67-.5c-1.17.05-2.6.78-3.44 1.77-.75.87-1.42 2.27-1.24 3.61 1.31.1 2.65-.67 3.41-1.61z" fill="currentColor"/>
                </svg>
                <div><small>{t('cashChallengeFunnel.appStoreSmall')}</small><strong>App Store</strong></div>
              </a>
              <a href="https://play.google.com" className="funnel-app__badge" aria-label="Get it on Google Play">
                <svg width="18" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.997.997 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.18l2.602 2.601-12.16 7.022 9.558-9.623zm5.398-3.105l-3.085 1.78-2.762-2.769 2.762-2.769 3.085 1.78c1.36.785 1.36 2.193 0 2.978zM5.05 1.622l11.443 6.605-2.762 2.768L5.05 1.622z"/>
                </svg>
                <div><small>{t('cashChallengeFunnel.googlePlaySmall')}</small><strong>Google Play</strong></div>
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
