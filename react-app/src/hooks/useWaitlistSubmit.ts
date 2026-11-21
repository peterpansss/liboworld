import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { trackLead } from '../lib/consent';
import { submitWaitlistSignup } from '../lib/waitlistSignup';

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

    // Bound the request. Observed in production (2026-08-21): a signup can
    // stop resolving entirely — the row sometimes commits server-side, the
    // response never arrives. Without a bound, `status` stays 'submitting'
    // forever: the visitor watches "Sending…" with no error and nothing to
    // retry, on the site's only conversion point. The server treats a retry
    // of an already stored email as a duplicate success.
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), SUBMIT_TIMEOUT_MS);

    try {
      const result = await submitWaitlistSignup(trimmed.toLowerCase(), source, undefined, abort.signal);
      if (result === 'success') {
        setStatus('success');
      // Meta Lead — fires ONLY on confirmed insert (not click, not duplicate:
      // a duplicate is someone who already converted). No-op without consent.
      trackLead();
      } else {
        setStatus('duplicate');
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
