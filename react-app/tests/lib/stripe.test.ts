/**
 * Coverage for src/lib/stripe.ts (and the thin infra/ re-export).
 *
 * The publishable key is captured at module load time, so each branch needs
 * a fresh module via vi.resetModules() after stubbing env vars.
 *
 * loadStripe is mocked so the network never lights up and we can confirm the
 * singleton: getStripe() called twice must invoke loadStripe() exactly once.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(async (key: string) => ({ __stripe: key })),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getStripe / isStripeConfigured (no key)', () => {
  it('returns null when VITE_STRIPE_PUBLISHABLE_KEY is unset and never calls loadStripe', async () => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', '');
    const { loadStripe } = await import('@stripe/stripe-js');
    const { getStripe, isStripeConfigured } = await import('../../src/lib/stripe');

    expect(isStripeConfigured()).toBe(false);
    await expect(getStripe()).resolves.toBeNull();
    expect(loadStripe).not.toHaveBeenCalled();
  });

  it('returns the same null promise on repeated calls (no-op singleton)', async () => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', '');
    const { getStripe } = await import('../../src/lib/stripe');
    const a = await getStripe();
    const b = await getStripe();
    expect(a).toBeNull();
    expect(b).toBeNull();
  });
});

describe('getStripe / isStripeConfigured (test key)', () => {
  it('reports configured and resolves to a Stripe-like value', async () => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_abc123');
    const { loadStripe } = await import('@stripe/stripe-js');
    const { getStripe, isStripeConfigured } = await import('../../src/lib/stripe');

    expect(isStripeConfigured()).toBe(true);
    const s = await getStripe();
    expect(s).toEqual({ __stripe: 'pk_test_abc123' });
    expect(loadStripe).toHaveBeenCalledOnce();
    expect(loadStripe).toHaveBeenCalledWith('pk_test_abc123');
  });

  it('caches the promise across getStripe calls', async () => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_cache');
    const { loadStripe } = await import('@stripe/stripe-js');
    const { getStripe } = await import('../../src/lib/stripe');

    const p1 = getStripe();
    const p2 = getStripe();
    expect(p1).toBe(p2);
    await p1;
    expect(loadStripe).toHaveBeenCalledOnce();
  });
});

describe('STRIPE_PRICE_IDS', () => {
  it('exposes the four documented tiers, undefined when env vars unset', async () => {
    // Clear any inherited values from outer test runs
    vi.stubEnv('VITE_STRIPE_PRICE_ENTRY', '');
    vi.stubEnv('VITE_STRIPE_PRICE_SILVER', '');
    vi.stubEnv('VITE_STRIPE_PRICE_GOLD', '');
    vi.stubEnv('VITE_STRIPE_PRICE_PREMIUM', '');
    const { STRIPE_PRICE_IDS } = await import('../../src/lib/stripe');
    expect(Object.keys(STRIPE_PRICE_IDS).sort()).toEqual(['entry', 'gold', 'premium', 'silver']);
    // Empty stubbed strings come through as '' (falsy) — both '' and undefined are acceptable here.
    for (const v of Object.values(STRIPE_PRICE_IDS)) {
      expect(v === undefined || v === '').toBe(true);
    }
  });

  it('passes env-supplied price ids through unchanged', async () => {
    vi.stubEnv('VITE_STRIPE_PRICE_ENTRY', 'price_entry_001');
    vi.stubEnv('VITE_STRIPE_PRICE_SILVER', 'price_silver_002');
    vi.stubEnv('VITE_STRIPE_PRICE_GOLD', 'price_gold_003');
    vi.stubEnv('VITE_STRIPE_PRICE_PREMIUM', 'price_premium_004');
    const { STRIPE_PRICE_IDS } = await import('../../src/lib/stripe');
    expect(STRIPE_PRICE_IDS.entry).toBe('price_entry_001');
    expect(STRIPE_PRICE_IDS.silver).toBe('price_silver_002');
    expect(STRIPE_PRICE_IDS.gold).toBe('price_gold_003');
    expect(STRIPE_PRICE_IDS.premium).toBe('price_premium_004');
  });
});

describe('infra/stripe re-export', () => {
  it('re-exports the same getStripe', async () => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_reexport');
    const direct = await import('../../src/lib/stripe');
    const infra = await import('../../src/lib/infra/stripe');
    expect(infra.getStripe).toBe(direct.getStripe);
    expect(infra.isStripeConfigured).toBe(direct.isStripeConfigured);
    expect(infra.STRIPE_PRICE_IDS).toBe(direct.STRIPE_PRICE_IDS);
  });
});
