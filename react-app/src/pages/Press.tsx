import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import './Press.css';

// /press — relaunch press kit: fact sheet, boilerplate + founder bio,
// downloadable logos, product shots, and a press contact CTA.
// All copy is driven by the "relaunchPress" i18n namespace.

type Fact = { label: string; value: string };
type LogoItem = { label: string; file: string };
type Shot = { img: string; label: string };

// Wordmark logo tile — rendered inline so <text> nodes pick up the page's
// self-hosted Barlow Condensed / Inter fonts. `dark` toggles lime-on-dark
// vs black-on-light fills.
function LogoWordmark({ dark }: { dark: boolean }) {
  const textFill = dark ? '#FFFFFF' : '#0A0A0A';
  return (
    <svg viewBox="104 4 332 128" role="img" aria-label="Libo World · Training Club" className="press-logo-svg">
      <circle cx="146" cy="42" r="4" fill="#CAFF00" />
      <circle cx="166" cy="30" r="6.5" fill="#CAFF00" />
      <circle cx="192" cy="18" r="10" fill="#CAFF00" />
      <text
        x="108"
        y="122"
        fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif"
        fontWeight={900}
        fontSize={92}
        letterSpacing="2"
        fill={textFill}
      >
        LIBO
      </text>
      <text
        x="304"
        y="118"
        fontFamily="'Inter', 'Helvetica Neue', sans-serif"
        fontWeight={600}
        fontSize={12}
        letterSpacing="3"
        fill={textFill}
        fillOpacity={0.7}
      >
        TRAINING CLUB
      </text>
    </svg>
  );
}

// Mark-only tile (the three lime dots).
function LogoMark() {
  return (
    <svg viewBox="140 6 66 44" role="img" aria-label="Libo mark" className="press-logo-svg">
      <circle cx="146" cy="42" r="4" fill="#CAFF00" />
      <circle cx="166" cy="30" r="6.5" fill="#CAFF00" />
      <circle cx="192" cy="18" r="10" fill="#CAFF00" />
    </svg>
  );
}

export default function Press() {
  const { t } = useTranslation();

  const facts = t('relaunchPress.facts', { returnObjects: true }) as Fact[];
  const logos = t('relaunchPress.logos.items', { returnObjects: true }) as LogoItem[];
  const shots = t('relaunchPress.shots.items', { returnObjects: true }) as Shot[];

  const factList = Array.isArray(facts) ? facts : [];
  const logoList = Array.isArray(logos) ? logos : [];
  const shotList = Array.isArray(shots) ? shots : [];

  return (
    <div className="press-page">
      <SiteNav />
      <SeoHead
        title={t('relaunchPress.seo.title')}
        description={t('relaunchPress.boilerplate.body')}
        canonical="/press"
        ogImage="https://liboworld.com/brand/og-image.png"
      />

      <main id="main-content">
        {/* ── Hero ───────────────────────────────── */}
        <header className="press-hero">
          <span className="press-badge">{t('relaunchPress.hero.badge')}</span>
          <h1 className="press-h1 font-display">
            {t('relaunchPress.hero.h1Line1')}
            <br />
            {t('relaunchPress.hero.h1Line2')}
          </h1>
          <p className="press-hero-sub">
            {t('relaunchPress.hero.subPre')}
            <a href="mailto:press@liboworld.com" className="press-link">
              {t('relaunchPress.hero.email')}
            </a>
          </p>
        </header>

        {/* ── Fact sheet ─────────────────────────── */}
        <section className="press-facts" aria-label={t('relaunchPress.aria.factSheet')}>
          <div className="press-facts-grid">
            {factList.map((f, i) => (
              <div className="press-fact-card" key={i}>
                <span className="press-fact-label">{f.label}</span>
                <span className="press-fact-value font-display">{f.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Boilerplate + founder ──────────────── */}
        <section className="press-boilerplate">
          <div className="press-boilerplate-inner">
            <div className="press-boilerplate-col">
              <h2 className="press-h2 font-display">
                {t('relaunchPress.boilerplate.title')}{' '}
                <span className="press-h2-tag">{t('relaunchPress.boilerplate.titleTag')}</span>
              </h2>
              <p className="press-body">{t('relaunchPress.boilerplate.body')}</p>
            </div>
            <div className="press-founder">
              <img
                src="/noah-photo-2.jpg"
                alt={t('relaunchPress.boilerplate.founderImgAlt')}
                className="press-founder-photo"
                loading="lazy"
              />
              <div className="press-founder-copy">
                <h2 className="press-h2 font-display">
                  {t('relaunchPress.boilerplate.founderTitle')}{' '}
                  <span className="press-h2-tag">{t('relaunchPress.boilerplate.founderTag')}</span>
                </h2>
                <p className="press-body press-body-sm">{t('relaunchPress.boilerplate.founderBio')}</p>
                <a href="/founder" className="press-link press-founder-link">
                  {t('relaunchPress.boilerplate.founderLink')}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Logos ──────────────────────────────── */}
        <section className="press-logos">
          <div className="press-section-head">
            <h2 className="press-h2-lg font-display">{t('relaunchPress.logos.h2')}</h2>
            <span className="press-section-note">{t('relaunchPress.logos.note')}</span>
          </div>
          <div className="press-logos-grid">
            {logoList.map((item, i) => {
              const light = i === 1;
              const mark = i === 2;
              return (
                <div className="press-logo-tile" key={i}>
                  <div className={`press-logo-preview${light ? ' is-light' : ''}`}>
                    {mark ? <LogoMark /> : <LogoWordmark dark={!light} />}
                  </div>
                  <div className="press-logo-meta">
                    <span className="press-muted-13">{item.label}</span>
                    <a href={`/${item.file}`} download className="press-link">
                      {t('relaunchPress.logos.downloadLabel')}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Product shots ──────────────────────── */}
        <section className="press-shots">
          <div className="press-section-head">
            <h2 className="press-h2-lg font-display">{t('relaunchPress.shots.h2')}</h2>
            <span className="press-section-note">{t('relaunchPress.shots.note')}</span>
          </div>
          <div className="press-shots-grid">
            {shotList.map((s, i) => (
              <div className="press-shot" key={i}>
                <img src={`/${s.img}`} alt={s.label} className="press-shot-img" loading="lazy" />
                <div className="press-shot-meta">
                  <span className="press-muted-12">{s.label}</span>
                  <a href={`/${s.img}`} download className="press-link" aria-label={t('relaunchPress.aria.download', { label: s.label })}>
                    ↓
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Contact CTA ────────────────────────── */}
        <section className="press-contact">
          <div className="press-contact-inner">
            <h2 className="press-contact-h2 font-display">{t('relaunchPress.contact.h2')}</h2>
            <p className="press-contact-body">{t('relaunchPress.contact.body')}</p>
            <a href="mailto:press@liboworld.com" className="press-contact-cta font-display">
              {t('relaunchPress.contact.cta')}
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
