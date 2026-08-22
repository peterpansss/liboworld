import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { SeoHead } from '../components/SeoHead';
import ScrollRevealText from '../components/ScrollRevealText';
import {
  FunnelContextBar,
  FunnelLogoNav,
  FunnelMinimalFooter,
  FunnelStickyCta,
} from '../components/funnel/FunnelChrome';
import { useFoundingCheckout, EARLY_ACCESS_PRICE } from '../components/funnel/FoundingCheckoutProvider';
import { isStripeConfigured } from '../lib/stripe';
import LaunchCountdown from '../components/LaunchCountdown';
import { isFoundingOpen } from '../config/launchMode';
import { logFunnelClick } from '../lib/funnelSignups';
import { useWaitlistSubmit } from '../hooks/useWaitlistSubmit';
import { usePopIn } from '../utils/funnelAnimations';
import { getChallengeTier, FUNNEL_TIER_SLUG, type ChallengeTier } from '../data/challengeTiers';
import './ChallengeFunnel.css';

/**
 * /cash-challenges/:tier — one funnel per tier (€5 Starter / €15 Committed /
 * €50 Flagship). One component; `challengeTiers.ts` drives payout, reps, image.
 *
 * CTA rules (target canvas + DECISIONS-V3):
 * - Paid tiers: every button reads "Click to Enter →"; ONLY the close-section
 *   button carries the price ("Click to Enter — €39.50/yr →"). The offer-card
 *   CTA sits OUTSIDE and below the card, unpriced.
 * - Starter is free-tier accessible, so its conversion event IS joining free:
 *   "Join free at launch →" everywhere, and the close section carries the one
 *   email capture allowed on a funnel (DECISIONS-V3 §1). Submitting never
 *   opens payment.
 * - Sticky mobile CTA stays on all tiers (DECISIONS-V3 §2 — as-built wins);
 *   the inline close CTA hides on mobile while the sticky shows.
 */

const PRICE = `€${EARLY_ACCESS_PRICE.toFixed(2)}`; // €39.50
const OFFER_HREF = '#offer';

/** The app screens for "Inside the challenge" fan. Mapped by content, not filename. */
const INSIDE_SCREENS = [
  { src: '/app-real-rewards.png', key: 'rewards' },
  // Centre: the "NICE WORK!" share screen — v2 capture (member photo,
  // 330 reps, Noah's request 2026-08-07). v1 stays on disk unused.
  { src: '/app-real-live-v2.png', key: 'summary' },
  { src: '/app-real-run.png', key: 'run' },
] as const;

type Testimonial = { photo: string; handle: string; badge: string; quote: string };

/**
 * Beta testimonials, shared by all three tiers. Badges are quotes' own facts
 * ("PAID €15", "8 WEEKS") and deliberately NOT scaled to the tier on screen —
 * these are real people describing what actually happened, not a payout table.
 */
const TESTIMONIALS: Testimonial[] = [
  {
    photo: '/beta-sarah.png',
    handle: '@somin',
    badge: 'PAID €15',
    quote:
      'completed the cash challenge in beta and kept the streak after. the money got me started, the streak kept me going',
  },
  {
    photo: '/beta-thao.png',
    handle: '@redtao_',
    badge: '8 WEEKS',
    quote:
      "legit the only fitness app i've stuck with past month 2. cash challenge thing got me actually doing reps for once",
  },
  {
    photo: '/beta-marco.png',
    handle: '@gabriel',
    badge: '30 DAYS',
    quote:
      "the daily recording keeps you honest — no way to cheat it. best motivation i've ever had",
  },
];

export default function ChallengeFunnel() {
  const { tier: slug } = useParams();
  const tier = getChallengeTier(slug);
  const { t } = useTranslation();
  const { openFoundingCheckout } = useFoundingCheckout();
  const stripeReady = isStripeConfigured();
  // Read at render so the upsell closes itself on LAUNCH_DATE without a deploy
  // (config/launchMode.ts). Only the Premium upsell is gated — the challenge
  // itself, including the free €5 Starter, is unaffected.
  const foundingOpen = isFoundingOpen();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  usePopIn();

  // Unknown slug → back to the catalogue rather than a 404 or the homepage.
  if (!tier) return <Navigate to="/cash-challenges" replace />;

  const isFree = !tier.requiresPremium;

  const ctaLabel = isFree
    ? t('challengeFunnel.cta.free', { defaultValue: 'Join free at launch →' })
    : t('challengeFunnel.cta.enter', { defaultValue: 'Click to Enter →' });

  // The ONE priced label on the page: the paid tiers' close button + sticky bar.
  // Once the pre-sale closes it drops back to the unpriced label — the €39.50
  // founding price must not be advertised past LAUNCH_DATE.
  const ctaPricedLabel =
    isFree || !foundingOpen
      ? ctaLabel
      : t('challengeFunnel.cta.checkout', {
          defaultValue: 'Click to Enter — {{price}}/yr →',
          price: PRICE,
        });

  const track = () => {
    void logFunnelClick({ funnel: 'cash_challenge', tierSlug: FUNNEL_TIER_SLUG[tier.slug] });
  };

  const handleCheckout = () => {
    track();
    openFoundingCheckout(`challenge_${tier.slug}`);
  };

  /* Repeated between sections; anchors to the offer (Starter: to the close
     capture). Hidden on mobile between steps and the video per target. */
  const CtaBar = ({ mobileHidden = false }: { mobileHidden?: boolean }) => (
    <div className={`cf-ctabar${mobileHidden ? ' cf-ctabar--desktop-only' : ''}`}>
      <a className="funnel-btn cf-btn" href={isFree ? '#join-free' : OFFER_HREF} onClick={track}>
        {ctaLabel}
      </a>
    </div>
  );

  const faqs = buildFaqs(t, tier);

  return (
    <div className="cf-page">
      <SeoHead
        title={t('challengeFunnel.seo.title', {
          defaultValue: 'Train 30 days. Earn €{{payout}} cash. | Libo',
          payout: tier.payout,
        })}
        description={t('challengeFunnel.seo.description', {
          defaultValue: '{{reps}} reps a day for 30 days. Proof on camera. Real money when you finish — no points, no gift cards.',
          reps: tier.reps,
        })}
        canonical={`/cash-challenges/${tier.slug}`}
      />

      <FunnelContextBar>
        <span className="cf-bar__full">
          {t('challengeFunnel.bar.full', {
            defaultValue: '⚡ Limited spots — your 30 days start the moment you join ⚡',
          })}
        </span>
        {/* Copy variant, not CSS truncation — matches the announcement-bar pattern. */}
        <span className="cf-bar__short">
          {t('challengeFunnel.bar.short', {
            defaultValue: '⚡ Limited spots — your 30 days start the moment you join ⚡',
          })}
        </span>
      </FunnelContextBar>

      {/* Logo only, unlinked, no back link — a funnel has one exit and it's the
          CTA. Returning is the browser's back button, not an on-page control. */}
      <FunnelLogoNav />

      <main id="main-content">
        {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
        <section className="cf-hero">
          <h1 className="cf-hero__title font-display">
            <span className="cf-hero__line">
              {t('challengeFunnel.hero.line1', { defaultValue: 'Train 30 days.' })}
            </span>
            <span className="cf-hero__line cf-hero__line--accent">
              {t('challengeFunnel.hero.line2', {
                defaultValue: 'Earn €{{payout}} cash.',
                payout: tier.payout,
              })}
            </span>
          </h1>
          <p className="cf-hero__sub">
            {t('challengeFunnel.hero.sub', {
              defaultValue: '{{reps}} reps a day. Proof on camera. Real money when you finish — no points, no gift cards.',
              reps: tier.reps,
            })}
          </p>

          <div className="cf-heroshot">
            <img className="cf-heroshot__img" src={tier.image} alt="" />
            <span className="cf-heroshot__scrim" aria-hidden="true" />
            {/* Centred payout lockup, ~60% height — not bottom-left. */}
            <span className="cf-heroshot__lockup">
              <span className="cf-heroshot__payout font-display">€{tier.payout}</span>
              <span className="cf-heroshot__tier font-display">
                {t('challengeFunnel.hero.tierLabel', {
                  defaultValue: '{{name}} challenge',
                  name: tier.name,
                })}
              </span>
            </span>
          </div>

          <CtaBar />

          {/* One bordered container with four cells — not four separate cards. */}
          <ul className="cf-stats">
            <Stat value={`€${tier.payout}`} label={t('challengeFunnel.stats.payout', { defaultValue: 'Cash reward' })} />
            <Stat value={String(tier.reps)} label={t('challengeFunnel.stats.reps', { defaultValue: 'Reps per day' })} />
            <Stat value={String(tier.days)} label={t('challengeFunnel.stats.days', { defaultValue: 'Days straight' })} />
            <Stat value={t('challengeFunnel.stats.spotsValue', { defaultValue: 'Limited' })} label={t('challengeFunnel.stats.spots', { defaultValue: 'Spots at once' })} />
          </ul>
        </section>

        {/* ── 2. Pain ─────────────────────────────────────────────────────── */}
        <section className="cf-section cf-section--tight">
          <h2 className="cf-h2 font-display">
            <span className="cf-h2__line">
              {t('challengeFunnel.pain.line1', { defaultValue: "You don't need another plan." })}
            </span>
            <span className="cf-h2__line cf-h2__line--accent">
              {t('challengeFunnel.pain.line2', { defaultValue: 'You need a reason to finish one.' })}
            </span>
          </h2>
          <p className="cf-body">
            {t('challengeFunnel.pain.body', {
              defaultValue:
                'The first week always works. The problem is day 19 — when nobody notices whether you show up. In the challenge, somebody does: everyone else in it, and your own money.',
            })}
          </p>
        </section>

        {/* ── 3. Rep → proof → payout ─────────────────────────────────────── */}
        <section className="cf-section">
          {/* White headline — the lime treatment was ours, not the target's. */}
          <ScrollRevealText as="h2" className="cf-h2 font-display">
            {t('challengeFunnel.steps.title', { defaultValue: 'Rep → proof → payout.' })}
          </ScrollRevealText>
          <ol className="cf-steps">
            {buildSteps(t, tier).map((step, i) => (
              <li className="cf-step" key={step.title} data-popin>
                {/* All four numbers share one style — the canvas renders them in
                    four different colours, which is a bug, not a treatment. */}
                <span className="cf-step__num font-display">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="cf-step__title font-display">{step.title}</h3>
                <p className="cf-step__body">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="cf-note">
            {t('challengeFunnel.steps.note', {
              defaultValue:
                "No per-challenge fee — entry comes with your membership. Your 30 days start the moment you join; if a challenge is full, request to join and you're notified the second a spot frees. In the app, challenges live in the Rewards tab.",
            })}
          </p>
          <CtaBar mobileHidden />
        </section>

        {/* ── 4. Watch how it works ───────────────────────────────────────── */}
        <section className="cf-section">
          <ScrollRevealText as="h2" className="cf-h2 font-display">
            {t('challengeFunnel.video.title', { defaultValue: 'Watch how it works.' })}
          </ScrollRevealText>
          {/* TODO(video): swap the placeholder panel for the real <video> once
              the challenge film lands — keep the 16:9 frame and the caption. */}
          <div className="cf-video" data-popin>
            <button
              type="button"
              className="cf-video__play"
              aria-label={t('challengeFunnel.video.playLabel', {
                defaultValue: 'Play: the cash challenge, 3 minutes',
              })}
            >
              <span className="cf-video__triangle" aria-hidden="true" />
            </button>
            <span className="cf-video__caption font-display">
              {t('challengeFunnel.video.caption', { defaultValue: 'The cash challenge — 3 min' })}
            </span>
          </div>
          <p className="cf-note">
            {t('challengeFunnel.video.note', { defaultValue: 'Film in production — placeholder' })}
          </p>
        </section>

        {/* ── 5. Inside the challenge ─────────────────────────────────────── */}
        <section className="cf-section cf-inside">
          <span className="funnel-eyebrow cf-eyebrow">
            {t('challengeFunnel.inside.eyebrow', { defaultValue: 'Inside the challenge' })}
          </span>
          <h2 className="cf-h2 font-display">
            <span className="cf-h2__line">
              {t('challengeFunnel.inside.line1', { defaultValue: 'Your 30 days,' })}
            </span>
            <span className="cf-h2__line cf-h2__line--accent">
              {t('challengeFunnel.inside.line2', { defaultValue: 'on screen.' })}
            </span>
          </h2>
          {/* Overlapping fan: centre screen larger + lime bloom, flanks tilted
              behind it. Mobile shows the centre screen only. */}
          <div className="cf-fan">
            {INSIDE_SCREENS.map(({ src, key }, i) => (
              <div className={`cf-fan__frame cf-fan__frame--${i}`} key={key} data-popin>
                {/* Only the centre screen is visible on mobile and carries the
                    meaning — flanks stay decorative (empty alt). */}
                <img
                  src={src}
                  alt={
                    i === 1
                      ? t('challengeFunnel.inside.altSummary', {
                          defaultValue: 'Post-workout summary in the Libo app',
                        })
                      : ''
                  }
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          <ul className="cf-pills">
            <li className="cf-pill">{t('challengeFunnel.inside.pill1', { defaultValue: 'Live rep counter' })}</li>
            <li className="cf-pill">{t('challengeFunnel.inside.pill2', { defaultValue: 'Camera verification' })}</li>
            <li className="cf-pill cf-pill--accent">{t('challengeFunnel.inside.pill3', { defaultValue: 'Real cash payout' })}</li>
          </ul>
        </section>

        {/* ── 6. Testimonials ─────────────────────────────────────────────── */}
        <section className="cf-section">
          <ScrollRevealText as="h2" className="cf-h2 font-display">
            {t('challengeFunnel.social.title', { defaultValue: 'People who actually got paid.' })}
          </ScrollRevealText>
          <ul className="cf-quotes">
            {TESTIMONIALS.map((q) => (
              <li className="cf-quote" key={q.handle} data-popin>
                <div className="cf-quote__head">
                  <img className="cf-quote__photo" src={q.photo} alt="" loading="lazy" />
                  <span className="cf-quote__handle">{q.handle}</span>
                  <span className="cf-quote__badge font-display">{q.badge}</span>
                </div>
                <p className="cf-quote__text">“{q.quote}”</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 7. Offer ────────────────────────────────────────────────────── */}
        <section className="cf-section" id="offer">
          <span className="funnel-eyebrow cf-eyebrow">
            {!foundingOpen
              ? t('challengeFunnel.offer.eyebrowClosed', { defaultValue: 'Premium · available at launch' })
              : isFree
                ? t('challengeFunnel.offer.eyebrowFree', { defaultValue: 'Optional upgrade · 50% off until launch' })
                : t('challengeFunnel.offer.eyebrow', { defaultValue: 'Premium · 50% off until launch' })}
          </span>
          <h2 className="cf-h2 font-display">
            {isFree
              ? t('challengeFunnel.offer.titleFree', { defaultValue: 'Unlock the €15 and €50 challenges.' })
              : foundingOpen
                ? t('challengeFunnel.offer.title', { defaultValue: 'Lock in the year before we launch.' })
                : t('challengeFunnel.offer.titleClosed', { defaultValue: 'Get Premium when we launch.' })}
          </h2>
          {isFree && (
            <p className="cf-body">
              {t('challengeFunnel.offer.ledeFree', {
                defaultValue:
                  'The €5 Starter is free for every member. Premium opens the higher-payout tiers — and right now the first year is half price.',
              })}
            </p>
          )}

          <div className="cf-offer" data-popin>
            <LaunchCountdown />
            <p className="cf-offer__price">
              <span className="cf-offer__now font-display">{foundingOpen ? PRICE : '€79.99'}</span>
              {foundingOpen && <s className="cf-offer__was">€79.99</s>}
            </p>
            <p className="cf-offer__sub">
              {foundingOpen
                ? t('challengeFunnel.offer.sub', {
                    defaultValue: 'First year of Premium · 50% off · fully refundable until launch',
                  })
                : t('earlyAccess.offerEnded')}
            </p>
            <ul className="cf-offer__ticks">
              {/* Starter leads with the unlock (defect 18). */}
              {isFree && (
                <li>{t('challengeFunnel.offer.tickUnlock', { defaultValue: 'Every challenge tier unlocked — €15 and €50' })}</li>
              )}
              <li>{t('challengeFunnel.offer.tick1', { defaultValue: 'Full library — 820+ exercises, 140 workouts' })}</li>
              {isFree ? (
                <li>{t('challengeFunnel.offer.tickFreeze', { defaultValue: '2 freeze tokens per challenge' })}</li>
              ) : (
                <li>{t('challengeFunnel.offer.tick2', { defaultValue: 'Eligible for every challenge tier — first come, first served' })}</li>
              )}
              <li>{t('challengeFunnel.offer.tick3', { defaultValue: 'Year starts on launch day, not today' })}</li>
            </ul>
          </div>

          {/* CTA under the card. A paid offer card never funnels into a free
              ask (defect 18): Starter's button is the paid checkout with the
              price visible — same handler as every other paid CTA — and it
              renders on mobile too. */}
          {stripeReady && foundingOpen && (
            <button type="button" className="funnel-btn cf-btn cf-btn--lg cf-btn--offer" onClick={handleCheckout}>
              {isFree
                ? t('challengeFunnel.offer.ctaFree', { defaultValue: 'Get Premium — {{price}}/yr →', price: PRICE })
                : ctaLabel}
            </button>
          )}
        </section>

        {/* ── 8. FAQ ──────────────────────────────────────────────────────── */}
        <section className="cf-section">
          <ScrollRevealText as="h2" className="cf-h2 font-display">
            {t('challengeFunnel.faq.title', { defaultValue: 'Any questions?' })}
          </ScrollRevealText>
          <ul className="funnel-faq cf-faq">
            {faqs.map((faq, i) => {
              const open = openFaq === i;
              return (
                <li
                  className={`funnel-faq__row cf-faq__row${open ? ' funnel-faq__row--open cf-faq__row--open' : ''}`}
                  key={faq.q}
                >
                  <button
                    type="button"
                    className="funnel-faq__q cf-faq__q"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    <span>{faq.q}</span>
                    <span className="funnel-faq__sign cf-faq__sign" aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                  {open && <p className="funnel-faq__a cf-faq__a">{faq.a}</p>}
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── 9. Close ────────────────────────────────────────────────────── */}
        <section className="cf-section cf-close" id="join-free">
          <h2 className="cf-h2 font-display">
            <span className="cf-h2__line">
              {t('challengeFunnel.close.line1', { defaultValue: 'Limited spots.' })}
            </span>
            <span className="cf-h2__line cf-h2__line--accent">
              {t('challengeFunnel.close.line2', { defaultValue: 'Start the day you join.' })}
            </span>
          </h2>
          {isFree ? (
            <>
              <p className="cf-body">
                {t('challengeFunnel.close.subFree', {
                  defaultValue:
                    "The €5 Starter challenge is free for every member — leave your email and you're in on launch day. Spots are first come, first served.",
                })}
              </p>
              <StarterCapture t={t} onTrack={track} />
              <Link className="cf-textlink" to="#offer" onClick={(e) => {
                e.preventDefault();
                document.getElementById('offer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}>
                {foundingOpen
                  ? t('challengeFunnel.close.upsell', {
                      defaultValue: 'Want the €15 and €50 tiers? Get Premium — 50% off →',
                    })
                  : t('challengeFunnel.close.upsellClosed', {
                      defaultValue: 'Want the €15 and €50 tiers? Get Premium →',
                    })}
              </Link>
            </>
          ) : (
            <>
              <p className="cf-body">
                {foundingOpen
                  ? t('challengeFunnel.close.sub', {
                      defaultValue:
                        "Premium unlocks this tier — entry is first come, first served, and spots are limited. If it's full, you're notified the second a spot frees. First year 50% off until launch, fully refundable.",
                    })
                  : t('challengeFunnel.close.subClosed', {
                      defaultValue:
                        "Premium unlocks this tier — entry is first come, first served, and spots are limited. If it's full, you're notified the second a spot frees.",
                    })}
              </p>
              {stripeReady && foundingOpen && (
                <button type="button" className="funnel-btn cf-btn cf-btn--lg cf-close__cta" onClick={handleCheckout}>
                  {ctaPricedLabel}
                </button>
              )}
            </>
          )}
        </section>
      </main>

      <FunnelMinimalFooter
        note={t('challengeFunnel.footerNote', { defaultValue: 'Challenge terms apply' })}
      />

      <FunnelStickyCta
        label={ctaPricedLabel}
        href={isFree ? '#join-free' : OFFER_HREF}
        onClick={track}
      />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <li className="cf-stat">
      <span className="cf-stat__value font-display">{value}</span>
      <span className="cf-stat__label">{label}</span>
    </li>
  );
}

type TFn = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Starter's close-section email capture — the one capture allowed on a funnel
 * (DECISIONS-V3 §1: the free tier's conversion event IS joining free).
 * Inline confirmation on submit; never opens payment.
 */
function StarterCapture({ t, onTrack }: { t: TFn; onTrack: () => void }) {
  // The hook owns the email state and the submit handler (it preventDefaults).
  const { email, setEmail, status, submit, errorMessage } = useWaitlistSubmit('challenge_waitlist');
  const done = status === 'success' || status === 'duplicate';

  const onSubmit = (e: FormEvent) => {
    onTrack();
    void submit(e);
  };

  if (done) {
    return (
      <p className="cf-capture__confirm font-display" role="status">
        {t('challengeFunnel.capture.confirm', { defaultValue: "You're on the list ✓" })}
      </p>
    );
  }

  return (
    <form className="cf-capture" onSubmit={onSubmit}>
      <label className="cf-capture__label" htmlFor="cf-capture-email">
        {t('challengeFunnel.capture.label', { defaultValue: 'Your email' })}
      </label>
      <input
        id="cf-capture-email"
        className="cf-capture__input"
        type="email"
        required
        placeholder={t('challengeFunnel.capture.placeholder', { defaultValue: 'Your email' })}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" className="funnel-btn cf-btn cf-capture__btn" disabled={status === 'submitting'}>
        {t('challengeFunnel.capture.btn', { defaultValue: 'Join free →' })}
      </button>
      {status === 'error' && (
        <p className="cf-capture__error" role="alert">{errorMessage}</p>
      )}
    </form>
  );
}

function buildSteps(t: TFn, tier: ChallengeTier) {
  return [
    {
      title: t('challengeFunnel.steps.s1.title', { defaultValue: 'Do reps' }),
      body: t('challengeFunnel.steps.s1.body', {
        defaultValue: '{{reps}} reps, every day, for 30 days.',
        reps: tier.reps,
      }),
    },
    {
      title: t('challengeFunnel.steps.s2.title', { defaultValue: 'Record' }),
      body: t('challengeFunnel.steps.s2.body', {
        defaultValue: 'Film the set in the app — the camera keeps it honest.',
      }),
    },
    {
      title: t('challengeFunnel.steps.s3.title', { defaultValue: 'Prove it' }),
      body: t('challengeFunnel.steps.s3.body', {
        defaultValue: 'Your daily recording is the proof — verified in-app, no way to cheat it.',
      }),
    },
    {
      title: t('challengeFunnel.steps.s4.title', { defaultValue: 'Cash out' }),
      body: t('challengeFunnel.steps.s4.body', {
        defaultValue: '30 days done = €{{payout}} in your pocket.',
        payout: tier.payout,
      }),
    },
  ];
}

function buildFaqs(t: TFn, tier: ChallengeTier) {
  return [
    {
      q: t('challengeFunnel.faq.scam.q', { defaultValue: 'Is this a scam? Why would an app pay me?' }),
      a: t('challengeFunnel.faq.scam.a', {
        defaultValue:
          'Your payout is set aside in cash the moment you join — funded by Libo, never dependent on other members failing. No draw, no luck: complete the work, get paid.',
      }),
    },
    {
      q: t('challengeFunnel.faq.pay.q', { defaultValue: 'Do I have to pay to enter?' }),
      a: t('challengeFunnel.faq.pay.a', {
        defaultValue: tier.requiresPremium
          ? 'There is no per-challenge fee. This tier is unlocked by Premium, and entry comes with your membership.'
          : 'No. This tier comes with the free tier — there is no per-challenge fee and no card needed.',
      }),
    },
    {
      q: t('challengeFunnel.faq.tooGood.q', { defaultValue: '"Free money" — too good to be true?' }),
      a: t('challengeFunnel.faq.tooGood.a', {
        defaultValue:
          'Most people do not finish 30 days straight. That is the whole point: the money is what makes the last ten days survivable, and it is funded by Libo either way.',
      }),
    },
    {
      q: t('challengeFunnel.faq.miss.q', { defaultValue: 'What happens if I miss a day?' }),
      a: t('challengeFunnel.faq.miss.a', {
        defaultValue:
          'A freeze token covers it — Premium includes 2 per challenge, and anyone can earn one by training consistently. Out of tokens, a missed day ends the run — that is what makes finishing worth money. You can join again when a spot opens.',
      }),
    },
    {
      q: t('challengeFunnel.faq.equipment.q', { defaultValue: 'Do I need equipment?' }),
      a: t('challengeFunnel.faq.equipment.a', {
        defaultValue:
          'No. Every challenge movement is bodyweight — pushups, squats, mountain climbers, burpees and the rest. You pick which one you are doing each day.',
      }),
    },
    {
      q: t('challengeFunnel.faq.when.q', { defaultValue: 'When do I get the money?' }),
      a: t('challengeFunnel.faq.when.a', {
        defaultValue:
          'After day 30 clears verification. It is paid as real cash — no points, no gift cards, no store credit.',
      }),
    },
  ];
}
