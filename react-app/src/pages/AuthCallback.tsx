import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './AuthCallback.css';

/**
 * Auth callback page — handles the redirect from Supabase email-confirmation
 * (and recovery / magic-link) emails. Supabase appends auth state to the URL
 * fragment (`#access_token=…&refresh_token=…&type=signup`) on success, or
 * `#error=…&error_description=…` on failure.
 *
 * This page does NOT establish a Supabase session on the web. The user is on
 * a desktop browser; the actual app session lives on the phone. We just show
 * a friendly confirmation and offer a deep link back into the mobile app.
 *
 * Wired into the router at `/auth/callback` (BrowserRouter). Must match the
 * Supabase Dashboard → Authentication → URL Configuration → Site URL value.
 */

type CallbackState =
  | { kind: 'loading' }
  | {
      kind: 'success';
      type: string;
      accessToken: string;
      refreshToken: string;
    }
  | {
      kind: 'error';
      errorCode: string | null;
      errorDescription: string | null;
    }
  | { kind: 'empty' };

interface ParsedFragment {
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}

function parseFragment(hash: string): ParsedFragment {
  // Strip leading "#" or "#/" — the latter shouldn't happen with BrowserRouter
  // but we handle it defensively in case anything (or a stray HashRouter
  // config in Supabase) prefixes the fragment.
  let raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw.startsWith('/')) raw = raw.slice(1);

  // The fragment may itself contain a "?" — Supabase doesn't usually do that,
  // but URLSearchParams handles plain "k=v&k=v" correctly.
  const params = new URLSearchParams(raw);

  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    type: params.get('type'),
    error: params.get('error'),
    errorCode: params.get('error_code'),
    errorDescription: params.get('error_description'),
  };
}

function friendlyErrorMessage(
  errorCode: string | null,
  errorDescription: string | null,
): string {
  const desc = (errorDescription ?? '').toLowerCase();
  const code = (errorCode ?? '').toLowerCase();

  if (
    code === 'otp_expired' ||
    code === 'access_denied' ||
    desc.includes('expired') ||
    desc.includes('invalid')
  ) {
    return 'This confirmation link has expired or already been used. Open the Libo app and request a new confirmation email to continue.';
  }

  if (errorDescription) {
    // Supabase descriptions are URL-encoded with "+" for spaces; decode for display.
    return errorDescription.replace(/\+/g, ' ');
  }

  return 'Something went wrong confirming your email. Open the Libo app and try again.';
}

export default function AuthCallback() {
  const [state, setState] = useState<CallbackState>({ kind: 'loading' });

  useEffect(() => {
    document.title = 'Email Confirmed | Libo';

    // Parse synchronously on mount. Wrapped in a short timeout only so that
    // very fast renders show the spinner briefly and don't flash content.
    const parsed = parseFragment(window.location.hash);

    let next: CallbackState;
    if (parsed.error || parsed.errorDescription) {
      next = {
        kind: 'error',
        errorCode: parsed.errorCode,
        errorDescription: parsed.errorDescription,
      };
    } else if (parsed.accessToken && parsed.refreshToken) {
      next = {
        kind: 'success',
        type: parsed.type ?? 'signup',
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
      };
    } else {
      next = { kind: 'empty' };
    }

    // Slight delay so the spinner is visible if the parse was instant.
    const t = window.setTimeout(() => setState(next), 250);
    return () => {
      window.clearTimeout(t);
      document.title = 'Libo';
    };
  }, []);

  const deepLink = useMemo(() => {
    if (state.kind !== 'success') return null;
    const params = new URLSearchParams({
      type: state.type,
      access_token: state.accessToken,
      refresh_token: state.refreshToken,
    });
    // Custom URL scheme — must match the mobile app's registered scheme
    // (libo-app-v2/app.json → "scheme": "libo"). If the user is on desktop
    // or the app isn't installed, the browser does nothing on click and
    // the user falls back to the "Back to liboworld.com" link.
    return `libo://auth/callback?${params.toString()}`;
  }, [state]);

  return (
    <main className="auth-callback-page">
      <div className="auth-callback-card">
        <Link to="/" className="auth-callback-logo" aria-label="Libo home">
          <img
            src="/brand/logo_options/option_A_wordmark_ascending_dots_transparent.png"
            alt="Libo"
          />
        </Link>

        {state.kind === 'loading' && (
          <>
            <div className="auth-callback-spinner" aria-hidden="true" />
            <div className="auth-callback-label">Verifying</div>
            <h1 className="auth-callback-title">One Moment</h1>
            <p className="auth-callback-body">
              Confirming your email&hellip;
            </p>
          </>
        )}

        {state.kind === 'success' && (
          <>
            <div
              className="auth-callback-icon auth-callback-icon--success"
              aria-hidden="true"
            >
              &#10003;
            </div>
            <div className="auth-callback-label">Email Confirmed</div>
            <h1 className="auth-callback-title">You&rsquo;re Verified</h1>
            <p className="auth-callback-body">
              Your account is verified — open the <strong>Libo app</strong> on
              your phone to continue. You&rsquo;re ready to start training.
            </p>
            {deepLink && (
              <a href={deepLink} className="auth-callback-cta">
                Open Libo App
              </a>
            )}
            <Link to="/" className="auth-callback-secondary">
              Back to liboworld.com
            </Link>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <div
              className="auth-callback-icon auth-callback-icon--error"
              aria-hidden="true"
            >
              !
            </div>
            <div className="auth-callback-label">Confirmation Failed</div>
            <h1 className="auth-callback-title">Link Expired</h1>
            <p className="auth-callback-body">
              {friendlyErrorMessage(state.errorCode, state.errorDescription)}
            </p>
            <Link to="/onboarding" className="auth-callback-cta">
              Sign Up Again
            </Link>
            <Link to="/" className="auth-callback-secondary">
              Back to liboworld.com
            </Link>
            {state.errorDescription && (
              <div className="auth-callback-error-detail">
                {state.errorCode ? `${state.errorCode}: ` : ''}
                {state.errorDescription.replace(/\+/g, ' ')}
              </div>
            )}
          </>
        )}

        {state.kind === 'empty' && (
          <>
            <div
              className="auth-callback-icon auth-callback-icon--neutral"
              aria-hidden="true"
            >
              ?
            </div>
            <div className="auth-callback-label">Nothing to confirm</div>
            <h1 className="auth-callback-title">Link Looks Broken</h1>
            <p className="auth-callback-body">
              We didn&rsquo;t find any confirmation tokens in this link. It may
              be incomplete — try signing up again from the Libo app to receive
              a fresh confirmation email.
            </p>
            <Link to="/onboarding" className="auth-callback-cta">
              Get Started
            </Link>
            <Link to="/" className="auth-callback-secondary">
              Back to liboworld.com
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
