import { useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserIsAdmin, isCallerAdminViaRpc } from '../../lib/adminApi';
import { AdminLogin } from './AdminLogin';
import { ReauthModal } from '../../components/admin/ReauthModal';
import { colors } from '../../theme';

type AuthState = 'loading' | 'unauthenticated' | 'authenticated-not-admin' | 'admin';

// Re-check the admin flag every 5 minutes. Long-lived admin sessions are a
// liability: an admin whose `is_admin` flag was revoked in the DB should not
// keep editing the panel until they happen to refresh. We also force a check
// on auth-state-change events from supabase (sign-out, token refresh).
const RECHECK_INTERVAL_MS = 5 * 60 * 1000;

export function AdminGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('loading');
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
