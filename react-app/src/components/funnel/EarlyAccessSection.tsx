/**
 * EarlyAccessSection — the on-page "Founding Member" offer (one of the
 * entry points into the shared founding checkout).
 *
 * Per Ticket 14 this is a SECONDARY surface, not the front door: it sits low
 * on the landing page (after the value/proof + cash-challenge sections), is
 * styled lime-on-black like every other Libo surface (no orange), and its
 * CTA is deliberately quieter than the primary Join-the-Waitlist pill. The
 * actual €39.50 checkout lives in FoundingCheckoutProvider; this section just
 * opens it tagged with source 'founding_section'.
 *
 * Rendered only in prelaunch (Landing gates it with isPrelaunch()); returns
 * null if Stripe isn't configured (nothing to buy).
 */
import { useTranslation } from 'react-i18next';
import { isStripeConfigured } from '../../lib/stripe';
import { YEARLY_PRICE } from '../../data/tiers';
import { useFoundingCheckout, EARLY_ACCESS_PRICE } from './FoundingCheckoutProvider';

export default function EarlyAccessSection() {
  const { t } = useTranslation();
  const { openFoundingCheckout } = useFoundingCheckout();

  // No Stripe → no purchasable offer, so render nothing rather than a CTA
  // that opens a no-op checkout.
  if (!isStripeConfigured()) return null;

  const anchorPrice = `€${YEARLY_PRICE.premium}`;              // €79
  const foundingPrice = `€${EARLY_ACCESS_PRICE.toFixed(2)}`;   // €39.50

  return (
    <section className="early-access-section" id="early-access">
      <div className="early-access-inner">
        <div className="early-access-copy reveal">
          <div className="label label-spaced">{t('earlyAccess.eyebrow')}</div>
          <h2 className="early-access-headline font-display">{t('earlyAccess.headline')}</h2>
          <p className="early-access-sub">{t('earlyAccess.description')}</p>

          <ul className="early-access-bullets">
            <li className="early-access-bullet">
              <span className="early-access-bullet-mark" aria-hidden="true">✓</span>
              {t('earlyAccess.bullet1')}
            </li>
            <li className="early-access-bullet">
              <span className="early-access-bullet-mark" aria-hidden="true">✓</span>
              {t('earlyAccess.bullet2')}
            </li>
            <li className="early-access-bullet">
              <span className="early-access-bullet-mark" aria-hidden="true">✓</span>
              {t('earlyAccess.bullet3')}
            </li>
          </ul>

          <p className="early-access-reassurance">{t('earlyAccess.reassurance')}</p>
        </div>

        <div className="early-access-card reveal reveal-delay-1">
          <div className="early-access-glass-badge">{t('earlyAccess.badge')}</div>

          <div className="early-access-price-block">
            <span className="early-access-price-anchor">{anchorPrice}</span>
            <span className="early-access-price-now font-display">{foundingPrice}</span>
            <span className="early-access-price-note">{t('earlyAccess.priceNote')}</span>
          </div>

          <button
            type="button"
            className="early-access-cta"
            onClick={() => openFoundingCheckout('founding_section')}
          >
            {t('earlyAccess.cta')}
          </button>

          <p className="early-access-deadline">{t('earlyAccess.deadline')}</p>
        </div>
      </div>
    </section>
  );
}
