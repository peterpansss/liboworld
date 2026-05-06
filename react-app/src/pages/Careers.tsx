import { useEffect } from 'react';
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
};

const ROLES: Role[] = [
  {
    id: 'mobile-engineer',
    title: 'Mobile Engineer (React Native)',
    location: 'Remote · EU/UK timezone',
    type: 'Contract',
    applyHref: 'mailto:hello@liboworld.com?subject=Application%20%E2%80%94%20Mobile%20Engineer',
  },
  {
    id: 'content-producer',
    title: 'Content Producer (Exercise Library)',
    location: 'Lisbon · or remote',
    type: 'Contract',
    applyHref: 'mailto:hello@liboworld.com?subject=Application%20%E2%80%94%20Content%20Producer',
  },
  {
    id: 'community-creator',
    title: 'Community & Creator Lead',
    location: 'Remote',
    type: 'Part-time',
    applyHref: 'mailto:hello@liboworld.com?subject=Application%20%E2%80%94%20Community%20Lead',
  },
];

export default function Careers() {
  const { t } = useTranslation();

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
                {ROLES.map((role) => (
                  <li key={role.id}>
                    <a
                      href={role.applyHref}
                      className="careers-role"
                      target={role.applyHref.startsWith('http') ? '_blank' : undefined}
                      rel={role.applyHref.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      <div className="careers-role__title-block">
                        <span className="careers-role__title font-display">{role.title}</span>
                        <span className="careers-role__type">{role.type}</span>
                      </div>
                      <div className="careers-role__location">{role.location}</div>
                      <div className="careers-role__cta">
                        {t('careers.viewOpening', { defaultValue: 'View opening' })}
                        <span aria-hidden> →</span>
                      </div>
                    </a>
                  </li>
                ))}
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
