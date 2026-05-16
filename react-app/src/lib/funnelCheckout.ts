import { supabase } from './supabase';
import type { FunnelKind, FunnelTierSlug } from './funnelSignups';

/**
 * Client for the funnel checkout flow.
 *
 * v1 (current): writes signup intent to `funnel_signups` table only —
 * no payment processed. See `submitFunnelInterest` in funnelSignups.ts.
 *
 * v2 (this file): calls the `create_payment_intent` Supabase Edge
 * Function which:
 *   1. Creates / finds Stripe Customer by email
 *   2. Creates Stripe PaymentIntent for the package amount
 *   3. Sets up the Premium subscription with tier-scaled trial
 *   4. Inserts pending row into `funnel_signups` with stripe refs
 *   5. Returns { client_secret, payment_intent_id, funnel_signup_id }
 *
 * The frontend then calls `stripe.confirmCardPayment(client_secret, ...)`
 * with the user's CardElement. On success, the webhook handler
 * (stripe_webhook Edge Function) credits the entries + points.
 */

export type CreatePaymentIntentInput = {
  funnel: FunnelKind;
  tierSlug: FunnelTierSlug;
  email: string;
  fullName: string;
  phone: string;
  giveawayId?: string | null;
  /** UTM params auto-captured from URL */
  utm?: Record<string, string | null>;
  /**
   * EU consumer-law consent (Directive 2011/83/EU Art. 16(m) — waiver of
   * 14-day right of withdrawal). Required at the modal layer; passed through
   * to the Edge Function as `terms_acknowledged` for the server-side audit
   * gate and Stripe charge metadata.
   * See PARTNERSHIP-FINANCE-MODEL.md §4.4.
   */
  termsAcknowledged: boolean;
};

export type CreatePaymentIntentResult =
  | {
      ok: true;
      clientSecret: string;
      paymentIntentId: string;
      funnelSignupId: string;
      amount: number;
      currency: string;
    }
  | { ok: false; error: string };

export async function createPaymentIntent(
  input: CreatePaymentIntentInput,
): Promise<CreatePaymentIntentResult> {
  try {
    const { data, error } = await supabase.functions.invoke('create_payment_intent', {
      body: {
        funnel: input.funnel,
        tier_slug: input.tierSlug,
        email: input.email,
        full_name: input.fullName,
        phone: input.phone,
        giveaway_id: input.giveawayId ?? null,
        utm: input.utm ?? null,
        referrer: typeof document !== 'undefined' ? document.referrer : null,
        terms_acknowledged: input.termsAcknowledged,
      },
    });
    if (error) return { ok: false, error: error.message ?? 'create_payment_intent failed' };
    const r = data as {
      ok: boolean;
      error?: string;
      client_secret?: string;
      payment_intent_id?: string;
      funnel_signup_id?: string;
      amount?: number;
      currency?: string;
    };
    if (!r.ok) return { ok: false, error: r.error ?? 'unknown' };
    return {
      ok: true,
      clientSecret: r.client_secret!,
      paymentIntentId: r.payment_intent_id!,
      funnelSignupId: r.funnel_signup_id!,
      amount: r.amount ?? 0,
      currency: r.currency ?? 'EUR',
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? 'network_error' };
  }
}
