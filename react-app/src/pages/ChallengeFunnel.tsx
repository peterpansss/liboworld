import { useState } from 'react';
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
import { logFunnelClick } from '../lib/funnelSignups';
import { usePopIn } from '../utils/funnelAnimations';
import { getChallengeTier, FUNNEL_TIER_SLUG, type ChallengeTier } from '../data/challengeTiers';
import './ChallengeFunnel.css';

/**
 * /cash-challenges/:tier — one funnel per tier (€5 Starter / €15 Committed /
 * €50 Flagship). One component; `challengeTiers.ts` drives payout, reps, image.
 *
 * CTA rule (MASTER-HANDOFF §15) — ONE action phrase per funnel:
 * every button reads "Click to Enter →"; the single button that opens Stripe
 * reads "Click to Enter — €39.50/yr →" so the price is on screen at the moment
 * of commitment. Never mix labels.
 *
 * Starter is the free tier, so it inverts: its action phrase is
 * "Join free at launch →" pointing at the homepage waitlist, with Premium as a
 * small text link. It never opens checkout.
 *
 * NO email capture anywhere on this page — the only capture on the site is at
 * the bottom of the homepage.
 *
 * Only the hero band was captured in the design canvases; everything below it
 * is built from the written spec (MASTER-HANDOFF §24 authorises this).
 */

const PRICE = `€${EARLY_ACCESS_PRICE.toFixed(2)}`; // €39.50
const WAITLIST_HREF = '/#waitlist';
const OFFER_HREF = '#offer';

/** The app screens shown in "Inside the challenge". Mapped by content, not filename. */
const INSIDE_SCREENS = [
  { src: '/app-real-run.png', key: 'run' },
  { src: '/app-real-rewards.png', key: 'rewards' },
  { src: '/app-real-live.png', key: 'summary' },
] as const;

type Winner = { photo: string; name: string; amount: number; handle: string };

const WINNERS: Winner[] = [
  { photo: '/beta-sarah.png', name: 'Somin', amount: 50, handle: '@somin' },
  { photo: '/beta-marco.png', name: 'Gabriel', amount: 15, handle: '@gabriel' },
  { photo: '/beta-paul.png', name: 'Tony', amount: 5, handle: '@tony' },
];

export default function ChallengeFunnel() {
  const { tier: slug } = useParams();
  const tier = getChallengeTier(slug);
  const { t } = useTranslation();
  const { openFoundingCheckout } = useFoundingCheckout();
  const stripeReady = isStripeConfigured();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  usePopIn();

  // Unknown slug → back to the catalogue rather than a 404 or the homepage.
  if (!tier) return <Navigate to="/cash-challenges" replace />;

  const isFree = !tier.requiresPremium;

  // One action phrase for the whole funnel. Free tier inverts to the waitlist.
  const ctaLabel = isFree
    ? t('challengeFunnel.cta.free', { defaultValue: 'Join free at launch →' })
    : t('challengeFunnel.cta.enter', { defaultValue: 'Click to Enter →' });

  // The single priced label: checkout button + mobile sticky bar.
  const ctaPricedLabel = isFree
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

  /** Repeated between sections; anchors to the offer card (or the waitlist on Starter). */
  const CtaBar = () => (
    <div className="cf-ctabar">
      <a
        className="cf-btn"
        href={isFree ? WAITLIST_HREF : OFFER_HREF}
        onClick={track}
      >
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
            defaultValue: '50 spots per challenge — your 30 days start the moment you join',
          })}
        </span>
        {/* Copy variant, not CSS truncation — matches the announcement-bar pattern. */}
        <span className="cf-bar__short">
          {t('challengeFunnel.bar.short', {
            defaultValue: '50 spots — your 30 days start the moment you join',
          })}
        </span>
      </FunnelContextBar>

      <FunnelLogoNav
        backTo="/cash-challenges"
        backLabel={t('challengeFunnel.back', { defaultValue: 'Back to challenges' })}
      />

      <main id="main-content">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
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
            <span className="cf-heroshot__payout font-display">€{tier.payout}</span>
            <span className="cf-heroshot__tier font-display">{tier.name}</span>
          </div>

          <CtaBar />

          <ul className="cf-stats">
            <Stat value={`€${tier.payout}`} label={t('challengeFunnel.stats.payout', { defaultValue: 'Payout' })} />
            <Stat value={String(tier.reps)} label={t('challengeFunnel.stats.reps', { defaultValue: 'Reps / day' })} />
            <Stat value={String(tier.days)} label={t('challengeFunnel.stats.days', { defaultValue: 'Days' })} />
            <Stat value={String(tier.spots)} label={t('challengeFunnel.stats.spots', { defaultValue: 'Spots' })} />
          </ul>
        </section>

        {/* ── Pain ────────────────────────────────────────────────────────── */}
        <section className="cf-section cf-section--tight">
          <ScrollRevealText as="h2" className="cf-h2 font-display">
            {t('challengeFunnel.pain.title', {
              defaultValue: 'You never needed a plan. You needed a reason to finish one.',
            })}
          </ScrollRevealText>
          <p className="cf-body">
            {t('challengeFunnel.pain.body', {
              defaultValue:
                'The first week always works. The problem is day 19 — when nobody notices whether you show up. In the challenge, somebody does: 49 other people, and your own money.',
            })}
          </p>
        </section>

        {/* ── Rep → proof → payout ────────────────────────────────────────── */}
        <section className="cf-section">
          <ScrollRevealText as="h2" className="cf-h2 cf-h2--accent font-display">
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
              defaultValue: 'No per-challenge fee — entry comes with your membership.',
            })}
          </p>
          <CtaBar />
        </section>

        {/* ── Inside the challenge ────────────────────────────────────────── */}
        <section className="cf-section cf-inside">
          <span className="cf-eyebrow">
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
          <div className="cf-screens">
            {INSIDE_SCREENS.map(({ src, key }) => (
              <div className="cf-screen" key={key} data-popin>
                <img src={src} alt={t(`challengeFunnel.inside.alt.${key}`, { defaultValue: '' })} loading="lazy" />
              </div>
            ))}
          </div>
          <ul className="cf-pills">
            <li className="cf-pill">{t('challengeFunnel.inside.pill1', { defaultValue: 'Live rep counter' })}</li>
            <li className="cf-pill">{t('challengeFunnel.inside.pill2', { defaultValue: 'Camera verification' })}</li>
            <li className="cf-pill">{t('challengeFunnel.inside.pill3', { defaultValue: 'Real cash payout' })}</li>
          </ul>
          {/* Naming bridge: the site sells "Cash Challenges", the app calls the
              surface "Rewards". Both names stay, always bridged. */}
          <p className="cf-note">
            {t('challengeFunnel.inside.bridge', {
              defaultValue: 'In the app, challenges live in the Rewards tab.',
            })}
          </p>
        </section>

        {/* ── Winners ─────────────────────────────────────────────────────── */}
        <section className="cf-section">
          <ScrollRevealText as="h2" className="cf-h2 font-display">
            {t('challengeFunnel.winners.title', { defaultValue: 'They finished. They got paid.' })}
          </ScrollRevealText>
          <ul className="cf-winners">
            {WINNERS.map((w) => (
              <li className="cf-winner" key={w.name} data-popin>
                <img className="cf-winner__photo" src={w.photo} alt="" loading="lazy" />
                <span className="cf-winner__badge font-display">€{w.amount}</span>
                <span className="cf-winner__name">{w.name}</span>
                <span className="cf-winner__meta">
                  {t('challengeFunnel.winners.earned', {
                    defaultValue: 'earned €{{amount}} · 30 days',
                    amount: w.amount,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Offer ───────────────────────────────────────────────────────── */}
        <section className="cf-section" id="offer">
          {isFree ? (
            <div className="cf-offer" data-popin>
              <h2 className="cf-offer__title font-display">
                {t('challengeFunnel.offer.freeTitle', { defaultValue: 'Starter is free.' })}
              </h2>
              <p className="cf-body">
                {t('challengeFunnel.offer.freeBody', {
                  defaultValue:
                    'The €5 tier comes with the free tier — join at launch and start your 30 days the day you get in.',
                })}
              </p>
              <a className="cf-btn cf-btn--lg" href={WAITLIST_HREF} onClick={track}>
                {ctaLabel}
              </a>
              {/* Upsell stays a TEXT LINK on the free tier — never a second button. */}
              <Link className="cf-textlink" to="/join">
                {t('challengeFunnel.offer.upsell', {
                  defaultValue: 'Want the €15 and €50 tiers? Get Premium — 50% off →',
                })}
              </Link>
            </div>
          ) : (
            <div className="cf-offer" data-popin>
              <h2 className="cf-offer__title font-display">
                {t('challengeFunnel.offer.title', { defaultValue: 'Premium unlocks this tier.' })}
              </h2>
              <p className="cf-offer__price">
                <span className="cf-offer__now font-display">{PRICE}</span>
                <s className="cf-offer__was">€79.99</s>
                <span className="cf-offer__per">
                  {t('challengeFunnel.offer.per', { defaultValue: '/ year' })}
                </span>
              </p>
              <p className="cf-body">
                {t('challengeFunnel.offer.body', {
                  defaultValue:
                    'Premium unlocks this tier — it does not reserve a place. Spots are first come, first served, 50 at a time. If the challenge is full, request to join and you are notified the second a spot frees.',
                })}
              </p>
              {stripeReady && (
                <button type="button" className="cf-btn cf-btn--lg" onClick={handleCheckout}>
                  {ctaPricedLabel}
                </button>
              )}
              <p className="cf-note">
                {t('challengeFunnel.offer.note', {
                  defaultValue: 'Fully refundable until launch.',
                })}
              </p>
            </div>
          )}
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section className="cf-section">
          <ScrollRevealText as="h2" className="cf-h2 font-display">
            {t('challengeFunnel.faq.title', { defaultValue: 'Straight answers.' })}
          </ScrollRevealText>
          <ul className="cf-faq">
            {faqs.map((faq, i) => {
              const open = openFaq === i;
              return (
                <li className={`cf-faq__row${open ? ' cf-faq__row--open' : ''}`} key={faq.q}>
                  <button
                    type="button"
                    className="cf-faq__q"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    <span>{faq.q}</span>
                    <span className="cf-faq__sign" aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                  {open && <p className="cf-faq__a">{faq.a}</p>}
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── Close ───────────────────────────────────────────────────────── */}
        <section className="cf-section cf-close">
          <h2 className="cf-h2 font-display">
            <span className="cf-h2__line">
              {t('challengeFunnel.close.line1', { defaultValue: '50 spots.' })}
            </span>
            <span className="cf-h2__line cf-h2__line--accent">
              {t('challengeFunnel.close.line2', { defaultValue: 'Start the day you join.' })}
            </span>
          </h2>
          <p className="cf-body">
            {t('challengeFunnel.close.sub', {
              defaultValue:
                'Premium unlocks this tier — entry is first come, first served, 50 spots at a time. If it is full, you are notified the second a spot frees.',
            })}
          </p>
          {isFree || !stripeReady ? (
            <a className="cf-btn cf-btn--lg" href={isFree ? WAITLIST_HREF : OFFER_HREF} onClick={track}>
              {ctaLabel}
            </a>
          ) : (
            <button type="button" className="cf-btn cf-btn--lg" onClick={handleCheckout}>
              {ctaPricedLabel}
            </button>
          )}
          {!isFree && (
            <Link className="cf-textlink" to={WAITLIST_HREF}>
              {t('challengeFunnel.close.waitlist', { defaultValue: 'Join the free waitlist instead' })}
            </Link>
          )}
        </section>
      </main>

      <FunnelMinimalFooter
        note={t('challengeFunnel.footerNote', { defaultValue: 'Challenge terms apply' })}
      />

      <FunnelStickyCta
        label={ctaPricedLabel}
        href={isFree ? WAITLIST_HREF : OFFER_HREF}
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
      q: t('challengeFunnel.faq.scam.q', { defaultValue: 'Is this a scam?' }),
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
