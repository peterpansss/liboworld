import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userId = 'admin-1';
let verifyError: Error | null = null;
const calls: string[] = [];

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    rpc: async (name: string) => {
      calls.push(`rpc:${name}`);
      return { data: { ok: true, postal_entries: 1, counting_now: 1 }, error: null };
    },
    auth: {
      getSession: async () => ({ data: { session: { user: { id: userId }, expires_at: Math.floor(Date.now() / 1000) + 3600 } } }),
      signOut: async () => ({ error: null }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal2' }, error: null }),
        listFactors: async () => ({ data: { totp: [{ id: 'factor-1', status: 'verified' }] }, error: null }),
        challenge: async () => { calls.push('challenge'); return { data: { id: 'challenge-1' }, error: null }; },
        verify: async () => { calls.push('verify'); return { error: verifyError }; },
      },
    },
  },
}));

import {
  deletePostalEntryWithReauth,
  recordPostalEntryWithReauth,
  registerReauthPrompt,
  requireRecentAuth,
  signOutAdmin,
} from '../../src/lib/adminApi';

let unregister: (() => void) | null = null;

beforeEach(async () => {
  await signOutAdmin();
  userId = 'admin-1';
  verifyError = null;
  calls.length = 0;
});

afterEach(() => {
  unregister?.();
  unregister = null;
});

describe('sensitive admin re-authentication', () => {
  it('requires a fresh TOTP challenge despite a fresh aal2 JWT', async () => {
    let prompts = 0;
    unregister = registerReauthPrompt((resolve) => { prompts += 1; resolve('123456'); });

    await requireRecentAuth();
    expect(prompts).toBe(1);
    expect(calls).toEqual(['challenge', 'verify']);

    await requireRecentAuth();
    expect(prompts).toBe(1);
  });

  it('does not reuse a recent check for another admin account', async () => {
    let prompts = 0;
    unregister = registerReauthPrompt((resolve) => { prompts += 1; resolve('123456'); });
    await requireRecentAuth();

    userId = 'admin-2';
    await requireRecentAuth();
    expect(prompts).toBe(2);
  });

  it('fails closed when the TOTP verification fails', async () => {
    verifyError = new Error('bad code');
    unregister = registerReauthPrompt((resolve) => resolve('000000'));
    await expect(requireRecentAuth()).rejects.toThrow(/Re-authentication failed/);
  });

  it('steps up before changing postal giveaway entries', async () => {
    unregister = registerReauthPrompt((resolve) => resolve('123456'));
    await recordPostalEntryWithReauth({
      giveawayId: 'round-1', email: 'member@example.test', receivedOn: '2026-11-17', country: 'DE',
    });
    await deletePostalEntryWithReauth('entry-1');
    expect(calls).toEqual([
      'challenge', 'verify', 'rpc:admin_record_postal_entry', 'rpc:admin_delete_postal_entry',
    ]);
  });

  it('does not call the postal mutation RPC when TOTP fails', async () => {
    verifyError = new Error('bad code');
    unregister = registerReauthPrompt((resolve) => resolve('000000'));
    await expect(recordPostalEntryWithReauth({
      giveawayId: 'round-1', email: 'member@example.test', receivedOn: '2026-11-17', country: 'DE',
    })).rejects.toThrow(/Re-authentication failed/);
    expect(calls).toEqual(['challenge', 'verify']);
  });
});
