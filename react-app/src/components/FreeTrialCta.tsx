import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './FreeTrialCta.css';

// Replaces the inline 3-card pricing dump on the homepage. Joinladder-style
// single CTA — pushes the curiosity-stage user to a dedicated /pricing page
// instead of forcing a tier decision in the middle of the marketing scroll.
//
// The closer used to sell a 7-day Premium trial. There is no trial: App Store
// Connect has no introductory offer on either subscription product, and the
// mobile app ships TIER_TRIAL_DAYS = 0 across the board — subscribing charges
// immediately. The pitch is now the free tier, which is the honest version of
// the same "try it before you pay" promise. The `trial-cta-*` class names and
// the #pricing-cta anchor are kept: FreeTrialCta.css and the homepage hero link
// both target them, and neither is user-visible.
//
// i18n note: none of the freeTrialCta.* keys exist in any locale file, so every
// string here resolves to its English defaultValue in all five languages. Adding
// one key means adding it to en/de/es/fr/pt or tests/i18n/keyParity.test.ts
// fails — hence defaultValue-only, matching how this file already worked.
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
          {t('freeTrialCta.eyebrow', { defaultValue: '100% Free tier' })}
        </div>
        <h2 id="trial-cta-heading" className="display display-lg font-display trial-cta-headline">
          {t('freeTrialCta.headline', { defaultValue: 'Start free.\nNo card required.' })}
        </h2>
        <p className="trial-cta-body">
          {t('freeTrialCta.body', { defaultValue: 'The free tier is genuinely free — not a trial. No countdown, no auto-bill. Train, track and enter real cash challenges, then upgrade only if you want the full library.' })}
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
