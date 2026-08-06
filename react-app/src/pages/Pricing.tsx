import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import ScrollRevealText from '../components/ScrollRevealText';
import { usePopIn } from '../utils/funnelAnimations';
import { PRICING_FAQ } from '../data/faq';
import { useFoundingCheckout } from '../components/funnel/FoundingCheckoutProvider';
import './Pricing.css';

// /membership (route /pricing redirects here) — the Membership page.
//
// Copy status, per HANDOFF-V2-COMPLEMENT §A7/§A8 and the site-wide copy rule:
//   • no prize-draw / product-raffle perks anywhere (Phase 2, gated off —
//     legal exposure), replaced by "Activity streak & points" (Free) and
//     "2 freeze tokens per challenge" (Premium)
//   • the free plan is a "free tier", never described as permanent
//   • the €12.99 month-to-month option is visible in the plan cards, not just
//     in the hero subhead
// The hero keys (relaunchPricing.hero.*) are already correct in en.json and are
// reused as-is. Everything that had to change is authored under the page-local
// `membershipV2` namespace as t(key, { defaultValue }) so a later harvest pass
// can lift the English into the locale files without five agents fighting over
// the same JSON.

type CtaStyle = 'default' | 'accent' | 'muted';

interface Plan {
  id: string;
  variant: 'default' | 'elevated';
  priceAccent: boolean;
  name: string;
  badge: string;
  price: string;
  per: string;
  /** Secondary billing line, e.g. the month-to-month alternative. */
  monthly: string;
  strike: string;
  strikeNote: string;
  blurb: string;
  perks: string[];
  ctaLabel: string;
  ctaStyle: CtaStyle;
  /** Founding Member is the only card that opens Stripe. */
  founding?: boolean;
  /** Premium isn't purchasable yet — rendered as a static, non-interactive chip. */
  staticCta?: boolean;
  href?: string;
}

export default function Pricing() {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { openFoundingCheckout } = useFoundingCheckout();

  usePopIn();

  const plans: Plan[] = [
    {
      id: 'free',
      variant: 'default',
      priceAccent: false,
      name: t('membershipV2.plans.free.name', { defaultValue: 'Free' }),
      badge: '',
      price: t('membershipV2.plans.free.price', { defaultValue: '€0' }),
      per: t('membershipV2.plans.free.per', { defaultValue: 'forever' }),
      monthly: '',
      strike: '',
      strikeNote: '',
      blurb: t('membershipV2.plans.free.blurb', {
        defaultValue: 'Everything you need to start training today — no card, no trial clock.',
      }),
      perks: [
        t('membershipV2.plans.free.perk1', { defaultValue: 'Core workout & exercise library' }),
        t('membershipV2.plans.free.perk2', { defaultValue: 'Basic progress tracking' }),
        t('membershipV2.plans.free.perk3', { defaultValue: 'Entry-level cash challenge (€5)' }),
        t('membershipV2.plans.free.perk4', { defaultValue: 'Activity streak & points' }),
        t('membershipV2.plans.free.perk5', { defaultValue: 'AI generator — 3 plans/mo' }),
      ],
      ctaLabel: t('membershipV2.plans.free.cta', { defaultValue: 'Start free' }),
      ctaStyle: 'default',
      href: '/#hero-capture',
    },
    {
      id: 'founding',
      variant: 'elevated',
      priceAccent: true,
      name: t('membershipV2.plans.founding.name', { defaultValue: 'Founding Member' }),
      badge: t('membershipV2.plans.founding.badge', { defaultValue: 'Pre-sale · 50% off' }),
      price: t('membershipV2.plans.founding.price', { defaultValue: '€39.50' }),
      per: t('membershipV2.plans.founding.per', { defaultValue: '12 months' }),
      monthly: '',
      strike: t('membershipV2.plans.founding.strike', { defaultValue: '€79.99' }),
      strikeNote: t('membershipV2.plans.founding.strikeNote', {
        defaultValue: 'refundable until launch',
      }),
      blurb: t('membershipV2.plans.founding.blurb', {
        defaultValue:
          'Lock a full year of Premium before launch. Your year starts on launch day, not today.',
      }),
      perks: [
        t('membershipV2.plans.founding.perk1', { defaultValue: 'Everything in Premium, 50% off' }),
        t('membershipV2.plans.founding.perk2', { defaultValue: 'Year starts on launch day' }),
        t('membershipV2.plans.founding.perk3', { defaultValue: 'Fully refundable until launch' }),
        t('membershipV2.plans.founding.perk4', { defaultValue: 'Founding Member badge' }),
        t('membershipV2.plans.founding.perk5', {
          defaultValue: 'First through the door at launch',
        }),
      ],
      ctaLabel: t('membershipV2.plans.founding.cta', {
        defaultValue: 'Become a Founding Member →',
      }),
      ctaStyle: 'accent',
      founding: true,
    },
    {
      id: 'premium',
      variant: 'default',
      priceAccent: false,
      name: t('membershipV2.plans.premium.name', { defaultValue: 'Premium' }),
      badge: '',
      price: t('membershipV2.plans.premium.price', { defaultValue: '€79.99' }),
      per: t('membershipV2.plans.premium.per', { defaultValue: '/year · €6.67/mo' }),
      monthly: t('membershipV2.plans.premium.monthly', {
        defaultValue: 'or €12.99/mo month-to-month — cancel any time',
      }),
      strike: '',
      strikeNote: '',
      blurb: t('membershipV2.plans.premium.blurb', {
        defaultValue: 'The full Libo experience once we launch — every format, every challenge tier.',
      }),
      perks: [
        t('membershipV2.plans.premium.perk1', {
          defaultValue: 'Full library — 641 exercises, 140 workouts',
        }),
        t('membershipV2.plans.premium.perk2', { defaultValue: 'Cash challenges up to €50' }),
        t('membershipV2.plans.premium.perk3', { defaultValue: 'Advanced analytics & PRs' }),
        t('membershipV2.plans.premium.perk4', { defaultValue: '2 freeze tokens per challenge' }),
        t('membershipV2.plans.premium.perk5', { defaultValue: 'Unlimited AI generator' }),
      ],
      ctaLabel: t('membershipV2.plans.premium.cta', { defaultValue: 'Available at launch' }),
      ctaStyle: 'muted',
      staticCta: true,
    },
  ];

  const guarantees = [
    {
      title: t('membershipV2.guarantee.g1.title', { defaultValue: 'No card to start' }),
      body: t('membershipV2.guarantee.g1.body', {
        defaultValue: 'The free tier is genuinely free — not a trial.',
      }),
    },
    {
      title: t('membershipV2.guarantee.g2.title', { defaultValue: '7 days of Premium on us' }),
      body: t('membershipV2.guarantee.g2.body', {
        defaultValue: 'Every new member starts with the full experience.',
      }),
    },
    {
      title: t('membershipV2.guarantee.g3.title', { defaultValue: 'Refundable pre-sale' }),
      body: t('membershipV2.guarantee.g3.body', {
        defaultValue: 'Founding Member is fully refundable until launch day.',
      }),
    },
  ];

  // The FAQ structure is shared (src/data/faq.ts) and so are three of its
  // answers (relaunchHome.faq.*). Two of those shared answers still carry copy
  // this page is no longer allowed to show (retired raffle perks, and the old
  // pre-rename challenge label). faq.ts and the locale files belong to other
  // owners, so the Membership page overrides just those entries locally.
  const faqOverride: Record<string, { q: string; a: string }> = {
    free: {
      q: t('membershipV2.faq.free.q', { defaultValue: 'Is Libo free?' }),
      a: t('membershipV2.faq.free.a', {
        defaultValue:
          'Yes — the free tier gets you the core workout and exercise library, basic progress tracking, your activity streak and points, and the entry-level €5 cash challenge. Premium unlocks the full library, advanced analytics, cash challenges up to €50, and 2 freeze tokens per challenge.',
      }),
    },
    challenges: {
      q: t('membershipV2.faq.challenges.q', { defaultValue: 'How do the cash challenges work?' }),
      a: t('membershipV2.faq.challenges.a', {
        defaultValue:
          'Pick a challenge and hit its daily rep target for 30 days. You record each session in the app, so the run is verified — there is no way to fake it. Your 30 days start the moment you join, and finishing pays out in real cash. Premium unlocks the bigger tiers; spots are first come, first served, 50 at a time.',
      }),
    },
    monthlyPrice: {
      q: t('membershipV2.faq.monthlyPrice.q', { defaultValue: 'What does €6.67/mo mean?' }),
      a: t('membershipV2.faq.monthlyPrice.a', {
        defaultValue:
          'Premium is billed yearly at €79.99, which works out to €6.67 per month. Prefer to stay flexible? Month-to-month is €12.99. Founding Members lock the first year at €39.50 — about €3.29/mo.',
      }),
    },
  };

  return (
    <>
      <SeoHead
        title={t('membershipV2.seo.title', {
          defaultValue: 'Membership | Libo — Training Club',
        })}
        description={t('membershipV2.seo.description', {
          defaultValue:
            'A free tier, or €6.67/mo for everything — or month-to-month at €12.99. No card to start. 7 days of Premium on us either way.',
        })}
        canonical="https://liboworld.com/membership"
        ogImage="https://liboworld.com/brand/og-image.png"
      />
      <SiteNav />

      <main className="pr-page">
        {/* ── Hero ── */}
        <header className="pr-hero">
          <span className="pr-badge">{t('relaunchPricing.hero.badge')}</span>
          {/* Two-tone headline. Each tone is its own ScrollRevealText so the
              lime segment keeps its colour through the sweep (--text override)
              instead of being repainted white by the reveal. */}
          <h1 className="pr-hero__h1">
            <ScrollRevealText as="span" className="pr-hero__seg">
              {t('relaunchPricing.hero.h1Pre')}
            </ScrollRevealText>
            <ScrollRevealText as="span" className="pr-hero__seg pr-hero__seg--accent">
              {t('relaunchPricing.hero.h1Accent')}
            </ScrollRevealText>
            <ScrollRevealText as="span" className="pr-hero__seg">
              {t('relaunchPricing.hero.h1Post')}
            </ScrollRevealText>
          </h1>
          <p className="pr-hero__sub">{t('relaunchPricing.hero.sub')}</p>
        </header>

        {/* ── Plans ── */}
        <section className="pr-plans" aria-label={t('relaunchPricing.aria.plans')}>
          {plans.map((p) => (
            <article key={p.id} className={`pr-card pr-card--${p.variant}`} data-popin>
              <div className="pr-card__head">
                <h2 className="pr-card__name">{p.name}</h2>
                {p.badge ? <span className="pr-card__badge">{p.badge}</span> : null}
              </div>

              <div className="pr-card__price-row">
                <span className={`pr-card__price${p.priceAccent ? ' pr-accent' : ''}`}>
                  {p.price}
                </span>
                <span className="pr-card__per">{p.per}</span>
              </div>

              {p.strike ? (
                <span className="pr-card__strike">
                  <span className="pr-card__strike-through">{p.strike}</span> · {p.strikeNote}
                </span>
              ) : null}

              {p.monthly ? <span className="pr-card__monthly">{p.monthly}</span> : null}

              <p className="pr-card__blurb">{p.blurb}</p>

              <ul className="pr-card__perks">
                {p.perks.map((perk) => (
                  <li key={perk} className="pr-card__perk">
                    <span className="pr-card__check" aria-hidden>
                      ✓
                    </span>{' '}
                    {perk}
                  </li>
                ))}
              </ul>

              {p.founding ? (
                <button
                  type="button"
                  className={`pr-card__cta pr-card__cta--${p.ctaStyle}`}
                  onClick={() => openFoundingCheckout('pricing_card')}
                >
                  {p.ctaLabel}
                </button>
              ) : p.staticCta ? (
                // Premium can't be bought before launch — a link here would be a
                // dead end (/pricing now redirects to this very page).
                <span
                  className={`pr-card__cta pr-card__cta--${p.ctaStyle} pr-card__cta--static`}
                  aria-disabled="true"
                >
                  {p.ctaLabel}
                </span>
              ) : (
                <Link to={p.href ?? '/'} className={`pr-card__cta pr-card__cta--${p.ctaStyle}`}>
                  {p.ctaLabel}
                </Link>
              )}
            </article>
          ))}
        </section>

        {/* ── Guarantee strip ── */}
        <section className="pr-guarantee" aria-label={t('relaunchPricing.aria.guarantees')}>
          <div className="pr-guarantee__inner">
            {guarantees.map((g) => (
              <div key={g.title} className="pr-guarantee__item">
                <span className="pr-guarantee__title">{g.title}</span>
                <span className="pr-guarantee__body">{g.body}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="pr-faq" aria-label={t('relaunchPricing.aria.faq')}>
          <div className="pr-faq__head">
            <h2 className="pr-faq__h2">{t('relaunchPricing.faq.headline')}</h2>
            <p className="pr-faq__subhead">
              {t('membershipV2.faq.subhead', {
                defaultValue: 'Same answers as the home page — one source of truth.',
              })}
            </p>
          </div>

          <div className="pr-faq__list">
            {PRICING_FAQ.map((item, i) => {
              const isOpen = openFaq === i;
              const override = faqOverride[item.id];
              const question = override ? override.q : t(item.qKey);
              const answer = override ? override.a : t(item.aKey);
              return (
                <div key={item.id} className="pr-faq__item">
                  <button
                    type="button"
                    className="pr-faq__q"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <span>{question}</span>
                    <span className="pr-faq__icon" aria-hidden>
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen ? <p className="pr-faq__a">{answer}</p> : null}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
