import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import { PRICING_FAQ } from '../data/faq';
import { useFoundingCheckout } from '../components/funnel/FoundingCheckoutProvider';
import './Pricing.css';

/** i18n copy shape for each plan (relaunchPricing.plans[]) */
interface PlanCopy {
  name: string;
  badge: string;
  price: string;
  per: string;
  strike: string;
  strikeNote: string;
  blurb: string;
  perks: string[];
  cta: string;
}

/** Non-copy, structural config per plan (design values), merged by index. */
const PLAN_CONFIG = [
  { variant: 'default', priceAccent: false, href: '/#hero-capture', cta: 'default', founding: false },
  // Founding Member card: opens the Stripe founding checkout, not a nav link.
  { variant: 'elevated', priceAccent: true, href: '/money-challenges', cta: 'accent', founding: true },
  { variant: 'default', priceAccent: false, href: '/pricing', cta: 'muted', founding: false },
] as const;

export default function Pricing() {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const plans = t('relaunchPricing.plans', { returnObjects: true }) as PlanCopy[];
  const { openFoundingCheckout } = useFoundingCheckout();

  return (
    <>
      <SeoHead
        title="Pricing | Libo — Training Club"
        description="Free forever, or €6.67/mo for everything. No card to start. 7 days of Premium on us either way."
        canonical="https://liboworld.com/pricing"
        ogImage="https://liboworld.com/brand/og-image.png"
      />
      <SiteNav />

      <main className="pr-page">
        {/* ── Hero ── */}
        <header className="pr-hero">
          <span className="pr-badge">{t('relaunchPricing.hero.badge')}</span>
          <h1 className="pr-hero__h1">
            {t('relaunchPricing.hero.h1Pre')}
            <span className="pr-accent">{t('relaunchPricing.hero.h1Accent')}</span>
            {t('relaunchPricing.hero.h1Post')}
          </h1>
          <p className="pr-hero__sub">
            {t('relaunchPricing.hero.sub')}
          </p>
        </header>

        {/* ── Plans ── */}
        <section className="pr-plans" aria-label="Plans">
          {plans.map((p, i) => {
            const cfg = PLAN_CONFIG[i] ?? PLAN_CONFIG[0];
            return (
              <article
                key={p.name}
                className={`pr-card pr-card--${cfg.variant}`}
              >
                <div className="pr-card__head">
                  <span className="pr-card__name">{p.name}</span>
                  {p.badge ? <span className="pr-card__badge">{p.badge}</span> : null}
                </div>

                <div className="pr-card__price-row">
                  <span className={`pr-card__price${cfg.priceAccent ? ' pr-accent' : ''}`}>
                    {p.price}
                  </span>
                  <span className="pr-card__per">{p.per}</span>
                </div>

                {p.strike ? (
                  <span className="pr-card__strike">
                    <span className="pr-card__strike-through">{p.strike}</span> · {p.strikeNote}
                  </span>
                ) : null}

                <p className="pr-card__blurb">{p.blurb}</p>

                <div className="pr-card__perks">
                  {p.perks.map((perk, pi) => (
                    <span key={pi} className="pr-card__perk">
                      <span className="pr-card__check" aria-hidden>✓</span> {perk}
                    </span>
                  ))}
                </div>

                {cfg.founding ? (
                  <button
                    type="button"
                    className={`pr-card__cta pr-card__cta--${cfg.cta}`}
                    onClick={() => openFoundingCheckout('pricing_card')}
                  >
                    {p.cta}
                  </button>
                ) : (
                  <Link to={cfg.href} className={`pr-card__cta pr-card__cta--${cfg.cta}`}>
                    {p.cta}
                  </Link>
                )}
              </article>
            );
          })}
        </section>

        {/* ── Guarantee strip ── */}
        <section className="pr-guarantee" aria-label="Guarantees">
          <div className="pr-guarantee__inner">
            {(t('relaunchPricing.guarantee', { returnObjects: true }) as { title: string; body: string }[]).map(
              (g, i) => (
                <div key={i} className="pr-guarantee__item">
                  <span className="pr-guarantee__title">{g.title}</span>
                  <span className="pr-guarantee__body">{g.body}</span>
                </div>
              ),
            )}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="pr-faq" aria-label="Frequently asked questions">
          <div className="pr-faq__head">
            <h2 className="pr-faq__h2">{t('relaunchPricing.faq.headline')}</h2>
            <p className="pr-faq__subhead">
              {t('relaunchPricing.faq.subhead')}
            </p>
          </div>

          <div className="pr-faq__list">
            {PRICING_FAQ.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={item.id} className="pr-faq__item">
                  <button
                    type="button"
                    className="pr-faq__q"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <span>{t(item.qKey)}</span>
                    <span className="pr-faq__icon" aria-hidden>{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen ? <p className="pr-faq__a">{t(item.aKey)}</p> : null}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
