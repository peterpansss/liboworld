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

/**
 * Stripe price IDs for each /giveaway funnel package tier.
 *
 * Once you've created the products in Stripe Dashboard, paste their
 * `price_…` IDs here (or set them via env vars and read with
 * import.meta.env.VITE_STRIPE_PRICE_*).
 */
export const STRIPE_PRICE_IDS = {
  entry: import.meta.env.VITE_STRIPE_PRICE_ENTRY as string | undefined,
  silver: import.meta.env.VITE_STRIPE_PRICE_SILVER as string | undefined,
  gold: import.meta.env.VITE_STRIPE_PRICE_GOLD as string | undefined,
  premium: import.meta.env.VITE_STRIPE_PRICE_PREMIUM as string | undefined, // €9.99/mo recurring
} as const;
