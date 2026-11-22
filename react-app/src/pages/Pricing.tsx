import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import { PRICING_FAQ } from '../data/faq';
import StoreBadges from '../components/StoreBadges';
import { storeUrlWithSource } from '../utils/storeRedirect';
import { MONTHLY_PRICE, YEARLY_PRICE, type BillingCycle, type TierId } from '../data/tiers';
import {
  GIVEAWAY_ENTRIES,
  LOYALTY_PER_MONTH,
  LOYALTY_MAX_MONTHS,
  LOYALTY_MIN_WORKOUT_MINUTES,
} from '../data/giveawayRounds';
import { ITEM_TIER_VALUE_CAP_EUR, ITEM_TIER_MIN_PAID_MONTHS, POINTS_EXPIRY_DAYS } from '../data/rewardsCatalog';
import './Pricing.css';

// /membership (route /pricing redirects here) — the Membership page.
//
// Structure follows LMCT+'s membership page (hero → plan cards with a billing
// toggle → full inclusions → loyalty ladder → "more than a membership" →
// FAQ → CTA); the look is Libo's own. Decisions (Noah, 19 Nov 2026):
//   • Three tiers: Free, Premium (€19.99/mo · €119.99/yr), Elite (€29.99/mo ·
//     €179.99/yr). Prices come from data/tiers.ts, never typed here.
//   • Billing is monthly or yearly only. The 3-month plan is withdrawn.
//   • Purchases happen in the app (App Store / Google Play): CTAs go to
//     /get-app or the store badges, never to a web checkout.
//   • Giveaway entries are a BONUS on top of the service. Elite leads with the
//     coach, Elite-only challenges and VIP events — never "pay for entries".
//     Entry numbers come from data/giveawayRounds.ts, and the free postal
//     route (Elite parity) is always linked next to them.
//   • Cash is always amount + condition + a link to /rules. No luck or casino
//     language, no winners feed, no trial (subscribing bills immediately),
//     the exercise claim is "820+", and points never "never expire".
//   • The Founding pre-sale is closed and has no card here any more.
//   • Physical reward items (Noah, 22 Nov 2026): Premium up to the Premium cap
//     after N paid months in a row, Elite any value after M paid months on
//     Elite. Cap and months come from data/rewardsCatalog.ts. The Free card
//     advertises no item (none is in the catalog), and no card names a
//     product or brand.

const TIER_IDS: TierId[] = ['free', 'premium', 'elite'];
const GET_APP = '/get-app?ct=membership&medium=web';
const LADDER_MONTHS = [1, 2, 3, 4, 5, 6];

type IconName = 'dumbbell' | 'coach' | 'cash' | 'points' | 'ticket' | 'star' | 'events' | 'check' | 'gift';

/** Card bullets: icon + i18n key under membershipV2.tiers.<id>. */
const HIGHLIGHTS: Record<TierId, Array<{ icon: IconName; key: string }>> = {
  free: [
    { icon: 'dumbbell', key: 'h1' },
    { icon: 'coach', key: 'h2' },
    { icon: 'cash', key: 'h3' },
    { icon: 'points', key: 'h4' },
    { icon: 'ticket', key: 'h5' },
  ],
  premium: [
    { icon: 'dumbbell', key: 'h1' },
    { icon: 'coach', key: 'h2' },
    { icon: 'cash', key: 'h3' },
    { icon: 'events', key: 'h4' },
    { icon: 'ticket', key: 'h5' },
    { icon: 'gift', key: 'h6' },
  ],
  elite: [
    { icon: 'check', key: 'h0' },
    { icon: 'coach', key: 'h1' },
    { icon: 'star', key: 'h2' },
    { icon: 'events', key: 'h3' },
    { icon: 'points', key: 'h4' },
    { icon: 'ticket', key: 'h5' },
    { icon: 'gift', key: 'h6' },
  ],
};

/** Number of inclusion lines (i1..iN) per tier in the locale files. */
const INCLUSION_COUNT: Record<TierId, number> = { free: 8, premium: 11, elite: 8 };

const eur = (n: number) => `€${n.toFixed(2)}`;
const savePct = (id: Exclude<TierId, 'free'>) =>
  Math.round((1 - YEARLY_PRICE[id] / (MONTHLY_PRICE[id] * 12)) * 100);

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    dumbbell: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
    coach: 'M4 5h16v11H9l-5 4V5zM8 10h8M8 13h5',
    cash: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM6 10v4M18 10v4',
    points: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v10M9 9.5h4.5a1.75 1.75 0 010 3.5H10.5a1.75 1.75 0 000 3.5H15',
    ticket: 'M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4V8zM14 6v12',
    star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3z',
    events: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3.5-5-1.25S10 7 12 7zM12 7c1.5-3 5-3.5 5-1.25S14 7 12 7z',
  };
  return (
    <svg className="pr-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}

export default function Pricing() {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  // Yearly is the anchor, as before.
  const [billing, setBilling] = useState<BillingCycle>('yearly');
  const [inclusionTier, setInclusionTier] = useState<TierId>('premium');
  const [ladderTier, setLadderTier] = useState<TierId>('premium');
  const inclusionsRef = useRef<HTMLElement>(null);

  const tierName = (id: TierId) => t(`membershipV2.tiers.${id}.name`);
  // Interpolation for card + inclusion lines: giveaway entries, points shelf
  // life and the physical-item tier (cap is null on Elite: any value).
  const entryVars = (id: TierId) => ({
    count: GIVEAWAY_ENTRIES[id],
    loyalty: LOYALTY_PER_MONTH[id],
    days: POINTS_EXPIRY_DAYS[id],
    cap: ITEM_TIER_VALUE_CAP_EUR[id] ?? '',
    months: ITEM_TIER_MIN_PAID_MONTHS[id],
  });

  const showInclusions = (id: TierId) => {
    setInclusionTier(id);
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    inclusionsRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    inclusionsRef.current?.focus({ preventScroll: true });
  };

  const priceFor = (id: TierId) => {
    if (id === 'free') {
      return { price: '€0', per: t('membershipV2.choose.freePer'), strike: '', note: t('membershipV2.choose.freeNote') };
    }
    if (billing === 'monthly') {
      return {
        price: eur(MONTHLY_PRICE[id]),
        per: t('membershipV2.choose.perMonth'),
        strike: '',
        note: t('membershipV2.choose.monthlyNote'),
      };
    }
    return {
      price: eur(YEARLY_PRICE[id]),
      per: t('membershipV2.choose.perYear'),
      strike: eur(MONTHLY_PRICE[id] * 12),
      note: t('membershipV2.choose.yearlyNote', { pm: eur(YEARLY_PRICE[id] / 12) }),
    };
  };

  // The FAQ structure is shared (src/data/faq.ts). Some shared answers carry
  // copy this page must not show, so /membership overrides those locally.
  const faqOverride: Record<string, { q: string; a: string }> = {
    free: { q: t('membershipV2.faq.free.q'), a: t('membershipV2.faq.free.a') },
    challenges: { q: t('membershipV2.faq.challenges.q'), a: t('membershipV2.faq.challenges.a') },
    monthlyPrice: { q: t('membershipV2.faq.monthlyPrice.q'), a: t('membershipV2.faq.monthlyPrice.a') },
  };
  // The refundable question was about the closed Founding pre-sale.
  const faqItems = PRICING_FAQ.filter((item) => item.id !== 'refundable');

  const ladderBase = GIVEAWAY_ENTRIES[ladderTier];
  const ladderMax = ladderBase + LOYALTY_PER_MONTH[ladderTier] * (LADDER_MONTHS.length - 1);

  const tierToggle = (value: TierId, onChange: (id: TierId) => void, label: string) => (
    <div className="pr-seg" role="group" aria-label={label}>
      {TIER_IDS.map((id) => (
        <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}>
          {tierName(id)}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <SeoHead
        title={t('membershipV2.seo.title')}
        description={t('membershipV2.seo.description')}
        canonical="https://liboworld.com/membership"
        ogImage="https://liboworld.com/brand/og-image.png"
      />
      <SiteNav />

      <main className="pr-page">
        {/* ── (a) Hero ── */}
        <header className="pr-hero">
          <img className="pr-prop pr-prop--hero-l" src="/props/gym-card-360.webp?v=2" alt="" aria-hidden="true" width={180} height={180} />
          <img className="pr-prop pr-prop--hero-r" src="/props/libo-coin-360.webp?v=2" alt="" aria-hidden="true" width={150} height={150} />
          <span className="pr-eyebrow">{t('membershipV2.hero.eyebrow')}</span>
          <h1 className="pr-hero__h1">
            {t('membershipV2.hero.h1Pre')}
            <span className="pr-accent">{t('membershipV2.hero.h1Accent')}</span>
            {t('membershipV2.hero.h1Post')}
          </h1>
          <p className="pr-hero__sub">{t('membershipV2.hero.sub')}</p>
        </header>

        {/* ── (b) Choose your membership ── */}
        <section className="pr-section pr-choose" aria-labelledby="pr-choose-h">
          <div className="pr-section__head">
            <h2 id="pr-choose-h" className="pr-h2">{t('membershipV2.choose.h2')}</h2>
            <div className="pr-seg pr-seg--billing" role="group" aria-label={t('membershipV2.billing.label')}>
              {(['monthly', 'yearly'] as const).map((b) => (
                <button key={b} type="button" aria-pressed={billing === b} onClick={() => setBilling(b)}>
                  {t(`membershipV2.billing.${b}`)}
                  {b === 'yearly' ? (
                    <span className="pr-seg__save">{t('membershipV2.choose.save', { pct: savePct('premium') })}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="pr-cards">
            {TIER_IDS.map((id) => {
              const p = priceFor(id);
              return (
                <article key={id} className={`pr-card pr-card--${id}`}>
                  {id === 'elite' ? (
                    <img className="pr-prop pr-prop--card" src="/props/trophy-lime-360.webp?v=2" alt="" aria-hidden="true" width={96} height={96} />
                  ) : null}
                  <div className="pr-card__head">
                    <h3 className="pr-card__name">{tierName(id)}</h3>
                    {id === 'premium' ? <span className="pr-card__badge">{t('membershipV2.choose.mostPopular')}</span> : null}
                  </div>
                  <p className="pr-card__tagline">{t(`membershipV2.tiers.${id}.tagline`)}</p>

                  <div className="pr-card__price" aria-live="polite">
                    <span className="pr-card__amount">{p.price}</span>
                    <span className="pr-card__per">{p.per}</span>
                  </div>
                  <div className="pr-card__note">
                    {p.strike ? (
                      <>
                        <s className="pr-card__strike">{p.strike}</s>
                        <span className="pr-card__save">
                          {t('membershipV2.choose.save', { pct: savePct(id as Exclude<TierId, 'free'>) })}
                        </span>
                      </>
                    ) : null}
                    <span>{p.note}</span>
                  </div>

                  <Link to={GET_APP} className={`pr-btn ${id === 'free' ? 'pr-btn--ghost' : 'pr-btn--accent'}`}>
                    {t(`membershipV2.tiers.${id}.cta`)}
                  </Link>

                  <ul className="pr-card__list">
                    {HIGHLIGHTS[id].map((h) => (
                      <li key={h.key}>
                        <Icon name={h.icon} />
                        <span>{t(`membershipV2.tiers.${id}.${h.key}`, entryVars(id))}</span>
                      </li>
                    ))}
                  </ul>

                  <button type="button" className="pr-card__more" onClick={() => showInclusions(id)}>
                    {t('membershipV2.choose.seeAll')} <span aria-hidden="true">→</span>
                  </button>
                </article>
              );
            })}
          </div>

          <p className="pr-fine">
            {t('membershipV2.choose.buyNote')}{' '}
            {t('membershipV2.choose.cashNote')}{' '}
            <Link to="/rules">{t('membershipV2.choose.rulesLink')}</Link>
          </p>
        </section>

        {/* ── (c) Full inclusions ── */}
        <section
          ref={inclusionsRef}
          tabIndex={-1}
          className="pr-section pr-incl-wrap"
          aria-labelledby="pr-incl-h"
        >
          <div className="pr-incl">
            <div className="pr-incl__head">
              <div>
                <span className="pr-eyebrow">{t('membershipV2.inclusions.eyebrow')}</span>
                <h2 id="pr-incl-h" className="pr-h2" aria-live="polite">
                  {t('membershipV2.inclusions.h2', { tier: tierName(inclusionTier) })}
                </h2>
              </div>
              {tierToggle(inclusionTier, setInclusionTier, t('membershipV2.inclusions.label'))}
            </div>
            <ul className="pr-incl__list">
              {Array.from({ length: INCLUSION_COUNT[inclusionTier] }, (_, i) => (
                <li key={`${inclusionTier}-${i}`}>
                  <Icon name="check" />
                  <span>{t(`membershipV2.tiers.${inclusionTier}.i${i + 1}`, entryVars(inclusionTier))}</span>
                </li>
              ))}
            </ul>
            <div className="pr-incl__foot">
              <span className="pr-incl__price">
                {inclusionTier === 'free'
                  ? `€0 · ${t('membershipV2.choose.freePer')}`
                  : `${eur(MONTHLY_PRICE[inclusionTier])}${t('membershipV2.choose.perMonth')} · ${eur(YEARLY_PRICE[inclusionTier])}${t('membershipV2.choose.perYear')}`}
              </span>
              <Link to={GET_APP} className="pr-btn pr-btn--accent">{t(`membershipV2.tiers.${inclusionTier}.cta`)}</Link>
            </div>
          </div>
        </section>

        {/* ── (d) Loyalty ladder ── */}
        <section className="pr-section pr-loyal" aria-labelledby="pr-loyal-h">
          <div className="pr-loyal__intro">
            <img className="pr-prop pr-prop--loyal" src="/props/coin-stack-360.webp?v=2" alt="" aria-hidden="true" width={150} height={150} />
            <span className="pr-eyebrow">{t('membershipV2.loyalty.eyebrow')}</span>
            <h2 id="pr-loyal-h" className="pr-h2">{t('membershipV2.loyalty.h2')}</h2>
            <p className="pr-lead">{t('membershipV2.loyalty.sub')}</p>
            {tierToggle(ladderTier, setLadderTier, t('membershipV2.inclusions.label'))}
          </div>
          <div className="pr-bars" role="list" aria-label={t('membershipV2.loyalty.aria', { tier: tierName(ladderTier) })}>
            {LADDER_MONTHS.map((m) => {
              const entries = ladderBase + LOYALTY_PER_MONTH[ladderTier] * (m - 1);
              return (
                <div key={m} className="pr-bar" role="listitem">
                  <span className="pr-bar__label">{t('membershipV2.loyalty.month', { n: m })}</span>
                  <span className="pr-bar__track">
                    <span className="pr-bar__fill" style={{ width: `${(entries / ladderMax) * 100}%` }} />
                  </span>
                  <span className="pr-bar__value">
                    {entries}
                    <span className="sr-only"> {t('membershipV2.loyalty.unit')}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="pr-loyal__foot">
            <p className="pr-fine">
              {t('membershipV2.loyalty.foot', { min: LOYALTY_MIN_WORKOUT_MINUTES, max: LOYALTY_MAX_MONTHS })}
            </p>
          </div>
        </section>

        {/* ── (e) More than a membership ── */}
        <section className="pr-section pr-more" aria-labelledby="pr-more-h">
          <h2 id="pr-more-h" className="pr-h2">{t('membershipV2.more.h2')}</h2>
          <ol className="pr-more__list">
            {[1, 2, 3, 4].map((n) => (
              <li key={n} className="pr-more__item">
                <span className="pr-more__num" aria-hidden="true">{String(n).padStart(2, '0')}</span>
                <div>
                  <h3 className="pr-more__title">{t(`membershipV2.more.t${n}`)}</h3>
                  <p className="pr-more__body">{t(`membershipV2.more.b${n}`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── (f) FAQ ── */}
        <section className="pr-section pr-faq" aria-label={t('relaunchPricing.aria.faq')}>
          <h2 className="pr-h2">{t('relaunchPricing.faq.headline')}</h2>
          <div className="pr-faq__list">
            {faqItems.map((item, i) => {
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
                    <span className="pr-faq__icon" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen ? <p className="pr-faq__a">{answer}</p> : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="pr-final" aria-labelledby="pr-final-h">
          <h2 id="pr-final-h" className="pr-final__h2">{t('membershipV2.final.h2')}</h2>
          <p className="pr-final__sub">{t('membershipV2.final.sub')}</p>
          <StoreBadges
            className="pr-final__badges"
            iosHref={storeUrlWithSource('ios', 'membership', 'web')}
            androidHref={storeUrlWithSource('android', 'membership', 'web')}
          />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
