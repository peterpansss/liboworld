import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import ScrollRevealText from '../components/ScrollRevealText';
import { usePopIn } from '../utils/funnelAnimations';
import './Press.css';

// /press — the press kit: fact sheet, boilerplate, founder bio, downloadable
// logos, real product shots and a press contact CTA. Stays a BRAND page
// (SiteNav + SiteFooter) — journalists arrive here from outside and must be
// able to reach the rest of the site.
//
// Copy notes:
// - The eyebrow reads "Press", not "Press kit" (MASTER-HANDOFF §19). The canvas
//   render still shows the old label.
// - The H1 is three lines and, unlike the canvas, line 3 gets the lime
//   treatment so the page matches the site-wide headline pattern.
// - Product shots are REAL in-app captures only (HANDOFF-V2-COMPLEMENT §C). The
//   old mocked frames (hero-*.png, app-workout.png, app-rewards.png) are gone
//   from this grid; the files themselves are untouched.
// - Strings live in the `pressKit` namespace via defaultValue. The older
//   `relaunchPress` keys are still referenced for the blocks whose English is
//   unchanged (logo tiles, contact band, aria labels) so their translations
//   survive.

type LogoItem = { label: string; file: string };

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

  // Fact tiles / product shots are authored here rather than pulled from the
  // locale bundle so the wording stays in step with the canon: "free tier",
  // named payout tiers, real captures only.
  const facts = [
    { label: t('pressKit.facts.whatLabel', { defaultValue: 'What' }), value: t('pressKit.facts.whatValue', { defaultValue: 'Training club that pays cash' }) },
    { label: t('pressKit.facts.platformLabel', { defaultValue: 'Platform' }), value: t('pressKit.facts.platformValue', { defaultValue: 'iOS (Android to follow)' }) },
    { label: t('pressKit.facts.stageLabel', { defaultValue: 'Stage' }), value: t('pressKit.facts.stageValue', { defaultValue: 'Pre-launch · waitlist open' }) },
    { label: t('pressKit.facts.pricingLabel', { defaultValue: 'Pricing' }), value: t('pressKit.facts.pricingValue', { defaultValue: 'Free tier + €79.99/yr' }) },
    { label: t('pressKit.facts.exercisesLabel', { defaultValue: 'Exercises' }), value: t('pressKit.facts.exercisesValue', { defaultValue: '820+' }) },
    { label: t('pressKit.facts.workoutsLabel', { defaultValue: 'Workouts' }), value: t('pressKit.facts.workoutsValue', { defaultValue: '140' }) },
    { label: t('pressKit.facts.payoutLabel', { defaultValue: 'Challenge payouts' }), value: t('pressKit.facts.payoutValue', { defaultValue: '€5–€50 / cycle' }) },
    { label: t('pressKit.facts.cohortLabel', { defaultValue: 'Challenge cohorts' }), value: t('pressKit.facts.cohortValue', { defaultValue: 'Limited spots / 30 days' }) },
  ];

  // Real in-app captures, mapped by CONTENT — the filenames are not reliable.
  const shots = [
    { img: 'app-real-home.png', label: t('pressKit.shots.home', { defaultValue: "Home · today's workout" }) },
    { img: 'app-real-rewards.png', label: t('pressKit.shots.rewards', { defaultValue: 'Cash challenges' }) },
    { img: 'app-real-run.png', label: t('pressKit.shots.run', { defaultValue: 'Challenge day 2' }) },
    { img: 'app-real-streak.png', label: t('pressKit.shots.streak', { defaultValue: 'Streak started' }) },
    { img: 'app-real-share.png', label: t('pressKit.shots.share', { defaultValue: 'Share to story' }) },
  ];
  const logos = t('relaunchPress.logos.items', { returnObjects: true }) as LogoItem[];
  const logoList = Array.isArray(logos) ? logos : [];

  const boilerplate = t('pressKit.boilerplate.body', {
    defaultValue:
      'Libo is a training club that pays members real cash for consistency. Alongside a library of 820+ exercises, 140 workouts, and generated training plans, Libo runs 30-day money challenges: members hit a daily rep target, record the proof, and cash out €5–€50 at the end of the cycle. The recording stays on your device and sharing is always optional — it is never a condition of being paid. Libo launches on iOS with a free tier and a Premium subscription at €79.99/year.',
  });

  usePopIn();

  return (
    <div className="press-page">
      <SiteNav />
      <SeoHead
        title={t('pressKit.seo.title', { defaultValue: 'Press — Libo' })}
        description={boilerplate}
        canonical="/press"
        ogImage="https://liboworld.com/brand/og-image.png"
      />

      <main id="main-content">
        {/* ── Hero ───────────────────────────────────
            Three separate block lines with real leading — the canvas render
            overprints line 3 onto the paragraph; this cannot. */}
        <header className="press-hero">
          <span className="press-badge">{t('pressKit.hero.badge', { defaultValue: 'Press kit' })}</span>
          <h1 className="press-h1 font-display">
            {/* Desktop: three white lines. Mobile (V3.1 §9): two lines —
                "EVERYTHING YOU NEED" / "TO COVER LIBO." with line 2 lime. */}
            <span className="press-h1-line press-h1-line--a">{t('pressKit.hero.h1Line1', { defaultValue: 'Everything you' })}</span>
            <span className="press-h1-line press-h1-line--b">{t('pressKit.hero.h1Line2', { defaultValue: 'need' })}</span>
            <span className="press-h1-line press-h1-line--c">
              {t('pressKit.hero.h1Line3', { defaultValue: 'to cover Libo.' })}
            </span>
          </h1>
          <p className="press-hero-sub">
            {t('pressKit.hero.subPre', {
              defaultValue:
                'Logos, screenshots, founder bio, and the facts — ready to use. For interviews, beta access, or anything else: ',
            })}
            <a href="mailto:press@liboworld.com" className="press-link">
              press@liboworld.com
            </a>
          </p>
        </header>

        {/* ── Fact sheet ─────────────────────────── */}
        <section className="press-facts" aria-label={t('relaunchPress.aria.factSheet')}>
          <div className="press-facts-grid">
            {facts.map((f, i) => (
              <div className="press-fact-card" key={i} data-popin>
                <span className="press-fact-label">{f.label}</span>
                <span className="press-fact-value font-display">{f.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Boilerplate + founder bio ──────────── */}
        <section className="press-boilerplate">
          <div className="press-boilerplate-inner">
            <div className="press-boilerplate-col">
              <h2 className="press-h2 font-display">
                {t('pressKit.boilerplate.title', { defaultValue: 'About Libo' })}{' '}
                <span className="press-h2-tag">{t('pressKit.boilerplate.titleTag', { defaultValue: '· boilerplate' })}</span>
              </h2>
              <p className="press-body">{boilerplate}</p>
            </div>

          </div>
        </section>

        {/* ── Logos ──────────────────────────────── */}
        <section className="press-logos">
          <div className="press-section-head">
            <ScrollRevealText as="h2" className="press-h2-lg font-display">
              {t('relaunchPress.logos.h2')}
            </ScrollRevealText>
            <span className="press-section-note">{t('relaunchPress.logos.note')}</span>
          </div>
          <div className="press-logos-grid">
            {logoList.map((item, i) => {
              const light = i === 1;
              const mark = i === 2;
              return (
                <div className="press-logo-tile" key={i} data-popin>
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

        {/* ── Product shots — real captures only ─── */}
        <section className="press-shots">
          <div className="press-section-head">
            <ScrollRevealText as="h2" className="press-h2-lg font-display">
              {t('pressKit.shots.h2', { defaultValue: 'Product shots.' })}
            </ScrollRevealText>
            <span className="press-section-note">
              {t('pressKit.shots.note', { defaultValue: 'Real in-app captures · PNG · no mock-ups' })}
            </span>
          </div>
          <div className="press-shots-grid">
            {shots.map((s, i) => (
              <div className="press-shot" key={i} data-popin>
                <img src={`/${s.img}`} alt={s.label} className="press-shot-img" loading="lazy" />
                <div className="press-shot-meta">
                  <span className="press-muted-12">{s.label}</span>
                  <a
                    href={`/${s.img}`}
                    download
                    className="press-link press-shot-dl"
                    aria-label={t('relaunchPress.aria.download', { label: s.label })}
                  >
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
            <ScrollRevealText as="h2" className="press-contact-h2 font-display">
              {t('relaunchPress.contact.h2')}
            </ScrollRevealText>
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
