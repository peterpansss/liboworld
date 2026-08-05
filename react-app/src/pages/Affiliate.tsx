import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SeoHead } from '../components/SeoHead';
import ScrollRevealText from '../components/ScrollRevealText';
import {
  FunnelContextBar,
  FunnelLogoNav,
  FunnelMinimalFooter,
  FunnelStickyCta,
} from '../components/funnel/FunnelChrome';
import { usePopIn } from '../utils/funnelAnimations';
import './Affiliate.css';

/**
 * /creator-program — the Creator Program funnel (was /affiliate, which now
 * redirects here).
 *
 * FUNNEL page, not a brand page: lime context bar, unlinked centred logo,
 * legal-only footer, mobile sticky CTA. One exit — "Apply to the program →"
 * pointing at /creator-program/apply. No other links compete with it.
 *
 * Naming: it is the "Creator Program", capitalised, everywhere. The canvas
 * render still shows three different names ("the program", "Affiliate
 * Programme", "Creator Program").
 *
 * Only the hero exists in the canvases (10-creator-program-desktop); the stat
 * strip, calculator, steps and FAQ below it are the existing page content kept
 * intact and re-chromed.
 *
 * i18n: the `affiliate` namespace does not exist in any locale bundle, so every
 * string renders from its defaultValue. Keep that pattern.
 */

// Slider math: 25% commission on the €79.99 standard annual subscription
// → ≈ €20 of commission per paid member per year.
const COMMISSION_PER_USER_PER_YEAR_EUR = 20;
const MIN_USERS = 0;
const MAX_USERS = 500;
const DEFAULT_USERS = 100;

const APPLY_PATH = '/creator-program/apply';

const FAQS = [
  {
    q: 'How much will I be paid?',
    a: 'We pay commission based on sales, not on traffic. The standard rate is 25% per transaction — on new subscriptions and on every renewal.',
  },
  {
    q: 'When and how do I get paid?',
    a: 'Payouts are processed monthly. Once your earnings clear €50, we pay out via bank transfer or PayPal — your choice during onboarding.',
  },
  {
    q: 'How are subscriptions tracked and credited to my link?',
    a: 'Every creator gets a unique referral link. Anyone who signs up through your link is automatically credited to your account, with a 60-day cookie window.',
  },
  {
    q: 'Can I see how much I will earn?',
    a: "Yes — once approved, you'll get a real-time dashboard showing clicks, signups, conversions and earnings. No black box.",
  },
  {
    q: 'Where can I place my personal and unique link?',
    a: 'Anywhere your audience is — Instagram bio, TikTok captions, YouTube descriptions, blog posts, newsletters, link-in-bio tools. The only restriction: no paid search ads on Libo branded keywords.',
  },
];

export default function Affiliate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  usePopIn();

  const estimatedEarnings = useMemo(() => users * COMMISSION_PER_USER_PER_YEAR_EUR, [users]);

  const formattedEarnings = useMemo(
    () => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(estimatedEarnings),
    [estimatedEarnings]
  );

  // One label, used by every CTA on the page — hero, band and sticky bar.
  const ctaLabel = t('affiliate.ctaBtn', { defaultValue: 'Apply to the program →' });

  const stats = [
    {
      value: '25%',
      label: t('affiliate.trustCommission', { defaultValue: 'Lifetime commission' }),
    },
    {
      value: '5K+',
      label: t('affiliate.trustFollowers', { defaultValue: 'Minimum audience' }),
    },
    {
      value: '60d',
      label: t('affiliate.trustCookie', { defaultValue: 'Cookie window' }),
    },
  ];

  return (
    <div className="aff-page">
      <SeoHead
        title={t('affiliate.seoTitle', { defaultValue: 'Creator Program — earn 25% for life | Libo' })}
        description={t('affiliate.seoDescription', {
          defaultValue:
            'Refer your audience to Libo and earn 25% commission on every subscription payment they make, for as long as they stay members.',
        })}
        canonical="https://liboworld.com/creator-program"
      />

      <FunnelContextBar>
        <span className="aff-bar-full">
          {t('affiliate.contextBar', {
            defaultValue: '25% lifetime commission — on every payment, not just the first',
          })}
        </span>
        <span className="aff-bar-short">
          {t('affiliate.contextBarShort', { defaultValue: '25% lifetime commission' })}
        </span>
      </FunnelContextBar>

      <FunnelLogoNav />

      {/* ── Hero (pixel-matched to 10-creator-program-desktop) ── */}
      <section className="aff-hero">
        <h1 className="aff-headline font-display">
          <ScrollRevealText as="span" className="aff-line">
            {t('affiliate.headlineLine1', { defaultValue: 'Your audience trains.' })}
          </ScrollRevealText>
          <ScrollRevealText as="span" className="aff-line aff-line--accent">
            {t('affiliate.headlineLine2', { defaultValue: 'You earn 25% for life.' })}
          </ScrollRevealText>
        </h1>
        <p className="aff-subhead">
          {t('affiliate.subhead', {
            defaultValue:
              'Refer your audience to the training app you actually use. 25% commission on every subscription payment they make — for as long as they stay members and you stay one too.',
          })}
        </p>

        <Link to={APPLY_PATH} className="aff-cta-btn aff-cta-btn--hero font-display">
          {ctaLabel}
        </Link>

        {/* Stat strip — equal-height cards, so a wrapping label can't leave the
            row ragged the way the canvas render does. */}
        <div className="aff-stats">
          {stats.map((s) => (
            <div className="aff-stat" key={s.value} data-popin>
              <span className="aff-stat-num font-display">{s.value}</span>
              <span className="aff-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Earnings calculator ── */}
      <section className="aff-calc">
        <ScrollRevealText as="h2" className="aff-section-heading font-display">
          {t('affiliate.calcHeading', { defaultValue: 'Grow your income with Libo.' })}
        </ScrollRevealText>
        <p className="aff-section-sub">
          {t('affiliate.calcSub', {
            defaultValue:
              'Turn your dedication into a source of income that rewards both your effort and your influence.',
          })}
        </p>

        <div className="aff-calc-card" data-popin>
          <div className="aff-calc-label">
            {t('affiliate.calcUsersLabel', { defaultValue: 'Paid members you can bring' })}
          </div>
          <div className="aff-calc-users">{users}</div>
          <input
            type="range"
            min={MIN_USERS}
            max={MAX_USERS}
            value={users}
            onChange={(e) => setUsers(Number(e.target.value))}
            className="aff-calc-slider"
            aria-label={t('affiliate.calcUsersLabel', { defaultValue: 'Paid members you can bring' })}
          />
          <div className="aff-calc-divider" aria-hidden />
          <div className="aff-calc-label aff-calc-label--earnings">
            {t('affiliate.calcEarningsLabel', { defaultValue: 'Estimated yearly earnings' })}
            <span className="aff-calc-info" tabIndex={0} role="note" aria-label="How this estimate is calculated">
              <span className="aff-calc-info-icon" aria-hidden>i</span>
              <span className="aff-calc-tooltip" role="tooltip">
                {t('affiliate.calcTooltip', { defaultValue: 'Estimated as a 25% commission on the €79.99 annual subscription. Real earnings depend on the plan and how long members stay.' })}
              </span>
            </span>
          </div>
          <div className="aff-calc-earnings font-display">{formattedEarnings}</div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="aff-how">
        <ScrollRevealText as="h2" className="aff-section-heading font-display">
          {t('affiliate.howHeading', { defaultValue: 'How it works' })}
        </ScrollRevealText>
        <ol className="aff-how-list">
          <li className="aff-how-step" data-popin>
            <span className="aff-how-num font-display">1</span>
            <div>
              <h3 className="aff-how-title">{t('affiliate.step1Title', { defaultValue: 'Apply' })}</h3>
              <p>{t('affiliate.step1Body', { defaultValue: 'If you have 5K+ followers on a social platform, blog or newsletter, apply to the Creator Program in under 2 minutes.' })}</p>
            </div>
          </li>
          <li className="aff-how-step" data-popin>
            <span className="aff-how-num font-display">2</span>
            <div>
              <h3 className="aff-how-title">{t('affiliate.step2Title', { defaultValue: 'Share your link' })}</h3>
              <p>{t('affiliate.step2Body', { defaultValue: 'Get your unique referral link and share it with your audience anywhere — bio, captions, descriptions, newsletter.' })}</p>
            </div>
          </li>
          <li className="aff-how-step" data-popin>
            <span className="aff-how-num font-display">3</span>
            <div>
              <h3 className="aff-how-title">{t('affiliate.step3Title', { defaultValue: 'Earn monthly' })}</h3>
              <p>{t('affiliate.step3Body', { defaultValue: 'Receive a 25% commission on every new subscription and every renewal. Paid out monthly.' })}</p>
            </div>
          </li>
        </ol>
      </section>

      {/* ── FAQ ── */}
      <section className="aff-faq">
        <ScrollRevealText as="h2" className="aff-section-heading font-display">
          {t('affiliate.faqHeading', { defaultValue: 'Any questions?' })}
        </ScrollRevealText>
        <ul className="aff-faq-list">
          {FAQS.map((faq, i) => {
            const open = openFaq === i;
            return (
              <li key={i} className={`aff-faq-item${open ? ' aff-faq-item--open' : ''}`}>
                <button
                  type="button"
                  className="aff-faq-trigger"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : i)}
                >
                  <span>{t(`affiliate.faq${i + 1}Q`, { defaultValue: faq.q })}</span>
                  <span className="aff-faq-icon" aria-hidden>{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="aff-faq-body">
                    {t(`affiliate.faq${i + 1}A`, { defaultValue: faq.a })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Final CTA ── */}
      <section className="aff-cta-band">
        <ScrollRevealText as="h2" className="aff-cta-headline font-display">
          {t('affiliate.ctaHeadline', { defaultValue: 'Ready to join the Creator Program?' })}
        </ScrollRevealText>
        <p className="aff-cta-sub">
          {t('affiliate.ctaSub', {
            defaultValue: 'Apply once. Share your link. Get paid every month your members stay.',
          })}
        </p>
        <Link to={APPLY_PATH} className="aff-cta-btn font-display">
          {ctaLabel}
        </Link>
      </section>

      <FunnelMinimalFooter />

      <FunnelStickyCta label={ctaLabel} onClick={() => navigate(APPLY_PATH)} />
    </div>
  );
}
