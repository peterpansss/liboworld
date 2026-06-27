import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import './AuthCallback.css';

/**
 * /auth/confirm — token-hash confirmation landing.
 *
 * With Associated Domains live, tapping the confirmation email link opens the
 * Libo app DIRECTLY (handled natively via the AASA + verifyOtp in-app). This
 * page is the FALLBACK for devices/browsers where the app isn't installed: it
 * reads `?token_hash` & `?type` from the query string and calls verifyOtp to
 * confirm the account in-browser, then tells the user to open the app.
 *
 * The Supabase "Confirm signup" (and recovery / magic-link) email templates must
 * point here, e.g.:
 *   https://liboworld.com/auth/confirm?token_hash={{ .TokenHash }}&type=signup
 * Query params (not the URL fragment) survive the Universal-Link handoff to the
 * native app, which is why this flow is preferred over the legacy
 * /auth/callback#access_token=… shape.
 *
 * Wired at /auth/confirm (BrowserRouter). Must be listed in Supabase Dashboard →
 * Authentication → URL Configuration → Redirect URLs.
 */

type ConfirmState =
  | { kind: 'loading' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' };

function parseQuery(): { tokenHash: string | null; type: string | null } {
  if (typeof window === 'undefined') return { tokenHash: null, type: null };
  const params = new URLSearchParams(window.location.search);
  return { tokenHash: params.get('token_hash'), type: params.get('type') };
}

export default function AuthConfirm() {
  const { tokenHash, type } = useMemo(parseQuery, []);
  const [state, setState] = useState<ConfirmState>(
    tokenHash && type ? { kind: 'loading' } : { kind: 'empty' },
  );

  useEffect(() => {
    document.title = 'Confirm | Libo';
    return () => {
      document.title = 'Libo';
    };
  }, []);

  useEffect(() => {
    if (!tokenHash || !type) return;
    let cancelled = false;
    void supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
      .then(({ error }) => {
        if (cancelled) return;
        if (error) {
          setState({ kind: 'error', message: error.message });
          return;
        }
        // Don't leave a session on the marketing site — the user signs in on the
        // phone. Fire-and-forget; failure here doesn't undo the confirmation.
        void supabase.auth.signOut().catch(() => {
          /* ignore */
        });
        setState({ kind: 'success' });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Confirmation failed.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [tokenHash, type]);

  return (
    <main className="auth-callback-page">
      <div className="auth-callback-card">
        <Link to="/" className="auth-callback-logo" aria-label="Libo home">
          <img src="/brand/logo_options/libo-dark.svg" alt="Libo" />
        </Link>

        {state.kind === 'loading' && (
          <>
            <div className="auth-callback-spinner" aria-hidden="true" />
            <div className="auth-callback-label">Confirming</div>
            <h1 className="auth-callback-title">One Moment</h1>
            <p className="auth-callback-body">Verifying your link&hellip;</p>
          </>
        )}

        {state.kind === 'success' && (
          <>
            <div className="auth-callback-icon auth-callback-icon--success" aria-hidden="true">
              &#10003;
            </div>
            <div className="auth-callback-label">Email Verified</div>
            <h1 className="auth-callback-title">You&rsquo;re verified</h1>
            <p className="auth-callback-body">
              Your account is verified — open the <strong>Libo app</strong> on your phone to sign
              in and get started.
            </p>
            <a href="libo://auth/confirmed" className="auth-callback-cta">
              Open Libo
            </a>
            <Link to="/" className="auth-callback-secondary">
              Back to liboworld.com
            </Link>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <div className="auth-callback-icon auth-callback-icon--error" aria-hidden="true">
              !
            </div>
            <div className="auth-callback-label">Link Problem</div>
            <h1 className="auth-callback-title">This link has expired</h1>
            <p className="auth-callback-body">
              This link has expired or already been used. Please request a new one from the Libo
              app.
            </p>
            <Link to="/" className="auth-callback-secondary">
              Back to liboworld.com
            </Link>
          </>
        )}

        {state.kind === 'empty' && (
          <>
            <div className="auth-callback-icon auth-callback-icon--neutral" aria-hidden="true">
              ?
            </div>
            <div className="auth-callback-label">Nothing to confirm</div>
            <h1 className="auth-callback-title">This link looks broken</h1>
            <p className="auth-callback-body">
              We didn&rsquo;t find a confirmation token in this link. Try requesting a new one from
              the Libo app.
            </p>
            <Link to="/" className="auth-callback-secondary">
              Back to liboworld.com
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
