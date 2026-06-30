import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import {
  VISIBLE_TIERS,
  YEARLY_PRICE,
  YEARLY_DISCOUNT,
  TRIAL_DAYS,
  buildHref,
  type BillingCycle,
} from '../data/tiers';
import './Pricing.css';

const FAQ_KEYS = ['card', 'cancel', 'free', 'switching', 'refund', 'trial'] as const;

export default function Pricing() {
  const { t } = useTranslation();
  const [cycle, setCycle] = useState<BillingCycle>('yearly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = `${t('pricing.documentTitle', { defaultValue: 'Pricing' })} | Libo`;
    return () => { document.title = 'Libo'; };
  }, [t]);

  return (
    <>
      <SiteNav />

      <main className="pricing-page">
        {/* Hero — minimal, all-caps, single CTA pill */}
        <section className="pricing-hero">
          <div className="pricing-hero__inner">
            <h1 className="pricing-hero__headline font-display">
              {t('pricing.headline', { defaultValue: 'Libo pricing plans' })}
            </h1>
            <p className="pricing-hero__sub font-display">
              {t('pricing.sub', { defaultValue: 'Train serious without spending serious.' })}
            </p>
            <p className="pricing-hero__lead">
              {t('pricing.lead', { defaultValue: 'Two plans, one library, a {{days}}-day free trial on Premium.', days: TRIAL_DAYS })}
            </p>

            {/* Billing toggle — kept compact under the hero, not the headline */}
            <div className="pricing-cycle" role="tablist" aria-label={t('pricing.cycleAria', { defaultValue: 'Billing cycle' })}>
              <button
                type="button"
                role="tab"
                aria-selected={cycle === 'monthly'}
                className={`pricing-cycle__btn ${cycle === 'monthly' ? 'active' : ''}`}
                onClick={() => setCycle('monthly')}
              >
                {t('pricing.monthly', { defaultValue: 'Monthly' })}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={cycle === 'yearly'}
                className={`pricing-cycle__btn ${cycle === 'yearly' ? 'active' : ''}`}
                onClick={() => setCycle('yearly')}
              >
                {t('pricing.yearly', { defaultValue: 'Yearly' })}
                <span className="pricing-cycle__save">
                  −{YEARLY_DISCOUNT.premium}%
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Cards — no comparison table. Each card carries its own story. */}
        <section className="pricing-cards">
          <div className="pricing-cards__inner">
            {VISIBLE_TIERS.map((tier) => {
              const priceLabel = cycle === 'yearly' ? tier.yearlyLabel : tier.monthlyLabel;
              const priceSubline = cycle === 'yearly' ? tier.yearlySubline : tier.monthlySubline;
              const variant =
                tier.id === 'free' ? 'light' : tier.id === 'premium' ? 'mid' : 'dark';
              return (
                <article
                  key={tier.id}
                  className={`pricing-card pricing-card--${variant}`}
                >
                  <div className="pricing-card__head">
                    <div className="pricing-card__name font-display">{tier.name}</div>
                    {tier.badge && <div className="pricing-card__badge">{tier.badge}</div>}
                  </div>

                  <div className="pricing-card__price-block">
                    <div className="pricing-card__price font-display">{priceLabel}</div>
                    <div className="pricing-card__price-sub">{priceSubline}</div>
                    {cycle === 'yearly' && (tier.id === 'premium' || tier.id === 'elite') && (
                      <div className="pricing-card__price-equivalent">
                        ≈ €{(YEARLY_PRICE[tier.id] / 12).toFixed(2)}/month, billed annually
                      </div>
                    )}
                  </div>

                  {tier.id === 'free' ? (
                    <p className="pricing-card__lede">
                      {t('pricing.freeLede', { defaultValue: 'No payment info, no card. Use Libo as long as you want.' })}
                    </p>
                  ) : (
                    <p className="pricing-card__lede">
                      {t('pricing.paidLede', { defaultValue: '{{days}} days free. No payment info collected until AFTER your trial ends.', days: TRIAL_DAYS })}
                    </p>
                  )}

                  <ul className="pricing-card__features">
                    {tier.features.map((f, i) => (
                      <li key={i}>
                        <span className="pricing-card__check" aria-hidden>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={buildHref(tier.href, tier.id, cycle)}
                    className="pricing-card__cta"
                  >
                    {tier.cta}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        {/* FAQ — light trust band, Ladder-style, on the otherwise dark page */}
        <section className="pricing-faq pricing-faq--light">
          <div className="pricing-faq__inner">
            <h2 className="pricing-faq__headline font-display">
              {t('pricing.faqHeadline', { defaultValue: 'Still have questions?' })}
            </h2>
            <div className="pricing-faq__list">
              {FAQ_KEYS.map((key, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={key} className={`pricing-faq__item ${isOpen ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="pricing-faq__question"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      aria-expanded={isOpen}
                    >
                      <span>{t(`pricing.faq.${key}.q`, { defaultValue: pricingFaqDefaultQ(key) })}</span>
                      <span className="pricing-faq__chev" aria-hidden>{isOpen ? '−' : '⌄'}</span>
                    </button>
                    {isOpen && (
                      <div className="pricing-faq__answer">
                        <p>{t(`pricing.faq.${key}.a`, { defaultValue: pricingFaqDefaultA(key) })}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="pricing-final-cta">
          <div className="pricing-final-cta__inner">
            <h2 className="pricing-final-cta__headline font-display">
              {t('pricing.finalCtaHeadline', { defaultValue: 'Try Libo free for {{days}} days.', days: TRIAL_DAYS })}
            </h2>
            <Link to="/onboarding?tier=premium" className="pricing-final-cta__primary">
              {t('pricing.finalCtaPrimary', { defaultValue: 'Find your plan' })}
            </Link>
          </div>
        </section>

        {/* Sticky mobile CTA */}
        <div className="pricing-sticky-cta">
          <Link to="/onboarding?tier=premium" className="pricing-sticky-cta__btn">
            {t('pricing.stickyCta', { defaultValue: 'Start {{days}}-day free trial', days: TRIAL_DAYS })}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function pricingFaqDefaultQ(key: string): string {
  const map: Record<string, string> = {
    card: 'Do I need a credit card to start a trial?',
    cancel: 'Can I cancel any time?',
    free: "What's actually included in the Free plan?",
    switching: 'Can I switch plans after I subscribe?',
    refund: 'Do you offer refunds?',
    trial: 'How does the free trial work?',
  };
  return map[key] ?? key;
}

function pricingFaqDefaultA(key: string): string {
  const map: Record<string, string> = {
    card: "No card needed for the Free plan. For Premium, we don't ask for payment info until after the 7-day trial ends — you can train the whole week and decide nothing.",
    cancel: 'Yes. Cancel any time from the app or by emailing hello@liboworld.com. Cancel during the trial and pay nothing. Cancel later and you keep access until the end of the billing period.',
    free: 'Free covers 20 curated workouts, the full 600+ exercise library, basic tracking, common product giveaways, and entry-level cash challenges (€5–15 stakes). Use it forever, no card on file.',
    switching: "Yes — upgrade or downgrade any time. Upgrades pro-rate immediately. Downgrades take effect at the next renewal so you don't lose what you paid for.",
    refund: "Within 14 days of a paid subscription starting we'll refund any unused days, no questions asked. After that we honor refunds case-by-case — just write us.",
    trial: "You get 7 days of full Libo Premium when you start the trial. No charge during the trial — and we'll email you 48 hours before the first bill so you can cancel without any drama.",
  };
  return map[key] ?? '';
}
