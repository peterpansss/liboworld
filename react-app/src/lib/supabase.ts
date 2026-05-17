import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client.
 *
 * Reads connection details from Vite env vars so that dev / staging /
 * preview / e2e / production builds can each point at their own project.
 *
 * Required env vars (set in `.env.local` for local dev, GitHub Secrets
 * for CI builds — see `.env.example`):
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_ANON_KEY
 *
 * The throw at module load is intentional: fail fast if env vars are
 * missing rather than silently falling back to a hardcoded prod key.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

export const supabase = createClient(url, key, {
  auth: {
    // The default (true) makes supabase-js read `#access_token=…&type=recovery`
    // from the URL on init, call setSession, then CLEAR the hash. That ran
    // synchronously at module-load time (this file is imported eagerly by
    // App.tsx), which is *before* the lazy-loaded AuthCallback page mounts.
    // Result: AuthCallback's parseFragment(window.location.hash) saw an empty
    // hash and showed "Nothing to confirm". /auth/callback now parses the hash
    // explicitly and calls setSession itself, so we want auto-detect off.
    detectSessionInUrl: false,
  },
});
