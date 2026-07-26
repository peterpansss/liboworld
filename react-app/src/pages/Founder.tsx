import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import './Founder.css';

// /founder — "About Libo" page for the site relaunch.
// Layout ported pixel-for-pixel from
// design_handoff_site_relaunch/designs/Founder.dc.html:
//   hero → why-we're-building-this (photo + 4 pillars) → pull quote
//   → vision statement card → join CTA.
// All copy lives in the i18n "relaunchFounder" namespace (en.json is the single
// source of truth; de/fr/es/pt carry English stubs until translated).

interface Pillar {
  num: string;
  title: string;
  body: string;
}

export default function Founder() {
  const { t } = useTranslation();

  const pillars = t('relaunchFounder.why.pillars', { returnObjects: true }) as Pillar[];
  const pillarList = Array.isArray(pillars) ? pillars : [];

  return (
    <div className="founder-page">
      <SeoHead
        title={t('relaunchFounder.seo.title')}
        description={t('relaunchFounder.hero.sub')}
        canonical="https://liboworld.com/founder"
        ogImage="https://liboworld.com/brand/og-image.png"
      />
      <SiteNav />

      {/* ── Hero ── */}
      <header className="fp-hero">
        <span className="fp-badge">{t('relaunchFounder.hero.badge')}</span>
        <h1>
          {t('relaunchFounder.hero.h1Line1')}
          <br />
          <span className="fp-accent">{t('relaunchFounder.hero.h1Accent')}</span>
        </h1>
        <p className="fp-hero-sub">{t('relaunchFounder.hero.sub')}</p>
      </header>

      {/* ── Why we're building this ── */}
      <section className="fp-why" aria-label={t('relaunchFounder.why.h2')}>
        <div className="fp-why-media">
          <img
            className="fp-why-img"
            src="/noah-founder.jpg"
            alt={t('relaunchFounder.why.imgAlt')}
          />
          <div className="fp-photo-badge">
            <span className="fp-photo-badge-name">{t('relaunchFounder.why.badgeName')}</span>
            <span className="fp-photo-badge-role">{t('relaunchFounder.why.badgeRole')}</span>
          </div>
        </div>

        <div className="fp-why-body">
          <h2>{t('relaunchFounder.why.h2')}</h2>
          {pillarList.map((p) => (
            <div className="fp-pillar" key={p.num}>
              <span className="fp-pillar-num">{p.num}</span>
              <div className="fp-pillar-text">
                <span className="fp-pillar-title">{p.title}</span>
                <p className="fp-pillar-body">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pull quote ── */}
      <section className="fp-pull">
        <div className="fp-pull-inner">
          <p className="fp-pull-quote">
            {t('relaunchFounder.pullQuote.line1')}
            <br />
            {t('relaunchFounder.pullQuote.line2Pre')}
            <span className="fp-accent">{t('relaunchFounder.pullQuote.line2Accent')}</span>
          </p>
          <div className="fp-pull-attrib">
            <span className="fp-pull-name">{t('relaunchFounder.pullQuote.name')}</span>
            <span className="fp-pull-source">{t('relaunchFounder.pullQuote.source')}</span>
          </div>
          <Link to="/blog" className="fp-btn-outline">
            {t('relaunchFounder.pullQuote.cta')}
          </Link>
        </div>
      </section>

      {/* ── Vision ── */}
      <section className="fp-vision">
        <div className="fp-vision-head">
          <h2>
            {t('relaunchFounder.vision.h2Line1')}
            <br />
            {t('relaunchFounder.vision.h2Line2')}
          </h2>
          <p className="fp-vision-desc">{t('relaunchFounder.vision.desc')}</p>
        </div>
        <div className="fp-vision-card">
          <p>
            {t('relaunchFounder.vision.cardPre')}
            <span className="fp-accent">{t('relaunchFounder.vision.cardAccent')}</span>
          </p>
        </div>
      </section>

      {/* ── Join CTA ── */}
      <section className="fp-join">
        <div className="fp-join-inner">
          <h2>
            {t('relaunchFounder.joinCta.h2Line1')}
            <br />
            <span className="fp-accent">{t('relaunchFounder.joinCta.h2Accent')}</span>
          </h2>
          <p className="fp-join-body">{t('relaunchFounder.joinCta.body')}</p>
          <div className="fp-join-actions">
            <Link to="/money-challenges#reserve" className="fp-btn-primary">
              {t('relaunchFounder.joinCta.ctaPrimary')}
            </Link>
            <Link to="/pricing" className="fp-btn-secondary">
              {t('relaunchFounder.joinCta.ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
