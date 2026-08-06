import { useState } from 'react';
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
import { usePopIn } from '../utils/funnelAnimations';
import './JoinFunnel.css';

/**
 * /join — the Founding Member funnel.
 *
 * Sells exactly ONE thing: Founding Member, €39.50 (was €79.99), refundable
 * until launch, year starts at launch.
 *
 * Hard rules (MASTER-HANDOFF §16 / HANDOFF-V2-COMPLEMENT §81):
 * - ZERO email inputs on this page. No waitlist, no capture of any kind. People
 *   who aren't ready to pay get a text link back to the homepage waitlist.
 * - Every CTA anchors to the single Founding Member card (#membership). Only
 *   that card's button opens Stripe, so the price is always on screen at the
 *   moment of commitment.
 * - No free-member card, no Home/Pricing links in the footer, never "cycle #1".
 *
 * Only the hero was captured in the design canvases (06 desktop / 17 mobile);
 * everything below it is built from the written spec.
 */

const PRICE = `€${EARLY_ACCESS_PRICE.toFixed(2)}`; // €39.50
const WAS_PRICE = '€79.99';
const MEMBERSHIP_HREF = '#membership';

/** Photo slot for the hero card — placeholder until "inside the club" photography lands. */
const HERO_PHOTO = '/images/marketing/cash-challenge-flagship-ai.jpg';

type Screen = { src: string; alt: string; caption: string };

export default function JoinFunnel() {
  const { t } = useTranslation();
  const { openFoundingCheckout } = useFoundingCheckout();
  const stripeReady = isStripeConfigured();

  // Pop-in cards (benefit pills, stats, offer card). Replays both directions.
  usePopIn();

  // Accordion: one open at a time, first open on load.
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const ctaLabel = t('joinFunnel.cta.primary', {
    defaultValue: 'Become a Founding Member — {{price}} →',
    price: PRICE,
  });

  const screens: Screen[] = [
    {
      src: '/app-real-home.png',
      alt: t('joinFunnel.screens.home.alt', {
        defaultValue: 'Libo home screen showing the active plan and today’s workout',
      }),
      caption: t('joinFunnel.screens.home.caption', { defaultValue: 'Today’s workout' }),
    },
    {
      src: '/app-real-run.png',
      alt: t('joinFunnel.screens.run.alt', {
        defaultValue: 'A cash challenge day screen with the 30-day tracker',
      }),
      caption: t('joinFunnel.screens.run.caption', { defaultValue: 'Challenge day' }),
    },
    {
      src: '/app-real-rewards.png',
      alt: t('joinFunnel.screens.rewards.alt', {
        defaultValue: 'The rewards tab showing points, streak and open challenges',
      }),
      caption: t('joinFunnel.screens.rewards.caption', { defaultValue: 'Streak & rewards' }),
    },
  ];

  const capabilities = [
    t('joinFunnel.pills.session', { defaultValue: 'The day’s session, picked for you' }),
    t('joinFunnel.pills.streak', { defaultValue: 'A streak that survives a bad week' }),
    t('joinFunnel.pills.cash', { defaultValue: 'Cash challenges with real money on the line' }),
  ];

  const stats = [
    {
      value: t('joinFunnel.stats.exercises.value', { defaultValue: '641' }),
      label: t('joinFunnel.stats.exercises.label', { defaultValue: 'Exercises' }),
    },
    {
      value: t('joinFunnel.stats.workouts.value', { defaultValue: '140' }),
      label: t('joinFunnel.stats.workouts.label', { defaultValue: 'Guided workouts' }),
    },
    {
      value: t('joinFunnel.stats.platforms.value', { defaultValue: 'iOS & Android' }),
      label: t('joinFunnel.stats.platforms.label', { defaultValue: 'Both stores at launch' }),
    },
    {
      value: t('joinFunnel.stats.freeTier.value', { defaultValue: 'Free tier' }),
      label: t('joinFunnel.stats.freeTier.label', { defaultValue: 'No card needed to start' }),
    },
  ];

  const benefits = [
    t('joinFunnel.offer.benefit1', { defaultValue: '12 months of Premium' }),
    t('joinFunnel.offer.benefit2', { defaultValue: 'First through the door at launch' }),
    t('joinFunnel.offer.benefit3', { defaultValue: 'Every cash-challenge tier unlocked' }),
    t('joinFunnel.offer.benefit4', { defaultValue: '2 freeze tokens per challenge' }),
    t('joinFunnel.offer.benefit5', { defaultValue: 'Fully refundable until launch' }),
  ];

  const faqs = [
    {
      q: t('joinFunnel.faq.q1', { defaultValue: 'What do I actually get?' }),
      a: t('joinFunnel.faq.a1', {
        defaultValue:
          'Twelve months of Libo Premium for half price: the day’s training picked for you, a streak that never resets to zero, every cash-challenge tier unlocked, and 2 freeze tokens per challenge.',
      }),
    },
    {
      q: t('joinFunnel.faq.q2', { defaultValue: 'When does my year start?' }),
      a: t('joinFunnel.faq.a2', {
        defaultValue:
          'At launch, not today. The 12 months begin the day the app goes live, so joining early costs you nothing but the wait.',
      }),
    },
    {
      q: t('joinFunnel.faq.q3', { defaultValue: 'Can I get my money back?' }),
      a: t('joinFunnel.faq.a3', {
        defaultValue:
          'Yes. Your payment is fully refundable until launch day — email us any time before then and we send it back in full.',
      }),
    },
    {
      q: t('joinFunnel.faq.q4', { defaultValue: 'What happens on launch day?' }),
      a: t('joinFunnel.faq.a4', {
        defaultValue:
          'You are first through the door. We email your download link before general release, your Premium year starts, and every cash-challenge tier is already unlocked on your account.',
      }),
    },
    {
      q: t('joinFunnel.faq.q5', { defaultValue: 'Is there a free option?' }),
      a: t('joinFunnel.faq.a5', {
        defaultValue:
          'Yes — Libo has a free tier, and you can join it at launch without paying anything. Founding Member is for people who want Premium at half price and to be in on day one.',
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
      />

      {/* ── Context bar. Two strings so the long one can't wrap awkwardly at 390px. */}
      <FunnelContextBar>
        <span className="jf-bar__full">
          {t('joinFunnel.contextBar', {
            defaultValue: 'Pre-launch offer · 50% off the first year · refundable until launch',
          })}
        </span>
        <span className="jf-bar__short">
          {t('joinFunnel.contextBarShort', {
            defaultValue: '50% off the first year · refundable',
          })}
        </span>
      </FunnelContextBar>

      {/* Logo only, centred, unlinked — a funnel has one exit and it's the CTA. */}
      <FunnelLogoNav />

      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <section className="jf-hero">
        {/* Soft lime bloom. Sits on its own layer behind the copy and is clipped
            to the headline band, so it can never wash over the CTA the way the
            canvas render does. */}
        <div className="jf-hero__bloom" aria-hidden="true" />

        <div className="jf-hero__inner">
          <div className="jf-hero__copy">
            <span className="jf-eyebrow">
              {t('joinFunnel.hero.eyebrow', { defaultValue: 'The Training Club' })}
            </span>

            <h1 className="jf-hero__title font-display">
              <ScrollRevealText as="span" className="jf-line">
                {t('joinFunnel.hero.titleLine1', { defaultValue: 'Enter' })}
              </ScrollRevealText>
              <ScrollRevealText as="span" className="jf-line jf-line--accent">
                {t('joinFunnel.hero.titleLine2', { defaultValue: 'the club.' })}
              </ScrollRevealText>
            </h1>

            <p className="jf-hero__body">
              {t('joinFunnel.hero.body', {
                defaultValue:
                  'The day’s training handed to you, a streak that never resets to zero, and cash challenges with real money on the line.',
              })}
            </p>

            <div className="jf-hero__actions">
              <a className="jf-btn jf-btn--primary" href={MEMBERSHIP_HREF}>
                {ctaLabel}
              </a>
              <p className="jf-hero__footnote">
                {t('joinFunnel.hero.footnote', {
                  defaultValue: '50% off the first year · fully refundable until launch',
                })}
              </p>
            </div>
          </div>

          <div className="jf-hero__media">
            <figure className="jf-photo">
              <img
                src={HERO_PHOTO}
                alt={t('joinFunnel.hero.photoAlt', {
                  defaultValue: 'A Libo member mid-session',
                })}
                loading="eager"
                decoding="async"
              />
              <figcaption className="jf-photo__caption">
                {t('joinFunnel.hero.photoCaption', { defaultValue: 'Inside the club' })}
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ── 2. Framed real screens + capability pills ────────────────────────── */}
      <section className="jf-section jf-screens">
        <h2 className="jf-h2 font-display">
          <ScrollRevealText as="span" className="jf-line">
            {t('joinFunnel.screens.titleLine1', { defaultValue: 'This is' })}
          </ScrollRevealText>
          <ScrollRevealText as="span" className="jf-line jf-line--accent">
            {t('joinFunnel.screens.titleLine2', { defaultValue: 'the app.' })}
          </ScrollRevealText>
        </h2>
        <p className="jf-lede">
          {t('joinFunnel.screens.lede', {
            defaultValue: 'Real screens from the build. Nothing here is a mock-up.',
          })}
        </p>

        <div className="jf-phones">
          {screens.map((s) => (
            <figure className="jf-phone" key={s.src}>
              <div className="jf-phone__frame">
                <img src={s.src} alt={s.alt} loading="lazy" decoding="async" />
              </div>
              <figcaption className="jf-phone__caption">{s.caption}</figcaption>
            </figure>
          ))}
        </div>

        <ul className="jf-pills">
          {capabilities.map((c) => (
            <li className="jf-pill" key={c} data-popin>
              <span className="jf-pill__dot" aria-hidden="true" />
              {c}
            </li>
          ))}
        </ul>

        <div className="jf-ctabar">
          <a className="jf-btn jf-btn--primary" href={MEMBERSHIP_HREF}>
            {ctaLabel}
          </a>
        </div>
      </section>

      {/* ── 3. Stats row (2×2 on mobile) ─────────────────────────────────────── */}
      <section className="jf-section jf-stats-section">
        <ul className="jf-stats">
          {stats.map((s) => (
            <li className="jf-stat" key={s.label} data-popin>
              <span className="jf-stat__value font-display">{s.value}</span>
              <span className="jf-stat__label">{s.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 4. Your whole club in your pocket ────────────────────────────────── */}
      <section className="jf-section jf-pocket">
        <div className="jf-pocket__inner">
          <div className="jf-pocket__copy">
            <h2 className="jf-h2 font-display">
              <ScrollRevealText as="span" className="jf-line">
                {t('joinFunnel.pocket.titleLine1', { defaultValue: 'Your whole club' })}
              </ScrollRevealText>
              <ScrollRevealText as="span" className="jf-line jf-line--accent">
                {t('joinFunnel.pocket.titleLine2', { defaultValue: 'in your pocket.' })}
              </ScrollRevealText>
            </h2>
            <p className="jf-lede jf-lede--left">
              {t('joinFunnel.pocket.body', {
                defaultValue:
                  'Plans, guided sessions, streaks, cash challenges and rewards — one app, on iOS and Android, from launch day.',
              })}
            </p>
            <a className="jf-btn jf-btn--primary" href={MEMBERSHIP_HREF}>
              {ctaLabel}
            </a>
          </div>

          <figure className="jf-pocket__media">
            <div className="jf-phone__frame jf-phone__frame--lg">
              <img
                src="/app-real-live.png"
                alt={t('joinFunnel.pocket.photoAlt', {
                  defaultValue: 'A finished Libo session summary ready to share',
                })}
                loading="lazy"
                decoding="async"
              />
            </div>
          </figure>
        </div>
      </section>

      {/* ── 5. The single Founding Member card ───────────────────────────────── */}
      <section className="jf-section jf-membership" id="membership">
        <h2 className="jf-h2 font-display">
          <ScrollRevealText as="span" className="jf-line">
            {t('joinFunnel.offer.titleLine1', { defaultValue: 'One offer.' })}
          </ScrollRevealText>
          <ScrollRevealText as="span" className="jf-line jf-line--accent">
            {t('joinFunnel.offer.titleLine2', { defaultValue: 'One price.' })}
          </ScrollRevealText>
        </h2>

        <article className="jf-offer" data-popin>
          <span className="jf-offer__badge">
            {t('joinFunnel.offer.badge', { defaultValue: 'Founding Member' })}
          </span>

          <div className="jf-offer__price">
            <s className="jf-offer__was">{WAS_PRICE}</s>
            <span className="jf-offer__now font-display">{PRICE}</span>
            <span className="jf-offer__per">
              {t('joinFunnel.offer.per', { defaultValue: 'for the first year' })}
            </span>
          </div>

          <p className="jf-offer__note">
            {t('joinFunnel.offer.note', {
              defaultValue: 'Your year starts at launch, not the day you pay.',
            })}
          </p>

          <ul className="jf-offer__list">
            {benefits.map((b) => (
              <li key={b}>
                <span className="jf-offer__tick" aria-hidden="true">
                  ✓
                </span>
                {b}
              </li>
            ))}
          </ul>

          {/* The ONLY checkout entry point on this page. Hidden — not disabled
              into a dead button — when Stripe isn't configured, because the
              provider no-ops and we never show a checkout that can't charge. */}
          {stripeReady ? (
            <button
              type="button"
              className="jf-btn jf-btn--primary jf-btn--block"
              onClick={() => openFoundingCheckout('fm_funnel')}
            >
              {ctaLabel}
            </button>
          ) : (
            <p className="jf-offer__unavailable">
              {t('joinFunnel.offer.unavailable', {
                defaultValue: 'Founding Member checkout opens shortly — check back in a moment.',
              })}
            </p>
          )}

          <p className="jf-offer__fine">
            {t('joinFunnel.offer.fine', {
              defaultValue: 'Secure card payment · fully refundable until launch',
            })}
          </p>
        </article>
      </section>

      {/* ── 6. FAQ ───────────────────────────────────────────────────────────── */}
      <section className="jf-section jf-faq-section">
        <h2 className="jf-h2 jf-h2--sm font-display">
          <ScrollRevealText as="span" className="jf-line">
            {t('joinFunnel.faq.titleLine1', { defaultValue: 'Before you' })}
          </ScrollRevealText>
          <ScrollRevealText as="span" className="jf-line jf-line--accent">
            {t('joinFunnel.faq.titleLine2', { defaultValue: 'join.' })}
          </ScrollRevealText>
        </h2>

        <div className="jf-faq">
          {faqs.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div className={`jf-faq__item${isOpen ? ' is-open' : ''}`} key={item.q}>
                <h3 className="jf-faq__h">
                  <button
                    type="button"
                    className="jf-faq__q"
                    aria-expanded={isOpen}
                    aria-controls={`jf-faq-a-${i}`}
                    id={`jf-faq-q-${i}`}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <span>{item.q}</span>
                    <span className="jf-faq__sign" aria-hidden="true">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                </h3>
                {isOpen && (
                  <div className="jf-faq__a" id={`jf-faq-a-${i}`} role="region" aria-labelledby={`jf-faq-q-${i}`}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 7. Close ─────────────────────────────────────────────────────────── */}
      <section className="jf-section jf-close">
        <div className="jf-close__card">
          <h2 className="jf-h2 font-display">
            <ScrollRevealText as="span" className="jf-line">
              {t('joinFunnel.close.titleLine1', { defaultValue: 'Start today.' })}
            </ScrollRevealText>
            <ScrollRevealText as="span" className="jf-line jf-line--accent">
              {t('joinFunnel.close.titleLine2', { defaultValue: 'Not someday.' })}
            </ScrollRevealText>
          </h2>
          <p className="jf-lede">
            {t('joinFunnel.close.body', {
              defaultValue:
                '50% off the first year, refundable until launch. The only thing you lose by waiting is the discount.',
            })}
          </p>
          <a className="jf-btn jf-btn--primary" href={MEMBERSHIP_HREF}>
            {ctaLabel}
          </a>
        </div>
      </section>

      <FunnelMinimalFooter />

      {/* Mobile sticky: no price (it lives on the inline + card buttons) and it
          anchors to the card rather than opening checkout, so the price is
          always on screen before Stripe appears. */}
      <FunnelStickyCta
        href={MEMBERSHIP_HREF}
        label={t('joinFunnel.cta.sticky', { defaultValue: 'Become a Founding Member →' })}
      />
    </div>
  );
}
