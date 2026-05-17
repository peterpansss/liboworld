import { useState, type FormEvent } from 'react';
import {
  signInAdmin,
  checkAdminLoginAllowed,
  recordAdminLoginFailure,
  validatePasswordPolicy,
} from '../../lib/adminApi';
import { Field, TextInput, Button } from '../../components/admin/FormField';
import { colors } from '../../theme';

// T11: hardened admin login.
// - Rate-limit via check_admin_login_allowed (RPC) before signInWithPassword.
// - Record failure via record_admin_login_failure (RPC) on auth error.
// - Password policy: 12+ chars with mixed classes, common-password block.
//   Existing admins whose stored password fails the policy aren't locked
//   out -- the policy only gates new-password fields (sign-up, change pwd).
//   On sign-in we DON'T validate the entered password against the policy
//   (the password may be older than the policy); we only call this from
//   "set new password" flows.
//
// Re-auth for sensitive ops (markPayoutPaid, setSubscriptionTier, etc.) is
// implemented by the wrappers in adminApi.ts that call requireRecentAuth();
// see ReauthModal.

export function AdminLogin({ onSignedIn, deniedReason }: { onSignedIn: () => void; deniedReason: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(deniedReason);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) throw new Error('Email is required.');
      if (!password) throw new Error('Password is required.');

      // 1. Pre-flight rate-limit check. Done BEFORE signInWithPassword so a
      //    locked email never reaches the auth server.
      const gate = await checkAdminLoginAllowed(trimmedEmail);
      if (!gate.ok) {
        if (gate.error === 'locked') {
          throw new Error(`Too many failed sign-ins. Try again in ${Math.ceil((gate.retry_after_seconds ?? 900) / 60)} min.`);
        }
        if (gate.error === 'rate_limited') {
          throw new Error('Slow down — too many attempts. Wait a minute and try again.');
        }
        throw new Error('Sign-in temporarily unavailable.');
      }

      // 2. Try the actual sign-in.
      try {
        await signInAdmin(trimmedEmail, password);
      } catch (authErr) {
        // Record the failure so the rate-limit window catches up. We DO this
        // even if the email doesn't exist -- otherwise an attacker could
        // probe addresses with no penalty.
        await recordAdminLoginFailure(trimmedEmail).catch(() => {});
        throw authErr;
      }

      onSignedIn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form
        onSubmit={submit}
        style={{
          background: colors.bg2,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 32,
          width: '100%',
          maxWidth: 380,
        }}
      >
        <h1
          style={{
            margin: '0 0 6px 0',
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 30,
            fontWeight: 800,
            color: colors.text,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          Libo Admin
        </h1>
        <p style={{ margin: '0 0 24px 0', color: colors.muted, fontSize: 13 }}>Sign in with your Libo admin account.</p>

        <Field label="Email">
          <TextInput
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password" error={error}>
          <TextInput
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <Button type="submit" disabled={loading} style={{ width: '100%', padding: '12px 16px', fontSize: 14 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>

        <p style={{ marginTop: 16, fontSize: 11, color: colors.dim, textAlign: 'center' }}>
          Repeated failures lock this email for 15 min. After 5 failures in 15 min you'll be slowed down.
        </p>
      </form>
    </div>
  );
}

// Exported for use by sign-up / change-password flows. Returns the first
// problem found, or null if the password is acceptable. We don't surface the
// full list because the UI shows a single error string.
export function describePasswordPolicyError(password: string): string | null {
  const result = validatePasswordPolicy(password);
  if (result.ok) return null;
  return result.errors[0] ?? 'Password is not strong enough.';
}
