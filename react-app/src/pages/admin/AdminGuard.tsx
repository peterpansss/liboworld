import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserIsAdmin } from '../../lib/adminApi';
import { AdminLogin } from './AdminLogin';
import { colors } from '../../theme';

type AuthState = 'loading' | 'unauthenticated' | 'authenticated-not-admin' | 'admin';

export function AdminGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('loading');

  const check = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setState('unauthenticated');
      return;
    }
    const ok = await getCurrentUserIsAdmin();
    setState(ok ? 'admin' : 'authenticated-not-admin');
  };

  useEffect(() => {
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void check();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Noindex guard in case meta tag isn't enough — remove admin chrome entirely
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

  return <>{children}</>;
}
