import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './PricingReveal.css';

// Homepage teaser pointing to /pricing. Ladder-style minimalist: two
// decorative "membership card" visuals (no feature lists, no prominent
// prices on the cards themselves), with thin price labels floating
// alongside. Keys live under pricing.reveal.* so they don't collide with
// the /pricing page's own t('pricing.*') keys.

export default function PricingReveal() {
  const { t } = useTranslation();

  return (
    <section className="pricing-reveal" id="pricing-reveal" aria-labelledby="pricing-reveal-headline">
      <div className="pricing-reveal__inner">
        <div className="pricing-reveal__head reveal">
          <div className="pricing-reveal__eyebrow">
            {t('pricing.reveal.eyebrow', { defaultValue: 'MEMBERSHIP' })}
          </div>
          <h2 id="pricing-reveal-headline" className="pricing-reveal__headline font-display">
            <span className="pricing-reveal__headline-line">
              {t('pricing.reveal.headline', { defaultValue: '100% FREE TRIAL.' })}
            </span>
            <span className="pricing-reveal__headline-line">
              {t('pricing.reveal.subheadline', { defaultValue: 'NO CARD NEEDED.' })}
            </span>
          </h2>
        </div>

        <div className="pricing-reveal__stage">
          {/* Left price label (paired with PREMIUM) */}
          <div className="pricing-reveal__side-label pricing-reveal__side-label--left">
            <span className="pricing-reveal__side-label-tier">
              {t('pricing.reveal.premiumLabel', { defaultValue: 'PREMIUM' })}
            </span>
            <span className="pricing-reveal__side-label-price">
              {t('pricing.reveal.premiumPrice', { defaultValue: '€79/yr' })}
            </span>
            <span className="pricing-reveal__side-label-mo">
              {t('pricing.reveal.premiumMo', { defaultValue: '12 months · €6.58/mo' })}
            </span>
          </div>

          <div className="pricing-reveal__cards">
            {/* PREMIUM — left, tilted -3deg */}
            <article className="pricing-reveal-card pricing-reveal-card--premium">
              <header className="pricing-reveal-card__top">
                <span className="pricing-reveal-card__label">
                  {t('pricing.reveal.premiumLabel', { defaultValue: 'PREMIUM' })}
                </span>
              </header>
              <div className="pricing-reveal-card__glyph" aria-hidden>P</div>
              <footer className="pricing-reveal-card__member">
                {t('pricing.reveal.premiumMember', { defaultValue: 'LIBO MEMBER · TEAM 2026' })}
              </footer>
            </article>

            {/* ELITE — right, tilted +3deg */}
            <article className="pricing-reveal-card pricing-reveal-card--elite">
              <header className="pricing-reveal-card__top">
                <span className="pricing-reveal-card__label">
                  {t('pricing.reveal.eliteLabel', { defaultValue: 'ELITE' })}
                </span>
              </header>
              <div className="pricing-reveal-card__glyph" aria-hidden>E</div>
              <footer className="pricing-reveal-card__member">
                {t('pricing.reveal.eliteMember', { defaultValue: 'LIBO ELITE · CHARTER MEMBER' })}
              </footer>
            </article>
          </div>

          {/* Right price label (paired with ELITE) */}
          <div className="pricing-reveal__side-label pricing-reveal__side-label--right">
            <span className="pricing-reveal__side-label-tier">
              {t('pricing.reveal.eliteLabel', { defaultValue: 'ELITE' })}
            </span>
            <span className="pricing-reveal__side-label-price">
              {t('pricing.reveal.elitePrice', { defaultValue: '€149/yr' })}
            </span>
            <span className="pricing-reveal__side-label-mo">
              {t('pricing.reveal.eliteMo', { defaultValue: '12 months · €12.42/mo' })}
            </span>
          </div>
        </div>

        <div className="pricing-reveal__cta">
          <Link to="/pricing" className="pricing-reveal__cta-pill font-display">
            {t('pricing.reveal.ctaLabel', { defaultValue: 'FIND YOUR PLAN' })}
            <span className="pricing-reveal__cta-arrow" aria-hidden> →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
