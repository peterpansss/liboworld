import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { usePopIn } from '../utils/funnelAnimations';
import FunnelVideo from '../components/funnel/FunnelVideo';
import { FOUNDING_MEMBER_VIDEO, buildFunnelVideoSchema } from '../data/funnelVideos';
import './JoinFunnel.css';

/**
 * /join — the Founding Member funnel. Sells ONE thing.
 *
 * ZERO email capture on this page (Noah, 2026-08-07 — supersedes
 * DECISIONS-V3, which had mandated a hero form; the canvas never had one).
 * A free ask above a €39.50 card splits the page's conversion goal: the
 * not-ready path is the fine-print link to the homepage waitlist under the
 * pricing card, nothing more. Every CTA anchors to the single Founding
 * Member card (#membership); only its button opens Stripe, price always on
 * screen first.
 */

const PRICE = `€${EARLY_ACCESS_PRICE.toFixed(2)}`; // €39.50
const WAS_PRICE = '€79.99';
const MEMBERSHIP_HREF = '#membership';

type Member = { photo: string; name: string; meta: string };

export default function JoinFunnel() {
  const { t } = useTranslation();
  const { openFoundingCheckout } = useFoundingCheckout();
  const stripeReady = isStripeConfigured();
  // Called at render, never captured at module load — the pre-sale closes
  // itself on LAUNCH_DATE with no deploy (config/launchMode.ts).
  const foundingOpen = isFoundingOpen();
  usePopIn();

  // FAQ: all rows collapsed by default, lime "+" always (target).
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Every CTA on the page reads off these two consts, so gating them here is
  // enough to stop the €39.50 founding price being advertised after LAUNCH_DATE
  // — the anchors still scroll to the card, which now sells Premium at list.
  const ctaLabel = foundingOpen
    ? t('joinFunnel.cta.primary', {
        defaultValue: 'Become a Founding Member — {{price}} →',
        price: PRICE,
      })
    : t('membershipV2.plans.premium.cta', { defaultValue: 'Available at launch' });
  const ctaUnpriced = foundingOpen
    ? t('joinFunnel.cta.unpriced', { defaultValue: 'Become a Founding Member →' })
    : t('membershipV2.plans.premium.cta', { defaultValue: 'Available at launch' });

  const members: Member[] = [
    {
      photo: '/beta-thao.png',
      name: t('joinFunnel.proof.m1Name', { defaultValue: 'Thao' }),
      meta: t('joinFunnel.proof.m1Meta', { defaultValue: '@redtao_ · yoga + bodyweight' }),
    },
    {
      photo: '/beta-sarah.png',
      name: t('joinFunnel.proof.m2Name', { defaultValue: 'Somin' }),
      meta: t('joinFunnel.proof.m2Meta', { defaultValue: '@somin · earned €15, kept the streak' }),
    },
    {
      photo: '/beta-danny.png',
      name: t('joinFunnel.proof.m3Name', { defaultValue: 'Guilherme' }),
      meta: t('joinFunnel.proof.m3Meta', { defaultValue: '@guilherme · 30 min + dumbbells' }),
    },
    {
      photo: '/beta-paul.png',
      name: t('joinFunnel.proof.m4Name', { defaultValue: 'Tony' }),
      meta: t('joinFunnel.proof.m4Meta', { defaultValue: '@tony · 47, mobility plans' }),
    },
  ];

  const stats = [
    { value: '820+', label: t('joinFunnel.stats.s1', { defaultValue: 'Exercises' }) },
    { value: '140', label: t('joinFunnel.stats.s2', { defaultValue: 'Workouts' }) },
    {
      value: '3',
      label: t('joinFunnel.stats.s3', { defaultValue: 'Cash challenge tiers' }),
      labelMobile: t('joinFunnel.stats.s3Mobile', { defaultValue: 'Challenge tiers' }),
    },
    { value: '€0', label: t('joinFunnel.stats.s4', { defaultValue: 'Free tier' }) },
  ];

  const holds = [
    {
      num: '01',
      title: t('joinFunnel.holds.c1Title', { defaultValue: 'Decision removed' }),
      body: t('joinFunnel.holds.c1Body', {
        defaultValue:
          "Open the app — today's session is already picked for your goal, time, and equipment. No planning stress, ever.",
      }),
    },
    {
      num: '02',
      title: t('joinFunnel.holds.c2Title', { defaultValue: 'Progress accumulates' }),
      body: t('joinFunnel.holds.c2Body', {
        defaultValue:
          'The streak never resets to zero — a missed day subtracts a day, and freeze tokens cover real life.',
      }),
    },
    {
      num: '03',
      title: t('joinFunnel.holds.c3Title', { defaultValue: 'Real money, real rules' }),
      body: t('joinFunnel.holds.c3Body', {
        defaultValue:
          'Cash challenges pay real money for 30 verified days. No draw, no luck — complete the work, get paid.',
      }),
    },
  ];

  // Ticks 4 and 5 are founding-only promises (badge, refundable pre-sale), so
  // they come off the card once the pre-sale has closed.
  const benefits = [
    t('joinFunnel.offer.tick1', { defaultValue: 'Everything in Free, plus the full library' }),
    t('joinFunnel.offer.tick2', { defaultValue: 'Eligible for every challenge tier — first come, first served' }),
    t('joinFunnel.offer.tick3', { defaultValue: '2 freeze tokens per challenge' }),
    ...(foundingOpen
      ? [
          t('joinFunnel.offer.tick4', {
            defaultValue: 'Founding Member badge · first through the door at launch',
          }),
          t('joinFunnel.offer.tick5', {
            defaultValue: 'Year starts on launch day · fully refundable until launch',
          }),
        ]
      : []),
  ];

  const faqs = [
    {
      q: t('joinFunnel.faq.q1', { defaultValue: 'What is Libo?' }),
      a: t('joinFunnel.faq.a1', {
        defaultValue:
          'A training club: 820+ exercises, 140 workouts, AI-built plans, a streak that never resets to zero — and 30-day cash challenges that pay real money for consistency.',
      }),
    },
    {
      q: t('joinFunnel.faq.q2', { defaultValue: 'What does membership cost?' }),
      a: t('joinFunnel.faq.a2', {
        defaultValue:
          'There is a free tier — no card needed. Premium is €79.99 a year (about €6.67/mo) or €12.99 month-to-month. Founding Members lock the first year at €39.50.',
      }),
    },
    // Describes the pre-sale itself, so it goes with the pre-sale.
    ...(foundingOpen
      ? [{
          q: t('joinFunnel.faq.q3', { defaultValue: 'What is a Founding Member?' }),
          a: t('joinFunnel.faq.a3', {
            defaultValue:
              'The pre-launch offer: 12 months of Premium at 50% off, first through the door on launch day, every challenge tier unlocked — and fully refundable until launch.',
          }),
        }]
      : []),
    {
      q: t('joinFunnel.faq.q4', { defaultValue: 'When does the app launch?' }),
      a: t('joinFunnel.faq.a4', {
        defaultValue:
          '3 September 2026 — iOS first. Waitlist members get one email the moment the doors open; Founding Members get their download link before general release.',
      }),
    },
    {
      q: t('joinFunnel.faq.q5', { defaultValue: 'How do cash challenges work?' }),
      a: t('joinFunnel.faq.a5', {
        defaultValue:
          '30 days of daily reps, recorded and verified in-app, paid out as real cash when you finish — €5, €15 or €50 depending on the tier. No draw, no luck.',
      }),
    },
  ];

  return (
    <div className="jf-page">
      <SeoHead
        title={t('joinFunnel.seo.title', {
          defaultValue: 'Become a Founding Member — Libo Training Club',
        })}
        description={t('joinFunnel.seo.description', {
          defaultValue:
            'Join Libo as a Founding Member for €39.50 — 50% off the first year, fully refundable until launch. Your year starts the day the app goes live.',
        })}
        canonical="https://liboworld.com/join"
        jsonLd={buildFunnelVideoSchema(
          FOUNDING_MEMBER_VIDEO,
          t('joinFunnel.hero.videoSchemaDescription', {
            defaultValue:
              'Noah, the founder of Libo, on what the Founding Member offer is, what Premium unlocks, and why it only exists before launch.',
          })
        )}
      />

      <FunnelContextBar>
        {foundingOpen ? (
          <>
            <span className="jf-bar__full">
              {t('joinFunnel.contextBar', {
                defaultValue: 'Pre-launch offer · 50% off the first year · refundable until launch',
              })}
            </span>
            <span className="jf-bar__short">
              {t('joinFunnel.contextBarShort', { defaultValue: '50% off the first year · refundable' })}
            </span>
          </>
        ) : (
          <span>{t('earlyAccess.offerEnded')}</span>
        )}
      </FunnelContextBar>

      {/* Logo only, centred, unlinked — a funnel has one exit and it's the CTA. */}
      <FunnelLogoNav />

      <main id="main-content">
        {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
        <section className="jf-hero">
          <div className="jf-hero__copy">
            <span className="funnel-eyebrow jf-eyebrow">
              {t('joinFunnel.hero.eyebrow', { defaultValue: 'The Training Club' })}
            </span>
            <h1 className="jf-h1 font-display">
              <span className="jf-line">{t('joinFunnel.hero.h1a', { defaultValue: 'Enter' })}</span>
              <span className="jf-line jf-line--accent">
                {t('joinFunnel.hero.h1b', { defaultValue: 'the club.' })}
              </span>
            </h1>
            <p className="jf-hero__body">
              {t('joinFunnel.hero.body', {
                defaultValue:
                  "The day's training handed to you, a streak that never resets to zero, and cash challenges with real money on the line.",
              })}
            </p>

            {/* Store badges — desktop only per target (mobile drops them).
                Google Play is omitted: launch is iOS-only (Noah, 2026-08-21).
                Restore the second badge when Android ships. */}
            <div className="jf-stores">
              <span className="jf-store">
                {t('joinFunnel.stores.ios', { defaultValue: 'On the App Store 3 September' })}
              </span>
            </div>
          </div>

          <div className="jf-hero__media">
            <FunnelVideo
              className="jf-hero__film"
              video={FOUNDING_MEMBER_VIDEO}
              analyticsName="founding_member"
              playLabel={t('joinFunnel.hero.videoPlayLabel', {
                defaultValue: 'Play: become a Founding Member, 2 minutes 44 seconds',
              })}
              caption={t('joinFunnel.hero.videoCaption', {
                defaultValue: 'Inside the club — 2:44',
              })}
            />
            {/* The film ends on "the button is below the video ... the rules are
                linked to the button below", so the hero's one CTA lives HERE
                rather than in the copy column — otherwise the mobile stack puts
                it above the film and the voiceover is describing nothing. */}
            <div className="jf-hero__film-cta">
              <a className="funnel-btn jf-btn jf-btn--primary" href={MEMBERSHIP_HREF}>
                {ctaLabel}
              </a>
              <p className="jf-hero__footnote">
                {foundingOpen
                  ? t('joinFunnel.hero.footnote', {
                      defaultValue: '50% off the first year · fully refundable until launch',
                    })
                  : t('joinFunnel.hero.footnoteClosed', {
                      defaultValue: 'A full year of Premium · available at launch',
                    })}
              </p>
              {/* Deep-linked: this is the founding funnel, and §Early Access is
              the section that governs it. Landing at the top of an 18-section
              document is not "the terms for this offer". */}
          <Link to="/terms#early-access" className="jf-inline-link jf-hero__rules">
                {t('joinFunnel.hero.rulesLink', { defaultValue: 'Read the full terms' })}
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. Real members from the beta ───────────────────────────────── */}
        <section className="jf-proof">
          <p className="jf-proof__label">
            <span className="jf-proof__check" aria-hidden="true">✓</span>
            {t('joinFunnel.proof.label', { defaultValue: 'Real members from the beta' })}
          </p>
          <div className="jf-proof__rail">
            {members.map((m) => (
              <figure className="jf-proof__card" data-popin key={m.name}>
                <img src={m.photo} alt={m.name} loading="lazy" />
                <figcaption>
                  <span className="jf-proof__name font-display">{m.name}</span>
                  <span className="jf-proof__meta">{m.meta}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── 3. Stats — borderless full-bleed band ───────────────────────── */}
        <section className="jf-stats" aria-label={t('joinFunnel.stats.label', { defaultValue: 'Libo in numbers' })}>
          <ul className="jf-stats__row">
            {stats.map((s) => (
              <li className="jf-stat" key={s.label}>
                <span className="jf-stat__value font-display">{s.value}</span>
                <span className="jf-stat__label">
                  {s.labelMobile ? (
                    <>
                      <span className="jf-copy--desktop">{s.label}</span>
                      <span className="jf-copy--mobile">{s.labelMobile}</span>
                    </>
                  ) : (
                    s.label
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 4. Why the club holds ───────────────────────────────────────── */}
        <section className="jf-section jf-holds">
          <h2 className="jf-h2 jf-h2--left font-display">
            <span className="jf-line">{t('joinFunnel.holds.h2a', { defaultValue: 'Why the club' })}</span>
            <span className="jf-line jf-line--accent">
              {t('joinFunnel.holds.h2b', { defaultValue: 'holds.' })}
            </span>
          </h2>
          <div className="jf-holds__grid">
            {holds.map((c) => (
              <article className="jf-hold" data-popin key={c.num}>
                <span className="jf-hold__num font-display">{c.num}</span>
                <h3 className="jf-hold__title font-display">{c.title}</h3>
                <p className="jf-hold__body">{c.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── 5. Your whole club, in your pocket ──────────────────────────── */}
        <section className="jf-section jf-pocket">
          <h2 className="jf-h2 font-display">
            <span className="jf-line">
              {t('joinFunnel.pocket.h2a', { defaultValue: 'Your whole club,' })}
            </span>
            <span className="jf-line jf-line--accent">
              {t('joinFunnel.pocket.h2b', { defaultValue: 'in your pocket.' })}
            </span>
          </h2>
          <p className="jf-lede">
            {t('joinFunnel.pocket.lede', {
              defaultValue:
                'Everything lives in one app — your session, your streak, your challenges, your progress. One tap away, every day.',
            })}
          </p>
          {/* Fanned trio: centre phone larger + raised, flanks tucked behind.
              Mobile shows the centre phone only. */}
          <div className="jf-fan">
            <div className="jf-fan__frame jf-fan__frame--0" data-popin>
              <img src="/app-real-run.png" alt="" loading="lazy" />
            </div>
            <div className="jf-fan__frame jf-fan__frame--1" data-popin>
              <img
                src="/app-real-home.png"
                alt={t('joinFunnel.pocket.alt', {
                  defaultValue: "Libo home screen showing the active plan and today's workout",
                })}
                loading="lazy"
              />
            </div>
            <div className="jf-fan__frame jf-fan__frame--2" data-popin>
              <img src="/app-real-rewards.png" alt="" loading="lazy" />
            </div>
          </div>
          <ul className="jf-pills">
            <li className="jf-pill">{t('joinFunnel.pocket.pill1', { defaultValue: "Today's workout" })}</li>
            <li className="jf-pill">{t('joinFunnel.pocket.pill2', { defaultValue: 'Streak & freezes' })}</li>
            <li className="jf-pill">{t('joinFunnel.pocket.pill3', { defaultValue: 'Progress tracking' })}</li>
          </ul>
          <a className="funnel-btn jf-btn jf-btn--primary" href={MEMBERSHIP_HREF}>
            {ctaUnpriced}
          </a>
        </section>

        {/* ── 6. Pricing ──────────────────────────────────────────────────── */}
        <section className="jf-section jf-membership" id="membership">
          <span className="funnel-eyebrow jf-eyebrow">
            {t('joinFunnel.offer.eyebrow', { defaultValue: 'Pre-sale · ends at launch' })}
          </span>
          {/* Both lines white — no lime in this headline (target). */}
          <h2 className="jf-h2 font-display">
            <span className="jf-line">
              {t('joinFunnel.offer.h2a', { defaultValue: 'Lock in the year' })}
            </span>
            <span className="jf-line">
              {t('joinFunnel.offer.h2b', { defaultValue: 'before we launch.' })}
            </span>
          </h2>

          <article className="jf-offer" data-popin>
            {/* Badge notched into the card's top border — the countdown has to
                sit BELOW it, or it collides with the negative top offset. */}
            <span className="jf-offer__badge font-display">
              {foundingOpen ? (
                <>
                  <span className="jf-copy--desktop">
                    {t('joinFunnel.offer.badge', { defaultValue: 'Pre-launch only' })}
                  </span>
                  <span className="jf-copy--mobile">
                    {t('joinFunnel.offer.badgeMobile', { defaultValue: 'Pre-launch' })}
                  </span>
                </>
              ) : (
                t('membershipV2.plans.premium.name', { defaultValue: 'Premium' })
              )}
            </span>
            <LaunchCountdown />
            <h3 className="jf-offer__title font-display">
              {foundingOpen
                ? t('joinFunnel.offer.title', { defaultValue: 'Founding Member' })
                : t('membershipV2.plans.premium.name', { defaultValue: 'Premium' })}
            </h3>
            {/* New price FIRST, was-price after — once the pre-sale closes
                there is no "was", just the standing €79.99 list price. */}
            <p className="jf-offer__price">
              <span className="jf-offer__now font-display">{foundingOpen ? PRICE : WAS_PRICE}</span>
              {foundingOpen && <s className="jf-offer__was">{WAS_PRICE}</s>}
              <span className="jf-offer__per">
                {foundingOpen
                  ? t('joinFunnel.offer.per', { defaultValue: 'first year' })
                  : t('membershipV2.plans.premium.per', { defaultValue: '/year · €6.67/mo' })}
              </span>
            </p>
            <ul className="jf-offer__ticks">
              {benefits.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {stripeReady && foundingOpen && (
              <button
                type="button"
                className="funnel-btn jf-btn jf-btn--primary jf-btn--block"
                onClick={() => openFoundingCheckout('fm_funnel')}
              >
                {ctaLabel}
              </button>
            )}
            {!foundingOpen && <p className="jf-offer__closed">{t('earlyAccess.offerEnded')}</p>}
          </article>

          <p className="jf-offer__fine">
            {t('joinFunnel.offer.fine', {
              defaultValue:
                'Checkout opens from this card only — price always shown first. Just want launch news? The waitlist lives on the ',
            })}
            <Link to="/#waitlist" className="jf-inline-link">
              {t('joinFunnel.offer.fineLink', { defaultValue: 'homepage' })}
            </Link>
            .
          </p>
        </section>

        {/* ── 7. FAQ ──────────────────────────────────────────────────────── */}
        <section className="jf-section">
          <ScrollRevealText as="h2" className="jf-h2 font-display">
            {t('joinFunnel.faq.title', { defaultValue: 'Any questions?' })}
          </ScrollRevealText>
          <ul className="funnel-faq jf-faq">
            {faqs.map((faq, i) => {
              const open = openFaq === i;
              return (
                <li
                  className={`funnel-faq__row jf-faq__row${open ? ' funnel-faq__row--open jf-faq__row--open' : ''}`}
                  key={faq.q}
                >
                  <button
                    type="button"
                    className="funnel-faq__q jf-faq__q"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    <span>{faq.q}</span>
                    <span className="funnel-faq__sign jf-faq__sign" aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                  {open && <p className="funnel-faq__a jf-faq__a">{faq.a}</p>}
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── 8. Close ────────────────────────────────────────────────────── */}
        <section className="jf-section jf-close">
          <div className="jf-close__card" data-popin>
            <h2 className="jf-h2 font-display">
              <span className="jf-line">{t('joinFunnel.close.h2a', { defaultValue: 'Start today.' })}</span>
              <span className="jf-line jf-line--accent">
                {t('joinFunnel.close.h2b', { defaultValue: 'Not someday.' })}
              </span>
            </h2>
            <a className="funnel-btn jf-btn jf-btn--primary jf-close__cta" href={MEMBERSHIP_HREF}>
              {ctaLabel}
            </a>
            <p className="jf-close__fine">
              <span className="jf-copy--desktop">
                {t('joinFunnel.close.fine', {
                  defaultValue: '50% off the first year · year starts on launch day · fully refundable until launch',
                })}
              </span>
              <span className="jf-copy--mobile">
                {t('joinFunnel.close.fineMobile', {
                  defaultValue: '50% off the first year · year starts on launch day · refundable until launch',
                })}
              </span>
            </p>
          </div>
        </section>
      </main>

      <FunnelMinimalFooter />

      {/* Sticky mobile CTA — unpriced (the price lives on the inline + card
          buttons); anchors to the card, never opens checkout directly. */}
      <FunnelStickyCta label={ctaUnpriced} href={MEMBERSHIP_HREF} />
    </div>
  );
}
