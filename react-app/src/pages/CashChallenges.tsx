import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { SeoHead } from '../components/SeoHead';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import ScrollRevealText from '../components/ScrollRevealText';
import { usePopIn } from '../utils/funnelAnimations';
import { CHALLENGE_TIERS } from '../data/challengeTiers';
import './CashChallenges.css';
// Shared funnel primitives (.funnel-eyebrow etc.) — this page has no
// FunnelChrome component, so pull the stylesheet in directly.
import '../components/funnel/FunnelChrome.css';

/**
 * /cash-challenges — the challenge catalogue.
 *
 * A BRAND page (full nav + brand footer), deliberately minimal: nav → hero →
 * three cards → footer. No how-it-works, no rules block, no extra sections —
 * everything persuasive lives on the per-tier funnels.
 *
 * The three cards are visually IDENTICAL by design (CHALLENGE-FUNNEL-TICKET):
 * no Free/Premium pills (gating is disclosed inside the app only) and no live
 * data of any kind — no spots-filled counters, no progress bars, no
 * "filling fast". Nothing here may depend on app sync.
 */
export default function CashChallenges() {
  const { t } = useTranslation();
  usePopIn();

  return (
    <>
      <SeoHead
        title={t('cashChallenges.seo.title', {
          defaultValue: 'Cash Challenges — train 30 days, earn real money | Libo',
        })}
        description={t('cashChallenges.seo.description', {
          defaultValue:
            'Three tiers, one rule: 30 days of daily reps, proof on camera, real cash when you finish. Your 30 days start the moment you join.',
        })}
        canonical="/cash-challenges"
      />
      <SiteNav />
      <main id="main-content" className="cc-page">
        <section className="cc-hero">
          <span className="funnel-eyebrow cc-eyebrow">
            {t('cashChallenges.eyebrow', { defaultValue: 'Cash Challenges' })}
          </span>
          <h1 className="cc-hero__title font-display">
            <ScrollRevealText as="span" className="cc-hero__line">
              {t('cashChallenges.hero.line1', { defaultValue: 'Pick your' })}
            </ScrollRevealText>{' '}
            <span className="cc-hero__line cc-hero__line--accent">
              {t('cashChallenges.hero.line2', { defaultValue: 'challenge.' })}
            </span>
          </h1>
          <p className="cc-hero__sub">
            {t('cashChallenges.hero.sub', {
              defaultValue:
                'Three tiers, one rule: 30 days of daily reps, proof on camera, real cash when you finish. No cycles, no waiting — your 30 days start the moment you join.',
            })}
          </p>
        </section>

        <section className="cc-grid" aria-label={t('cashChallenges.gridLabel', { defaultValue: 'Challenge tiers' })}>
          {CHALLENGE_TIERS.map((tier) => (
            <Link
              key={tier.slug}
              to={`/cash-challenges/${tier.slug}`}
              className="cc-card"
              data-popin
            >
              <img className="cc-card__photo" src={tier.image} alt="" loading="lazy" />
              {/* Bottom scrim: 0.15 → 0.55 → 0.92, matching the app's HeroChallengeCard */}
              <span className="cc-card__scrim" aria-hidden="true" />
              <span className="cc-card__body">
                <span className="cc-card__payout font-display">€{tier.payout}</span>
                <span className="cc-card__name font-display">{tier.name}</span>
                <span className="cc-card__meta">
                  {t('cashChallenges.card.meta', {
                    defaultValue: '{{reps}} reps / day · {{days}} days · Limited spots',
                    reps: tier.reps,
                    days: tier.days,
                  })}
                </span>
                <span className="cc-card__cta">
                  {t('cashChallenges.card.cta', { defaultValue: 'View challenge →' })}
                </span>
              </span>
            </Link>
          ))}
        </section>

        {/* Someone comparing €5 / €15 / €50 is exactly the person asking what
            the rules actually are. Until this link existed they had to enter a
            funnel to find out. */}
        <p className="cc-rules">
          <Link to="/rules">
            {t('cashChallenges.rulesLink', { defaultValue: 'Read the full rules →' })}
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
