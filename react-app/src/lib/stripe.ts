import { loadStripe, type Stripe } from '@stripe/stripe-js';

/**
 * Singleton Stripe client.
 *
 * Reads the publishable key from `VITE_STRIPE_PUBLISHABLE_KEY` (set in
 * GitHub Actions secrets for production builds, in `.env.local` for dev).
 * If no key is configured, the loader returns a Promise that resolves to
 * null and the modal falls back to the placeholder card field — that way
 * dev/staging without Stripe keys still build and render correctly.
 *
 * Test keys: `pk_test_…`  Live keys: `pk_live_…`
 */

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!PUBLISHABLE_KEY) {
    // No key configured — return a no-op promise. Components should
    // detect this and fall back to the offline placeholder card field.
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    stripePromise = loadStripe(PUBLISHABLE_KEY);
  }
  return stripePromise;
}

export function isStripeConfigured(): boolean {
  return !!PUBLISHABLE_KEY;
}

// Stripe price IDs are resolved server-side by the `create_payment_intent`
// Supabase Edge Function, which maps tier_slug → price using Edge Function
// secrets (`supabase secrets set STRIPE_PRICE_ENTRY=price_…` etc.).
// The frontend only needs the publishable key.
