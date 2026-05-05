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
 *      (one-time, mode='payment' — no Subscription, no trial)
 *   3. Inserts pending row into `funnel_signups` with stripe refs
 *   4. Returns { client_secret, payment_intent_id, funnel_signup_id }
 *
 * The frontend then calls `stripe.confirmPayment(client_secret, ...)`
 * with the PaymentElement. On success, the webhook handler
 * (stripe_webhook Edge Function) credits the entries + points only —
 * no subscription / trial setup.
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
