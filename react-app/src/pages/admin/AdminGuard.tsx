import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getCurrentUserIsAdmin,
  isCallerAdminViaRpc,
  getAdminMfaStatus,
} from '../../lib/adminApi';
import { AdminLogin } from './AdminLogin';
import { ReauthModal } from '../../components/admin/ReauthModal';
import { colors } from '../../theme';

type AuthState = 'loading' | 'unauthenticated' | 'authenticated-not-admin' | 'admin';

// Path of the MFA enrolment page. Kept in sync with AdminLayout.tsx and
// MfaPage.tsx. We compare against this exact path so an admin who is already
// on /admin/mfa isn't redirected to itself (infinite loop).
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
  const location = useLocation();
  // Track in-flight check so we don't queue concurrent SELECTs on rapid
  // mount + onAuthStateChange firing within the same tick.
  const inFlight = useRef(false);

  const check = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setState('unauthenticated');
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
      } else {
        setMustEnrol(false);
      }
    } finally {
      inFlight.current = false;
    }
  };

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
  }, []);

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

  // Hard-redirect: grace period expired AND no factor enrolled. Allow the
  // /admin/mfa route itself through (otherwise the user can never reach the
  // enrolment UI to fix the situation). All other admin routes are blocked
  // until enrolment completes.
  if (mustEnrol && location.pathname !== MFA_ENROL_PATH) {
    return <Navigate to={MFA_ENROL_PATH} replace />;
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
