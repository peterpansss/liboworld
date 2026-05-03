/**
 * Coverage for src/lib/funnelSignups.ts.
 *
 * The supabase client is replaced with a scriptable double; tests exercise
 * the email validator, UTM/referrer capture, and the duplicate-detection
 * branch (Postgres unique-violation code 23505).
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';

const inserts: { table: string; row: any }[] = [];
let nextInsertResp: { error: any } = { error: null };

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      insert: async (row: any) => {
        inserts.push({ table, row });
        return nextInsertResp;
      },
    }),
  },
}));

import { submitFunnelInterest, logFunnelClick } from '../../src/lib/funnelSignups';

beforeEach(() => {
  inserts.length = 0;
  nextInsertResp = { error: null };
});

describe('submitFunnelInterest — email validation', () => {
  it('rejects invalid emails before hitting the network', async () => {
    const r = await submitFunnelInterest({
      email: 'not-an-email',
      funnel: 'giveaway',
      tierSlug: 'entry',
    });
    expect(r).toEqual({ ok: false, error: 'invalid_email' });
    expect(inserts.length).toBe(0);
  });

  it('rejects emails with no domain', async () => {
    const r = await submitFunnelInterest({
      email: 'foo@',
      funnel: 'giveaway',
      tierSlug: 'entry',
    });
    expect(r.ok).toBe(false);
  });

  it('lowercases and trims the email', async () => {
    await submitFunnelInterest({
      email: '  Alice@Example.COM  ',
      funnel: 'giveaway',
      tierSlug: 'entry',
    });
    expect(inserts[0].row.email).toBe('alice@example.com');
  });
});

describe('submitFunnelInterest — happy path + duplicate', () => {
  it('returns ok when insert succeeds', async () => {
    nextInsertResp = { error: null };
    const r = await submitFunnelInterest({
      email: 'alice@example.com',
      funnel: 'giveaway',
      tierSlug: 'entry',
      giveawayId: 'g_1',
    });
    expect(r).toEqual({ ok: true, duplicate: false });
    expect(inserts[0].table).toBe('funnel_signups');
    expect(inserts[0].row.giveaway_id).toBe('g_1');
  });

  it('detects duplicates via Postgres 23505 and returns duplicate=true', async () => {
    nextInsertResp = { error: { code: '23505', message: 'duplicate key' } };
    const r = await submitFunnelInterest({
      email: 'alice@example.com',
      funnel: 'giveaway',
      tierSlug: 'entry',
    });
    expect(r).toEqual({ ok: true, duplicate: true });
  });

  it('returns ok=false / error=unknown for non-23505 errors', async () => {
    nextInsertResp = { error: { code: '42P01', message: 'relation does not exist' } };
    const r = await submitFunnelInterest({
      email: 'alice@example.com',
      funnel: 'giveaway',
      tierSlug: 'entry',
    });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toBe('unknown');
  });

  it('returns network error when the insert promise throws', async () => {
    // Make the mock throw on next call.
    const realInsert = inserts;
    vi.doMock('../../src/lib/supabase', () => ({
      supabase: {
        from: () => ({
          insert: async () => {
            throw new Error('Network down');
          },
        }),
      },
    }));
    // Need a fresh import so the new mock takes effect.
    vi.resetModules();
    const { submitFunnelInterest: freshSubmit } = await import('../../src/lib/funnelSignups');
    const r = await freshSubmit({
      email: 'alice@example.com',
      funnel: 'giveaway',
      tierSlug: 'entry',
    });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toBe('network');
    void realInsert;
    vi.doUnmock('../../src/lib/supabase');
  });

  it('captures full_name and phone when supplied', async () => {
    await submitFunnelInterest({
      email: 'alice@example.com',
      fullName: 'Alice Smith',
      phone: '+15551234567',
      funnel: 'giveaway',
      tierSlug: 'silver',
    });
    expect(inserts[inserts.length - 1].row.full_name).toBe('Alice Smith');
    expect(inserts[inserts.length - 1].row.phone).toBe('+15551234567');
  });

  it('null full_name and phone when blank', async () => {
    await submitFunnelInterest({
      email: 'alice@example.com',
      fullName: '   ',
      phone: '',
      funnel: 'giveaway',
      tierSlug: 'silver',
    });
    expect(inserts[inserts.length - 1].row.full_name).toBeNull();
    expect(inserts[inserts.length - 1].row.phone).toBeNull();
  });
});

describe('submitFunnelInterest — UTM capture', () => {
  it('captures UTM params from window.location.search', async () => {
    const orig = window.location.search;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...window.location, search: '?utm_source=google&utm_campaign=spring' },
    });
    await submitFunnelInterest({
      email: 'a@b.com',
      funnel: 'giveaway',
      tierSlug: 'entry',
    });
    expect(inserts[inserts.length - 1].row.utm_source).toBe('google');
    expect(inserts[inserts.length - 1].row.utm_campaign).toBe('spring');

    // Restore.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...window.location, search: orig },
    });
  });
});

describe('logFunnelClick — fire-and-forget anon logger', () => {
  it('inserts a row with email=null', async () => {
    await logFunnelClick({ funnel: 'cash_challenge', tierSlug: 'pro_pool' });
    expect(inserts.some((i) => i.row.email === null && i.row.funnel === 'cash_challenge')).toBe(true);
  });

  it('does not throw when the network call fails', async () => {
    nextInsertResp = { error: { code: '???', message: 'down' } };
    await expect(logFunnelClick({ funnel: 'giveaway', tierSlug: 'entry' })).resolves.toBeUndefined();
  });
});
