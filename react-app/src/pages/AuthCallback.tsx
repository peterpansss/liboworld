import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './AuthCallback.css';

/**
 * Auth callback page — handles the redirect from Supabase email links.
 * Supabase appends auth state to the URL fragment on success
 * (`#access_token=…&refresh_token=…&type=signup|recovery|magiclink`) or
 * `#error=…&error_code=…&error_description=…` on failure.
 *
 * The page branches on `type`:
 *  - `recovery`  → show a password-reset form (web-native flow). Authenticate
 *                  the temporary recovery session via setSession, let the user
 *                  pick a new password, call updateUser, then signOut so we
 *                  don't leave a session on the marketing site.
 *  - `signup`    → passive "✓ Email verified" copy. No buttons (the deep-link
 *                  custom scheme is unreliable; users open the app manually).
 *  - `magiclink` → passive "✓ Signed in" copy. Web doesn't establish a session.
 *  - error/empty → friendly error state with a path back into the app.
 *
 * Wired into the router at `/auth/callback` (BrowserRouter). Must match the
 * Supabase Dashboard → Authentication → URL Configuration → Site URL value.
 */

const PASSWORD_MIN_LENGTH = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type LinkType = 'recovery' | 'signup' | 'magiclink' | 'unknown';

type CallbackState =
  | { kind: 'loading' }
  | {
      kind: 'recovery';
      // 'authenticating' → calling setSession on mount
      // 'ready'          → form visible, awaiting input
      // 'submitting'     → updateUser in flight
      // 'done'           → password updated, session cleared
      phase: 'authenticating' | 'ready' | 'submitting' | 'done';
      formError: string | null;
    }
  | { kind: 'signup' }
  | { kind: 'magiclink' }
  | {
      kind: 'error';
      errorCode: string | null;
      errorDescription: string | null;
    }
  | { kind: 'empty' };

interface ParsedFragment {
  accessToken: string | null;
  refreshToken: string | null;
  type: LinkType | null;
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseFragment(hash: string): ParsedFragment {
  // Strip leading "#" or "#/" — the latter shouldn't happen with BrowserRouter
  // but we handle it defensively in case anything (or a stray HashRouter
  // config in Supabase) prefixes the fragment.
  let raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw.startsWith('/')) raw = raw.slice(1);

  const params = new URLSearchParams(raw);
  const rawType = params.get('type');
  let type: LinkType | null = null;
  if (rawType === 'recovery' || rawType === 'signup' || rawType === 'magiclink') {
    type = rawType;
  } else if (rawType) {
    type = 'unknown';
  }

  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    type,
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
    return 'This link has expired or already been used. Please request a new one from the Libo app.';
  }

  if (errorDescription) {
    // Supabase descriptions are URL-encoded with "+" for spaces; decode for display.
    return errorDescription.replace(/\+/g, ' ');
  }

  return 'Something went wrong with this link. Please request a new one from the Libo app.';
}

function validatePassword(pw: string, confirm: string): string | null {
  if (pw.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(pw)) return 'Password must include at least one letter.';
  if (!/\d/.test(pw)) return 'Password must include at least one number.';
  if (pw !== confirm) return 'Passwords do not match.';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

// Compute the initial render state synchronously from the URL fragment so we
// don't have to call setState from an effect (which the lint rule discourages).
// The async recovery `setSession` call still happens in an effect — that's
// genuinely external-system synchronization.
function deriveInitialState(): {
  state: CallbackState;
  recoveryTokens: { access: string; refresh: string } | null;
} {
  if (typeof window === 'undefined') {
    return { state: { kind: 'loading' }, recoveryTokens: null };
  }

  const parsed = parseFragment(window.location.hash);

  if (parsed.error || parsed.errorDescription || parsed.errorCode) {
    return {
      state: {
        kind: 'error',
        errorCode: parsed.errorCode,
        errorDescription: parsed.errorDescription,
      },
      recoveryTokens: null,
    };
  }

  if (!parsed.accessToken || !parsed.refreshToken) {
    return { state: { kind: 'empty' }, recoveryTokens: null };
  }

  if (parsed.type === 'recovery') {
    return {
      state: { kind: 'recovery', phase: 'authenticating', formError: null },
      recoveryTokens: { access: parsed.accessToken, refresh: parsed.refreshToken },
    };
  }

  if (parsed.type === 'magiclink') {
    return { state: { kind: 'magiclink' }, recoveryTokens: null };
  }

  // signup / unknown-but-with-tokens → verified email confirmation.
  return { state: { kind: 'signup' }, recoveryTokens: null };
}

export default function AuthCallback() {
  const initial = useMemo(() => deriveInitialState(), []);
  const [state, setState] = useState<CallbackState>(initial.state);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Title — keep stable, mutated per state below if useful.
  useEffect(() => {
    document.title = 'Auth | Libo';
    return () => {
      document.title = 'Libo';
    };
  }, []);

  // For recovery links: establish the temporary session so updateUser works.
  // This is the only flow that needs a session on the web.
  useEffect(() => {
    if (!initial.recoveryTokens) return;

    let cancelled = false;
    void supabase.auth
      .setSession({
        access_token: initial.recoveryTokens.access,
        refresh_token: initial.recoveryTokens.refresh,
      })
      .then(({ error }) => {
        if (cancelled) return;
        if (error) {
          setState({
            kind: 'error',
            errorCode: 'session_failed',
            errorDescription: error.message,
          });
          return;
        }
        setState({ kind: 'recovery', phase: 'ready', formError: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          kind: 'error',
          errorCode: 'session_failed',
          errorDescription:
            err instanceof Error ? err.message : 'Could not start the recovery session.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [initial.recoveryTokens]);

  const isRecovery = state.kind === 'recovery';
  const recoveryPhase = isRecovery ? state.phase : null;
  const recoveryFormError = isRecovery ? state.formError : null;

  const submitDisabled = useMemo(() => {
    if (!isRecovery) return true;
    if (recoveryPhase !== 'ready') return true;
    return !password || !confirmPassword;
  }, [isRecovery, recoveryPhase, password, confirmPassword]);

  async function handleRecoverySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isRecovery || recoveryPhase !== 'ready') return;

    const validationError = validatePassword(password, confirmPassword);
    if (validationError) {
      setState({ kind: 'recovery', phase: 'ready', formError: validationError });
      return;
    }

    setState({ kind: 'recovery', phase: 'submitting', formError: null });
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setState({
          kind: 'recovery',
          phase: 'ready',
          formError: error.message || 'Could not update password. Please try again.',
        });
        return;
      }

      // End the temporary web session — user finishes signing in on the phone.
      // Fire-and-forget; failure here doesn't invalidate the password change.
      await supabase.auth.signOut().catch(() => {
        /* ignore — password is already updated */
      });

      setPassword('');
      setConfirmPassword('');
      setState({ kind: 'recovery', phase: 'done', formError: null });
    } catch (err: unknown) {
      setState({
        kind: 'recovery',
        phase: 'ready',
        formError:
          err instanceof Error ? err.message : 'Could not update password. Please try again.',
      });
    }
  }

  return (
    <main className="auth-callback-page">
      <div className="auth-callback-card">
        <Link to="/" className="auth-callback-logo" aria-label="Libo home">
          <img
            src="/brand/logo_options/libo-dark.svg"
            alt="Libo"
          />
        </Link>

        {state.kind === 'loading' && (
          <>
            <div className="auth-callback-spinner" aria-hidden="true" />
            <div className="auth-callback-label">Loading</div>
            <h1 className="auth-callback-title">One Moment</h1>
            <p className="auth-callback-body">Reading your link&hellip;</p>
          </>
        )}

        {/* ─── Recovery: password reset form ─────────────────────────── */}
        {state.kind === 'recovery' && state.phase === 'authenticating' && (
          <>
            <div className="auth-callback-spinner" aria-hidden="true" />
            <div className="auth-callback-label">Verifying Link</div>
            <h1 className="auth-callback-title">One Moment</h1>
            <p className="auth-callback-body">
              Securing your password-reset session&hellip;
            </p>
          </>
        )}

        {state.kind === 'recovery' &&
          (state.phase === 'ready' || state.phase === 'submitting') && (
            <>
              <div className="auth-callback-label">Reset Password</div>
              <h1 className="auth-callback-title">Set a new password</h1>
              <p className="auth-callback-body">
                Pick a new password for your <strong>Libo</strong> account. Then
                sign in on your phone with it.
              </p>

              <form className="auth-callback-form" onSubmit={handleRecoverySubmit} noValidate>
                <label className="auth-callback-field">
                  <span className="auth-callback-field-label">New password</span>
                  <input
                    type="password"
                    className="auth-callback-input"
                    autoComplete="new-password"
                    autoFocus
                    minLength={PASSWORD_MIN_LENGTH}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={state.phase === 'submitting'}
                    placeholder="At least 8 characters"
                    aria-invalid={Boolean(recoveryFormError)}
                  />
                </label>

                <label className="auth-callback-field">
                  <span className="auth-callback-field-label">Confirm password</span>
                  <input
                    type="password"
                    className="auth-callback-input"
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={state.phase === 'submitting'}
                    placeholder="Re-enter password"
                    aria-invalid={Boolean(recoveryFormError)}
                  />
                </label>

                <p className="auth-callback-hint">
                  Must include a letter and a number, 8+ characters.
                </p>

                {recoveryFormError && (
                  <div className="auth-callback-form-error" role="alert">
                    {recoveryFormError}
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-callback-cta"
                  disabled={submitDisabled || state.phase === 'submitting'}
                >
                  {state.phase === 'submitting' ? 'Updating…' : 'Update password'}
                </button>
              </form>

              <Link to="/" className="auth-callback-secondary">
                Back to liboworld.com
              </Link>
            </>
          )}

        {state.kind === 'recovery' && state.phase === 'done' && (
          <>
            <div
              className="auth-callback-icon auth-callback-icon--success"
              aria-hidden="true"
            >
              &#10003;
            </div>
            <div className="auth-callback-label">Password Updated</div>
            <h1 className="auth-callback-title">All set</h1>
            <p className="auth-callback-body">
              Your password has been updated. Open the <strong>Libo app</strong>{' '}
              on your phone and sign in with your new password.
            </p>
            <Link to="/" className="auth-callback-secondary">
              Back to liboworld.com
            </Link>
          </>
        )}

        {/* ─── Signup: passive verified copy ─────────────────────────── */}
        {state.kind === 'signup' && (
          <>
            <div
              className="auth-callback-icon auth-callback-icon--success"
              aria-hidden="true"
            >
              &#10003;
            </div>
            <div className="auth-callback-label">Email Verified</div>
            <h1 className="auth-callback-title">You&rsquo;re verified</h1>
            <p className="auth-callback-body">
              Your account is verified — open the <strong>Libo app</strong> on
              your phone to sign in and get started.
            </p>
            <Link to="/" className="auth-callback-secondary">
              Back to liboworld.com
            </Link>
          </>
        )}

        {/* ─── Magic-link: passive signed-in copy ────────────────────── */}
        {state.kind === 'magiclink' && (
          <>
            <div
              className="auth-callback-icon auth-callback-icon--success"
              aria-hidden="true"
            >
              &#10003;
            </div>
            <div className="auth-callback-label">Signed In</div>
            <h1 className="auth-callback-title">You&rsquo;re verified</h1>
            <p className="auth-callback-body">
              You&rsquo;re verified — open the <strong>Libo app</strong> on your
              phone to continue.
            </p>
            <Link to="/" className="auth-callback-secondary">
              Back to liboworld.com
            </Link>
          </>
        )}

        {/* ─── Error: expired or denied link ─────────────────────────── */}
        {state.kind === 'error' && (
          <>
            <div
              className="auth-callback-icon auth-callback-icon--error"
              aria-hidden="true"
            >
              !
            </div>
            <div className="auth-callback-label">Link Problem</div>
            <h1 className="auth-callback-title">This link has expired</h1>
            <p className="auth-callback-body">
              {friendlyErrorMessage(state.errorCode, state.errorDescription)}
            </p>
            <p className="auth-callback-body">
              Please request a new one from the Libo app.
            </p>
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

        {/* ─── Empty: missing tokens / unknown shape ─────────────────── */}
        {state.kind === 'empty' && (
          <>
            <div
              className="auth-callback-icon auth-callback-icon--neutral"
              aria-hidden="true"
            >
              ?
            </div>
            <div className="auth-callback-label">Nothing to confirm</div>
            <h1 className="auth-callback-title">This link looks broken</h1>
            <p className="auth-callback-body">
              We didn&rsquo;t find any auth tokens in this link. Try signing up or
              requesting a new link from the Libo app.
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
