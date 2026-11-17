import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SeoHead } from '../components/SeoHead';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import StoreBadges from '../components/StoreBadges';
import { PhoneShot, AppCta, PremiumStrip } from '../components/earn/EarnKit';
import './Features.css';

/**
 * /features — the fitness side of the app (Noah, 18 Nov 2026).
 *
 * Real app screens only (17 Nov 2026 English recording, public/app-screens):
 * no AI imagery for training (THUMBNAIL-DESIGN-SYSTEM). Claims stay inside
 * canon: "820+" exercises (VOICE-CANON §8), never a precise count.
 * The streak screen in the recording shows a 0-day streak, so streaks are
 * listed under extras instead of shown next to "never resets to zero".
 */
const FEATURES: { id: string; screen: string; to?: string }[] = [
  { id: 'today', screen: 'home' },
  { id: 'library', screen: 'explore', to: '/exercises' },
  { id: 'player', screen: 'player' },
  { id: 'coach', screen: 'coach' },
  { id: 'generator', screen: 'generator', to: '/workouts' },
  { id: 'editor', screen: 'plan-editor' },
  { id: 'plan', screen: 'plan', to: '/workouts' },
  { id: 'earn', screen: 'rewards', to: '/earn' },
];

const EXTRAS = ['streak', 'offline', 'languages', 'phases', 'notes', 'equipment'] as const;

export default function Features() {
  const { t } = useTranslation();

  return (
    <>
      <SeoHead
        title={t('earnPages.features.seo.title')}
        description={t('earnPages.features.seo.description')}
        canonical="/features"
      />
      <SiteNav />
      <main id="main-content" className="earn-page">
        <section className="ft-hero">
          <div className="ft-hero__copy">
            <span className="earn-eyebrow">{t('earnPages.features.eyebrow')}</span>
            <h1 className="ft-hero__title font-display">
              {t('earnPages.features.title1')} <span className="accent">{t('earnPages.features.title2')}</span>
            </h1>
            <p className="earn-hero__sub">{t('earnPages.features.sub')}</p>
            <StoreBadges className="ft-badges" />
          </div>
          <div className="ft-hero__phones" aria-hidden="true">
            <PhoneShot src="player" alt="" className="ft-hero__phone ft-hero__phone--back" />
            <PhoneShot src="home" alt="" className="ft-hero__phone ft-hero__phone--front" />
          </div>
        </section>

        <ol className="ft-list">
          {FEATURES.map((f, i) => (
            <li key={f.id} className={`ft-item${i % 2 ? ' ft-item--flip' : ''}`}>
              <PhoneShot src={f.screen} alt={t(`earnPages.features.items.${f.id}.alt`)} className="ft-item__phone" />
              <div className="ft-item__copy">
                <span className="ft-item__num font-display" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <h2 className="ft-item__title font-display">{t(`earnPages.features.items.${f.id}.title`)}</h2>
                <p className="ft-item__text">{t(`earnPages.features.items.${f.id}.text`)}</p>
                {f.to && (
                  <Link to={f.to} className="ft-item__link" viewTransition>
                    {t(`earnPages.features.items.${f.id}.link`)} <span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>

        <section className="earn-section">
          <h2 className="earn-h2 font-display">{t('earnPages.features.extras.heading')}</h2>
          <ul className="ft-extras">
            {EXTRAS.map((x) => (
              <li key={x} className="ft-extra">
                <strong className="font-display">{t(`earnPages.features.extras.${x}.title`)}</strong>
                <span>{t(`earnPages.features.extras.${x}.text`)}</span>
              </li>
            ))}
          </ul>
        </section>

        <PremiumStrip text={t('earnPages.features.premiumText')} />
        <AppCta title={t('earnPages.common.ctaTitle')} sub={t('earnPages.features.ctaSub')} />
      </main>
      <SiteFooter />
    </>
  );
}
