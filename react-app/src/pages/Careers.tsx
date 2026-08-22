import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './Careers.css';

// Open roles. Add/remove entries here — the page renders zero-state if empty.
// Keep titles concrete (not "Engineer" alone — engineers get a stack/scope).
// `applyHref` can be a mailto: or an external ATS link; the row reuses the
// same "View Opening →" affordance regardless.
type Role = {
  id: string;
  title: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  applyHref: string;
  description: string;
  whatYouDo: string[];
  yourExpertise: string[];
  niceToHave?: string[];
};

const ROLES: Role[] = [
  {
    id: 'mobile-engineer',
    title: 'Mobile Engineer (React Native)',
    location: 'Remote · EU/UK timezone',
    type: 'Contract',
    applyHref: 'mailto:careers@liboworld.com?subject=Application%20%E2%80%94%20Mobile%20Engineer',
    description:
      "Own the Libo mobile app end-to-end — a premium, NTC-inspired fitness product with 880+ exercises and 140 guided workouts. You'll ship features that feel fast and quiet, from the workout player to offline sync, on a small team where craft is the bar.",
    whatYouDo: [
      'Ship the workout player with synced voiceovers and rest-timer haptics',
      'Build offline-first exercise sync over expo-sqlite and MMKV',
      'Tune list and video-grid performance to stay buttery on mid-tier Androids',
      'Wire Supabase auth, deltas, and media URLs into Zustand stores',
      "Integrate the media worker's 4:3 clips and thumbnails into playback",
      'Submit and maintain App Store and Play Store releases via EAS',
    ],
    yourExpertise: [
      'Strong React Native + TypeScript with Expo Router',
      'Animation and gesture chops; Reanimated or equivalent',
      'Native APIs: haptics, audio, video, file system',
      'Zustand or similar; clean local state and persistence',
      'Owns a feature from spec to ship to telemetry',
    ],
    niceToHave: [
      'Reanimated or Skia for custom motion',
      'Supabase, Postgres, or row-level security',
      'Shipped a fitness or media-heavy app',
    ],
  },
];

export default function Careers() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${t('careers.documentTitle', { defaultValue: 'Careers' })} | Libo`;
    return () => { document.title = 'Libo'; };
  }, [t]);

  return (
    <>
      <SiteNav />

      <main className="careers-page">
        {/* Hero */}
        <section className="careers-hero">
          <div className="careers-hero__inner">
            <h1 className="careers-hero__headline font-display">
              {t('careers.headline', { defaultValue: 'Join our team' })}
            </h1>
            <p className="careers-hero__lead">
              {t('careers.lead', { defaultValue: 'Libo is built by a small group of people who actually train. We hire athletes, engineers, and creators who care about craft — and who write their own emails.' })}
            </p>
          </div>
        </section>

        {/* Open roles */}
        <section className="careers-roles">
          <div className="careers-roles__inner">
            {ROLES.length === 0 ? (
              <div className="careers-empty">
                <p className="careers-empty__title font-display">
                  {t('careers.empty.title', { defaultValue: 'No open roles right now.' })}
                </p>
                <p className="careers-empty__body">
                  {t('careers.empty.body', { defaultValue: "Send a note to hello@liboworld.com — if you're a fit we'll keep you on file." })}
                </p>
              </div>
            ) : (
              <ul className="careers-roles__list">
                {ROLES.map((role) => {
                  const isOpen = expandedId === role.id;
                  const panelId = `careers-role-panel-${role.id}`;
                  return (
                    <li key={role.id}>
                      <button
                        type="button"
                        className={`careers-role${isOpen ? ' careers-role--open' : ''}`}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setExpandedId(isOpen ? null : role.id)}
                      >
                        <div className="careers-role__title-block">
                          <span className="careers-role__title font-display">{role.title}</span>
                          <span className="careers-role__type">{role.type}</span>
                        </div>
                        <div className="careers-role__location">{role.location}</div>
                        <div className="careers-role__cta">
                          {isOpen
                            ? t('careers.closeOpening', { defaultValue: 'Close' })
                            : t('careers.viewOpening', { defaultValue: 'View opening' })}
                          <span aria-hidden>{isOpen ? ' ↑' : ' →'}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div id={panelId} className="careers-role__detail">
                          <p className="careers-role__description">{role.description}</p>

                          <h3 className="careers-role__section-title font-display">
                            {t('careers.whatYouDo', { defaultValue: "What you'll do" })}
                          </h3>
                          <ul className="careers-role__bullets">
                            {role.whatYouDo.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>

                          <h3 className="careers-role__section-title font-display">
                            {t('careers.yourExpertise', { defaultValue: 'Your expertise' })}
                          </h3>
                          <ul className="careers-role__bullets">
                            {role.yourExpertise.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>

                          {role.niceToHave && role.niceToHave.length > 0 && (
                            <>
                              <h3 className="careers-role__section-title font-display">
                                {t('careers.niceToHave', { defaultValue: 'Nice to have' })}
                              </h3>
                              <ul className="careers-role__bullets">
                                {role.niceToHave.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </>
                          )}

                          <a
                            href={role.applyHref}
                            className="careers-role__apply"
                            target={role.applyHref.startsWith('http') ? '_blank' : undefined}
                            rel={role.applyHref.startsWith('http') ? 'noopener noreferrer' : undefined}
                          >
                            {t('careers.applyNow', { defaultValue: 'Apply Now' })}
                          </a>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="careers-fallback">
              {t('careers.fallback', { defaultValue: "Don't see your role?" })}{' '}
              <a href="mailto:hello@liboworld.com?subject=Open%20application">
                {t('careers.fallbackLink', { defaultValue: 'Send us a note' })}
              </a>
              .
            </p>
          </div>
        </section>

        {/* Cross-promo — coverd's "Turn Expenses into Games" equivalent */}
        <section className="careers-promo">
          <div className="careers-promo__inner">
            <div className="careers-promo__copy">
              <h2 className="careers-promo__headline font-display">
                {t('careers.promoHeadline', { defaultValue: 'Train smarter.\nEarn while you do.' })}
              </h2>
              <p className="careers-promo__body">
                {t('careers.promoBody', { defaultValue: 'Even if we never work together — Libo is free to use. Real workouts, real cash challenges, real progress.' })}
              </p>
              <div className="careers-promo__actions">
                <Link to="/onboarding" className="careers-promo__primary">
                  {t('careers.promoPrimary', { defaultValue: 'Get the app' })}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
