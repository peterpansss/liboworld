import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { trackLead } from '../lib/consent';
import { supabase } from '../lib/supabase';

export type WaitlistStatus = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error';

export type WaitlistSource = 'homepage_waitlist' | 'challenge_waitlist';

// Long enough to clear a slow-but-working insert (measured 5-7s in production),
// short enough that a stuck one surfaces while the visitor is still on the page.
const SUBMIT_TIMEOUT_MS = 15_000;

export function useWaitlistSubmit(source: WaitlistSource = 'homepage_waitlist'): {
  email: string;
  setEmail: (v: string) => void;
  status: WaitlistStatus;
  errorMessage: string;
  submit: (e: FormEvent) => Promise<void>;
  reset: () => void;
} {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<WaitlistStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const submit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('submitting');
    setErrorMessage('');

    // Bound the request. Observed in production (2026-08-21): an insert can
    // stop resolving entirely — the row sometimes commits server-side, the
    // response never arrives. Without a bound, `status` stays 'submitting'
    // forever: the visitor watches "Sending…" with no error and nothing to
    // retry, on the site's only conversion point. Failing loudly after 15s is
    // strictly better than an infinite spinner, and a duplicate insert from a
    // retry is harmless (23505 is already treated as success).
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), SUBMIT_TIMEOUT_MS);

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert({
          email: trimmed.toLowerCase(),
          source,
        })
        .abortSignal(abort.signal);

      if (!error) {
        setStatus('success');
      // Meta Lead — fires ONLY on confirmed insert (not click, not duplicate:
      // a duplicate is someone who already converted). No-op without consent.
      trackLead();
      } else if (error.code === '23505') {
        setStatus('duplicate');
      } else {
        setStatus('error');
        setErrorMessage(t('waitlist.errorMessage'));
      }
    } catch {
      setStatus('error');
      setErrorMessage(t('waitlist.errorMessage'));
    } finally {
      clearTimeout(timeout);
    }
  }, [email, t, source]);

  const reset = useCallback(() => {
    setStatus('idle');
    setEmail('');
    setErrorMessage('');
  }, []);

  return { email, setEmail, status, errorMessage, submit, reset };
}
