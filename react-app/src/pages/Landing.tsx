import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import ScrollRevealText from '../components/ScrollRevealText';
import StoreBadges from '../components/StoreBadges';
import VideoTestimonials from '../components/VideoTestimonials';
import HomeEarn from '../components/earn/HomeEarn';
import HomeAd from '../components/HomeAd';
import SiteIntro from '../components/SiteIntro';
import { Ribbons } from '../components/motion/Motion';
import { usePopIn } from '../utils/funnelAnimations';
import { CHALLENGE_TIERS } from '../data/challengeTiers';
import { POINTS_ACTIONS } from '../data/pointsTable';
import { buildTestimonialVideoGraph } from '../data/testimonialVideos';
import './Landing.css';

// ── Smooth scroll to an in-page anchor (offset for the sticky nav) ──
//
// Two live targets on this page: "#hero-capture" (the download block in the
// hero — the site header and /membership link straight to it) and "#waitlist"
// (the bottom block, linked from the funnels). Both were email captures until
// 3 Nov 2026; the ids are kept because other pages and outside links point at
// them, but neither collects an address any more.
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({
    top: y,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

// Number of features in "Everything you get" (libraryCards). The pinned scene
// splits its scroll length into this many steps.
const FEATURE_COUNT = 6;

export default function Landing() {
  const { t } = useTranslation();
  const location = useLocation();

  // Pop-in cards: mounted ONCE for the whole page. Every card marked
  // `data-popin` is picked up — "How Libo is different", creator stats, guides.
  usePopIn();

  // "Everything you get": which feature the phone shows. Starts on 01; the
  // scene below moves it with the scroll.
  const [activeFeature, setActiveFeature] = useState(0);
  const sceneRef = useRef<HTMLDivElement>(null);

  // While the hero's own store badges are on screen, the fixed bottom badge
  // bar (SiteNav) stays tucked away so the badges never show twice at once.
  useEffect(() => {
    const el = document.getElementById('hero-capture');
    const root = document.documentElement;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      root.dataset.heroBadges = e.isIntersecting ? 'in' : 'out';
    });
    io.observe(el);
    return () => { io.disconnect(); delete root.dataset.heroBadges; };
  }, []);

  // Pinned scene (Noah, 18 Nov 2026, replaces the card list that scrolled past
  // a sticky phone): the section is several screens tall and its inner stage
  // pins to the viewport; how far you have scrolled through it picks the
  // feature, so the phone and the one visible text block always change
  // together. Every screen size, phones included (Noah, same day).
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const p = Math.min(Math.max(-el.getBoundingClientRect().top / total, 0), 0.9999);
      setActiveFeature(Math.floor(p * FEATURE_COUNT));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  // A progress segment: scroll to that step.
  const goToFeature = (i: number) => {
    const el = sceneRef.current;
    const total = el ? el.offsetHeight - window.innerHeight : 0;
    if (!el || total <= 0) { setActiveFeature(i); return; }
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (total * (i + 0.5)) / FEATURE_COUNT, behavior: 'smooth' });
  };

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
        defaultValue: "Today's session is picked for you.",
      }),
    },
    {
      num: '02',
      name: t('relaunchHome.different.card2Name', { defaultValue: 'Streak protected' }),
      desc: t('relaunchHome.different.card2Desc', {
        defaultValue: 'A miss subtracts a day, never back to zero.',
      }),
    },
    {
      num: '03',
      // Was "Cash challenge", which repeated the challenge band below (Noah, 18 Nov 2026).
      name: t('relaunchHome.different.card3RewardsName', { defaultValue: 'Rewards system' }),
      desc: t('relaunchHome.different.card3RewardsDesc', {
        n: POINTS_ACTIONS[0].base,
        defaultValue: '+{{n}} points every workout. Spend them on gift cards and cash.',
      }),
    },
  ];

  // ── "Everything you get" — Cal-AI-style interactive phone + card list.
  // Current app screens (iOS 8.4.1 captures, 17 Nov 2026; replaced the
  // 7 Aug set). Shared with the earn pages in /app-screens/.
  const libraryCards = [
    {
      num: '01',
      name: t('relaunchHome.library.c1Name', { defaultValue: 'Exercise library' }),
      desc: t('relaunchHome.library.c1Desc', {
        defaultValue: '820+ exercises: 432 gym, 396 home. Every one with equipment notes and form cues.',
      }),
      descMobile: t('relaunchHome.library.c1DescMobile', {
        defaultValue: '820+ exercises with equipment notes and form cues.',
      }),
      screen: '/app-screens/library.webp?v=1',
    },
    {
      num: '02',
      name: t('relaunchHome.library.c2Name', { defaultValue: 'Workout library' }),
      desc: t('relaunchHome.library.c2Desc', {
        defaultValue: '140 pre-built sessions: gym, home, cardio, stretching, morning routines. 5 to 60 minutes.',
      }),
      descMobile: t('relaunchHome.library.c2DescMobile', {
        defaultValue: '140 pre-built sessions, 5 to 60 minutes.',
      }),
      screen: '/app-screens/explore.webp?v=1',
    },
    {
      num: '03',
      name: t('relaunchHome.library.c3Name', { defaultValue: 'Workout generator' }),
      desc: t('relaunchHome.library.c3Desc', {
        defaultValue: 'Tell Libo your time and equipment. It builds a real session around your goal and level.',
      }),
      descMobile: t('relaunchHome.library.c3DescMobile', {
        defaultValue: 'Tell Libo your time and equipment. It builds the session.',
      }),
      screen: '/app-screens/generator.webp?v=1',
    },
    {
      num: '04',
      name: t('relaunchHome.library.c4Name', { defaultValue: 'Progress tracking' }),
      desc: t('relaunchHome.library.c4Desc', {
        defaultValue: 'Every set, rep, and weight logged. History, PRs, and streaks in clear charts.',
      }),
      descMobile: t('relaunchHome.library.c4DescMobile', {
        defaultValue: 'Every set, rep, and weight logged. PRs and streaks.',
      }),
      screen: '/app-screens/progress.webp?v=1',
    },
    {
      num: '05',
      name: t('relaunchHome.library.c5Name', { defaultValue: 'Custom builder' }),
      desc: t('relaunchHome.library.c5Desc', {
        defaultValue: 'Build your own workout from the full library. Set sequence, sets, rest, then save and reuse.',
      }),
      descMobile: t('relaunchHome.library.c5DescMobile', {
        defaultValue: 'Build your own workout from the full library.',
      }),
      screen: '/app-screens/plan-editor.webp?v=1',
    },
    {
      num: '06',
      name: t('relaunchHome.library.c6Name', { defaultValue: 'Cash challenges' }),
      desc: t('relaunchHome.library.c6Desc', {
        defaultValue: '30 days of daily reps with real money as the proof of consistency. Details on the challenge page.',
      }),
      descMobile: t('relaunchHome.library.c6DescMobile', {
        defaultValue: '30 days of daily reps with real money as the proof.',
      }),
      screen: '/app-screens/challenges.webp?v=1',
    },
  ];

  // ── "From one rep to a habit" ladder — desktop only.
  const habitSteps = [
    {
      name: t('relaunchHome.habit.s1Name', { defaultValue: 'Show up' }),
      desc: t('relaunchHome.habit.s1Desc', {
        defaultValue: "One session, handed to you. No planning, no decisions, just today's work.",
      }),
      screen: '/app-screens/home.webp?v=1',
    },
    {
      name: t('relaunchHome.habit.s2Name', { defaultValue: 'Hold the streak' }),
      desc: t('relaunchHome.habit.s2Desc', {
        defaultValue: 'Day by day the streak grows, protected by freeze tokens, and never reset to zero.',
      }),
      screen: '/app-screens/streak.webp?v=1',
    },
    {
      name: t('relaunchHome.habit.s3Name', { defaultValue: 'Become someone who trains' }),
      desc: t('relaunchHome.habit.s3Desc', {
        defaultValue: "After 30 days it isn't a challenge anymore. It's who you are. That's the product.",
      }),
      screen: '/app-screens/progress.webp?v=1',
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
  // Order is the owner's call (20 Sep 2026): Gabriel leads. Cast unchanged.
  const members = [
    {
      photo: 'beta-marco.png',
      name: t('relaunchHome.community.m4Name', { defaultValue: 'Gabriel' }),
      meta: t('relaunchHome.community.m4Meta', { defaultValue: '@gabriel · generated plans convert' }),
    },
    {
      photo: 'beta-thao.png',
      name: t('relaunchHome.community.m1Name', { defaultValue: 'Thao' }),
      meta: t('relaunchHome.community.m1Meta', { defaultValue: '@redtao_ · 25, yoga + bodyweight' }),
    },
    {
      photo: 'beta-danny.png',
      name: t('relaunchHome.community.m3Name', { defaultValue: 'Guilherme' }),
      meta: t('relaunchHome.community.m3Meta', { defaultValue: '@guilherme · 30 min + dumbbells' }),
    },
    {
      photo: 'beta-sarah.png',
      name: t('relaunchHome.community.m2Name', { defaultValue: 'Somin' }),
      meta: t('relaunchHome.community.m2Meta', { defaultValue: '@somin · kept the streak' }),
    },
    {
      photo: 'beta-paul.png',
      name: t('relaunchHome.community.m5Name', { defaultValue: 'Tony' }),
      meta: t('relaunchHome.community.m5Meta', { defaultValue: '@tony · 47, mobility plans' }),
    },
  ];


  // ── Early reviews. Live beta copy, carried over verbatim EXCEPT the one
  // clause that breaks the canon rules: "@somin · won €10" — "win" is banned
  // ("earn"), and €10 is a superseded tier (€5 / €15 / €50).
  //
  // Three, not five. The filmed testimonials above them are now the section's
  // proof; these back it up. Five left a dead sixth slot in the 3-up grid and
  // needed a `.rh-review--desktop` hack to hide the overflow on mobile — both
  // gone with the count.
  //
  // No avatars. The faces above these cards are real people who were filmed and
  // consented; the stock-ish `beta-*.png` portraits next to a handle read as if
  // they were the same kind of thing, and app-store-style review cards (the
  // reference here) carry a name and a rating, not a photograph.
  const reviews = [
    {
      handle: '@redtao_',
      quote: t('relaunchHome.reviews.q1', {
        defaultValue:
          "not a gym person at all. came for the yoga + bodyweight flows, stayed for the streaks. finally an app that doesn't shove barbells at me. my mobility's the best it's ever been.",
      }),
    },
    {
      handle: '@somin',
      quote: t('relaunchHome.reviews.q2', {
        defaultValue:
          'BETA TESTING LIBO FOR 6 WEEKS AND IM HOOKED. my form on squats is so much better. earned €15 on the cash challenge but the streak is what got me',
      }),
    },
    {
      handle: '@guilherme',
      quote: t('relaunchHome.reviews.q3', {
        defaultValue:
          "im usually so bad with apps but libo's plans actually make sense. told it i have 30 min and dumbbells and it built me something real. no fluff.",
      }),
    },
  ];

  // ── Creator Program stats (pop-in). Mirrors the live /creator-program page.

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
        title={t('relaunchHome.seo.titleV2', {
          defaultValue: 'Libo: Finish 30 days straight. We pay you up to €50.',
        })}
        description={seoDescription}
        canonical="https://liboworld.com/"
        ogImage="https://liboworld.com/brand/og-image.png"
        jsonLd={buildTestimonialVideoGraph()}
      />
      <SiteIntro />
      <SiteNav />
      <main className="relaunch-home" id="main-content">

        {/* ── 1. HERO ─────────────────────────────────────────────── */}
        <section className="rh-hero">
          <div className="rh-hero-text">
            {/* Live now / iOS · Android / Free tier chips removed 18 Nov 2026
                (Noah): the giveaway bar above the nav carries the news now. */}

            {/* Four display lines on desktop; the two groups collapse to two
                lines at ≤700px ("FINISH 30 DAYS STRAIGHT." / "WE PAY YOU UP TO
                €50."). The promise is split so the payout — the accent group —
                is the half that survives the collapse intact. */}
            <h1 className="rh-hero-h1">
              <span className="rh-hero-h1-group">
                <span className="rh-hero-h1-line">
                  {t('relaunchHome.hero.h1a', { defaultValue: 'Finish 30 days' })}
                </span>{' '}
                <span className="rh-hero-h1-line">
                  {t('relaunchHome.hero.h1b', { defaultValue: 'straight.' })}
                </span>
              </span>
              <span className="rh-hero-h1-group rh-accent">
                <span className="rh-hero-h1-line">
                  {t('relaunchHome.hero.h1c', { defaultValue: 'We pay you' })}
                </span>{' '}
                <span className="rh-hero-h1-line">
                  {t('relaunchHome.hero.h1d', { defaultValue: 'up to €50.' })}
                </span>
              </span>
            </h1>

            {/* A waitlist email field until 3 Nov 2026 — six and a half weeks
                after Libo reached the App Store, the hero was still collecting
                addresses for a launch that had already happened, and this page
                carried no App Store link anywhere in it. App Store Connect
                reported zero downloads from a web referrer for the whole life
                of the app. The id stays: Pricing.tsx ("Start free"), the site
                header and storeRedirect's desktop fallback all deep-link to
                it. It lands on the download now, not a form. Sits right under the H1
                since 17 Nov 2026 so both badges are visible on arrival (Noah,
                "like Cal AI"). */}
            <div id="hero-capture" className="rh-hero-capture-anchor">
              <StoreBadges className="rh-hero-badges" />
            </div>
            {/* Second path for people not ready to download (Noah, 18 Nov
                2026, Ladder's "Find your plan"): the same lime button as the
                nav, straight to question 1. */}
            <Link to="/find-your-plan" state={{ start: true }} className="btn-primary rh-hero-plan" viewTransition>
              {t('findPlan.intro.start')} <span aria-hidden="true">→</span>
            </Link>

            <p className="rh-hero-sub">
              {t('relaunchHome.hero.body', {
                defaultValue:
                  'Pick a challenge. Hit your daily reps for 30 days, filmed and verified in the app. Finish and we pay you €5, €15 or €50 in real cash, funded by Libo. No draw, no luck. Miss a day and a freeze token covers you. Entry is free.',
              })}
            </p>
          </div>

          <div className="rh-hero-phones">
            <img
              className="rh-phone rh-phone--left"
              src="/app-screens/challenges.webp?v=1"
              alt={t('relaunchHome.hero.altLeft', {
                defaultValue: 'Libo Rewards tab: points, streak and the cash challenges you can join',
              })}
              loading="eager"
              width={600}
              height={1304}
            />
            <img
              className="rh-phone rh-phone--center"
              src="/app-screens/home.webp?v=1"
              alt={t('relaunchHome.hero.altCenter', {
                defaultValue: "Libo home screen: active plan, ask your coach and today's workout",
              })}
              loading="eager"
              width={600}
              height={1304}
            />
            {/* Current app screens (Noah, 18 Nov 2026): the Aug screen
                recording (hero-right.mp4) showed the old player and gave way
                to the current one. */}
            <img
              className="rh-phone rh-phone--right"
              src="/app-screens/player.webp?v=1"
              alt={t('relaunchHome.hero.altRight', {
                defaultValue: 'Libo workout player: exercise demo, sets, weight and reps',
              })}
              loading="eager"
              width={600}
              height={1304}
            />
          </div>
        </section>

        {/* ── 1b. THE TRAIN AND EARN AD (Noah, 19 Nov 2026) ──────── */}
        <HomeAd />

        {/* ── 2. TRAIN AND EARN: points, rewards, giveaway, cash ── */}
        <HomeEarn />

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
                {appCaptions.slice(0, 2).map((c, i) => (
                  <div className={`rh-inside-cap rh-inside-cap--${i}`} key={c.title}>
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
                      poster="/app-screens/challenge-day.webp?v=1"
                      autoPlay muted loop playsInline preload="metadata"
                      aria-label={t('relaunchHome.insideApp.phoneAlt')}
                    />

                  .rh-inside-phone already styles both element types.
                  ────────────────────────────────────────────────────────────
                */}
                <img
                  className="rh-inside-phone"
                  src="/app-screens/challenge-day.webp?v=1"
                  alt={t('relaunchHome.insideApp.phoneAlt', {
                    defaultValue:
                      'A Libo challenge day in the app: 30 reps × 30 days, day 1 of 30, with Record session ready to start',
                  })}
                  loading="lazy"
                  width={600}
                  height={1304}
                />
              </div>

              <div className="rh-inside-caps rh-inside-caps--right">
                {/* Mobile folds caption 4 into caption 3's sub (target shows
                    3 captions at 390px): cap 4 hides, cap 3 swaps its sub. */}
                {appCaptions.slice(2).map((c, i) => (
                  <div
                    className={`rh-inside-cap rh-inside-cap--${i + 2}${i === 1 ? ' rh-inside-cap--desktop' : ''}`}
                    key={c.title}
                  >
                    <span className={`rh-inside-cap-title${c.accent ? ' rh-accent' : ''}`}>{c.title}</span>
                    {i === 0 ? (
                      <>
                        <span className="rh-inside-cap-sub rh-inside-cap-sub--desktop">{c.sub}</span>
                        <span className="rh-inside-cap-sub rh-inside-cap-sub--mobile">
                          {t('relaunchHome.insideApp.cap3SubMobile', {
                            defaultValue: 'one rep target · every day · freeze tokens cover a miss',
                          })}
                        </span>
                      </>
                    ) : (
                      <span className="rh-inside-cap-sub">{c.sub}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
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
                    {t('relaunchHome.community.h2a', { defaultValue: 'Your community,' })}
                  </ScrollRevealText>
                  <ScrollRevealText as="span" className="rh-h2-line rh-reveal--accent">
                    {t('relaunchHome.community.h2b', { defaultValue: 'already on Libo.' })}
                  </ScrollRevealText>
                </h2>
              </div>
              <p className="rh-community-desc">
                {t('relaunchHome.community.descV2', {
                  defaultValue:
                    'Real people, real faces. Logging reps, holding streaks. No coaches or influencers selling courses. Just members showing up every day.',
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
                  'One loop: open the app, do the session, keep the streak. The cash challenge is opt-in: money is the receipt, not the reason.',
              })}
            </p>
            <Link to="/cash-challenges" viewTransition className="rh-accent-link rh-different-link">
              {t('relaunchHome.different.link', { defaultValue: 'How the cash challenge works →' })}
            </Link>
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

        {/* ── 5. CASH CHALLENGES ──────────────────────────────────── */}
        {/* Critical on mobile: the challenges must be reachable from home
            without opening the nav (HANDOFF-V2 §B9). */}
        <section className="rh-challenges" id="cash-challenges">
          <div className="rh-challenges-inner">
            <div className="rh-challenges-head">
              <div className="rh-challenges-heading">
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
              <Link to="/cash-challenges" viewTransition className="rh-challenges-all rh-accent-link">
                <span className="rh-challenges-all--full">
                  {t('relaunchHome.challenges.allCta', { defaultValue: 'All challenges →' })}
                </span>
                <span className="rh-challenges-all--short">
                  {t('relaunchHome.challenges.allCtaShort', { defaultValue: 'All →' })}
                </span>
              </Link>
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
                        defaultValue: '{{reps}} reps / day · {{days}} days · Limited spots',
                        reps: tier.reps,
                        days: tier.days,
                      })}
                    </span>
                    <span className="rh-cc-cta">
                      {t('relaunchHome.challenges.cardCta', { defaultValue: 'View challenge →' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

          </div>
        </section>

        {/* ── 5b. EVERYTHING YOU GET — interactive phone + card list ── */}
        <section className="rh-library">
          <div className="rh-library-inner">
            <h2 className="rh-h2 rh-h2--center rh-library-h2">
              <ScrollRevealText as="span" className="rh-h2-line">
                {t('relaunchHome.library.h2a', { defaultValue: 'Everything you get' })}
              </ScrollRevealText>
              <ScrollRevealText as="span" className="rh-h2-line rh-reveal--accent">
                {t('relaunchHome.library.h2b', { defaultValue: 'with Libo World.' })}
              </ScrollRevealText>
            </h2>

            <div className="rh-scene" ref={sceneRef}>
              <div className="rh-scene-pin">
                <div className="rh-library-stage rh-scene-stage">
                  <div className="rh-library-device rh-scene-device">
                    <div className="rh-library-phone rh-scene-phone">
                      <img
                        key={libraryCards[activeFeature].screen}
                        className="rh-library-screen"
                        src={libraryCards[activeFeature].screen}
                        alt={t('relaunchHome.library.phoneAlt', {
                          defaultValue: '{{feature}} in the Libo app',
                          feature: libraryCards[activeFeature].name,
                        })}
                        width={600}
                        height={1304}
                      />
                    </div>
                  </div>

                  {/* One feature at a time, plus a 6-step bar. */}
                  <div className="rh-scene-copy">
                    <div className="rh-scene-text" key={activeFeature} aria-live="polite">
                      <span className="rh-scene-count">
                        {libraryCards[activeFeature].num} / {String(libraryCards.length).padStart(2, '0')}
                      </span>
                      <h3 className="rh-scene-name">{libraryCards[activeFeature].name}</h3>
                      <p className="rh-scene-desc">
                        <span className="rh-copy--desktop">{libraryCards[activeFeature].desc}</span>
                        <span className="rh-copy--mobile">{libraryCards[activeFeature].descMobile}</span>
                      </p>
                    </div>
                    <div className="rh-scene-progress" role="tablist"
                      aria-label={t('relaunchHome.library.dotsLabel', { defaultValue: 'App features' })}>
                      {libraryCards.map((c, i) => (
                        <button
                          key={c.num}
                          type="button"
                          role="tab"
                          aria-selected={i === activeFeature}
                          aria-label={c.name}
                          className={`rh-scene-seg${i <= activeFeature ? ' rh-scene-seg--on' : ''}`}
                          onClick={() => goToFeature(i)}
                        >
                          <span />
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5c. FROM ONE REP TO A HABIT — desktop only (target hides it
            below 768px entirely). ─────────────────────────────────────── */}
        <section className="rh-habit">
          <h2 className="rh-h2 rh-h2--center">
            <ScrollRevealText as="span" className="rh-h2-line">
              {t('relaunchHome.habit.h2a', { defaultValue: 'From one rep to a' })}
            </ScrollRevealText>
            <ScrollRevealText as="span" className="rh-h2-line">
              {t('relaunchHome.habit.h2b', { defaultValue: 'habit.' })}
            </ScrollRevealText>
          </h2>
          <div className="rh-habit-steps">
            {habitSteps.map((step, i) => (
              <div className="rh-habit-step" data-popin key={step.name}>
                {/* Framed app capture above the caption (V4 §4). */}
                <div className="rh-habit-screen">
                  <img src={step.screen} alt="" loading="lazy" width={600} height={1304} />
                </div>
                {/* Number badge inline BESIDE the title, not above it. */}
                <h3 className="rh-habit-name">
                  <span className="rh-habit-circle font-display">{i + 1}</span>
                  {step.name}
                </h3>
                <p className="rh-habit-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. EARLY REVIEWS ────────────────────────────────────── */}
        {/* Two tiers: the filmed testimonials carry the section, the written
            beta reviews back them up underneath. The video wall replaced a
            third row of avatar-and-text cards — see UserVoices/EDIT-MAP.md §3,
            "Site swap". */}
        <section className="rh-reviews">
          <div className="rh-reviews-inner">
            <div className="rh-reviews-head">
              <p className="rh-eyebrow">
                {t('relaunchHome.reviews.eyebrowV2', { defaultValue: 'Beta program' })}
              </p>
              <h2 className="rh-h2">
                <ScrollRevealText as="span" className="rh-h2-line">
                  {t('relaunchHome.videoReviews.h2', {
                    defaultValue: 'What people like you are saying.',
                  })}
                </ScrollRevealText>
              </h2>
            </div>

            <VideoTestimonials
              playLabelFor={(name, duration) =>
                t('relaunchHome.videoReviews.play', {
                  defaultValue: `Play: ${name}'s review, ${duration}`,
                  name,
                  duration,
                })
              }
              pauseLabelFor={(name) =>
                t('relaunchHome.videoReviews.pause', {
                  defaultValue: `Pause: ${name}'s review`,
                  name,
                })
              }
            />

            <div className="rh-reviews-grid">
              {reviews.map((r) => (
                <div className="rh-review" key={r.handle}>
                  <div className="rh-review-head">
                    <span className="rh-review-handle">{r.handle}</span>
                    <span className="rh-review-stars" aria-label="5 out of 5">
                      {'★★★★★'}
                    </span>
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
                {t('relaunchHome.creators.eyebrow', { defaultValue: 'Creators & partners' })}
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
                    'Refer people to Libo and we pay you a 25% commission on their subscription, for as long as they stay members and you stay one too. Open to anyone who actually trains: creators, coaches, gyms and PTs, whatever the follower count.',
                })}
              </p>
              <Link to="/creator-program" viewTransition className="rh-btn rh-btn--primary">
                {t('relaunchHome.creators.cta', { defaultValue: 'Become a partner →' })}
              </Link>
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

        {/* ── 10. FINAL CTA ───────────────────────────────────────── */}
        {/* The second of the page's two download prompts, for anyone who read
            the whole page before deciding. The id stays "waitlist" because
            JoinFunnel links to "/#waitlist" and outside links may too — it is
            not a waitlist any more. The hero owns "hero-capture". */}
        <Ribbons />
        <section className="rh-final band-lime" id="waitlist">
          <div className="rh-final-inner">
            <h2 className="rh-h2 rh-h2--center rh-h2--lg">
              <ScrollRevealText as="span" className="rh-h2-line">
                {t('relaunchHome.final.h2a', { defaultValue: 'Your first challenge' })}
              </ScrollRevealText>
              <ScrollRevealText as="span" className="rh-h2-line rh-reveal--accent">
                {t('relaunchHome.final.h2b', { defaultValue: 'is already open.' })}
              </ScrollRevealText>
            </h2>
            <p className="rh-final-body">
              {t('relaunchHome.final.body', {
                defaultValue:
                  'Download Libo free on iPhone or Android, pick a challenge and start today. Finish 30 days straight and we pay you €5, €15 or €50 in real cash, funded by Libo.',
              })}
            </p>
            <StoreBadges />
          </div>
        </section>

      </main>
      <SiteFooter />
    </>
  );
}
