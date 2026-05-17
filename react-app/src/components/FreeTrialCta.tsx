import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TRIAL_DAYS } from '../data/tiers';
import './FreeTrialCta.css';

// Replaces the inline 3-card pricing dump on the homepage. Joinladder-style
// single CTA — pushes the curiosity-stage user to a dedicated /pricing page
// instead of forcing a tier decision in the middle of the marketing scroll.
export default function FreeTrialCta({ variant = 'dark' }: { variant?: 'dark' | 'light' } = {}) {
  const { t } = useTranslation();
  return (
    <section
      className={`trial-cta-section${variant === 'light' ? ' trial-cta-section--light' : ''}`}
      id="pricing-cta"
      aria-labelledby="trial-cta-heading"
    >
      <div className="trial-cta-inner">
        <div className="label label-spaced trial-cta-eyebrow">
          {t('freeTrialCta.eyebrow', { defaultValue: '100% Free trial' })}
        </div>
        <h2 id="trial-cta-heading" className="display display-lg font-display trial-cta-headline">
          {t('freeTrialCta.headline', { defaultValue: 'Start free.\nNo card required.' })}
        </h2>
        <p className="trial-cta-body">
          {t('freeTrialCta.body', { defaultValue: '{{days}} days of full Libo Premium, on us. Cancel any time — we\'ll never auto-bill without a heads-up.', days: TRIAL_DAYS })}
        </p>
        <div className="trial-cta-actions">
          <Link to="/pricing" className="trial-cta-primary">
            {t('freeTrialCta.primary', { defaultValue: 'See plans' })} →
          </Link>
          <Link to="/onboarding" className="trial-cta-secondary">
            {t('freeTrialCta.secondary', { defaultValue: 'Get the app' })}
          </Link>
        </div>
        <ul className="trial-cta-bullets">
          <li>{t('freeTrialCta.bullet1', { defaultValue: 'No credit card to start' })}</li>
          <li>{t('freeTrialCta.bullet2', { defaultValue: 'Cancel any time' })}</li>
          <li>{t('freeTrialCta.bullet3', { defaultValue: 'All plans unlock real cash challenges' })}</li>
        </ul>
      </div>
    </section>
  );
}
