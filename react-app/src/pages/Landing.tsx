import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import { HOME_FAQ } from '../data/faq';
import { useWaitlistSubmit } from '../hooks/useWaitlistSubmit';
import { useFoundingCheckout } from '../components/funnel/FoundingCheckoutProvider';
import './Landing.css';

// Urgency: how many of the 50 cycle-#1 spots are already reserved.
// Mirrors the design's `spotsTaken` prop (default 37).
const SPOTS_TAKEN = 37;
const SPOTS_TOTAL = 50;
const SPOTS_LEFT = SPOTS_TOTAL - SPOTS_TAKEN;

type Step = { num: string; name: string; desc: string };
type Feature = { num: string; name: string; desc: string };
type Member = { photo: string; name: string; meta: string };
type Review = { photo: string; handle: string; quote: string };
type Post = { cat: string; title: string; meta: string };
type AffiliateCard = { value: string; label: string; desc: string };

// ── Smooth scroll to an in-page anchor (offset for the sticky nav) ──
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({
    top: y,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

// ── Inline email capture (hero + final) wired to the real waitlist ──
function CaptureForm({
  variant,
  confirm,
  placeholder,
  button,
}: {
  variant: 'hero' | 'final';
  confirm: string;
  placeholder: string;
  button: string;
}) {
  const source = variant === 'hero' ? 'homepage_waitlist' : 'challenge_waitlist';
  const { email, setEmail, status, submit } = useWaitlistSubmit(source);
  const joined = status === 'success' || status === 'duplicate';

  if (joined) {
    return <div className={`rh-capture-confirm rh-capture-confirm--${variant}`}>{confirm}</div>;
  }

  return (
    <form className={`rh-capture-form rh-capture-form--${variant}`} onSubmit={submit as (e: FormEvent) => void}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        className="rh-capture-input"
        disabled={status === 'submitting'}
      />
      <button type="submit" className="rh-capture-button" disabled={status === 'submitting'}>
        {status === 'submitting' ? '…' : button}
      </button>
    </form>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const location = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Honor #hash arrivals (e.g. nav "Join the club" → /#hero-capture).
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToId(id)));
  }, [location.hash, location.key]);

  const steps = t('relaunchHome.mechanism.steps', { returnObjects: true }) as Step[];
  const features = t('relaunchHome.library.features', { returnObjects: true }) as Feature[];
  const members = t('relaunchHome.community.members', { returnObjects: true }) as Member[];
  const perks = t('relaunchHome.offer.perks', { returnObjects: true }) as string[];
  const reviews = t('relaunchHome.reviews.items', { returnObjects: true }) as Review[];
  const affiliateCards = t('relaunchHome.affiliate.cards', { returnObjects: true }) as AffiliateCard[];
  const { openFoundingCheckout } = useFoundingCheckout();
  const posts = t('relaunchHome.blogTeaser.posts', { returnObjects: true }) as Post[];

  const proofStats = [
    { n: t('relaunchHome.proof.exercisesValue'), label: t('relaunchHome.proof.exercisesLabel') },
    { n: t('relaunchHome.proof.workoutsValue'), label: t('relaunchHome.proof.workoutsLabel') },
    { n: t('relaunchHome.proof.payoutValue'), label: t('relaunchHome.proof.payoutLabel') },
    { n: String(SPOTS_LEFT), label: t('relaunchHome.proof.spotsLabel') },
  ];

  return (
    <>
      <SeoHead
        title={t('relaunchHome.seo.title')}
        description={t('relaunchHome.hero.sub')}
        canonical="https://liboworld.com/"
        ogImage="https://liboworld.com/brand/og-image.png"
      />
      <SiteNav />
      <main className="relaunch-home" id="main-content">

        {/* ── HERO ── */}
        <section className="rh-hero">
          <div className="rh-hero-text">
            <div className="rh-badges">
              <span className="rh-badge rh-badge--accent">{t('relaunchHome.hero.badgeComingSoon')}</span>
              <span className="rh-badge">{t('relaunchHome.hero.badgeIos')}</span>
              <span className="rh-badge">{t('relaunchHome.hero.badgeFree')}</span>
            </div>
            <h1 className="rh-hero-h1">
              {t('relaunchHome.hero.h1Line1')}<br />
              <span className="rh-accent">{t('relaunchHome.hero.h1Accent')}</span>
            </h1>
            <p className="rh-hero-sub">{t('relaunchHome.hero.sub')}</p>
            <div className="rh-hero-ctas">
              <Link to="/money-challenges" viewTransition className="rh-btn rh-btn--primary">
                {t('relaunchHome.hero.ctaPrimary')}
              </Link>
              <a
                href="#mechanism"
                className="rh-btn rh-btn--ghost"
                onClick={(e) => { e.preventDefault(); scrollToId('mechanism'); }}
              >
                {t('relaunchHome.hero.ctaSecondary')}
              </a>
            </div>
            <div id="hero-capture" className="rh-hero-capture">
              <CaptureForm
                variant="hero"
                confirm={t('relaunchHome.hero.captureConfirm')}
                placeholder={t('relaunchHome.hero.emailPlaceholder')}
                button={t('relaunchHome.hero.captureButton')}
              />
              <p className="rh-capture-note">{t('relaunchHome.hero.captureNote')}</p>
            </div>
          </div>
          <div className="rh-hero-phones">
            <img className="rh-phone rh-phone--left" src="/hero-left.png" alt={t('relaunchHome.hero.imgAltLeft')} loading="eager" />
            <img className="rh-phone rh-phone--center" src="/hero-center.png" alt={t('relaunchHome.hero.imgAltCenter')} loading="eager" />
            <img className="rh-phone rh-phone--right" src="/hero-right.png" alt={t('relaunchHome.hero.imgAltRight')} loading="eager" />
          </div>
        </section>

        {/* ── PROOF BAR ── */}
        <section className="rh-proof">
          <div className="rh-proof-inner">
            {proofStats.map((s, i) => (
              <div className="rh-proof-cell" key={i}>
                <span className="rh-proof-num">{s.n}</span>
                <span className="rh-proof-label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── MECHANISM ── */}
        <section className="rh-mechanism" id="mechanism">
          <div className="rh-mechanism-copy">
            <div className="rh-eyebrow">{t('relaunchHome.mechanism.eyebrow')}</div>
            <h2 className="rh-h2">
              {t('relaunchHome.mechanism.h2Line1')}<br />
              <span className="rh-accent">{t('relaunchHome.mechanism.h2Accent')}</span>
            </h2>
            <p className="rh-body">{t('relaunchHome.mechanism.body')}</p>
            <blockquote className="rh-quote">
              &ldquo;{t('relaunchHome.mechanism.quote')}&rdquo;
              <footer className="rh-quote-footer">
                {t('relaunchHome.mechanism.quoteAuthor')} — {t('relaunchHome.mechanism.quoteSource')}
              </footer>
            </blockquote>
          </div>
          <div className="rh-steps">
            {steps.map((st, i) => (
              <div className="rh-card rh-step" key={st.num}>
                <span className={`rh-step-num${i === steps.length - 1 ? ' rh-step-num--accent' : ''}`}>{st.num}</span>
                <span className="rh-step-name">{st.name}</span>
                <span className="rh-step-desc">{st.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── LIBRARY ── */}
        <section className="rh-library" id="library">
          <div className="rh-library-head">
            <h2 className="rh-h2">
              {t('relaunchHome.library.h2Line1')}<br />{t('relaunchHome.library.h2Line2')}
            </h2>
            <p className="rh-library-desc">{t('relaunchHome.library.desc')}</p>
          </div>
          <div className="rh-features">
            {features.map((f, i) => (
              <div className={`rh-card rh-feature${i === 0 ? ' rh-card--elevated' : ''}`} key={f.num}>
                <span className="rh-feature-num">{f.num}</span>
                <span className="rh-feature-name">{f.name}</span>
                <span className="rh-feature-desc">{f.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── COMMUNITY ── */}
        <section className="rh-community">
          <div className="rh-community-inner">
            <div className="rh-community-head">
              <div>
                <div className="rh-eyebrow">{t('relaunchHome.community.eyebrow')}</div>
                <h2 className="rh-h2">
                  {t('relaunchHome.community.h2Line1')}<br />{t('relaunchHome.community.h2Line2')}
                </h2>
              </div>
              <p className="rh-community-desc">{t('relaunchHome.community.desc')}</p>
            </div>
            <div className="rh-members">
              {members.map((m) => (
                <div className="rh-member" key={m.name}>
                  <img className="rh-member-photo" src={`/${m.photo}`} alt={m.name} loading="lazy" />
                  <div className="rh-member-meta">
                    <span className="rh-member-name">{m.name}</span>
                    <span className="rh-member-sub">{m.meta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOUNDING MEMBER OFFER ── */}
        <section className="rh-offer">
          <div className="rh-offer-copy">
            <div className="rh-eyebrow">{t('relaunchHome.offer.eyebrow')}</div>
            <h2 className="rh-h2">
              {t('relaunchHome.offer.h2Line1')}<br />{t('relaunchHome.offer.h2Line2')}
            </h2>
            <p className="rh-body">{t('relaunchHome.offer.body')}</p>
            <button
              type="button"
              className="rh-btn rh-btn--primary rh-offer-cta"
              onClick={() => openFoundingCheckout('home_offer')}
            >
              {t('relaunchHome.offer.cta')}
            </button>
          </div>
          <div className="rh-card rh-card--elevated rh-offer-card">
            <span className="rh-badge rh-badge--accent">{t('relaunchHome.offer.cardBadge')}</span>
            <div className="rh-offer-price-row">
              <span className="rh-offer-price">{t('relaunchHome.offer.price')}</span>
              <span className="rh-offer-strike">{t('relaunchHome.offer.priceStrike')}</span>
            </div>
            <span className="rh-offer-card-sub">{t('relaunchHome.offer.cardSub')}</span>
            <div className="rh-offer-perks">
              {perks.map((p, i) => (
                <span className="rh-offer-perk" key={i}>&#10003; {p}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── BETA REVIEWS ── */}
        <section className="rh-reviews">
          <div className="rh-reviews-inner">
            <div>
              <div className="rh-eyebrow">{t('relaunchHome.reviews.eyebrow')}</div>
              <h2 className="rh-h2">{t('relaunchHome.reviews.h2')}</h2>
            </div>
            <div className="rh-reviews-grid">
              {reviews.map((r) => (
                <div className="rh-card rh-review" key={r.handle}>
                  <div className="rh-review-head">
                    <img className="rh-review-photo" src={`/${r.photo}`} alt={r.handle} loading="lazy" />
                    <span className="rh-review-handle">{r.handle}</span>
                  </div>
                  <p className="rh-review-quote">&ldquo;{r.quote}&rdquo;</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AFFILIATE / CREATORS & PARTNERS ── */}
        <section className="rh-affiliate">
          <div className="rh-affiliate-inner">
            <div className="rh-affiliate-copy">
              <div className="rh-eyebrow">{t('relaunchHome.affiliate.eyebrow')}</div>
              <h2 className="rh-h2">
                {t('relaunchHome.affiliate.h2Line1')}<br />
                <span className="rh-accent">{t('relaunchHome.affiliate.h2Accent')}</span>
              </h2>
              <p className="rh-affiliate-body">{t('relaunchHome.affiliate.body')}</p>
              <Link to="/affiliate" viewTransition className="rh-btn rh-btn--primary rh-affiliate-cta">
                {t('relaunchHome.affiliate.cta')}
              </Link>
            </div>
            <div className="rh-affiliate-cards">
              {affiliateCards.map((c, i) => (
                <div className="rh-card rh-affiliate-card" key={i}>
                  <span className="rh-affiliate-card-value">{c.value}</span>
                  <span className="rh-affiliate-card-label">{c.label}</span>
                  <p className="rh-affiliate-card-desc">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="rh-faq" id="faq">
          <h2 className="rh-h2">{t('relaunchHome.faq.headline')}</h2>
          <div className="rh-faq-list">
            {HOME_FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <div className={`rh-faq-item${open ? ' open' : ''}`} key={item.id}>
                  <button
                    className="rh-faq-q"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span>{t(item.qKey)}</span>
                    <span className="rh-faq-icon" aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                  {open && <p className="rh-faq-a">{t(item.aKey)}</p>}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FINAL CAPTURE ── */}
        <section className="rh-final">
          <div className="rh-final-inner">
            <h2 className="rh-final-h2">
              {t('relaunchHome.finalCapture.h2Line1')}<br />
              <span className="rh-accent">{t('relaunchHome.finalCapture.h2Accent')}</span>
            </h2>
            <p className="rh-final-body">
              {t('relaunchHome.finalCapture.body')}{' '}
              {t('relaunchHome.finalCapture.spotsLabel', { count: SPOTS_TAKEN })}
            </p>
            <CaptureForm
              variant="final"
              confirm={t('relaunchHome.finalCapture.confirm')}
              placeholder={t('relaunchHome.finalCapture.emailPlaceholder')}
              button={t('relaunchHome.finalCapture.button')}
            />
            <p className="rh-capture-note">{t('relaunchHome.finalCapture.note')}</p>
          </div>
        </section>

        {/* ── BLOG TEASER ── */}
        <section className="rh-blog">
          <div className="rh-blog-head">
            <h2 className="rh-blog-h2">{t('relaunchHome.blogTeaser.h2')}</h2>
            <Link to="/blog" viewTransition className="rh-blog-seeall">{t('relaunchHome.blogTeaser.seeAll')}</Link>
          </div>
          <div className="rh-blog-grid">
            {posts.map((p, i) => (
              <Link to="/blog" viewTransition className="rh-card rh-card--outlined rh-blog-card" key={i}>
                <span className="rh-blog-cat">{p.cat}</span>
                <span className="rh-blog-title">{p.title}</span>
                <span className="rh-blog-meta">{p.meta}</span>
              </Link>
            ))}
          </div>
        </section>

      </main>
      <SiteFooter />
    </>
  );
}
