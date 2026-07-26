import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './Affiliate.css';

// /affiliate — affiliate program marketing page (Hevy-style).
// The "Apply" button now routes to the in-app application form at
// /affiliate/apply (which submits via mailto for v1).

// Slider math: assume €10 of commission per paid user per year (≈ €3.33/mo
// average ARPU × 25% commission × 12 months). Update this when the real
// pricing/commission settles.
const COMMISSION_PER_USER_PER_YEAR_EUR = 10;
const MIN_USERS = 0;
const MAX_USERS = 500;
const DEFAULT_USERS = 100;

const FAQS = [
  {
    q: 'How much will I be paid?',
    a: 'We pay commission based on the sales. We do not pay commissions for driving traffic to our app. Our standard commission rate is 25% per transaction (on new subscriptions and renewals).',
  },
  {
    q: 'When and how do I get paid?',
    a: 'Payouts are processed monthly. Once your earnings clear €50, we pay out via bank transfer or PayPal — your choice during onboarding.',
  },
  {
    q: 'How are subscriptions tracked and credited to my link?',
    a: 'Every affiliate gets a unique referral link. Anyone who signs up through your link is automatically credited to your account, with a 60-day cookie window.',
  },
  {
    q: 'Can I see how much I will earn?',
    a: 'Yes — once approved, you\'ll get a real-time dashboard showing clicks, signups, conversions, and earnings. No black box.',
  },
  {
    q: 'Where can I place my personal and unique link?',
    a: 'Anywhere your audience is — Instagram bio, TikTok captions, YouTube descriptions, blog posts, newsletters, link-in-bio tools. The only restriction: no paid search ads on Libo branded keywords.',
  },
];

export default function Affiliate() {
  const { t } = useTranslation();
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const estimatedEarnings = useMemo(() => users * COMMISSION_PER_USER_PER_YEAR_EUR, [users]);

  const formattedEarnings = useMemo(
    () => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(estimatedEarnings),
    [estimatedEarnings]
  );

  return (
    <div className="aff-page">
      <SiteNav />

      {/* ── Hero ── */}
      <section className="aff-hero">
        <span className="aff-eyebrow">{t('affiliate.eyebrow', { defaultValue: 'Affiliate Program' })}</span>
        <h1 className="aff-headline font-display">
          {t('affiliate.headline', { defaultValue: 'Become a Libo Affiliate.' })}
        </h1>
        <p className="aff-subhead">
          {t('affiliate.subhead', {
            defaultValue:
              'Earn lifelong commissions by referring your audience to the training app you actually use.',
          })}
        </p>

        {/* Trust strip */}
        <div className="aff-trust">
          <div className="aff-trust-item">
            <span className="aff-trust-num font-display">25%</span>
            <span className="aff-trust-label">{t('affiliate.trustCommission', { defaultValue: 'Lifetime commission' })}</span>
          </div>
          <div className="aff-trust-divider" aria-hidden />
          <div className="aff-trust-item">
            <span className="aff-trust-num font-display">5K+</span>
            <span className="aff-trust-label">{t('affiliate.trustFollowers', { defaultValue: 'Min. follower count' })}</span>
          </div>
          <div className="aff-trust-divider" aria-hidden />
          <div className="aff-trust-item">
            <span className="aff-trust-num font-display">60d</span>
            <span className="aff-trust-label">{t('affiliate.trustCookie', { defaultValue: 'Cookie window' })}</span>
          </div>
        </div>
      </section>

      {/* ── Earnings calculator ── */}
      <section className="aff-calc">
        <h2 className="aff-section-heading font-display">
          {t('affiliate.calcHeading', { defaultValue: 'Grow your income with Libo.' })}
        </h2>
        <p className="aff-section-sub">
          {t('affiliate.calcSub', {
            defaultValue:
              "Turn your dedication into a source of income that rewards both your effort and your influence.",
          })}
        </p>

        <div className="aff-calc-card">
          <div className="aff-calc-label">{t('affiliate.calcUsersLabel', { defaultValue: 'Paid users you can bring' })}</div>
          <div className="aff-calc-users">{users}</div>
          <input
            type="range"
            min={MIN_USERS}
            max={MAX_USERS}
            value={users}
            onChange={(e) => setUsers(Number(e.target.value))}
            className="aff-calc-slider"
            aria-label={t('affiliate.calcUsersLabel', { defaultValue: 'Paid users you can bring' })}
          />
          <div className="aff-calc-divider" aria-hidden />
          <div className="aff-calc-label aff-calc-label--earnings">
            {t('affiliate.calcEarningsLabel', { defaultValue: 'Estimated yearly earnings' })}
          </div>
          <div className="aff-calc-earnings font-display">{formattedEarnings}</div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="aff-how">
        <h2 className="aff-section-heading font-display">
          {t('affiliate.howHeading', { defaultValue: 'How it works' })}
        </h2>
        <ol className="aff-how-list">
          <li className="aff-how-step">
            <span className="aff-how-num font-display">1</span>
            <div>
              <h3 className="aff-how-title">{t('affiliate.step1Title', { defaultValue: 'Sign up' })}</h3>
              <p>{t('affiliate.step1Body', { defaultValue: 'If you have 5K+ followers on a social platform, blog, or newsletter, apply in under 2 minutes.' })}</p>
            </div>
          </li>
          <li className="aff-how-step">
            <span className="aff-how-num font-display">2</span>
            <div>
              <h3 className="aff-how-title">{t('affiliate.step2Title', { defaultValue: 'Share your link' })}</h3>
              <p>{t('affiliate.step2Body', { defaultValue: 'Get your unique referral link and share it with your audience anywhere — bio, captions, descriptions, newsletter.' })}</p>
            </div>
          </li>
          <li className="aff-how-step">
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
        <h2 className="aff-section-heading font-display">
          {t('affiliate.faqHeading', { defaultValue: 'Any questions?' })}
        </h2>
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
        <h2 className="aff-cta-headline font-display">
          {t('affiliate.ctaHeadline', { defaultValue: 'Ready to become a Libo affiliate?' })}
        </h2>
        <p className="aff-cta-sub">
          {t('affiliate.ctaSub', { defaultValue: 'Join the program and start earning by sharing your love for training.' })}
        </p>
        <Link to="/affiliate/apply" className="aff-cta-btn">
          {t('affiliate.ctaBtn', { defaultValue: 'Apply to the program' })}
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
