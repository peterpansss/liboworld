/**
 * Coverage for src/lib/funnelSignups.ts.
 *
 * LIBO-01 (Dimitri audit): funnel capture goes through the
 * capture_funnel_signup RPC, never a direct table insert. The RPC hard-nulls
 * every Stripe/payment column server-side, and direct anon INSERT is revoked.
 *
 * These tests pin BOTH paths:
 *   - allowed: a valid submit/click calls rpc('capture_funnel_signup') with the
 *     lead-capture params, and returns ok.
 *   - denied:  the client payload can NEVER carry a Stripe/payment column, so
 *     the browser cannot forge a `succeeded` buyer-registry row even if the RPC
 *     were permissive. This is the client half of the fix; the server half is
 *     asserted in the SQL migration + probe.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';

const rpcCalls: { name: string; args: any }[] = [];
let nextRpcResp: { data: any; error: any } = { data: { ok: true, duplicate: false }, error: null };

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    rpc: async (name: string, args: any) => {
      rpcCalls.push({ name, args });
      return nextRpcResp;
    },
    // A `from` that throws if touched — proves nothing writes the table directly.
    from: () => {
      throw new Error('direct table access is forbidden — use capture_funnel_signup');
    },
  },
}));

import { submitFunnelInterest, logFunnelClick } from '../../src/lib/funnelSignups';

const PAYMENT_KEYS = ['stripe_status', 'stripe_payment_intent_id', 'stripe_session_id',
  'p_stripe_status', 'p_stripe_payment_intent_id', 'p_stripe_session_id'];

beforeEach(() => {
  rpcCalls.length = 0;
  nextRpcResp = { data: { ok: true, duplicate: false }, error: null };
});

describe('submitFunnelInterest — email validation', () => {
  it('rejects invalid emails before hitting the network', async () => {
    const r = await submitFunnelInterest({ email: 'not-an-email', funnel: 'giveaway', tierSlug: 'entry' });
    expect(r).toEqual({ ok: false, error: 'invalid_email' });
    expect(rpcCalls.length).toBe(0);
  });

  it('rejects emails with no domain', async () => {
    const r = await submitFunnelInterest({ email: 'foo@', funnel: 'giveaway', tierSlug: 'entry' });
    expect(r.ok).toBe(false);
  });

  it('lowercases and trims the email', async () => {
    await submitFunnelInterest({ email: '  Alice@Example.COM  ', funnel: 'giveaway', tierSlug: 'entry' });
    expect(rpcCalls[0].args.p_email).toBe('alice@example.com');
  });
});

describe('submitFunnelInterest — RPC contract', () => {
  it('calls capture_funnel_signup (never a direct insert)', async () => {
    const r = await submitFunnelInterest({
      email: 'alice@example.com', funnel: 'giveaway', tierSlug: 'entry', giveawayId: 'g_1',
    });
    expect(r).toEqual({ ok: true, duplicate: false });
    expect(rpcCalls[0].name).toBe('capture_funnel_signup');
    expect(rpcCalls[0].args.p_giveaway_id).toBe('g_1');
  });

  it('LIBO-01: the payload carries NO payment/stripe column', async () => {
    await submitFunnelInterest({ email: 'alice@example.com', funnel: 'giveaway', tierSlug: 'entry' });
    const keys = Object.keys(rpcCalls[0].args);
    for (const k of PAYMENT_KEYS) expect(keys).not.toContain(k);
  });

  it('surfaces duplicate=true from the RPC result, not an error code', async () => {
    nextRpcResp = { data: { ok: true, duplicate: true }, error: null };
    const r = await submitFunnelInterest({ email: 'alice@example.com', funnel: 'giveaway', tierSlug: 'entry' });
    expect(r).toEqual({ ok: true, duplicate: true });
  });

  it('returns ok=false / error=unknown when the RPC errors', async () => {
    nextRpcResp = { data: null, error: { code: '22023', message: 'invalid_funnel' } };
    const r = await submitFunnelInterest({ email: 'alice@example.com', funnel: 'giveaway', tierSlug: 'entry' });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toBe('unknown');
  });

  it('returns network error when the RPC promise throws', async () => {
    vi.resetModules();
    vi.doMock('../../src/lib/supabase', () => ({
      supabase: { rpc: async () => { throw new Error('Network down'); }, from: () => ({}) },
    }));
    const { submitFunnelInterest: freshSubmit } = await import('../../src/lib/funnelSignups');
    const r = await freshSubmit({ email: 'alice@example.com', funnel: 'giveaway', tierSlug: 'entry' });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toBe('network');
    vi.doUnmock('../../src/lib/supabase');
    vi.resetModules();
  });

  it('captures full_name and phone when supplied', async () => {
    await submitFunnelInterest({
      email: 'alice@example.com', fullName: 'Alice Smith', phone: '+15551234567',
      funnel: 'giveaway', tierSlug: 'silver',
    });
    expect(rpcCalls[rpcCalls.length - 1].args.p_full_name).toBe('Alice Smith');
    expect(rpcCalls[rpcCalls.length - 1].args.p_phone).toBe('+15551234567');
  });

  it('nulls full_name and phone when blank', async () => {
    await submitFunnelInterest({
      email: 'alice@example.com', fullName: '   ', phone: '', funnel: 'giveaway', tierSlug: 'silver',
    });
    expect(rpcCalls[rpcCalls.length - 1].args.p_full_name).toBeNull();
    expect(rpcCalls[rpcCalls.length - 1].args.p_phone).toBeNull();
  });
});

describe('submitFunnelInterest — UTM capture', () => {
  it('captures UTM params from window.location.search', async () => {
    const orig = window.location.search;
    Object.defineProperty(window, 'location', {
      configurable: true, writable: true,
      value: { ...window.location, search: '?utm_source=google&utm_campaign=spring' },
    });
    await submitFunnelInterest({ email: 'a@b.com', funnel: 'giveaway', tierSlug: 'entry' });
    expect(rpcCalls[rpcCalls.length - 1].args.p_utm_source).toBe('google');
    expect(rpcCalls[rpcCalls.length - 1].args.p_utm_campaign).toBe('spring');
    Object.defineProperty(window, 'location', {
      configurable: true, writable: true, value: { ...window.location, search: orig },
    });
  });
});

describe('logFunnelClick — fire-and-forget anon logger', () => {
  it('calls the RPC with p_email=null', async () => {
    await logFunnelClick({ funnel: 'cash_challenge', tierSlug: 'pro_pool' });
    expect(rpcCalls.some((c) => c.name === 'capture_funnel_signup'
      && c.args.p_email === null && c.args.p_funnel === 'cash_challenge')).toBe(true);
  });

  it('LIBO-01: click payload carries no payment column', async () => {
    await logFunnelClick({ funnel: 'giveaway', tierSlug: 'entry' });
    const keys = Object.keys(rpcCalls[rpcCalls.length - 1].args);
    for (const k of PAYMENT_KEYS) expect(keys).not.toContain(k);
  });

  it('does not throw when the RPC fails', async () => {
    nextRpcResp = { data: null, error: { code: '???', message: 'down' } };
    await expect(logFunnelClick({ funnel: 'giveaway', tierSlug: 'entry' })).resolves.toBeUndefined();
  });
});
