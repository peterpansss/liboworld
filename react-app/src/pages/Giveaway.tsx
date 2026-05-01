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
import { SeoHead } from '../components/SeoHead';
import FunnelHeader from '../components/funnel/FunnelHeader';
import PackageCard from '../components/funnel/PackageCard';
import FunnelFAQ from '../components/funnel/FunnelFAQ';
import FunnelCheckoutModal, { type ModalSelectedTier } from '../components/funnel/FunnelCheckoutModal';
import { submitFunnelInterest, type GiveawayTierSlug } from '../lib/funnelSignups';
import { listGiveaways, type Giveaway } from '../lib/adminApi';
import './Giveaway.css';

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

const FALLBACK_PRIZE_BG = '/ReferenceImagesReal/935abbc2c7027fa606dba7152c73c59e.jpg';

export default function GiveawayPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Giveaway | null>(null);
  const [, setLoadingActive] = useState(true);
  const [modalTier, setModalTier] = useState<(PackageDef & { tier: ModalSelectedTier }) | null>(null);
  const [inclusionsOpen, setInclusionsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listGiveaways();
        if (cancelled) return;
        const a = list.find(g => g.status === 'active') ?? list.find(g => g.status === 'upcoming') ?? null;
        setActive(a);
      } catch {
        // Public visitors can't read giveaways table — fallback silently
      } finally {
        if (!cancelled) setLoadingActive(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const prizeName = active?.prize_description ?? t('giveawayFunnel.fallbackPrize');
  const prizeImage = active?.image_url ?? FALLBACK_PRIZE_BG;

  function openModal(p: PackageDef) {
    const tier: ModalSelectedTier = {
      name: t(`giveawayFunnel.packages.${p.slug}.name`),
      price: t(`giveawayFunnel.packages.${p.slug}.price`),
      heroSummary: t(`giveawayFunnel.packages.${p.slug}.heroSummary`),
      tierSlug: p.slug,
    };
    setModalTier({ ...p, tier });
  }

  return (
    <div className="funnel-page">
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
                style={{ backgroundImage: `url(${prizeImage})` }}
                role="img"
                aria-label={prizeName}
              />
            </div>
          </div>
        </section>

        {/* ── PACKAGES (immediately under hero — zero friction) ─ */}
        <section id="packages" className="funnel-section">
          <header className="funnel-section__header">
            <a href="#packages" className="funnel-hero__cta" style={{ marginBottom: 24, display: 'inline-block' }}>
              {t('giveawayFunnel.heroCta')}
            </a>
            <h2 className="funnel-section__title font-display">{t('giveawayFunnel.packagesTitle')}</h2>
            <p className="funnel-section__sub">{t('giveawayFunnel.packagesSub')}</p>
          </header>

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
                  { value: t(`giveawayFunnel.packages.${p.slug}.points`), label: 'XP' },
                  { value: t(`giveawayFunnel.packages.${p.slug}.coins`), label: 'Coins' },
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
          <header className="funnel-section__header">
            <h2 className="funnel-section__title font-display">{t('giveawayFunnel.prizeDetailTitle')}</h2>
          </header>

          <div className="funnel-prize-card">
            <div
              className="funnel-prize-card__photo"
              style={{ backgroundImage: `url(${prizeImage})` }}
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
        <div className="funnel-repeat-cta">
          <h2 className="funnel-repeat-cta__title font-display">{t('giveawayFunnel.repeatCta1Title')}</h2>
          <a href="#packages" className="funnel-hero__cta">{t('giveawayFunnel.heroCta')}</a>
        </div>

        {/* ── BIG STATS ────────────────────────────────────── */}
        <section className="funnel-stats">
          <h2 className="funnel-stats__title font-display">{t('giveawayFunnel.statsTitle')}</h2>
          <div className="funnel-stats__sub">{t('giveawayFunnel.statsSub')}</div>
          <div className="funnel-stats__grid">
            <div className="funnel-stats__cell">
              <div className="funnel-stats__num">2,400+</div>
              <div className="funnel-stats__label">{t('giveawayFunnel.statEntries')}</div>
            </div>
            <div className="funnel-stats__cell">
              <div className="funnel-stats__num">€18k</div>
              <div className="funnel-stats__label">{t('giveawayFunnel.statGivenAway')}</div>
            </div>
            <div className="funnel-stats__cell">
              <div className="funnel-stats__num">47</div>
              <div className="funnel-stats__label">{t('giveawayFunnel.statWinners')}</div>
            </div>
          </div>
        </section>

        {/* ── WINNERS (placeholder cards) ──────────────────── */}
        <section className="funnel-section">
          <header className="funnel-section__header">
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
              <a href="https://apps.apple.com" className="funnel-app__badge" aria-label="Download on the App Store">
                <svg width="18" height="22" viewBox="0 0 20 24" fill="none" aria-hidden="true">
                  <path d="M16.47 12.2c-.03-3.1 2.53-4.59 2.64-4.66-1.44-2.1-3.68-2.39-4.47-2.42-1.9-.19-3.72 1.12-4.69 1.12-.97 0-2.46-1.1-4.05-1.07-2.08.03-4 1.21-5.08 3.08-2.17 3.76-.55 9.33 1.56 12.38 1.03 1.5 2.27 3.17 3.89 3.11 1.56-.06 2.15-1.01 4.03-1.01 1.88 0 2.42 1.01 4.07.98 1.68-.03 2.74-1.52 3.76-3.03 1.19-1.74 1.68-3.42 1.71-3.51-.04-.02-3.28-1.26-3.31-4.97h-.06z" fill="currentColor"/>
                  <path d="M13.4 3.27C14.24 2.24 14.82.87 14.67-.5c-1.17.05-2.6.78-3.44 1.77-.75.87-1.42 2.27-1.24 3.61 1.31.1 2.65-.67 3.41-1.61z" fill="currentColor"/>
                </svg>
                <div><small>{t('giveawayFunnel.appStoreSmall')}</small><strong>App Store</strong></div>
              </a>
              <a href="https://play.google.com" className="funnel-app__badge" aria-label="Get it on Google Play">
                <svg width="18" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.997.997 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.18l2.602 2.601-12.16 7.022 9.558-9.623zm5.398-3.105l-3.085 1.78-2.762-2.769 2.762-2.769 3.085 1.78c1.36.785 1.36 2.193 0 2.978zM5.05 1.622l11.443 6.605-2.762 2.768L5.05 1.622z"/>
                </svg>
                <div><small>{t('giveawayFunnel.googlePlaySmall')}</small><strong>Google Play</strong></div>
              </a>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section className="funnel-section funnel-section--narrow" id="faq">
          <header className="funnel-section__header">
            <h2 className="funnel-section__title font-display">{t('giveawayFunnel.faqTitle')}</h2>
          </header>
          <FunnelFAQ
            items={[1, 2, 3, 4, 5, 6, 7].map(n => ({
              q: t(`giveawayFunnel.faq.q${n}`),
              a: t(`giveawayFunnel.faq.a${n}`),
            }))}
          />
        </section>

        {/* ── FINAL CTA ────────────────────────────────────── */}
        <div className="funnel-repeat-cta" style={{ paddingBottom: 48 }}>
          <h2 className="funnel-repeat-cta__title font-display">{t('giveawayFunnel.finalCtaTitle')}</h2>
          <a href="#packages" className="funnel-hero__cta funnel-hero__cta--xl">{t('giveawayFunnel.finalCta')}</a>
        </div>

        {/* ── DISCLAIMER ───────────────────────────────────── */}
        <div className="funnel-disclaimer">
          {t('giveawayFunnel.disclaimer')}
        </div>
      </main>

      <SiteFooter />

      {/* Shared modal — rendered once, controlled by openModal */}
      <FunnelCheckoutModal
        open={modalTier !== null}
        selected={modalTier?.tier ?? null}
        title={t('giveawayFunnel.modalTitle')}
        subtitle={t('giveawayFunnel.modalSubtitle')}
        emailLabel={t('giveawayFunnel.modalEmailLabel')}
        emailPlaceholder={t('giveawayFunnel.emailPlaceholder')}
        ctaLabel={t('giveawayFunnel.modalCta')}
        successTitle={t('giveawayFunnel.modalSuccessTitle')}
        successBody={t('giveawayFunnel.modalSuccessBody')}
        duplicateTitle={t('giveawayFunnel.modalDuplicateTitle')}
        duplicateBody={t('giveawayFunnel.modalDuplicateBody')}
        errorMsg={t('giveawayFunnel.ctaError')}
        legalNote={t('giveawayFunnel.modalLegal')}
        onSubmit={async (email) => {
          if (!modalTier) return { ok: false };
          const r = await submitFunnelInterest({
            email,
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
