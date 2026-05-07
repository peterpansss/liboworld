/**
 * /giveaway — LMCT+-style paid-package funnel.
 *
 * Hero is a full-bleed prize image with a cash-amount overlay and an
 * orange "CLICK TO WIN" CTA that scrolls straight to the 5-tier
 * package ladder (ENTRY / BRONZE / SILVER / GOLD / PLATINUM). Each
 * card has a clean SELECT button that opens a single shared modal —
 * the modal carries the chosen tier_slug and submits to funnel_signups
 * (v1) or Stripe Checkout (v2).
 *
 * Below packages: trust badges, prize detail with entries-close /
 * live-draw dates, big stats counter ("THE NUMBERS DON'T LIE"),
 * winner placeholder cards, app download row, FAQ, repeat CTAs.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SiteFooter from '../components/SiteFooter';
import SiteNav from '../components/SiteNav';
import { SeoHead } from '../components/SeoHead';
import FunnelHeader from '../components/funnel/FunnelHeader';
import PackageCard from '../components/funnel/PackageCard';
import FunnelFAQ from '../components/funnel/FunnelFAQ';
import FunnelCheckoutModal, { type ModalSelectedTier } from '../components/funnel/FunnelCheckoutModal';
import { submitFunnelInterest, type GiveawayTierSlug } from '../lib/funnelSignups';
import { createPaymentIntent } from '../lib/funnelCheckout';
import { isStripeConfigured } from '../lib/stripe';
import { supabase } from '../lib/supabase';
import { useInView, useCountUp, useRevealOnScroll } from '../utils/funnelAnimations';
import './Giveaway.css';

/**
 * Public-safe shape returned by the get_active_giveaway() RPC.
 * Mirrors the columns the function exposes (no admin-only fields).
 */
type ActiveGiveaway = {
  id: string;
  title: string;
  prize_description: string;
  description: string | null;
  image_url: string | null;
  ends_at: string;
  winner_count: number;
  type: string;
  status: string;
};

type PackageDef = {
  slug: GiveawayTierSlug;
  highlight: 'entry' | 'bronze' | 'silver' | 'gold' | 'platinum';
  badgeKey?: string;
};

const PACKAGES: PackageDef[] = [
  { slug: 'entry',  highlight: 'entry' },
  { slug: 'silver', highlight: 'silver', badgeKey: 'mostPopular' },
  { slug: 'gold',   highlight: 'gold',   badgeKey: 'bestValue' },
];

export default function GiveawayPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState<ActiveGiveaway | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [modalTier, setModalTier] = useState<(PackageDef & { tier: ModalSelectedTier }) | null>(null);
  const [inclusionsOpen, setInclusionsOpen] = useState(false);

  // Big-stats count-up on scroll
  const statsView = useInView<HTMLElement>(0.4);
  const statEntries = useCountUp(2400, statsView.inView);
  const statGivenAway = useCountUp(18, statsView.inView);
  const statWinners = useCountUp(47, statsView.inView);

  // Reveal-on-scroll for [data-reveal] section headers
  useRevealOnScroll();

  // Fetch the active giveaway via the public RPC `get_active_giveaway()`.
  // The RPC is SECURITY DEFINER — bypasses RLS and exposes only public-safe
  // columns. If the RPC doesn't exist yet (admin hasn't run the SQL), this
  // fails silently and the hero shows the gradient backdrop without an image.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_active_giveaway');
        if (cancelled || error) return;
        const row = Array.isArray(data) && data.length > 0 ? (data[0] as ActiveGiveaway) : null;
        setActive(row);
      } catch {
        // RPC missing or network failure — leave active=null, no image renders
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Preload the prize image — only render it once decoded so there's no flash
  useEffect(() => {
    setImageLoaded(false);
    const url = active?.image_url;
    if (!url) return;
    const img = new Image();
    img.src = url;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(false);
  }, [active?.image_url]);

  const prizeName = active?.prize_description ?? t('giveawayFunnel.fallbackPrize');
  const prizeImage = active?.image_url ?? null;

  // Numeric amounts for order summary (parallel to i18n price strings)
  const TIER_AMOUNTS: Record<GiveawayTierSlug, number> = {
    entry: 5, bronze: 10, silver: 25, gold: 75, platinum: 250,
  };

  function openModal(p: PackageDef) {
    const tier: ModalSelectedTier = {
      name: t(`giveawayFunnel.packages.${p.slug}.name`),
      price: t(`giveawayFunnel.packages.${p.slug}.price`),
      heroSummary: t(`giveawayFunnel.packages.${p.slug}.heroSummary`),
      tierSlug: p.slug,
      amount: TIER_AMOUNTS[p.slug],
    };
    setModalTier({ ...p, tier });
  }

  return (
    <div className="funnel-page">
      <SiteNav />
      <SeoHead
        title={t('giveawayFunnel.seoTitle')}
        description={t('giveawayFunnel.seoDescription')}
        canonical="/giveaway"
      />

      <main id="main-content">
        {/* ── HERO (text left, prize image right) ──────────── */}
        <section className="funnel-hero">
          <FunnelHeader />
          <div className="funnel-hero__layout">
            <div className="funnel-hero__text">
              <div className="funnel-hero__brand-eyebrow">{t('giveawayFunnel.eyebrow')}</div>
              <h1 className="funnel-hero__headline font-display">
                {t('giveawayFunnel.headline1')}<br />
                <span className="funnel-hero__cash">{t('giveawayFunnel.cashAmount')}</span>
              </h1>
              <p className="funnel-hero__sub">{t('giveawayFunnel.heroSub')}</p>
            </div>
            <div className="funnel-hero__prize-image">
              <div
                className="funnel-hero__prize-bg"
                style={{
                  backgroundImage: imageLoaded && prizeImage ? `url(${prizeImage})` : undefined,
                  opacity: imageLoaded ? 1 : 0,
                }}
                role="img"
                aria-label={prizeName}
              />
            </div>
          </div>
        </section>

        {/* ── PACKAGES (immediately under hero — zero friction) ─ */}
        <section id="packages" className="funnel-section">
          <header className="funnel-section__header" data-reveal>
            <a href="#packages" className="funnel-hero__cta funnel-hero__cta--xl" style={{ marginBottom: 32 }}>
              {t('giveawayFunnel.heroCta')}
              <span className="funnel-hero__cta__arrow" aria-hidden="true">→</span>
            </a>
            <h2 className="funnel-section__title font-display">{t('giveawayFunnel.packagesTitle')}</h2>
            <p className="funnel-section__sub">{t('giveawayFunnel.packagesSub')}</p>
          </header>

          <div style={{ textAlign: 'center' }} data-reveal>
            <div className="funnel-eligibility-chip">
              ✓ {t('giveawayFunnel.eligibilityLine')}
            </div>
          </div>

          <div className="funnel-packages-grid funnel-packages-grid--3">
            {PACKAGES.map((p) => (
              <PackageCard
                key={p.slug}
                name={t(`giveawayFunnel.packages.${p.slug}.name`)}
                hero={t(`giveawayFunnel.packages.${p.slug}.entries`)}
                heroLabel={t('giveawayFunnel.entriesLabel')}
                price={t(`giveawayFunnel.packages.${p.slug}.price`)}
                priceSubline={t(`giveawayFunnel.packages.${p.slug}.priceSubline`)}
                badge={p.badgeKey ? t(`giveawayFunnel.badges.${p.badgeKey}`) : undefined}
                highlight={p.highlight}
                perks={[
                  { value: t(`giveawayFunnel.packages.${p.slug}.points`), label: 'pts' },
                  { value: t(`giveawayFunnel.packages.${p.slug}.trial`), label: 'Premium' },
                ]}
                ctaLabel={t('giveawayFunnel.ctaSelect')}
                onSelect={() => openModal(p)}
              />
            ))}
          </div>

          {/* CLICK TO VIEW FULL INCLUSIONS — expandable */}
          <div className="funnel-inclusions">
            <div className="funnel-inclusions__toggle-wrap">
              <button
                type="button"
                className="funnel-inclusions__toggle"
                onClick={() => setInclusionsOpen(o => !o)}
                aria-expanded={inclusionsOpen}
                aria-controls="funnel-inclusions-panel"
              >
                {inclusionsOpen ? t('giveawayFunnel.inclusionsHide') : t('giveawayFunnel.inclusionsShow')}
                <span className={`funnel-inclusions__arrow${inclusionsOpen ? ' funnel-inclusions__arrow--open' : ''}`}>▼</span>
              </button>
            </div>
            {inclusionsOpen && (
              <div id="funnel-inclusions-panel" className="funnel-inclusions__grid">
                {PACKAGES.map((p) => {
                  const items = t(`giveawayFunnel.inclusions.${p.slug}`, { returnObjects: true }) as string[];
                  return (
                    <div key={p.slug} className={`funnel-inclusions__tile funnel-inclusions__tile--${p.highlight}`}>
                      <div className="funnel-inclusions__tile-header">
                        <span className="funnel-inclusions__tile-name">{t(`giveawayFunnel.packages.${p.slug}.name`)}</span>
                        <span className="funnel-inclusions__tile-price">{t(`giveawayFunnel.packages.${p.slug}.price`)}</span>
                      </div>
                      <ul className="funnel-inclusions__tile-list">
                        {Array.isArray(items) && items.map((line, i) => <li key={i}>{line}</li>)}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="funnel-amoe-line">
            {t('giveawayFunnel.amoeLine')}
          </p>
          <p className="funnel-amoe-line" style={{ paddingTop: 0, opacity: 0.85 }}>
            {t('giveawayFunnel.premiumDisclosure')}
          </p>
        </section>

        {/* ── TRUST BADGES ─────────────────────────────────── */}
        <div className="funnel-trust-row">
          <div className="funnel-trust-badge">
            <span className="funnel-trust-badge__icon" aria-hidden="true">✓</span>
            {t('giveawayFunnel.trust1')}
          </div>
          <div className="funnel-trust-badge">
            <span className="funnel-trust-badge__icon" aria-hidden="true">🔒</span>
            {t('giveawayFunnel.trust2')}
          </div>
          <div className="funnel-trust-badge">
            <span className="funnel-trust-badge__icon" aria-hidden="true">🏆</span>
            {t('giveawayFunnel.trust3')}
          </div>
        </div>

        {/* ── PRIZE DETAIL CARD ────────────────────────────── */}
        <section className="funnel-section funnel-section--narrow">
          <header className="funnel-section__header" data-reveal>
            <h2 className="funnel-section__title font-display">{t('giveawayFunnel.prizeDetailTitle')}</h2>
          </header>

          <div className="funnel-prize-card">
            <div
              className="funnel-prize-card__photo"
              style={{
                backgroundImage: imageLoaded && prizeImage ? `url(${prizeImage})` : undefined,
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.4s ease',
              }}
              aria-hidden="true"
            />
            <div className="funnel-prize-card__body">
              <span className="funnel-prize-card__chip">{t('giveawayFunnel.firstPrize')}</span>
              <h3 className="funnel-prize-card__title font-display">{prizeName}</h3>
              <p className="funnel-prize-card__cash-alt">{t('giveawayFunnel.orCashAlt')}</p>
            </div>
          </div>

          <div className="funnel-date-row">
            <div className="funnel-date-card">
              <span className="funnel-date-card__chip">{t('giveawayFunnel.entriesClose')}</span>
              <div className="funnel-date-card__date">
                {active?.ends_at ? new Date(active.ends_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : t('giveawayFunnel.tba')}
              </div>
              <div className="funnel-date-card__sub">
                {active?.ends_at ? new Date(active.ends_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
            </div>
            <div className="funnel-date-card">
              <span className="funnel-date-card__chip">{t('giveawayFunnel.liveDraw')}</span>
              <div className="funnel-date-card__date">
                {active?.ends_at ? new Date(active.ends_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : t('giveawayFunnel.tba')}
              </div>
              <div className="funnel-date-card__sub">
                {t('giveawayFunnel.liveDrawSub')}
              </div>
            </div>
          </div>
        </section>

        {/* ── OR-YOU-CAN-TAKE-CASH ─────────────────────────── */}
        <section className="funnel-section funnel-section--narrow">
          <div className="funnel-cash-alt">
            <span className="funnel-cash-alt__chip">{t('giveawayFunnel.orYouCanTake')}</span>
            <h2 className="funnel-cash-alt__amount font-display">{t('giveawayFunnel.cashAmount')}</h2>
            <div className="funnel-cash-alt__notification">
              <div className="funnel-cash-alt__notification-icon">€</div>
              <div className="funnel-cash-alt__notification-text">
                <strong>{t('giveawayFunnel.notificationTitle')}</strong>
                <br />
                {t('giveawayFunnel.notificationBody')}
              </div>
            </div>
          </div>
        </section>

        {/* ── REPEAT CTA ───────────────────────────────────── */}
        <div className="funnel-repeat-cta" data-reveal>
          <h2 className="funnel-repeat-cta__title font-display">{t('giveawayFunnel.repeatCta1Title')}</h2>
          <a href="#packages" className="funnel-hero__cta">
            {t('giveawayFunnel.heroCta')}
            <span className="funnel-hero__cta__arrow" aria-hidden="true">→</span>
          </a>
        </div>

        {/* ── BIG STATS ────────────────────────────────────── */}
        <section className="funnel-stats" ref={statsView.ref}>
          <h2 className="funnel-stats__title font-display" data-reveal>{t('giveawayFunnel.statsTitle')}</h2>
          <div className="funnel-stats__sub" data-reveal data-reveal-delay="0.1">{t('giveawayFunnel.statsSub')}</div>
          <div className="funnel-stats__grid">
            <div className="funnel-stats__cell">
              <div className="funnel-stats__num">{statEntries.toLocaleString()}+</div>
              <div className="funnel-stats__label">{t('giveawayFunnel.statEntries')}</div>
            </div>
            <div className="funnel-stats__cell">
              <div className="funnel-stats__num">€{statGivenAway}k</div>
              <div className="funnel-stats__label">{t('giveawayFunnel.statGivenAway')}</div>
            </div>
            <div className="funnel-stats__cell">
              <div className="funnel-stats__num">{statWinners}</div>
              <div className="funnel-stats__label">{t('giveawayFunnel.statWinners')}</div>
            </div>
          </div>
        </section>

        {/* ── WINNERS (placeholder cards) ──────────────────── */}
        <section className="funnel-section">
          <header className="funnel-section__header" data-reveal>
            <h2 className="funnel-section__title font-display">{t('giveawayFunnel.winnersTitle')}</h2>
            <p className="funnel-section__sub">{t('giveawayFunnel.winnersSub')}</p>
          </header>
          <div className="funnel-winners">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="funnel-winner-card">
                <span className="funnel-winner-card__chip">{t(`giveawayFunnel.winners.w${n}.prize`)}</span>
                <p className="funnel-winner-card__quote">"{t(`giveawayFunnel.winners.w${n}.quote`)}"</p>
                <div className="funnel-winner-card__author">— {t(`giveawayFunnel.winners.w${n}.name`)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── APP DOWNLOAD CTA ─────────────────────────────── */}
        <section className="funnel-section funnel-section--narrow funnel-section--tight">
          <div className="funnel-app">
            <h2 className="funnel-app__title">{t('giveawayFunnel.appTitle')}</h2>
            <p className="funnel-app__sub">{t('giveawayFunnel.appSub')}</p>
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
            <h2 className="funnel-section__title font-display">{t('giveawayFunnel.faqTitle')}</h2>
          </header>
          <FunnelFAQ
            items={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => ({
              q: t(`giveawayFunnel.faq.q${n}`),
              a: t(`giveawayFunnel.faq.a${n}`),
            }))}
          />
        </section>

        {/* ── FINAL CTA ────────────────────────────────────── */}
        <div className="funnel-repeat-cta" data-reveal style={{ paddingBottom: 48 }}>
          <h2 className="funnel-repeat-cta__title font-display">{t('giveawayFunnel.finalCtaTitle')}</h2>
          <a href="#packages" className="funnel-hero__cta funnel-hero__cta--xl">
            {t('giveawayFunnel.finalCta')}
            <span className="funnel-hero__cta__arrow" aria-hidden="true">→</span>
          </a>
        </div>

        {/* ── DISCLAIMER ───────────────────────────────────── */}
        <div className="funnel-disclaimer">
          {t('giveawayFunnel.disclaimer')}
        </div>
      </main>

      <SiteFooter />

      {/* Shared LMCT+-style 2-step checkout modal.
          Stripe-mode (real payment processing) activates automatically when
          VITE_STRIPE_PUBLISHABLE_KEY is set + the create_payment_intent
          Edge Function is deployed. Until then, falls back to intent-only
          capture into funnel_signups. */}
      <FunnelCheckoutModal
        open={modalTier !== null}
        selected={modalTier?.tier ?? null}
        currency="€"
        createIntent={
          isStripeConfigured() && modalTier
            ? async ({ email, fullName, phone }) => {
                const r = await createPaymentIntent({
                  funnel: 'giveaway',
                  tierSlug: modalTier.slug,
                  email,
                  fullName,
                  phone,
                  giveawayId: active?.id ?? null,
                });
                return r.ok
                  ? { ok: true, clientSecret: r.clientSecret, paymentIntentId: r.paymentIntentId }
                  : { ok: false, error: r.error };
              }
            : undefined
        }
        copy={{
          step1Label: t('giveawayFunnel.modal.step1Label'),
          step1Subtitle: t('giveawayFunnel.modal.step1Subtitle'),
          step2Label: t('giveawayFunnel.modal.step2Label'),
          step2Subtitle: t('giveawayFunnel.modal.step2Subtitle'),
          mandatoryNote: t('giveawayFunnel.modal.mandatoryNote'),
          fullNameLabel: t('giveawayFunnel.modal.fullNameLabel'),
          fullNamePlaceholder: t('giveawayFunnel.modal.fullNamePlaceholder'),
          emailLabel: t('giveawayFunnel.modal.emailLabel'),
          emailPlaceholder: t('giveawayFunnel.modal.emailPlaceholder'),
          phoneLabel: t('giveawayFunnel.modal.phoneLabel'),
          phonePlaceholder: t('giveawayFunnel.modal.phonePlaceholder'),
          cardLabel: t('giveawayFunnel.modal.cardLabel'),
          cardPlaceholder: t('giveawayFunnel.modal.cardPlaceholder'),
          continueCta: t('giveawayFunnel.modal.continueCta'),
          submitCta: t('giveawayFunnel.modal.submitCta'),
          secureCheckout: t('giveawayFunnel.modal.secureCheckout'),
          orderItem: t('giveawayFunnel.modal.orderItem'),
          orderTotal: t('giveawayFunnel.modal.orderTotal'),
          backLabel: t('giveawayFunnel.modal.backLabel'),
          successTitle: t('giveawayFunnel.modalSuccessTitle'),
          successBody: t('giveawayFunnel.modalSuccessBody'),
          duplicateTitle: t('giveawayFunnel.modalDuplicateTitle'),
          duplicateBody: t('giveawayFunnel.modalDuplicateBody'),
          errorMsg: t('giveawayFunnel.ctaError'),
          legalNote: t('giveawayFunnel.modalLegal'),
        }}
        onSubmit={async ({ fullName, email, phone }) => {
          if (!modalTier) return { ok: false };
          // v1: capture purchase intent + contact info into funnel_signups.
          // v2: replace with stripe.confirmCardPayment(client_secret, ...).
          const r = await submitFunnelInterest({
            email,
            fullName,
            phone,
            funnel: 'giveaway',
            tierSlug: modalTier.slug,
            giveawayId: active?.id ?? null,
          });
          return r.ok ? { ok: true, duplicate: r.duplicate } : { ok: false, error: r.error };
        }}
        onClose={() => setModalTier(null)}
      />
    </div>
  );
}
