import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

export type WaitlistStatus = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error';

export type WaitlistSource = 'homepage_waitlist' | 'challenge_waitlist';

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

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert({
          email: trimmed.toLowerCase(),
          source,
        });

      if (!error) {
        setStatus('success');
      } else if (error.code === '23505') {
        setStatus('duplicate');
      } else {
        setStatus('error');
        setErrorMessage(t('waitlist.errorMessage'));
      }
    } catch {
      setStatus('error');
      setErrorMessage(t('waitlist.errorMessage'));
    }
  }, [email, t, source]);

  const reset = useCallback(() => {
    setStatus('idle');
    setEmail('');
    setErrorMessage('');
  }, []);

  return { email, setEmail, status, errorMessage, submit, reset };
}
