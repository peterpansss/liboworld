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

describe('infra/stripe re-export', () => {
  it('re-exports the same getStripe', async () => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_reexport');
    const direct = await import('../../src/lib/stripe');
    const infra = await import('../../src/lib/infra/stripe');
    expect(infra.getStripe).toBe(direct.getStripe);
    expect(infra.isStripeConfigured).toBe(direct.isStripeConfigured);
  });
});
