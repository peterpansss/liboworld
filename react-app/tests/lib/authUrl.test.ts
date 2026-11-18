import { afterEach, describe, expect, it } from 'vitest';
import { captureAuthUrl, readAuthCallbackHash, readAuthConfirmQuery } from '../../src/lib/authUrl';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('auth URL credentials', () => {
  it('removes legacy session tokens from the address bar while keeping them available to the callback', () => {
    const hash = '#access_token=secret-access&refresh_token=secret-refresh&type=recovery';
    window.history.replaceState(null, '', `/auth/callback${hash}`);

    captureAuthUrl();

    expect(window.location.href).toBe(`${window.location.origin}/auth/callback`);
    expect(readAuthCallbackHash()).toBe(hash);
  });

  it('removes the confirmation token before analytics can read the URL', () => {
    window.history.replaceState(null, '', '/auth/confirm?token_hash=secret-hash&type=signup&utm_source=test');

    captureAuthUrl();

    expect(window.location.search).toBe('?utm_source=test');
    expect(readAuthConfirmQuery()).toEqual({ tokenHash: 'secret-hash', type: 'signup' });
  });

  it('does not reuse credentials after the history entry changes', () => {
    window.history.replaceState(null, '', '/auth/callback#access_token=old&refresh_token=old');
    expect(readAuthCallbackHash()).toContain('access_token=old');

    window.history.replaceState(null, '', '/auth/callback');
    expect(readAuthCallbackHash()).toBe('');
  });
});
