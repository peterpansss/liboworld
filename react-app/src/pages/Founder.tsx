import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './Founder.css';

// /founder — the long-form founder story page. Linked from the FounderCard
// on the homepage. Builds trust by showing the human behind the brand.
export default function Founder() {
  const { t } = useTranslation();
  return (
    <div className="founder-page">
      <SiteNav />

      {/* ── Hero ── */}
      <section className="fp-hero">
        <nav aria-label={t('founderPage.breadcrumbAria', { defaultValue: 'Breadcrumb' })} className="fp-breadcrumb">
          <Link to="/">{t('founderPage.breadcrumbHome', { defaultValue: 'Home' })}</Link>
          <span aria-hidden>›</span>
          {t('founderPage.breadcrumbCurrent', { defaultValue: 'Founder' })}
        </nav>
        <h1 className="fp-hero-headline font-display">
          {t('founderPage.headline', { defaultValue: 'Built by an athlete. For athletes.' })}
        </h1>
        <p className="fp-hero-lede">
          {t('founderPage.lede', {
            defaultValue:
              'Libo started in a gym, not a boardroom. Every workout was trained first by Noah, the founder — before a single user ever opened the app.',
          })}
        </p>
      </section>

      {/* ── Hero image ── */}
      <section className="fp-portrait-section">
        <figure className="fp-portrait">
          <img src="/founder/noah-photo.jpg" alt="Noah, founder of Libo" loading="eager" />
        </figure>
      </section>

      {/* ── Story body ── */}
      <section className="fp-story">
        <div className="fp-story-block">
          <h2 className="fp-story-heading font-display">
            {t('founderPage.section1Heading', { defaultValue: 'Why Libo exists' })}
          </h2>
          <p>
            {t('founderPage.section1Body', {
              defaultValue:
                "I trained for over a decade before I built anything. The apps I used were either bloated with features I'd never touch, or cheap-looking and impossible to trust with my training. So I built the product I wanted: every workout is one I've actually done, every exercise is filmed by someone who lifts, every line of copy is written like a coach would actually say it.",
            })}
          </p>
        </div>

        <div className="fp-story-block">
          <h2 className="fp-story-heading font-display">
            {t('founderPage.section2Heading', { defaultValue: 'The bar I set' })}
          </h2>
          <p>
            {t('founderPage.section2Body', {
              defaultValue:
                'No stock footage. No influencer cameos. No AI-generated thumbnails. Every video on Libo is filmed in a real gym, by a real lifter, with form I can defend. If a workout is in the app, I trained it first. If it doesn\'t pass that bar, it\'s not in the app.',
            })}
          </p>
        </div>

        <div className="fp-story-block">
          <h2 className="fp-story-heading font-display">
            {t('founderPage.section3Heading', { defaultValue: 'What you can expect' })}
          </h2>
          <p>
            {t('founderPage.section3Body', {
              defaultValue:
                "Libo isn't going to gamify you into checking the app every hour. It's going to give you serious, scalable training and stay out of your way. We add features when they earn their place — not when a growth dashboard says we should.",
            })}
          </p>
        </div>

        <div className="fp-signature">
          <p className="fp-signature-name">{t('founderPage.signatureName', { defaultValue: 'Noah' })}</p>
          <p className="fp-signature-role">{t('founderPage.signatureRole', { defaultValue: 'Founder, Libo' })}</p>
        </div>
      </section>

      {/* ── CTA back ── */}
      <section className="fp-cta-band">
        <h3 className="font-display fp-cta-headline">
          {t('founderPage.ctaHeadline', { defaultValue: 'Train with me.' })}
        </h3>
        <p className="fp-cta-sub">
          {t('founderPage.ctaSub', {
            defaultValue: 'Start with the workouts I trained first. No credit card required.',
          })}
        </p>
        <Link to="/onboarding" className="fp-cta-btn">
          {t('founderPage.ctaBtn', { defaultValue: 'Get Started' })}
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
