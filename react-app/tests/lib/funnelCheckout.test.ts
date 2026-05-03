/**
 * Coverage for src/lib/funnelCheckout.ts.
 *
 * The module shells out to a Supabase Edge Function (`create_payment_intent`).
 * We mock supabase.functions.invoke to script success / error paths.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';

let nextInvokeResp: { data: any; error: any } = { data: null, error: null };
let nextInvokeThrow: Error | null = null;
const invokeCalls: { fn: string; body: any }[] = [];

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: async (fn: string, opts: { body: any }) => {
        invokeCalls.push({ fn, body: opts.body });
        if (nextInvokeThrow) throw nextInvokeThrow;
        return nextInvokeResp;
      },
    },
  },
}));

import { createPaymentIntent } from '../../src/lib/funnelCheckout';

beforeEach(() => {
  invokeCalls.length = 0;
  nextInvokeResp = { data: null, error: null };
  nextInvokeThrow = null;
});

describe('createPaymentIntent', () => {
  it('returns ok with normalized fields on success', async () => {
    nextInvokeResp = {
      data: {
        ok: true,
        client_secret: 'cs_test',
        payment_intent_id: 'pi_test',
        funnel_signup_id: 'fs_test',
        amount: 1999,
        currency: 'EUR',
      },
      error: null,
    };
    const r = await createPaymentIntent({
      funnel: 'giveaway',
      tierSlug: 'silver',
      email: 'alice@example.com',
      fullName: 'Alice',
      phone: '+15551234567',
      giveawayId: 'g_1',
      utm: { utm_source: 'twitter' },
    });
    expect(r).toEqual({
      ok: true,
      clientSecret: 'cs_test',
      paymentIntentId: 'pi_test',
      funnelSignupId: 'fs_test',
      amount: 1999,
      currency: 'EUR',
    });
    expect(invokeCalls[0].fn).toBe('create_payment_intent');
    expect(invokeCalls[0].body.email).toBe('alice@example.com');
    expect(invokeCalls[0].body.full_name).toBe('Alice');
    expect(invokeCalls[0].body.giveaway_id).toBe('g_1');
    expect(invokeCalls[0].body.utm).toEqual({ utm_source: 'twitter' });
  });

  it('returns error from supabase invoke', async () => {
    nextInvokeResp = { data: null, error: { message: 'function failed' } };
    const r = await createPaymentIntent({
      funnel: 'giveaway',
      tierSlug: 'entry',
      email: 'alice@example.com',
      fullName: 'A',
      phone: '+1',
    });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toBe('function failed');
  });

  it('returns error when data.ok is false (server-side validation)', async () => {
    nextInvokeResp = { data: { ok: false, error: 'invalid_tier' }, error: null };
    const r = await createPaymentIntent({
      funnel: 'giveaway',
      tierSlug: 'gold',
      email: 'alice@example.com',
      fullName: 'A',
      phone: '+1',
    });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toBe('invalid_tier');
  });

  it('returns "unknown" when data.ok is false but no error message provided', async () => {
    nextInvokeResp = { data: { ok: false }, error: null };
    const r = await createPaymentIntent({
      funnel: 'giveaway',
      tierSlug: 'gold',
      email: 'a@b.c',
      fullName: 'A',
      phone: '+1',
    });
    if (r.ok === false) expect(r.error).toBe('unknown');
  });

  it('handles network exceptions', async () => {
    nextInvokeThrow = new Error('Failed to fetch');
    const r = await createPaymentIntent({
      funnel: 'giveaway',
      tierSlug: 'entry',
      email: 'a@b.c',
      fullName: 'A',
      phone: '+1',
    });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toBe('Failed to fetch');
  });

  it('passes giveaway_id=null when not provided', async () => {
    nextInvokeResp = {
      data: { ok: true, client_secret: 'a', payment_intent_id: 'b', funnel_signup_id: 'c', amount: 10, currency: 'EUR' },
      error: null,
    };
    await createPaymentIntent({
      funnel: 'giveaway',
      tierSlug: 'entry',
      email: 'a@b.c',
      fullName: 'A',
      phone: '+1',
    });
    expect(invokeCalls[0].body.giveaway_id).toBeNull();
  });
});
