/**
 * FoundingCheckoutProvider — one shared Founding Member (early-access)
 * checkout, openable from anywhere with a source tag.
 *
 * Ticket 14 turns the founding offer into a demoted on-page section AND a
 * post-waitlist upsell. Both need to open the SAME €39.50 Stripe checkout,
 * but tagged with where the click came from so we can see which angle
 * converts (funnel_signups.utm_content). Rather than duplicate the
 * FunnelCheckoutModal wiring at each call site, this provider owns it once
 * and exposes `openFoundingCheckout(source)`.
 *
 * Attribution: the source is passed as `utm_content` on the checkout, which
 * create_payment_intent already persists to funnel_signups (index.ts). URL
 * UTMs (source/medium/campaign/term) are preserved via readUtm(); only
 * utm_content is reserved for the internal entry-point tag — so do NOT set
 * utm_content in ad URLs.
 *
 * Query: SELECT utm_content, count(*) FROM funnel_signups
 *        WHERE funnel='early_access' AND stripe_status='succeeded'
 *        GROUP BY utm_content;
 *
 * Renders nothing (and openFoundingCheckout is a no-op) when Stripe isn't
 * configured — we never show a checkout that can't charge.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import FunnelCheckoutModal, { type ModalSelectedTier, LIME_ACCENT } from './FunnelCheckoutModal';
import { createPaymentIntent } from '../../lib/funnelCheckout';
import { readUtm } from '../../lib/funnelSignups';
import { isStripeConfigured } from '../../lib/stripe';

// One-time founding price = 50% off the €79.99 first-year price of Premium.
// Mirrors EARLY_ACCESS_TIERS.founding.amountCents (3950) in
// libo-app-v2/supabase/functions/_shared/tiers.ts — keep in sync.
export const EARLY_ACCESS_PRICE = 39.5;

// Known entry points, for reference / type help at call sites.
export type FoundingSource =
  | 'founding_section'
  | 'post_waitlist'
  | 'post_waitlist_challenge'
  | string;

type FoundingCheckoutContextValue = {
  openFoundingCheckout: (source: FoundingSource) => void;
};

const FoundingCheckoutContext = createContext<FoundingCheckoutContextValue>({
  openFoundingCheckout: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export function useFoundingCheckout(): FoundingCheckoutContextValue {
  return useContext(FoundingCheckoutContext);
}

export default function FoundingCheckoutProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  // `source` doubles as the open flag: null = closed.
  const [source, setSource] = useState<FoundingSource | null>(null);
  const open = source !== null;

  const openFoundingCheckout = useCallback((src: FoundingSource) => {
    // Never open a checkout that can't take money.
    if (!isStripeConfigured()) return;
    setSource(src);
  }, []);

  const stripeReady = isStripeConfigured();

  const selectedTier: ModalSelectedTier = {
    name: t('earlyAccess.tierName'),
    price: `€${EARLY_ACCESS_PRICE.toFixed(2)}`,
    heroSummary: t('earlyAccess.tierSummary'),
    tierSlug: 'founding',
    amount: EARLY_ACCESS_PRICE,
  };

  const friendlyError = (error: string): string => {
    if (error === 'already_purchased') return t('earlyAccess.alreadyPurchased');
    if (error === 'offer_ended') return t('earlyAccess.offerEnded');
    return t('earlyAccess.genericError');
  };

  return (
    <FoundingCheckoutContext.Provider value={{ openFoundingCheckout }}>
      {children}
      {stripeReady && (
        <FunnelCheckoutModal
          open={open}
          selected={open ? selectedTier : null}
          currency="€"
          consentHref="/terms#early-access"
          showGetAppCta={false}
          accent={LIME_ACCENT}
          createIntent={async ({ email, fullName, phone }) => {
            const r = await createPaymentIntent({
              funnel: 'early_access',
              tierSlug: 'founding',
              email,
              fullName,
              phone,
              // Preserve real URL UTMs; reserve utm_content for the internal
              // entry-point tag so we can attribute which door converted.
              utm: { ...readUtm(), utm_content: source ?? null },
              // Modal blocks submission until consent is ticked.
              termsAcknowledged: true,
            });
            return r.ok
              ? { ok: true, clientSecret: r.clientSecret, paymentIntentId: r.paymentIntentId }
              : { ok: false, error: friendlyError(r.error) };
          }}
          copy={{
            step1Label: t('earlyAccess.modal.step1Label'),
            step1Subtitle: t('earlyAccess.modal.step1Subtitle'),
            step2Label: t('earlyAccess.modal.step2Label'),
            step2Subtitle: t('earlyAccess.modal.step2Subtitle'),
            mandatoryNote: t('earlyAccess.modal.mandatoryNote'),
            fullNameLabel: t('earlyAccess.modal.fullNameLabel'),
            fullNamePlaceholder: t('earlyAccess.modal.fullNamePlaceholder'),
            emailLabel: t('earlyAccess.modal.emailLabel'),
            emailPlaceholder: t('earlyAccess.modal.emailPlaceholder'),
            phoneLabel: t('earlyAccess.modal.phoneLabel'),
            phonePlaceholder: t('earlyAccess.modal.phonePlaceholder'),
            cardLabel: t('earlyAccess.modal.cardLabel'),
            cardPlaceholder: t('earlyAccess.modal.cardPlaceholder'),
            continueCta: t('earlyAccess.modal.continueCta'),
            submitCta: t('earlyAccess.modal.submitCta'),
            secureCheckout: t('earlyAccess.modal.secureCheckout'),
            orderItem: t('earlyAccess.modal.orderItem'),
            orderTotal: t('earlyAccess.modal.orderTotal'),
            orderSummaryItem: t('earlyAccess.modal.orderSummaryItem'),
            backLabel: t('earlyAccess.modal.backLabel'),
            successTitle: t('earlyAccess.modal.successTitle'),
            successBody: t('earlyAccess.modal.successBody'),
            duplicateTitle: t('earlyAccess.modal.duplicateTitle'),
            duplicateBody: t('earlyAccess.modal.duplicateBody'),
            errorMsg: t('earlyAccess.modal.errorMsg'),
            legalNote: t('earlyAccess.modal.legalNote'),
            consentLabel: t('earlyAccess.modal.consentLabel'),
            consentLinkLabel: t('earlyAccess.modal.consentLinkLabel'),
            consentRequired: t('earlyAccess.modal.consentRequired'),
          }}
          onSubmit={async ({ paymentIntentId }) => {
            if (paymentIntentId) return { ok: true };
            return { ok: false, error: t('earlyAccess.genericError') };
          }}
          onClose={() => setSource(null)}
        />
      )}
    </FoundingCheckoutContext.Provider>
  );
}
