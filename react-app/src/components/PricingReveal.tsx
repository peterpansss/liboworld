import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './PricingReveal.css';

// Homepage teaser that floats 2 of the 3 /pricing tiers as physical
// "membership cards". CTA routes to the full /pricing page — this is a
// surface, not a checkout. Keys live under pricing.reveal.* so they don't
// collide with the /pricing page's own t('pricing.*') keys.

export default function PricingReveal() {
  const { t } = useTranslation();

  const premiumFeatures = t('pricing.reveal.features.premium', {
    returnObjects: true,
    defaultValue: [] as string[],
  }) as string[];
  const eliteFeatures = t('pricing.reveal.features.elite', {
    returnObjects: true,
    defaultValue: [] as string[],
  }) as string[];

  return (
    <section className="pricing-reveal" id="pricing-reveal" aria-labelledby="pricing-reveal-headline">
      <div className="pricing-reveal__inner">
        <div className="pricing-reveal__head reveal">
          <div className="pricing-reveal__eyebrow">
            {t('pricing.reveal.eyebrow', { defaultValue: 'MEMBERSHIP' })}
          </div>
          <h2 id="pricing-reveal-headline" className="pricing-reveal__headline font-display">
            {t('pricing.reveal.headline', { defaultValue: 'START WITH 7 DAYS FREE.' })}
          </h2>
          <p className="pricing-reveal__subhead">
            {t('pricing.reveal.subhead', {
              defaultValue: 'No card needed. Cancel anytime. Use Libo as long as you want.',
            })}
          </p>
        </div>

        <div className="pricing-reveal__cards">
          {/* PREMIUM — left, tilted -3deg */}
          <article className="pricing-reveal-card pricing-reveal-card--premium">
            <header className="pricing-reveal-card__top">
              <span className="pricing-reveal-card__label">
                {t('pricing.reveal.premiumLabel', { defaultValue: 'PREMIUM' })}
              </span>
              <span className="pricing-reveal-card__pill">
                {t('pricing.reveal.premiumPopular', { defaultValue: 'MOST POPULAR' })}
              </span>
            </header>

            <div className="pricing-reveal-card__price-row">
              <span className="pricing-reveal-card__price font-display">
                {t('pricing.reveal.premiumPrice', { defaultValue: '€79' })}
              </span>
              <span className="pricing-reveal-card__period">
                {t('pricing.reveal.premiumPeriod', { defaultValue: '/year — save 34%' })}
              </span>
            </div>

            <ul className="pricing-reveal-card__features">
              {premiumFeatures.map((feature, i) => (
                <li key={i}>
                  <span className="pricing-reveal-card__check" aria-hidden>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <footer className="pricing-reveal-card__bottom">
              <span className="pricing-reveal-card__trial">
                {t('pricing.reveal.trial', { defaultValue: '7 days free' })}
              </span>
            </footer>
          </article>

          {/* ELITE — right, tilted +3deg */}
          <article className="pricing-reveal-card pricing-reveal-card--elite">
            <header className="pricing-reveal-card__top">
              <span className="pricing-reveal-card__label">
                {t('pricing.reveal.eliteLabel', { defaultValue: 'ELITE' })}
              </span>
              <span className="pricing-reveal-card__diamond" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 9L12 2L19 9L12 22L5 9Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path d="M5 9H19" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M9 9L12 2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M15 9L12 2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M9 9L12 22" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M15 9L12 22" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </span>
            </header>

            <div className="pricing-reveal-card__price-row">
              <span className="pricing-reveal-card__price font-display">
                {t('pricing.reveal.elitePrice', { defaultValue: '€149' })}
              </span>
              <span className="pricing-reveal-card__period">
                {t('pricing.reveal.elitePeriod', { defaultValue: '/year — save 37%' })}
              </span>
            </div>

            <ul className="pricing-reveal-card__features">
              {eliteFeatures.map((feature, i) => (
                <li key={i}>
                  <span className="pricing-reveal-card__check" aria-hidden>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <footer className="pricing-reveal-card__bottom">
              <span className="pricing-reveal-card__trial">
                {t('pricing.reveal.trial', { defaultValue: '7 days free' })}
              </span>
            </footer>
          </article>
        </div>

        <div className="pricing-reveal__cta">
          <Link to="/pricing" className="pricing-reveal__cta-pill">
            {t('pricing.reveal.ctaLabel', { defaultValue: 'SEE ALL PLANS' })}
            <span className="pricing-reveal__cta-arrow" aria-hidden> →</span>
          </Link>
          <p className="pricing-reveal__cta-subtext">
            {t('pricing.reveal.ctaSubtext', { defaultValue: '3 tiers including Free forever' })}
          </p>
        </div>
      </div>
    </section>
  );
}
