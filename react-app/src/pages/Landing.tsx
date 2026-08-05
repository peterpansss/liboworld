import { useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import ScrollRevealText from '../components/ScrollRevealText';
import { usePopIn } from '../utils/funnelAnimations';
import { useWaitlistSubmit } from '../hooks/useWaitlistSubmit';
import { CHALLENGE_TIERS } from '../data/challengeTiers';
import './Landing.css';

// ── Smooth scroll to an in-page anchor (offset for the sticky nav) ──
//
// Still needed: /membership links to "/#hero-capture", and that id now lives on
// the one and only email capture at the bottom of this page.
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({
    top: y,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

/**
 * The site's ONLY email capture (MASTER-HANDOFF §14, HANDOFF-V2 "Funnel vs.
 * waitlist split"). Submitting is a FREE ask and always ends in a plain inline
 * confirmation — it must NEVER open payment. The Founding Member funnel is a
 * separate, explicitly-labelled link rendered below the confirmed state.
 *
 * `duplicate` is treated as success: the address is on the list either way and
 * telling someone "you already signed up" is a worse outcome than confirming.
 */
function WaitlistCapture() {
  const { t } = useTranslation();
  const { email, setEmail, status, errorMessage, submit } = useWaitlistSubmit('homepage_waitlist');
  const joined = status === 'success' || status === 'duplicate';

  if (joined) {
    return (
      <div className="rh-wl-joined">
        <p className="rh-wl-confirm">
          {t('relaunchHome.waitlist.confirm', { defaultValue: "You're on the list ✓" })}
        </p>
        <p className="rh-wl-note">
          {t('relaunchHome.waitlist.confirmNote', { defaultValue: 'We email you at launch. No spam.' })}
        </p>
        <p className="rh-wl-footnote">
          <Link to="/join" viewTransition className="rh-accent-link">
            {t('relaunchHome.waitlist.fmFootnote', {
              defaultValue: 'Want in before launch? Become a Founding Member →',
            })}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <form className="rh-wl-form" onSubmit={submit as (e: FormEvent) => void}>
        <label className="rh-wl-label" htmlFor="rh-waitlist-email">
          {t('relaunchHome.waitlist.label', { defaultValue: 'Email address' })}
        </label>
        <input
          id="rh-waitlist-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('relaunchHome.waitlist.placeholder', { defaultValue: 'Your email' })}
          className="rh-wl-input"
          disabled={status === 'submitting'}
          autoComplete="email"
        />
        <button type="submit" className="rh-wl-button" disabled={status === 'submitting'}>
          {status === 'submitting'
            ? t('relaunchHome.waitlist.buttonBusy', { defaultValue: 'Sending…' })
            : t('relaunchHome.waitlist.button', { defaultValue: 'Join the waitlist' })}
        </button>
      </form>
      <p className="rh-wl-note">
        {t('relaunchHome.waitlist.note', { defaultValue: 'We email you at launch. No spam.' })}
      </p>
      {status === 'error' && (
        <p className="rh-wl-error" role="alert">{errorMessage}</p>
      )}
      <p className="rh-wl-footnote">
        <Link to="/join" viewTransition className="rh-accent-link">
          {t('relaunchHome.waitlist.fmFootnote', {
            defaultValue: 'Want in before launch? Become a Founding Member →',
          })}
        </Link>
      </p>
    </>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const location = useLocation();

  // Pop-in cards: mounted ONCE for the whole page. Every card marked
  // `data-popin` is picked up — "How Libo is different", creator stats, guides.
  usePopIn();

  // Honor #hash arrivals (e.g. /membership → "/#hero-capture").
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToId(id)));
  }, [location.hash, location.key]);

  // ── "How Libo is different" — the four mechanics, spelled out.
  // Built from MASTER §14 ("Decision removed" etc.) + HANDOFF-V2's
  // "Consistency, with receipts" description; the captured band cut off before
  // the cards, so the copy below is authored, not traced.
  const differentCards = [
    {
      num: '01',
      name: t('relaunchHome.different.card1Name', { defaultValue: 'Decision removed' }),
      desc: t('relaunchHome.different.card1Desc', {
        defaultValue:
          "The day's session is already picked when you open the app. Nothing to plan, nothing to scroll, nothing to negotiate with yourself.",
      }),
    },
    {
      num: '02',
      name: t('relaunchHome.different.card2Name', { defaultValue: 'A streak that bends' }),
      desc: t('relaunchHome.different.card2Desc', {
        defaultValue:
          'A bad week sets your streak back — never to zero. Freeze tokens cover a missed day so one slip never costs you the whole run.',
      }),
    },
    {
      num: '03',
      name: t('relaunchHome.different.card3Name', { defaultValue: 'Receipts, not promises' }),
      desc: t('relaunchHome.different.card3Desc', {
        defaultValue:
          'Every session is logged and every challenge rep is recorded in-app. Your consistency becomes a record you can point at.',
      }),
    },
    {
      num: '04',
      name: t('relaunchHome.different.card4Name', { defaultValue: 'Real stakes, when you want them' }),
      desc: t('relaunchHome.different.card4Desc', {
        defaultValue:
          'Ready for pressure? A cash challenge pays €5, €15 or €50 for 30 days straight — funded by Libo, set aside the moment you join.',
      }),
    },
  ];

  // ── "Inside the app" floating captions — cash-challenge mechanics only.
  // HANDOFF-V2 "Inside-the-app showcase": never general training features.
  const appCaptions = [
    {
      title: t('relaunchHome.insideApp.cap1Title', { defaultValue: 'Rep verification' }),
      sub: t('relaunchHome.insideApp.cap1Sub', { defaultValue: 'on camera · no way to cheat' }),
      accent: false,
    },
    {
      title: t('relaunchHome.insideApp.cap2Title', { defaultValue: 'Real cash' }),
      sub: t('relaunchHome.insideApp.cap2Sub', { defaultValue: 'no points, no gift cards' }),
      accent: true,
    },
    {
      title: t('relaunchHome.insideApp.cap3Title', { defaultValue: '30 days straight' }),
      sub: t('relaunchHome.insideApp.cap3Sub', { defaultValue: 'one rep target · every day' }),
      accent: false,
    },
    {
      title: t('relaunchHome.insideApp.cap4Title', { defaultValue: 'Freeze tokens' }),
      sub: t('relaunchHome.insideApp.cap4Sub', { defaultValue: 'cover a missed day · keep the run alive' }),
      accent: false,
    },
  ];

  // ── Community rail. Order is fixed by HANDOFF-V2 §B5: Thao first, Noah is
  // NOT in this row (the founder lives on /founder only).
  const members = [
    {
      photo: 'beta-thao.png',
      name: t('relaunchHome.community.m1Name', { defaultValue: 'Thao' }),
      meta: t('relaunchHome.community.m1Meta', { defaultValue: '@redtao_ · 25, yoga + bodyweight' }),
    },
    {
      photo: 'beta-sarah.png',
      name: t('relaunchHome.community.m2Name', { defaultValue: 'Somin' }),
      meta: t('relaunchHome.community.m2Meta', { defaultValue: '@somin · earned €15, kept the streak' }),
    },
    {
      photo: 'beta-danny.png',
      name: t('relaunchHome.community.m3Name', { defaultValue: 'Guilherme' }),
      meta: t('relaunchHome.community.m3Meta', { defaultValue: '@guilherme · 30 min + dumbbells' }),
    },
    {
      photo: 'beta-marco.png',
      name: t('relaunchHome.community.m4Name', { defaultValue: 'Gabriel' }),
      meta: t('relaunchHome.community.m4Meta', { defaultValue: '@gabriel · AI plans convert' }),
    },
    {
      photo: 'beta-paul.png',
      name: t('relaunchHome.community.m5Name', { defaultValue: 'Tony' }),
      meta: t('relaunchHome.community.m5Meta', { defaultValue: '@tony · 63, mobility plans' }),
    },
  ];

  // ── Early reviews. Live beta copy, carried over verbatim EXCEPT the one
  // clause that breaks the canon rules: "@somin · won €10" — "win" is banned
  // ("earn"), and €10 is a superseded tier (€5 / €15 / €50).
  const reviews = [
    {
      photo: 'beta-thao.png',
      handle: '@redtao_',
      quote: t('relaunchHome.reviews.q1', {
        defaultValue:
          "not a gym person at all. came for the yoga + bodyweight flows, stayed for the streaks. finally an app that doesn't shove barbells at me — my mobility's the best it's ever been.",
      }),
    },
    {
      photo: 'beta-sarah.png',
      handle: '@somin',
      quote: t('relaunchHome.reviews.q2', {
        defaultValue:
          'BETA TESTING LIBO FOR 6 WEEKS AND IM HOOKED. my form on squats is so much better. earned €15 on the cash challenge but the streak is what got me',
      }),
    },
    {
      photo: 'beta-danny.png',
      handle: '@guilherme',
      quote: t('relaunchHome.reviews.q3', {
        defaultValue:
          "im usually so bad with apps but libo's plans actually make sense. told it i have 30 min and dumbbells and it built me something real. no fluff.",
      }),
    },
    {
      photo: 'beta-marco.png',
      handle: '@gabriel',
      quote: t('relaunchHome.reviews.q4', {
        defaultValue:
          'joined the libo beta with low expectations. the AI workout generator is better than my old PT, not even close',
      }),
    },
    {
      photo: 'beta-paul.png',
      handle: '@tony',
      quote: t('relaunchHome.reviews.q5', {
        defaultValue:
          '63 and skeptical about gym-bro apps. picked up libo in the beta and... the mobility plans are unreal. rewards thing is dumb fun. 2 months in',
      }),
    },
  ];

  // ── Creator Program stats (pop-in). Mirrors the live /creator-program page.
  const creatorCards = [
    {
      value: t('relaunchHome.creators.c1Value', { defaultValue: '25%' }),
      label: t('relaunchHome.creators.c1Label', { defaultValue: 'Lifetime commission' }),
      desc: t('relaunchHome.creators.c1Desc', {
        defaultValue: 'On every subscription payment your members make — not just the first one.',
      }),
    },
    {
      value: t('relaunchHome.creators.c2Value', { defaultValue: '∞' }),
      label: t('relaunchHome.creators.c2Label', { defaultValue: 'Recurring' }),
      desc: t('relaunchHome.creators.c2Desc', {
        defaultValue: 'You earn every month your member stays subscribed. No cap, no expiry.',
      }),
    },
    {
      value: t('relaunchHome.creators.c3Value', { defaultValue: '60d' }),
      label: t('relaunchHome.creators.c3Label', { defaultValue: 'Cookie window' }),
      desc: t('relaunchHome.creators.c3Desc', {
        defaultValue: 'Two months for a click to turn into a member. You still get credited.',
      }),
    },
  ];

  // ── Guides teaser (pop-in). Cards hug their content — no fixed height.
  const posts = [
    {
      cat: t('relaunchHome.guides.p1Cat', { defaultValue: 'Founder story' }),
      title: t('relaunchHome.guides.p1Title', { defaultValue: '30 Days, One Habit, Real Money' }),
      meta: t('relaunchHome.guides.p1Meta', { defaultValue: 'Noah F. · 6 min read' }),
    },
    {
      cat: t('relaunchHome.guides.p2Cat', { defaultValue: 'Training' }),
      title: t('relaunchHome.guides.p2Title', { defaultValue: 'How to Lose Fat and Stay Lean' }),
      meta: t('relaunchHome.guides.p2Meta', { defaultValue: '8 min read' }),
    },
    {
      cat: t('relaunchHome.guides.p3Cat', { defaultValue: 'Nutrition' }),
      title: t('relaunchHome.guides.p3Title', { defaultValue: 'Simple High-Protein Meals in 15 Minutes' }),
      meta: t('relaunchHome.guides.p3Meta', { defaultValue: '5 min read' }),
    },
  ];

  const seoDescription = t('relaunchHome.seo.descriptionV2', {
    defaultValue:
      "Libo is a training club built for consistency. The day's session is handed to you, your streak never resets to zero, and a cash challenge pays €5, €15 or €50 for 30 days straight.",
  });

  return (
    <>
      <SeoHead
        title={t('relaunchHome.seo.titleV2', { defaultValue: 'Libo — The end of starting over.' })}
        description={seoDescription}
        canonical="https://liboworld.com/"
        ogImage="https://liboworld.com/brand/og-image.png"
      />
      <SiteNav />
      <main className="relaunch-home" id="main-content">

        {/* ── 1. HERO ─────────────────────────────────────────────── */}
        <section className="rh-hero">
          <div className="rh-hero-text">
            <div className="rh-badges">
              <span className="rh-badge rh-badge--accent">
                {t('relaunchHome.hero.pillSoon', { defaultValue: 'Coming soon' })}
              </span>
              <span className="rh-badge">
                {t('relaunchHome.hero.pillPlatforms', { defaultValue: 'iOS & Android' })}
              </span>
              <span className="rh-badge">
                {t('relaunchHome.hero.pillTier', { defaultValue: 'Free tier' })}
              </span>
            </div>

            {/* Four display lines on desktop; the two groups collapse to two
                lines at ≤700px ("THE END OF" / "STARTING OVER."). */}
            <h1 className="rh-hero-h1">
              <span className="rh-hero-h1-group">
                <span className="rh-hero-h1-line">
                  {t('relaunchHome.hero.h1a', { defaultValue: 'The end' })}
                </span>{' '}
                <span className="rh-hero-h1-line">
                  {t('relaunchHome.hero.h1b', { defaultValue: 'of' })}
                </span>
              </span>
              <span className="rh-hero-h1-group rh-accent">
                <span className="rh-hero-h1-line">
                  {t('relaunchHome.hero.h1c', { defaultValue: 'Starting' })}
                </span>{' '}
                <span className="rh-hero-h1-line">
                  {t('relaunchHome.hero.h1d', { defaultValue: 'over.' })}
                </span>
              </span>
            </h1>

            <p className="rh-hero-sub">
              {t('relaunchHome.hero.body', {
                defaultValue:
                  "You've restarted 10, 15 times. Libo gets you 30 days straight — the day's training handed to you, a streak that never resets to zero, and when you're ready, a cash challenge with real money on the line.",
              })}
            </p>

            <div className="rh-hero-ctas">
              <Link to="/join" viewTransition className="rh-btn rh-btn--primary">
                {t('relaunchHome.hero.cta', { defaultValue: 'Enter the club →' })}
              </Link>
            </div>
          </div>

          <div className="rh-hero-phones">
            <img
              className="rh-phone rh-phone--left"
              src="/app-real-rewards.png"
              alt={t('relaunchHome.hero.altLeft', {
                defaultValue: 'Libo Rewards tab — points, streak and the challenges you can join',
              })}
              loading="eager"
              width={1206}
              height={2622}
            />
            <img
              className="rh-phone rh-phone--center"
              src="/app-real-home.png"
              alt={t('relaunchHome.hero.altCenter', {
                defaultValue: "Libo home screen — today's challenge, active plan and today's workout",
              })}
              loading="eager"
              width={1206}
              height={2622}
            />
            {/* KEEP THIS VIDEO. The live hero screen recording beats every
                static capture in the handoff — MASTER-HANDOFF "Hero screen
                recording" and HANDOFF-V2 "Hero phone frames". The canvas shows
                a still here only because it cannot embed video. */}
            <video
              className="rh-phone rh-phone--right"
              src="/hero-right.mp4"
              poster="/hero-right-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label={t('relaunchHome.hero.altRight', {
                defaultValue: 'Screen recording of a Libo challenge day in the app',
              })}
            />
          </div>
        </section>

        {/* ── 2. THE LOOP ─────────────────────────────────────────── */}
        <section className="rh-loop" id="the-loop">
          <div className="rh-loop-inner">
            <p className="rh-eyebrow rh-eyebrow--center">
              {t('relaunchHome.loop.eyebrow', { defaultValue: 'The loop' })}
            </p>
            <h2 className="rh-h2 rh-h2--center">
              <ScrollRevealText as="span" className="rh-h2-line">
                {t('relaunchHome.loop.h2a', { defaultValue: 'Motivated in week' })}
              </ScrollRevealText>
              <ScrollRevealText as="span" className="rh-h2-line">
                {t('relaunchHome.loop.h2b', { defaultValue: 'one.' })}
              </ScrollRevealText>
              {/* Third line lands on --muted, not lime: it is the failure half
                  of the sentence. Lime is reserved for what Libo does. */}
              <ScrollRevealText as="span" className="rh-h2-line rh-reveal--muted">
                {t('relaunchHome.loop.h2c', { defaultValue: 'Gone by week four.' })}
              </ScrollRevealText>
            </h2>
            {/* The one body paragraph the reveal spec allows (the "mission"
                paragraph). Everything else on this page stays a plain <p>. */}
            <ScrollRevealText as="p" className="rh-loop-body">
              {t('relaunchHome.loop.body', {
                defaultValue:
                  "It's not a discipline problem. Every restart forces a hundred small decisions — what to train, when, whether today counts. Decisions drain. Libo removes them: the day's session is picked, a bad week sets your streak back — never to zero — and when you want real stakes, the cash challenge is waiting.",
              })}
            </ScrollRevealText>
          </div>
        </section>

        {/* ── 3. HOW LIBO IS DIFFERENT ────────────────────────────── */}
        <section className="rh-different">
          <div className="rh-different-copy">
            <p className="rh-eyebrow">
              {t('relaunchHome.different.eyebrow', { defaultValue: 'How Libo is different' })}
            </p>
            <h2 className="rh-h2">
              <ScrollRevealText as="span" className="rh-h2-line">
                {t('relaunchHome.different.h2a', { defaultValue: 'Consistency,' })}
              </ScrollRevealText>
              <ScrollRevealText as="span" className="rh-h2-line rh-reveal--accent">
                {t('relaunchHome.different.h2b', { defaultValue: 'with receipts.' })}
              </ScrollRevealText>
            </h2>
            <p className="rh-body">
              {t('relaunchHome.different.body', {
                defaultValue:
                  'Most apps sell motivation and leave the hard part to you. Libo is built around the only thing that decides results — coming back tomorrow. Every mechanic below exists to protect the run, and every day you train leaves a receipt.',
              })}
            </p>
          </div>
          <div className="rh-different-cards">
            {differentCards.map((c) => (
              <article className="rh-card rh-diff-card" data-popin key={c.num}>
                <span className="rh-diff-num">{c.num}</span>
                <h3 className="rh-diff-name">{c.name}</h3>
                <p className="rh-diff-desc">{c.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── 4. INSIDE THE APP ───────────────────────────────────── */}
        <section className="rh-inside">
          <div className="rh-inside-inner">
            <p className="rh-eyebrow rh-eyebrow--center">
              {t('relaunchHome.insideApp.eyebrow', { defaultValue: 'Inside the app' })}
            </p>
            <h2 className="rh-h2 rh-h2--center">
              <ScrollRevealText as="span" className="rh-h2-line">
                {t('relaunchHome.insideApp.h2a', { defaultValue: 'Experience a club' })}
              </ScrollRevealText>
              <ScrollRevealText as="span" className="rh-h2-line">
                {t('relaunchHome.insideApp.h2b', { defaultValue: 'built' })}
              </ScrollRevealText>
              <ScrollRevealText as="span" className="rh-h2-line rh-reveal--accent">
                {t('relaunchHome.insideApp.h2c', { defaultValue: 'for consistency.' })}
              </ScrollRevealText>
            </h2>

            <div className="rh-inside-stage">
              <div className="rh-inside-caps rh-inside-caps--left">
                {appCaptions.slice(0, 2).map((c) => (
                  <div className="rh-inside-cap" key={c.title}>
                    <span className={`rh-inside-cap-title${c.accent ? ' rh-accent' : ''}`}>{c.title}</span>
                    <span className="rh-inside-cap-sub">{c.sub}</span>
                  </div>
                ))}
              </div>

              <div className="rh-inside-phone-wrap">
                {/*
                  ─── VIDEO SWAP POINT ───────────────────────────────────────
                  HANDOFF-V2 "Inside-the-app showcase" calls for a muted
                  autoplay loop screen recording of a challenge day (timer, rep
                  counter, camera verification) here. That file does not exist
                  in the repo yet, so the static capture stands in.

                  When the recording lands, drop it in public/ and replace the
                  <img> below with, keeping the same class:

                    <video
                      className="rh-inside-phone"
                      src="/inside-challenge-day.mp4"
                      poster="/app-real-run.png"
                      autoPlay muted loop playsInline preload="metadata"
                      aria-label={t('relaunchHome.insideApp.phoneAlt')}
                    />

                  .rh-inside-phone already styles both element types.
                  ────────────────────────────────────────────────────────────
                */}
                <img
                  className="rh-inside-phone"
                  src="/app-real-run.png"
                  alt={t('relaunchHome.insideApp.phoneAlt', {
                    defaultValue:
                      'A Libo challenge day in the app — 50 reps × 30 days, day 2 of 30, with the daily recording ready to start',
                  })}
                  loading="lazy"
                  width={1206}
                  height={2622}
                />
              </div>

              <div className="rh-inside-caps rh-inside-caps--right">
                {appCaptions.slice(2).map((c) => (
                  <div className="rh-inside-cap" key={c.title}>
                    <span className={`rh-inside-cap-title${c.accent ? ' rh-accent' : ''}`}>{c.title}</span>
                    <span className="rh-inside-cap-sub">{c.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. CASH CHALLENGES ──────────────────────────────────── */}
        {/* Critical on mobile: the challenges must be reachable from home
            without opening the nav (HANDOFF-V2 §B9). */}
        <section className="rh-challenges" id="cash-challenges">
          <div className="rh-challenges-inner">
            <div className="rh-challenges-head">
              <p className="rh-eyebrow">
                {t('relaunchHome.challenges.eyebrow', { defaultValue: 'Cash challenges' })}
              </p>
              <h2 className="rh-h2">
                <ScrollRevealText as="span" className="rh-h2-line">
                  {t('relaunchHome.challenges.h2a', { defaultValue: 'Pick your' })}
                </ScrollRevealText>
                <ScrollRevealText as="span" className="rh-h2-line">
                  {t('relaunchHome.challenges.h2b', { defaultValue: 'challenge.' })}
                </ScrollRevealText>
              </h2>
            </div>

            {/* All three cards are visually IDENTICAL — no tier pills, no
                availability signal, no live counters. Mechanics only. */}
            <div className="rh-challenge-grid">
              {CHALLENGE_TIERS.map((tier) => (
                <Link
                  to={`/cash-challenges/${tier.slug}`}
                  viewTransition
                  className="rh-cc-card"
                  key={tier.slug}
                >
                  <img
                    className="rh-cc-photo"
                    src={tier.image}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                  />
                  <div className="rh-cc-body">
                    <span className="rh-cc-payout">€{tier.payout}</span>
                    <span className="rh-cc-name">{tier.name}</span>
                    <span className="rh-cc-meta">
                      {t('relaunchHome.challenges.meta', {
                        defaultValue: '{{reps}} reps / day · {{days}} days · {{spots}} spots',
                        reps: tier.reps,
                        days: tier.days,
                        spots: tier.spots,
                      })}
                    </span>
                    <span className="rh-cc-cta">
                      {t('relaunchHome.challenges.cardCta', { defaultValue: 'View challenge →' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <Link to="/cash-challenges" viewTransition className="rh-challenges-all rh-accent-link">
              {t('relaunchHome.challenges.allCta', { defaultValue: 'All challenges →' })}
            </Link>
          </div>
        </section>

        {/* ── 6. THE LIBO COMMUNITY ───────────────────────────────── */}
        <section className="rh-community">
          <div className="rh-community-inner">
            <div className="rh-community-head">
              <div className="rh-community-heading">
                <p className="rh-eyebrow">
                  {t('relaunchHome.community.eyebrowV2', { defaultValue: 'The Libo community' })}
                </p>
                <h2 className="rh-h2">
                  <ScrollRevealText as="span" className="rh-h2-line">
                    {t('relaunchHome.community.h2a', { defaultValue: 'A club that' })}
                  </ScrollRevealText>
                  <ScrollRevealText as="span" className="rh-h2-line">
                    {t('relaunchHome.community.h2b', { defaultValue: 'trains' })}
                  </ScrollRevealText>
                  <ScrollRevealText as="span" className="rh-h2-line">
                    {t('relaunchHome.community.h2c', { defaultValue: 'with you.' })}
                  </ScrollRevealText>
                </h2>
              </div>
              <p className="rh-community-desc">
                {t('relaunchHome.community.descV2', {
                  defaultValue:
                    'Real people, real faces. Logging reps, hitting streaks. No coaches or influencers selling courses. Just members showing up every day.',
                })}
              </p>
            </div>

            <div
              className="rh-member-rail"
              role="group"
              aria-label={t('relaunchHome.community.railLabel', { defaultValue: 'Libo members' })}
            >
              {members.map((m) => (
                <figure className="rh-member" key={m.name}>
                  <img className="rh-member-photo" src={`/${m.photo}`} alt={m.name} loading="lazy" />
                  <figcaption className="rh-member-meta">
                    <span className="rh-member-name">{m.name}</span>
                    <span className="rh-member-sub">{m.meta}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. EARLY REVIEWS ────────────────────────────────────── */}
        <section className="rh-reviews">
          <div className="rh-reviews-inner">
            <div>
              <p className="rh-eyebrow">
                {t('relaunchHome.reviews.eyebrowV2', { defaultValue: 'Beta program' })}
              </p>
              <h2 className="rh-h2">
                <ScrollRevealText as="span" className="rh-h2-line">
                  {t('relaunchHome.reviews.h2V2', { defaultValue: 'Early reviews.' })}
                </ScrollRevealText>
              </h2>
            </div>
            <div className="rh-reviews-grid">
              {reviews.map((r) => (
                <div className="rh-card rh-review" key={r.handle}>
                  <div className="rh-review-head">
                    <img className="rh-review-photo" src={`/${r.photo}`} alt="" aria-hidden="true" loading="lazy" />
                    <span className="rh-review-handle">{r.handle}</span>
                  </div>
                  <p className="rh-review-quote">&ldquo;{r.quote}&rdquo;</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8. CREATORS ─────────────────────────────────────────── */}
        <section className="rh-creators">
          <div className="rh-creators-inner">
            <div className="rh-creators-copy">
              <p className="rh-eyebrow">
                {t('relaunchHome.creators.eyebrow', { defaultValue: 'Creator Program' })}
              </p>
              <h2 className="rh-h2">
                <ScrollRevealText as="span" className="rh-h2-line">
                  {t('relaunchHome.creators.h2a', { defaultValue: 'Your audience trains.' })}
                </ScrollRevealText>
                <ScrollRevealText as="span" className="rh-h2-line rh-reveal--accent">
                  {t('relaunchHome.creators.h2b', { defaultValue: 'You earn 25% for life.' })}
                </ScrollRevealText>
              </h2>
              <p className="rh-body">
                {t('relaunchHome.creators.body', {
                  defaultValue:
                    'Every member you bring pays you 25% of their subscription — for as long as they stay. Built for creators with 5K+ followers who actually train.',
                })}
              </p>
              <Link to="/creator-program" viewTransition className="rh-btn rh-btn--primary">
                {t('relaunchHome.creators.cta', { defaultValue: 'See the Creator Program →' })}
              </Link>
            </div>
            <div className="rh-creator-cards">
              {creatorCards.map((c) => (
                <article className="rh-card rh-creator-card" data-popin key={c.label}>
                  <span className="rh-creator-value">{c.value}</span>
                  <span className="rh-creator-label">{c.label}</span>
                  <p className="rh-creator-desc">{c.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── 9. GUIDES ───────────────────────────────────────────── */}
        <section className="rh-guides">
          <div className="rh-guides-head">
            <h2 className="rh-h2 rh-h2--sm">
              <ScrollRevealText as="span" className="rh-h2-line">
                {t('relaunchHome.guides.h2', { defaultValue: 'Guides & insights.' })}
              </ScrollRevealText>
            </h2>
            <Link to="/blog" viewTransition className="rh-guides-all">
              {t('relaunchHome.guides.seeAll', { defaultValue: 'See all posts →' })}
            </Link>
          </div>
          <div className="rh-guides-grid">
            {posts.map((p) => (
              <Link
                to="/blog"
                viewTransition
                className="rh-card rh-card--outlined rh-guide-card"
                data-popin
                key={p.title}
              >
                <span className="rh-guide-cat">{p.cat}</span>
                <span className="rh-guide-title">{p.title}</span>
                <span className="rh-guide-meta">{p.meta}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 10. FINAL CTA + WAITLIST ────────────────────────────── */}
        {/* `hero-capture` keeps its name: /membership still deep-links to
            "/#hero-capture", and this is now the site's only capture. */}
        <section className="rh-final" id="hero-capture">
          <div className="rh-final-inner">
            <h2 className="rh-h2 rh-h2--center rh-h2--lg">
              <ScrollRevealText as="span" className="rh-h2-line">
                {t('relaunchHome.final.h2a', { defaultValue: 'Your 30 days' })}
              </ScrollRevealText>
              <ScrollRevealText as="span" className="rh-h2-line rh-reveal--accent">
                {t('relaunchHome.final.h2b', { defaultValue: 'start here.' })}
              </ScrollRevealText>
            </h2>
            <p className="rh-final-body">
              {t('relaunchHome.final.body', {
                defaultValue:
                  "Libo launches on iOS and Android. Leave your email and we'll tell you the moment the doors open.",
              })}
            </p>
            <WaitlistCapture />
          </div>
        </section>

      </main>
      <SiteFooter />
    </>
  );
}
