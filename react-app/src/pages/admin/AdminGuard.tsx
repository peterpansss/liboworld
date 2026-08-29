import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getCurrentUserIsAdmin,
  isCallerAdminViaRpc,
  getAdminMfaStatus,
  getSessionAal,
  stepUpAdminSessionToAal2,
  signOutAdmin,
} from '../../lib/adminApi';
import { AdminLogin } from './AdminLogin';
import { ReauthModal } from '../../components/admin/ReauthModal';
import { Button } from '../../components/admin/FormField';
import { colors } from '../../theme';

type AuthState = 'loading' | 'unauthenticated' | 'authenticated-not-admin' | 'admin';

// AAL gate decision (only meaningful once state === 'admin'):
//   'checking' — AAL not yet determined this cycle
//   'allow'    — session is aal2, OR aal1 with no factor (enrol/grace case,
//                deferred to the mustEnrol redirect)
//   'stepup'   — session must be elevated to aal2 before admin content renders
//                (aal1 with a verified factor, or a fail-closed read error)
type AalGate = 'checking' | 'allow' | 'stepup';

// Path of the MFA enrolment page. Kept in sync with AdminLayout.tsx and
// MfaPage.tsx. We compare against this exact path so an admin who is already
// on /admin/mfa isn't redirected to itself (infinite loop) and can always
// reach the enrolment / factor-management UI even at aal1.
const MFA_ENROL_PATH = '/admin/mfa';

// TODO (deferred for min-viable MFA scope):
//   - Recovery codes (10 single-use). Without these a lost-device admin must
//     be unlocked by a sysadmin via the Supabase dashboard.
//   - "Trust this device" cookie keyed by browser + 30-day expiry, to skip
//     the aal2 prompt on subsequent sessions.
//   - SMS / push factor fallback. TOTP-only is fragile.
//   - Audit log of enrol / verify / unenrol events into admin_audit.

// Re-check the admin flag every 5 minutes. Long-lived admin sessions are a
// liability: an admin whose `is_admin` flag was revoked in the DB should not
// keep editing the panel until they happen to refresh. We also force a check
// on auth-state-change events from supabase (sign-out, token refresh).
const RECHECK_INTERVAL_MS = 5 * 60 * 1000;

export function AdminGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('loading');
  // null = unknown / not-yet-fetched; false = grace still active or enrolled;
  // true = grace expired AND not enrolled (hard-redirect).
  const [mustEnrol, setMustEnrol] = useState<boolean>(false);
  // AAL2 gate: whether the session is at aal2 (allow) or must step up first.
  const [aalGate, setAalGate] = useState<AalGate>('checking');
  const location = useLocation();
  // Track in-flight check so we don't queue concurrent SELECTs on rapid
  // mount + onAuthStateChange firing within the same tick.
  const inFlight = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setState('unauthenticated');
        setAalGate('checking');
        return;
      }
      // Two checks, AND-combined:
      //   1. Profile row says is_admin=true (cheap, anyone can read their own).
      //   2. RPC is_caller_admin() returns true. This is what every admin RPC
      //      uses, so if it disagrees with (1) the panel will be unusable
      //      anyway and we should kick the user out.
      // The RPC also acts as a server-side liveness probe -- if the JWT was
      // revoked, the RPC fails and we treat it as not-admin.
      const [profileSaysAdmin, rpcSaysAdmin] = await Promise.all([
        getCurrentUserIsAdmin(),
        isCallerAdminViaRpc(),
      ]);
      const ok = profileSaysAdmin && rpcSaysAdmin;
      setState(ok ? 'admin' : 'authenticated-not-admin');

      // Only check MFA enforcement once we've confirmed admin status. For
      // non-admins the must_enrol flag is irrelevant (they won't see the
      // panel anyway).
      if (ok) {
        try {
          const mfa = await getAdminMfaStatus();
          setMustEnrol(mfa.must_enrol === true);
        } catch (e) {
          // FAIL CLOSED (LIBO-02): if the MFA-status RPC is unavailable or
          // errors, we cannot prove the admin is exempt from enrolment, so we
          // must NOT wave them through. Force the enrolment redirect instead of
          // skipping the MFA gate. The /admin/mfa route itself stays reachable
          // (see the mustEnrol redirect below), so an admin can still enrol.
          // Note: the real authorization control is now the database
          // (is_admin_aal2()); this guard is defense-in-depth for the UX.
          console.error(
            '[AdminGuard] getAdminMfaStatus failed — failing CLOSED (enrolment required):',
            e instanceof Error ? e.message : e,
          );
          setMustEnrol(true);
        }

        // AAL2 gate (LIBO-02): the DB enforces is_admin_aal2() for admin
        // writes, so an aal1 session can read but not act. Require the session
        // to be at aal2 before rendering admin content.
        const aal = await getSessionAal();
        if (aal.level === 'aal2') {
          setAalGate('allow');
        } else if (aal.error) {
          // FAIL CLOSED: couldn't determine AAL / factors. Do not silently
          // allow — require a step-up. If elevation is impossible the step-up
          // screen blocks (with retry + sign-out), never a dead-end.
          setAalGate('stepup');
        } else if (aal.hasVerifiedFactor) {
          // aal1 with a verified factor: the session just needs elevating.
          setAalGate('stepup');
        } else {
          // aal1 with NO verified factor: this is the enrol case. Defer to the
          // mustEnrol / grace logic (redirect to /admin/mfa once grace ends).
          setAalGate('allow');
        }
      } else {
        setMustEnrol(false);
        setAalGate('checking');
      }
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void check();
    });

    // Periodic re-check. setInterval is fine here -- the check is debounced
    // via inFlight, and a tab in the background still ticks (which is what
    // we want: a stale admin session sitting open for hours should still
    // notice if the flag was revoked).
    const tickId = setInterval(() => {
      void check();
    }, RECHECK_INTERVAL_MS);

    return () => {
      sub.subscription.unsubscribe();
      clearInterval(tickId);
    };
  }, [check]);

  // Noindex guard in case meta tag isn't enough -- remove admin chrome entirely
  // when not admin, so the DOM doesn't hint at admin routes.
  if (state === 'loading') {
    return (
      <div style={{ background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.muted }}>
        Loading…
      </div>
    );
  }

  if (state === 'unauthenticated' || state === 'authenticated-not-admin') {
    return <AdminLogin onSignedIn={check} deniedReason={state === 'authenticated-not-admin' ? 'Not an admin account.' : null} />;
  }

  // Admin confirmed, but AAL not yet resolved this cycle. Hold on a loading
  // screen rather than flashing admin content before the AAL2 gate decides.
  if (aalGate === 'checking') {
    return (
      <div style={{ background: colors.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.muted }}>
        Loading…
      </div>
    );
  }

  // Hard-redirect: grace period expired AND no factor enrolled. Allow the
  // /admin/mfa route itself through (otherwise the user can never reach the
  // enrolment UI to fix the situation). All other admin routes are blocked
  // until enrolment completes.
  if (mustEnrol && location.pathname !== MFA_ENROL_PATH) {
    return <Navigate to={MFA_ENROL_PATH} replace />;
  }

  // AAL2 step-up gate. The session has a verified factor (or we couldn't prove
  // otherwise) but isn't aal2 yet. Block admin content and prompt for a code.
  // Exempt the /admin/mfa route exactly like the mustEnrol redirect above, so
  // an admin can always reach the factor-management UI at aal1.
  if (aalGate === 'stepup' && location.pathname !== MFA_ENROL_PATH) {
    return <Aal2StepUpGate onElevated={check} />;
  }

  // Admin pass-through. ReauthModal listens for requireRecentAuth() prompts
  // from the wrapped sensitive RPCs; rendered inside the admin tree so it
  // unmounts when the user signs out.
  return (
    <>
      {children}
      <ReauthModal />
    </>
  );
}

// Blocking screen that elevates an aal1 admin session to aal2 via a TOTP
// prompt. Mounts ReauthModal (which registers the prompt handler) and kicks
// off the step-up. On success it re-runs the guard's check() so admin content
// renders; on cancel / bad code it shows a "2FA required" block with a retry
// and a sign-out — never a dead-end.
function Aal2StepUpGate({ onElevated }: { onElevated: () => void }) {
  const [phase, setPhase] = useState<'prompting' | 'failed'>('prompting');
  const runningRef = useRef(false);

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase('prompting');
    try {
      const ok = await stepUpAdminSessionToAal2();
      if (ok) {
        onElevated();
      } else {
        setPhase('failed');
      }
    } finally {
      runningRef.current = false;
    }
  }, [onElevated]);

  useEffect(() => {
    // Defer to a macrotask so ReauthModal's registration effect has run and
    // the prompt handler is registered before we invoke it.
    const t = setTimeout(() => {
      void run();
    }, 0);
    return () => clearTimeout(t);
  }, [run]);

  return (
    <>
      <ReauthModal />
      <div
        style={{
          background: colors.bg,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 28,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            margin: 0,
            color: colors.text,
          }}
        >
          Two-factor required
        </h1>
        <p style={{ color: colors.muted, fontSize: 14, maxWidth: 420, margin: 0 }}>
          {phase === 'prompting'
            ? 'Enter the 6-digit code from your authenticator app to continue.'
            : 'Verification was cancelled or the code was invalid. A verified authenticator is required to use the admin panel.'}
        </p>
        {phase === 'failed' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="button" onClick={() => void run()}>
              Enter code
            </Button>
            <Button type="button" variant="ghost" onClick={() => void signOutAdmin()}>
              Sign out
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
